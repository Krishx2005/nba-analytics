# NBA Shot Quality Engine

[![Live Demo](https://img.shields.io/badge/Live%20Demo-nba--analytics--mu.vercel.app-e84d4d?style=flat-square)](https://nba-analytics-mu.vercel.app)

## What is this?

I wanted to answer a simple question: **are some NBA players just better at picking their shots?** Not who makes the most — who consistently puts themselves in the best position to score.

So I built a metric called **Shot Quality Score (SQS)** that grades every single field goal attempt in the 2024-25 NBA season based on where it was taken, how far away it was, whether the player was tired, and if the game was on the line. Then I built a full pipeline to collect the data, transform it, and display it in a dashboard you can actually explore.

The dataset covers **219,527 shots from 566 players**. All the data comes from the NBA's official stats API.

---

## How the data flows

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

The short version: a Python script hits the NBA API for every active player, pulls their shot chart and game log, and saves it all to CSV. That CSV gets uploaded to Google Cloud Storage, loaded into BigQuery, and then dbt transforms it into clean dimension and fact tables. A FastAPI backend queries those tables, and a React frontend displays everything. Airflow ties it all together so it can run on a schedule.

---

## Tech stack

| Layer            | What I used                         |
|------------------|-------------------------------------|
| Ingestion        | Python, nba_api                     |
| Orchestration    | Apache Airflow                      |
| Storage          | Google Cloud Storage                |
| Warehouse        | Google BigQuery                     |
| Transformation   | dbt                                 |
| Backend          | FastAPI, google-cloud-bigquery      |
| Frontend         | React, Vite, Recharts, Tailwind CSS |
| Hosting          | Vercel (frontend), Render (backend) |

---

## How the Shot Quality Score works

Every shot gets a score between 0 and 1. The idea is: **before we know if the shot went in, how good of a shot was it?**

### It starts with where the shot was taken

| Zone           | Base Value | Why                                           |
|----------------|:----------:|-----------------------------------------------|
| Paint          |   0.65     | Shots at the rim go in the most               |
| Corner 3       |   0.58     | Shortest 3-point shot, surprisingly efficient  |
| Above Break 3  |   0.52     | Standard three — decent expected value         |
| Mid-Range      |   0.40     | The "worst" shot in modern basketball          |

### Then it gets adjusted

```
SQS = base_value(zone)
    - distance_penalty
    - fatigue_penalty
    + clutch_bonus
```

**Distance** — A 3-footer in the paint is better than a 9-footer in the paint. For every foot past the zone's typical distance, the score drops by 0.005.

```
penalty = max(0, (shot_distance - zone_midpoint) × 0.005)
```

Zone midpoints: paint 5 ft, mid-range 15 ft, corner 3 23 ft, above break 3 25 ft.

**Fatigue** — Playing on a back-to-back is real. If a player played yesterday, the score gets a small penalty because tired players shoot worse. That's just how it works.

| Situation        | Penalty |
|------------------|:-------:|
| Back-to-back     | -0.03   |
| Zero rest days   | -0.04   |

**Clutch** — A wide-open corner 3 means more when the game is close and the clock is running out. If it's the 4th quarter or overtime, under 2 minutes left, and the score is within 5 points, the shot gets a +0.05 bump.

```
+0.05 if period ≥ 4 AND ≤ 120 seconds left AND |score_diff| ≤ 5
```

Is this formula perfect? No. But it captures something real — not all shots are created equal, and this gives us a way to compare them.

---

## The dashboard

### League View

This is where you can browse the full league. Two big sortable tables:

- **Shot Selection Leaders** — who finds the best shots? Ranked by average SQS. You can sort by any column and the key stats get color-coded by percentile (red = elite, orange = above average).
- **SQS vs FG% Gap** — this is the interesting one. Some players shoot way better than their shot quality suggests (overperformers), and some shoot way worse (underperformers). The gap tells you who's finishing above or below expectation.

### Team Defense

Every team ranked by the average SQS they *allow* opponents to get. If a team has a low SQS allowed, they're doing a good job forcing bad shots. You can see which defenses are actually good at contesting and which ones give up easy looks.

### Player View

Search for any player and get their full breakdown. There's a scatter plot showing SQS vs actual FG% for every game they played — each dot is one game, and the dot size is how many shots they took. You also get a sortable game log with rest days, back-to-back flags, and per-game shooting splits.

---

## What I learned

- **The NBA API is rate-limited and undocumented.** I had to add retries with exponential backoff and checkpoint files because the script takes 15+ minutes to run and it kept timing out halfway through.
- **dbt is great for organizing SQL.** Having staging → intermediate → mart layers made it way easier to debug when something broke in BigQuery. The SQS formula lives in a macro so I could tweak the weights without touching the model SQL.
- **Sortable tables > bar charts for this kind of data.** I originally had Recharts bar charts for everything, but when you're comparing 50+ players across 8 stats, a table with percentile coloring is just more useful.
- **Deploying a Python backend that talks to BigQuery from Render is annoying.** You can't just drop a credentials file on the server, so I had to parse the service account JSON from an environment variable at runtime.

---

## Running it locally

### You'll need

- Python 3.9+
- Node.js 18+
- Google Cloud SDK (run `gcloud auth application-default login`)
- A BigQuery project with billing enabled

### 1. Collect the data

```bash
pip install nba_api pandas

python nba_shot_data.py
```

This takes ~15 minutes. It saves 3 CSVs and supports resume if it crashes — just run it again and it picks up where it left off.

### 2. Load into BigQuery

```bash
pip install google-cloud-bigquery

export GCP_PROJECT_ID=your-project-id
python load_to_bigquery.py
```

### 3. Run dbt

```bash
cd dbt_nba
pip install dbt-bigquery

dbt deps
dbt run      # builds dim_players, dim_teams, dim_games, fact_shots
dbt test     # checks that everything looks right
```

### 4. Start the backend

```bash
cd backend
pip install -r requirements.txt

export GCP_PROJECT_ID=your-project-id
uvicorn main:app --reload --port 8000
```

API docs at `http://localhost:8000/docs`

### 5. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard at `http://localhost:5173`

---

## API endpoints

| Method | Path                          | What it returns                            |
|--------|-------------------------------|--------------------------------------------|
| GET    | `/players`                    | All players with avg SQS and FG%           |
| GET    | `/players/{id}/scatter`       | Per-game SQS vs FG% for one player         |
| GET    | `/team-defense`               | Teams ranked by SQS allowed                |
| GET    | `/league/top-selectors`       | Top N players by average SQS               |
| GET    | `/league/clutch`              | Biggest gaps between SQS and actual FG%    |
| GET    | `/health`                     | Health check                               |

---

## Project structure

```
├── nba_shot_data.py           # Pulls shot data from NBA API, saves to CSV
├── load_to_bigquery.py        # Loads CSV into BigQuery
├── dbt_nba/                   # dbt project
│   ├── models/
│   │   ├── staging/           # stg_shots — clean and rename raw columns
│   │   ├── intermediate/      # int_shots_enriched — add zone categories, rest days
│   │   └── marts/             # dim_players, dim_teams, dim_games, fact_shots
│   └── macros/                # shot_quality_score formula
├── dags/                      # Airflow DAG for nightly runs
│   └── nba_ingestion_dag.py
├── backend/                   # FastAPI app
│   ├── main.py
│   ├── config.py
│   ├── db.py
│   └── routers/
├── frontend/                  # React dashboard
│   ├── src/
│   │   ├── views/             # LeagueView, TeamView, PlayerView
│   │   ├── components/        # Nav, Card, SortableTable, Loader
│   │   └── api.js
│   └── vercel.json
└── README.md
```
