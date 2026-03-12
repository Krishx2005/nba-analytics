import os

GCP_PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "nbaanalyzer")
BQ_DATASET = os.environ.get("BQ_DATASET", "nba_analytics_dev_analytics")

# Fully qualified table references
FACT_SHOTS = f"`{GCP_PROJECT_ID}.{BQ_DATASET}.fact_shots`"
DIM_PLAYERS = f"`{GCP_PROJECT_ID}.{BQ_DATASET}.dim_players`"
DIM_TEAMS = f"`{GCP_PROJECT_ID}.{BQ_DATASET}.dim_teams`"
DIM_GAMES = f"`{GCP_PROJECT_ID}.{BQ_DATASET}.dim_games`"

# Minimum FGA filter to exclude low-volume noise
MIN_FGA = int(os.environ.get("MIN_FGA", "50"))
