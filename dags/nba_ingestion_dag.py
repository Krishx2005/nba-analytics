"""
nba_ingestion_dag — Nightly NBA shot data pipeline

Schedule: daily at 6 AM UTC (after west-coast games finish)
Pipeline: nba_api → CSV → GCS → BigQuery → dbt

Requires env vars:
  GCP_PROJECT_ID   — Google Cloud project ID
  GCS_BUCKET       — defaults to "nba-raw-data"
  DBT_PROJECT_DIR  — defaults to /opt/airflow/dbt_nba
"""

import os
from datetime import datetime, timedelta
from pathlib import Path

from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.google.cloud.transfers.local_to_gcs import (
    LocalFilesystemToGCSOperator,
)
from airflow.providers.google.cloud.operators.bigquery import (
    BigQueryCreateEmptyDatasetOperator,
    BigQueryInsertJobOperator,
)
from airflow.operators.bash import BashOperator

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
GCP_PROJECT_ID = os.environ.get("GCP_PROJECT_ID")
GCS_BUCKET = os.environ.get("GCS_BUCKET", "nba-raw-data")
DBT_PROJECT_DIR = os.environ.get("DBT_PROJECT_DIR", "/opt/airflow/dbt_nba")

SEASON = "2024-25"
SEASON_TYPE = "Regular Season"
DATASET_ID = "nba_raw"
TABLE_ID = "shots_with_rest"
CSV_FILENAME = "nba_shots_with_rest_2024_25.csv"
LOCAL_DATA_DIR = "/tmp/nba_data"

default_args = {
    "owner": "data-eng",
    "depends_on_past": False,
    "email_on_failure": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}


# ---------------------------------------------------------------------------
# Task callables
# ---------------------------------------------------------------------------
def pull_shot_data(**context):
    """Fetch all shot chart data + game logs from nba_api, merge, save CSV."""
    import time
    import pandas as pd
    from nba_api.stats.static import players
    from nba_api.stats.endpoints import shotchartdetail, playergamelog

    os.makedirs(LOCAL_DATA_DIR, exist_ok=True)
    all_players = players.get_active_players()
    print(f"Found {len(all_players)} active players")

    all_shots = []
    all_game_logs = []
    request_delay = 0.6

    for i, player in enumerate(all_players):
        pid = player["id"]
        name = player["full_name"]

        if (i + 1) % 50 == 0:
            print(f"Processing player {i + 1}/{len(all_players)}...")

        # Shot chart
        try:
            resp = shotchartdetail.ShotChartDetail(
                player_id=pid,
                team_id=0,
                season_nullable=SEASON,
                season_type_all_star=SEASON_TYPE,
                context_measure_simple="FGA",
            )
            shots_df = resp.get_data_frames()[0]
        except Exception as e:
            print(f"  Error fetching shots for {name}: {e}")
            shots_df = pd.DataFrame()
        time.sleep(request_delay)

        if shots_df.empty:
            continue

        print(f"  {name}: {len(shots_df)} shots")
        all_shots.append(shots_df)

        # Game log for rest days
        try:
            resp = playergamelog.PlayerGameLog(
                player_id=pid,
                season=SEASON,
                season_type_all_star=SEASON_TYPE,
            )
            log_df = resp.get_data_frames()[0]
        except Exception as e:
            print(f"  Error fetching game log for {name}: {e}")
            log_df = pd.DataFrame()
        time.sleep(request_delay)

        if not log_df.empty:
            log_df["GAME_DATE"] = pd.to_datetime(log_df["GAME_DATE"], format="mixed")
            log_df = log_df.sort_values("GAME_DATE")
            log_df["REST_DAYS"] = log_df["GAME_DATE"].diff().dt.days
            log_df["PLAYER_ID"] = pid
            log_df["PLAYER_NAME"] = name
            all_game_logs.append(log_df)

    if not all_shots:
        raise RuntimeError("No shot data collected — aborting pipeline")

    # Combine shots
    shots_combined = pd.concat(all_shots, ignore_index=True)
    print(f"Total shots: {len(shots_combined)}")

    # Merge rest days
    if all_game_logs:
        logs_combined = pd.concat(all_game_logs, ignore_index=True)
        rest_lookup = logs_combined[["PLAYER_ID", "Game_ID", "REST_DAYS"]].copy()
        rest_lookup = rest_lookup.rename(columns={"Game_ID": "GAME_ID"})
        rest_lookup["GAME_ID"] = rest_lookup["GAME_ID"].astype(str).str.zfill(10)
        shots_combined["GAME_ID"] = shots_combined["GAME_ID"].astype(str).str.zfill(10)
        shots_combined = shots_combined.merge(
            rest_lookup, on=["PLAYER_ID", "GAME_ID"], how="left"
        )

    csv_path = os.path.join(LOCAL_DATA_DIR, CSV_FILENAME)
    shots_combined.to_csv(csv_path, index=False)
    print(f"Saved {len(shots_combined)} rows to {csv_path}")

    # Push path to XCom for downstream tasks
    context["ti"].xcom_push(key="csv_path", value=csv_path)
    context["ti"].xcom_push(key="row_count", value=len(shots_combined))


# ---------------------------------------------------------------------------
# DAG
# ---------------------------------------------------------------------------
with DAG(
    dag_id="nba_ingestion_dag",
    default_args=default_args,
    description="Nightly NBA shot data: nba_api → GCS → BigQuery → dbt",
    schedule="0 6 * * *",
    start_date=datetime(2025, 10, 1),
    catchup=False,
    tags=["nba", "analytics", "ingestion"],
) as dag:

    # 1. Pull shot data from nba_api
    extract = PythonOperator(
        task_id="pull_shot_data",
        python_callable=pull_shot_data,
        execution_timeout=timedelta(hours=1),
    )

    # 2. Upload CSV to GCS
    ds = "{{ ds_nodash }}"
    gcs_path = f"shots/{ds}/{CSV_FILENAME}"

    upload_to_gcs = LocalFilesystemToGCSOperator(
        task_id="upload_csv_to_gcs",
        src=f"{LOCAL_DATA_DIR}/{CSV_FILENAME}",
        dst=gcs_path,
        bucket=GCS_BUCKET,
    )

    # 3. Ensure BigQuery dataset exists
    create_dataset = BigQueryCreateEmptyDatasetOperator(
        task_id="create_bq_dataset",
        dataset_id=DATASET_ID,
        project_id=GCP_PROJECT_ID,
        location="US",
        if_exists="ignore",
    )

    # 4. Load CSV from GCS into BigQuery
    load_to_bq = BigQueryInsertJobOperator(
        task_id="load_gcs_to_bigquery",
        configuration={
            "load": {
                "sourceUris": [f"gs://{GCS_BUCKET}/{gcs_path}"],
                "destinationTable": {
                    "projectId": GCP_PROJECT_ID,
                    "datasetId": DATASET_ID,
                    "tableId": TABLE_ID,
                },
                "sourceFormat": "CSV",
                "skipLeadingRows": 1,
                "writeDisposition": "WRITE_TRUNCATE",
                "allowQuotedNewlines": True,
                "schema": {
                    "fields": [
                        {"name": "GRID_TYPE",           "type": "STRING"},
                        {"name": "GAME_ID",             "type": "STRING"},
                        {"name": "GAME_EVENT_ID",       "type": "INTEGER"},
                        {"name": "PLAYER_ID",           "type": "INTEGER"},
                        {"name": "PLAYER_NAME",         "type": "STRING"},
                        {"name": "TEAM_ID",             "type": "INTEGER"},
                        {"name": "TEAM_NAME",           "type": "STRING"},
                        {"name": "PERIOD",              "type": "INTEGER"},
                        {"name": "MINUTES_REMAINING",   "type": "INTEGER"},
                        {"name": "SECONDS_REMAINING",   "type": "INTEGER"},
                        {"name": "EVENT_TYPE",          "type": "STRING"},
                        {"name": "ACTION_TYPE",         "type": "STRING"},
                        {"name": "SHOT_TYPE",           "type": "STRING"},
                        {"name": "SHOT_ZONE_BASIC",     "type": "STRING"},
                        {"name": "SHOT_ZONE_AREA",      "type": "STRING"},
                        {"name": "SHOT_ZONE_RANGE",     "type": "STRING"},
                        {"name": "SHOT_DISTANCE",       "type": "INTEGER"},
                        {"name": "LOC_X",               "type": "INTEGER"},
                        {"name": "LOC_Y",               "type": "INTEGER"},
                        {"name": "SHOT_ATTEMPTED_FLAG", "type": "INTEGER"},
                        {"name": "SHOT_MADE_FLAG",      "type": "INTEGER"},
                        {"name": "GAME_DATE",           "type": "STRING"},
                        {"name": "HTM",                 "type": "STRING"},
                        {"name": "VTM",                 "type": "STRING"},
                        {"name": "REST_DAYS",           "type": "FLOAT"},
                    ]
                },
            }
        },
        project_id=GCP_PROJECT_ID,
        location="US",
    )

    # 5. Run dbt models
    dbt_run = BashOperator(
        task_id="dbt_run",
        bash_command=f"cd {DBT_PROJECT_DIR} && dbt deps && dbt run --profiles-dir .",
        env={
            "GCP_PROJECT_ID": GCP_PROJECT_ID or "",
            "PATH": os.environ.get("PATH", ""),
        },
    )

    # 6. Run dbt tests
    dbt_test = BashOperator(
        task_id="dbt_test",
        bash_command=f"cd {DBT_PROJECT_DIR} && dbt test --profiles-dir .",
        env={
            "GCP_PROJECT_ID": GCP_PROJECT_ID or "",
            "PATH": os.environ.get("PATH", ""),
        },
    )

    # Pipeline: extract → GCS → BQ → dbt
    extract >> upload_to_gcs >> create_dataset >> load_to_bq >> dbt_run >> dbt_test
