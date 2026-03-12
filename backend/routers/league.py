from fastapi import APIRouter, Query
from google.cloud import bigquery

from db import run_query
from config import FACT_SHOTS, DIM_PLAYERS, MIN_FGA

router = APIRouter(prefix="/league", tags=["league"])


@router.get("/top-selectors")
def top_shot_selectors(
    limit: int = Query(default=20, ge=1, le=100),
    min_fga: int = Query(default=MIN_FGA, description="Minimum FGA to qualify"),
):
    """
    Top N players by average shot_quality_score.
    These players consistently find the highest-value shots.
    """
    sql = f"""
        select
            p.player_id,
            p.player_name,
            p.team_name,
            p.total_fga,
            p.fg_pct,
            p.games_played,
            round(avg(f.shot_quality_score), 4) as avg_sqs,
            round(avg(f.shot_distance), 1)      as avg_distance,
            round(safe_divide(
                countif(f.shot_zone_category = 'paint'),
                count(*)
            ), 3)                                as paint_pct,
            round(safe_divide(
                countif(f.shot_zone_category in ('corner_3', 'above_break_3')),
                count(*)
            ), 3)                                as three_pt_pct
        from {DIM_PLAYERS} p
        inner join {FACT_SHOTS} f using (player_id)
        where p.total_fga >= @min_fga
        group by
            p.player_id, p.player_name, p.team_name,
            p.total_fga, p.fg_pct, p.games_played
        order by avg_sqs desc
        limit @limit
    """
    params = [
        bigquery.ScalarQueryParameter("min_fga", "INT64", min_fga),
        bigquery.ScalarQueryParameter("limit", "INT64", limit),
    ]
    return run_query(sql, params)


@router.get("/clutch")
def clutch_gap(
    min_fga: int = Query(default=MIN_FGA, description="Minimum FGA to qualify"),
    limit: int = Query(default=25, ge=1, le=100),
):
    """
    Players with the biggest gap between SQS and actual FG%.

    - Positive gap (fg_pct > avg_sqs): overperforming shot quality — clutch finishers
    - Negative gap (fg_pct < avg_sqs): underperforming shot quality — unlucky or poor finishing
    """
    sql = f"""
        with player_metrics as (
            select
                p.player_id,
                p.player_name,
                p.team_name,
                p.total_fga,
                p.fg_pct,
                p.games_played,
                round(avg(f.shot_quality_score), 4) as avg_sqs
            from {DIM_PLAYERS} p
            inner join {FACT_SHOTS} f using (player_id)
            where p.total_fga >= @min_fga
            group by
                p.player_id, p.player_name, p.team_name,
                p.total_fga, p.fg_pct, p.games_played
        )
        select
            *,
            round(fg_pct - avg_sqs, 4) as sqs_gap,
            case
                when fg_pct - avg_sqs > 0.03 then 'overperformer'
                when fg_pct - avg_sqs < -0.03 then 'underperformer'
                else 'neutral'
            end as label
        from player_metrics
        order by abs(fg_pct - avg_sqs) desc
        limit @limit
    """
    params = [
        bigquery.ScalarQueryParameter("min_fga", "INT64", min_fga),
        bigquery.ScalarQueryParameter("limit", "INT64", limit),
    ]
    return run_query(sql, params)
