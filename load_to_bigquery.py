"""
Load nba_shots_with_rest_2024_25.csv into BigQuery.
Table: nba_raw.shots_with_rest
"""

import os
import sys
from pathlib import Path

from google.cloud import bigquery

PROJECT_ID = os.environ.get("GCP_PROJECT_ID")
DATASET_ID = "nba_raw"
TABLE_ID = "shots_with_rest"
CSV_PATH = Path(__file__).parent / "nba_shots_with_rest_2024_25.csv"

SCHEMA = [
    bigquery.SchemaField("GRID_TYPE",           "STRING"),
    bigquery.SchemaField("GAME_ID",             "STRING"),
    bigquery.SchemaField("GAME_EVENT_ID",       "INTEGER"),
    bigquery.SchemaField("PLAYER_ID",           "INTEGER"),
    bigquery.SchemaField("PLAYER_NAME",         "STRING"),
    bigquery.SchemaField("TEAM_ID",             "INTEGER"),
    bigquery.SchemaField("TEAM_NAME",           "STRING"),
    bigquery.SchemaField("PERIOD",              "INTEGER"),
    bigquery.SchemaField("MINUTES_REMAINING",   "INTEGER"),
    bigquery.SchemaField("SECONDS_REMAINING",   "INTEGER"),
    bigquery.SchemaField("EVENT_TYPE",          "STRING"),
    bigquery.SchemaField("ACTION_TYPE",         "STRING"),
    bigquery.SchemaField("SHOT_TYPE",           "STRING"),
    bigquery.SchemaField("SHOT_ZONE_BASIC",     "STRING"),
    bigquery.SchemaField("SHOT_ZONE_AREA",      "STRING"),
    bigquery.SchemaField("SHOT_ZONE_RANGE",     "STRING"),
    bigquery.SchemaField("SHOT_DISTANCE",       "INTEGER"),
    bigquery.SchemaField("LOC_X",               "INTEGER"),
    bigquery.SchemaField("LOC_Y",               "INTEGER"),
    bigquery.SchemaField("SHOT_ATTEMPTED_FLAG", "INTEGER"),
    bigquery.SchemaField("SHOT_MADE_FLAG",      "INTEGER"),
    bigquery.SchemaField("GAME_DATE",           "STRING"),
    bigquery.SchemaField("HTM",                 "STRING"),
    bigquery.SchemaField("VTM",                 "STRING"),
    bigquery.SchemaField("REST_DAYS",           "FLOAT"),
]


def main():
    if not PROJECT_ID:
        sys.exit("Error: GCP_PROJECT_ID environment variable is not set.")

    if not CSV_PATH.exists():
        sys.exit(f"Error: CSV not found at {CSV_PATH}")

    client = bigquery.Client(project=PROJECT_ID)
    dataset_ref = bigquery.DatasetReference(PROJECT_ID, DATASET_ID)

    # Create dataset if it doesn't exist
    dataset = bigquery.Dataset(dataset_ref)
    dataset.location = "US"
    client.create_dataset(dataset, exists_ok=True)
    print(f"Dataset ready: {PROJECT_ID}.{DATASET_ID}")

    # Configure load job
    table_ref = dataset_ref.table(TABLE_ID)
    job_config = bigquery.LoadJobConfig(
        schema=SCHEMA,
        source_format=bigquery.SourceFormat.CSV,
        skip_leading_rows=1,
        write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
        allow_quoted_newlines=True,
    )

    # Load CSV
    with open(CSV_PATH, "rb") as f:
        load_job = client.load_table_from_file(f, table_ref, job_config=job_config)

    print(f"Loading {CSV_PATH.name} ...")
    load_job.result()  # wait for completion

    # Verify
    table = client.get_table(table_ref)
    print(f"Loaded {table.num_rows} rows into {PROJECT_ID}.{DATASET_ID}.{TABLE_ID}")


if __name__ == "__main__":
    main()
