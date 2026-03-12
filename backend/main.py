"""
NBA Shot Analytics API
Serves pre-computed dbt mart tables from BigQuery.
"""

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from routers import players, teams, league

app = FastAPI(
    title="NBA Shot Analytics API",
    description="Shot quality scores, player efficiency, and team defense metrics — 2024-25 season",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://*.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(players.router)
app.include_router(teams.router)
app.include_router(league.router)


@app.get("/health")
def health():
    return {"status": "ok"}
