from fastapi import APIRouter

from db import run_query
from config import FACT_SHOTS, DIM_TEAMS

router = APIRouter(prefix="/team-defense", tags=["teams"])


@router.get("")
def team_defense_ranking():
    """
    Teams ranked by average shot_quality_score they ALLOW opponents.
    Lower avg_sqs_allowed = better defense (forces worse shots).
    """
    sql = f"""
        with opponent_shots as (
            select
                f.game_id,
                f.team_id as shooting_team_id,
                f.shot_quality_score,
                f.shot_made
            from {FACT_SHOTS} f
        ),
        -- For each shot, find the opposing team in that game
        game_teams as (
            select distinct game_id, team_id
            from {FACT_SHOTS}
        ),
        defense as (
            select
                gt.team_id as defending_team_id,
                os.shot_quality_score,
                os.shot_made
            from opponent_shots os
            inner join game_teams gt
                on os.game_id = gt.game_id
                and os.shooting_team_id != gt.team_id
        )
        select
            dt.team_id,
            dt.team_name,
            count(*)                                          as opponent_fga,
            sum(d.shot_made)                                  as opponent_fgm,
            round(safe_divide(sum(d.shot_made), count(*)), 4) as opponent_fg_pct,
            round(avg(d.shot_quality_score), 4)               as avg_sqs_allowed
        from defense d
        inner join {DIM_TEAMS} dt
            on d.defending_team_id = dt.team_id
        group by dt.team_id, dt.team_name
        order by avg_sqs_allowed asc
    """
    return run_query(sql)
