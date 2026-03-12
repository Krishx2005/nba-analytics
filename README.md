# NBA Shot Quality Engine

[![Live Demo](https://img.shields.io/badge/Live%20Demo-nba--analytics--mu.vercel.app-e84d4d?style=flat-square)](https://nba-analytics-mu.vercel.app)

A full-stack analytics platform that evaluates every field goal attempt in the 2024-25 NBA season using a custom **Shot Quality Score (SQS)** — a composite metric that estimates the expected value of a shot based on court zone, distance, player fatigue, and clutch context. The system ingests 219,527 shots across 566 players from the NBA's official stats API, transforms the data through a dbt modeling layer in BigQuery, and serves it through a FastAPI backend to a React dashboard built for serious basketball analysis.

---

## Architecture

```
                         ┌──────────────────────────────────────────────────────┐
                         │                   ORCHESTRATION                      │
                         │                  Apache Airflow                      │
                         │              (nba_ingestion_dag)                     │
                         └──────┬───────────────┬──────────────────┬────────────┘
                                │               │                  │
                                ▼               ▼                  ▼
┌───────────┐    extract   ┌─────────┐   upload   ┌─────────┐   load    ┌──────────────┐
│  nba_api  │─────────────▶│   CSV   │───────────▶│   GCS   │─────────▶│   BigQuery   │
│  (stats)  │              │  files  │            │  Bucket │          │   (nba_raw)  │
└───────────┘              └─────────┘            └─────────┘          └──────┬───────┘
                                                                              │
                                                                         dbt run
                                                                              │
                                                                              ▼
┌───────────┐   fetch    ┌───────────┐   query   ┌──────────────────────────────────┐
│   React   │◀───────────│  FastAPI  │◀──────────│         BigQuery                 │
│ Dashboard │            │  Backend  │           │   (nba_analytics)                │
│ (Vercel)  │            │ (Render)  │           │                                  │
└───────────┘            └───────────┘           │  dim_players  dim_teams          │
                                                 │  dim_games    fact_shots          │
                                                 └──────────────────────────────────┘
```

---

## Tech Stack

| Layer            | Technology                          |
|------------------|-------------------------------------|
| Ingestion        | Python, nba_api                     |
| Orchestration    | Apache Airflow                      |
| Storage          | Google Cloud Storage                |
| Warehouse        | Google BigQuery                     |
| Transformation   | dbt (data build tool)               |
| Backend          | FastAPI, google-cloud-bigquery      |
| Frontend         | React, Vite, Recharts, Tailwind CSS |
| Hosting          | Vercel (frontend), Render (backend) |

---

## Shot Quality Score

Every field goal attempt receives a **Shot Quality Score (SQS)** between 0 and 1, estimating the probability-weighted value of the shot independent of outcome.

### Zone Base Values

| Zone           | Base Value | Rationale                            |
|----------------|:----------:|--------------------------------------|
| Paint          |   0.65     | Highest efficiency shots in the NBA  |
| Corner 3       |   0.58     | Shortest three-point distance        |
| Above Break 3  |   0.52     | League-average three-point value     |
| Mid-Range      |   0.40     | Lowest expected value per attempt    |

### Adjustments

```
SQS = base_value(zone)
    - distance_penalty
    - fatigue_penalty
    + clutch_bonus
```

**Distance penalty** — Shots farther from the zone midpoint are penalized at -0.005 per additional foot:

```
max(0, (shot_distance - zone_midpoint) × 0.005)
```

Zone midpoints: paint 5 ft, mid-range 15 ft, corner 3 23 ft, above break 3 25 ft.

**Fatigue penalty** — Back-to-back games reduce shot quality:

| Condition        | Penalty |
|------------------|:-------:|
| Back-to-back     | -0.03   |
| Zero rest days   | -0.04   |

**Clutch bonus** — High-leverage situations increase shot value:

```
+0.05 if period ≥ 4 AND ≤ 120 seconds remaining AND |score_differential| ≤ 5
```

---

## Dashboard Views

### League View

Sortable stat tables replacing traditional bar charts. The **Shot Selection Leaders** table ranks players by average SQS with percentile coloring on key columns — paint frequency, three-point rate, and shooting efficiency. The **SQS vs FG% Gap** table identifies overperformers (finishing above their shot quality) and underperformers (below expected output).

### Team Defense

Teams ranked by the average Shot Quality Score they allow opponents. Lower SQS allowed means the defense forces worse shots. Includes opponent FGA, FGM, opponent FG%, and summary stat cards for best/worst defense and league averages.

### Player View

A centered search bar loads any player's game-by-game profile. Includes a scatter plot of SQS vs actual FG% per game (dot size = FGA volume, dashed lines = season averages), season summary stat pills, and a full sortable game log with rest days and back-to-back flags.

---

## Dataset

| Metric         | Value                |
|----------------|----------------------|
| Shots          | 219,527 FGA          |
| Players        | 566                  |
| Season         | 2024-25 Regular      |
| Source          | NBA Stats API        |

---

## Local Setup

### Prerequisites

- Python 3.9+
- Node.js 18+
- Google Cloud SDK (`gcloud auth application-default login`)
- A BigQuery project with billing enabled

### 1. Data Collection

```bash
pip install nba_api pandas

# Pulls all shot data + game logs, saves 3 CSVs
# Supports resume — skips already-collected players on restart
python nba_shot_data.py
```

Output: `nba_shots_2024_25.csv`, `nba_game_logs_2024_25.csv`, `nba_shots_with_rest_2024_25.csv`

### 2. Load to BigQuery

```bash
pip install google-cloud-bigquery

export GCP_PROJECT_ID=your-project-id
python load_to_bigquery.py
```

### 3. Run dbt Models

```bash
cd dbt_nba
pip install dbt-bigquery

dbt deps
dbt run      # builds dim_players, dim_teams, dim_games, fact_shots
dbt test     # validates schema contracts
```

### 4. Start Backend

```bash
cd backend
pip install -r requirements.txt

export GCP_PROJECT_ID=your-project-id
uvicorn main:app --reload --port 8000
```

API docs at `http://localhost:8000/docs`

### 5. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard at `http://localhost:5173`

---

## API Endpoints

| Method | Path                          | Description                                |
|--------|-------------------------------|--------------------------------------------|
| GET    | `/players`                    | All players with avg SQS and FG%           |
| GET    | `/players/{id}/scatter`       | Per-game SQS vs FG% for scatter plot       |
| GET    | `/team-defense`               | Teams ranked by SQS allowed                |
| GET    | `/league/top-selectors`       | Top N players by average SQS               |
| GET    | `/league/clutch`              | Biggest SQS vs FG% gaps                    |
| GET    | `/health`                     | Health check                               |

---

## Project Structure

```
├── nba_shot_data.py           # Data collection script (nba_api → CSV)
├── load_to_bigquery.py        # CSV → BigQuery loader
├── dbt_nba/                   # dbt project
│   ├── models/
│   │   ├── staging/           # stg_shots (clean + rename)
│   │   ├── intermediate/      # int_shots_enriched (zone categories, rest)
│   │   └── marts/             # dim_players, dim_teams, dim_games, fact_shots
│   └── macros/                # shot_quality_score formula
├── dags/                      # Airflow DAG
│   └── nba_ingestion_dag.py
├── backend/                   # FastAPI
│   ├── main.py
│   ├── config.py
│   ├── db.py
│   └── routers/
├── frontend/                  # React + Vite
│   ├── src/
│   │   ├── views/             # LeagueView, TeamView, PlayerView
│   │   ├── components/        # Nav, Card, SortableTable, Loader
│   │   └── api.js
│   └── vercel.json
└── README.md
```
