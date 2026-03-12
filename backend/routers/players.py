from fastapi import APIRouter, Query
from google.cloud import bigquery

from db import run_query
from config import FACT_SHOTS, DIM_PLAYERS, DIM_GAMES, MIN_FGA

router = APIRouter(prefix="/players", tags=["players"])


@router.get("")
def list_players(
    min_fga: int = Query(default=MIN_FGA, description="Minimum FGA to include"),
    sort_by: str = Query(default="avg_sqs", enum=["avg_sqs", "fg_pct", "total_fga", "player_name"]),
    order: str = Query(default="desc", enum=["asc", "desc"]),
):
    """
    All players with average shot_quality_score and actual FG%.
    Only includes players with at least `min_fga` attempts.
    """
    sql = f"""
        select
            p.player_id,
            p.player_name,
            p.team_name,
            p.total_fga,
            p.total_fgm,
            p.fg_pct,
            p.games_played,
            round(avg(f.shot_quality_score), 4) as avg_sqs
        from {DIM_PLAYERS} p
        inner join {FACT_SHOTS} f using (player_id)
        where p.total_fga >= @min_fga
        group by
            p.player_id, p.player_name, p.team_name,
            p.total_fga, p.total_fgm, p.fg_pct, p.games_played
        order by {sort_by} {order}
    """
    params = [bigquery.ScalarQueryParameter("min_fga", "INT64", min_fga)]
    return run_query(sql, params)


@router.get("/{player_id}/scatter")
def player_scatter(player_id: int):
    """
    Per-game SQS vs actual FG% for a single player.
    Returns one row per game for scatter plot visualization.
    """
    sql = f"""
        select
            f.game_id,
            g.game_date,
            g.home_team_abbr || ' vs ' || g.away_team_abbr as matchup,
            count(*)                                         as fga,
            sum(f.shot_made)                                 as fgm,
            round(safe_divide(sum(f.shot_made), count(*)), 4) as game_fg_pct,
            round(avg(f.shot_quality_score), 4)              as game_avg_sqs,
            logical_or(f.is_back_to_back)                    as is_back_to_back,
            round(avg(f.rest_days), 1)                       as rest_days
        from {FACT_SHOTS} f
        inner join {DIM_GAMES} g using (game_id)
        where f.player_id = @player_id
        group by f.game_id, g.game_date, g.home_team_abbr, g.away_team_abbr
        order by g.game_date
    """
    params = [bigquery.ScalarQueryParameter("player_id", "INT64", player_id)]
    return run_query(sql, params)
