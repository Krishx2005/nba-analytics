# NBA Shot Quality Engine

Live at https://nba-analytics-mu.vercel.app

This is a full-stack analytics project that scores every field goal attempt in the 2024-25 NBA season. I built a metric called Shot Quality Score (SQS) that rates each shot from 0 to 1 based on where it was taken, how far from the basket, whether the player was on a back-to-back, and if it was a clutch situation. The idea is to separate shot selection from shot making — who finds good looks vs who just happens to make tough ones.

The scoring starts with a base value by zone (paint: 0.65, corner 3: 0.58, above the break 3: 0.52, mid-range: 0.40), then adjusts down for distance beyond the zone midpoint (-0.005 per foot), down for fatigue on back-to-backs (-0.03), and up for clutch situations in the final two minutes of close games (+0.05). It's not perfect but it captures real differences in shot quality across players and teams.

The data pipeline pulls from the NBA stats API using nba_api, collects shot charts and game logs for every active player, and merges in rest days. That lands in BigQuery as raw data, then dbt transforms it into dimension tables (players, teams, games) and a fact table with the SQS calculation baked into a reusable macro. An Airflow DAG ties the nightly ingestion together. The backend is FastAPI querying BigQuery, and the frontend is React with Vite and Tailwind, styled after databallr with sortable stat tables and percentile coloring.

The dataset is 219,527 shots across 566 players.

Tech stack: Python, nba_api, Airflow, Google Cloud Storage, BigQuery, dbt, FastAPI, React, Vite, Recharts, Tailwind. Hosted on Vercel and Render.

The dashboard has three views. League view shows shot selection leaders and a table of players who over or underperform their shot quality. Team defense view ranks every team by the average SQS they allow opponents. Player view lets you search any player and see a scatter plot of their SQS vs FG% game by game, plus a full sortable game log.

## Running locally

You need Python 3.9+, Node 18+, and a BigQuery project. Run `gcloud auth application-default login` first.

```
pip install nba_api pandas
python nba_shot_data.py

export GCP_PROJECT_ID=your-project-id
pip install google-cloud-bigquery
python load_to_bigquery.py

cd dbt_nba
pip install dbt-bigquery
dbt deps && dbt run && dbt test

cd ../backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

cd ../frontend
npm install
npm run dev
```

The data collection script takes about 15 minutes and supports resume if it gets interrupted. Backend serves at localhost:8000/docs, frontend at localhost:5173.
