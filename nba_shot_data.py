"""
NBA Shot Chart Data Collector — 2024-25 Season
Pulls all shot chart detail + player game logs for rest day calculation.
Saves to CSV files. Reads existing CSVs to skip already-collected players.
"""

import time
from pathlib import Path

import pandas as pd
from nba_api.stats.static import players
from nba_api.stats.endpoints import shotchartdetail, playergamelog

SEASON = "2024-25"
SEASON_TYPE = "Regular Season"
REQUEST_DELAY = 2.0
MAX_RETRIES = 3
BACKOFF_SECONDS = [2, 4, 8]

SHOTS_CSV = Path("nba_shots_2024_25.csv")
LOGS_CSV = Path("nba_game_logs_2024_25.csv")
MERGED_CSV = Path("nba_shots_with_rest_2024_25.csv")


def get_existing_player_ids():
    """Read existing shots CSV and return set of player IDs already collected."""
    if not SHOTS_CSV.exists():
        return set()
    try:
        existing = pd.read_csv(SHOTS_CSV, usecols=["PLAYER_ID"])
        ids = set(existing["PLAYER_ID"].unique())
        print(f"Found existing data for {len(ids)} players in {SHOTS_CSV}")
        return ids
    except Exception as e:
        print(f"Could not read existing CSV: {e}")
        return set()


def fetch_with_retry(fetch_fn, label):
    """Call fetch_fn up to MAX_RETRIES times with exponential backoff (2/4/8s)."""
    for attempt in range(MAX_RETRIES):
        try:
            return fetch_fn()
        except Exception as e:
            wait = BACKOFF_SECONDS[attempt]
            if attempt < MAX_RETRIES - 1:
                print(f"    Retry {attempt + 1}/{MAX_RETRIES} for {label} "
                      f"(waiting {wait}s): {e}")
                time.sleep(wait)
            else:
                print(f"    Failed after {MAX_RETRIES} attempts for {label}: {e}")
                return pd.DataFrame()


def fetch_shot_chart(player_id):
    """Fetch shot chart detail for a single player with retries."""
    def _call():
        resp = shotchartdetail.ShotChartDetail(
            player_id=player_id,
            team_id=0,
            season_nullable=SEASON,
            season_type_all_star=SEASON_TYPE,
            context_measure_simple="FGA",
        )
        return resp.get_data_frames()[0]

    return fetch_with_retry(_call, f"shots player {player_id}")


def fetch_game_log(player_id):
    """Fetch player game log with retries."""
    def _call():
        resp = playergamelog.PlayerGameLog(
            player_id=player_id,
            season=SEASON,
            season_type_all_star=SEASON_TYPE,
        )
        return resp.get_data_frames()[0]

    return fetch_with_retry(_call, f"game log player {player_id}")


def calculate_rest_days(game_log_df):
    """Add rest days column to game log. Rest = days since last game."""
    if game_log_df.empty:
        return game_log_df

    df = game_log_df.copy()
    df["GAME_DATE"] = pd.to_datetime(df["GAME_DATE"], format="mixed")
    df = df.sort_values("GAME_DATE")
    df["REST_DAYS"] = df["GAME_DATE"].diff().dt.days
    return df


def main():
    existing_ids = get_existing_player_ids()

    # Load existing data to append to
    if SHOTS_CSV.exists() and len(existing_ids) > 0:
        all_shots = [pd.read_csv(SHOTS_CSV)]
        print(f"Loaded {len(all_shots[0])} existing shot rows")
    else:
        all_shots = []

    if LOGS_CSV.exists() and len(existing_ids) > 0:
        all_game_logs = [pd.read_csv(LOGS_CSV)]
        print(f"Loaded {len(all_game_logs[0])} existing game log rows")
    else:
        all_game_logs = []

    all_players = players.get_active_players()
    print(f"Found {len(all_players)} active players")

    remaining = [p for p in all_players if p["id"] not in existing_ids]
    print(f"Players to fetch: {len(remaining)}")

    if not remaining:
        print("All players already collected — skipping to merge step")
    else:
        new_players = 0
        for i, player in enumerate(remaining):
            pid = player["id"]
            name = player["full_name"]

            if (i + 1) % 50 == 0 or i == 0:
                print(f"\nProcessing {i + 1}/{len(remaining)}...")

            # Fetch shot chart
            shots_df = fetch_shot_chart(pid)
            time.sleep(REQUEST_DELAY)

            if shots_df.empty:
                continue

            new_players += 1
            print(f"  {name}: {len(shots_df)} shots")
            all_shots.append(shots_df)

            # Fetch game log
            log_df = fetch_game_log(pid)
            time.sleep(REQUEST_DELAY)

            if not log_df.empty:
                log_df = calculate_rest_days(log_df)
                log_df["PLAYER_ID"] = pid
                log_df["PLAYER_NAME"] = name
                all_game_logs.append(log_df)

        print(f"\nNew players collected: {new_players}")

    # --- Save combined CSVs ---
    print(f"\n{'='*50}")

    if all_shots:
        shots_combined = pd.concat(all_shots, ignore_index=True)
        print(f"Total shots: {len(shots_combined)}")
        shots_combined.to_csv(SHOTS_CSV, index=False)
        print(f"Saved: {SHOTS_CSV}")
    else:
        print("No shot data collected.")
        return

    if all_game_logs:
        logs_combined = pd.concat(all_game_logs, ignore_index=True)
        print(f"Total game log entries: {len(logs_combined)}")
        logs_combined.to_csv(LOGS_CSV, index=False)
        print(f"Saved: {LOGS_CSV}")
    else:
        print("No game log data collected.")
        return

    # Merge shots + rest days
    rest_lookup = logs_combined[["PLAYER_ID", "Game_ID", "REST_DAYS"]].copy()
    rest_lookup = rest_lookup.rename(columns={"Game_ID": "GAME_ID"})
    rest_lookup["GAME_ID"] = rest_lookup["GAME_ID"].astype(str).str.zfill(10)
    shots_combined["GAME_ID"] = shots_combined["GAME_ID"].astype(str).str.zfill(10)

    merged = shots_combined.merge(rest_lookup, on=["PLAYER_ID", "GAME_ID"], how="left")
    merged.to_csv(MERGED_CSV, index=False)
    print(f"\nSaved merged dataset: {MERGED_CSV} ({len(merged)} rows)")


if __name__ == "__main__":
    main()
