/*
    fact_shots — one row per field goal attempt
    Includes shot context, fatigue metrics, and computed shot_quality_score.

    Score differential is estimated per-game using cumulative made shots
    as a proxy (true score diff requires play-by-play data).
*/

with enriched as (

    select * from {{ ref('int_shots_enriched') }}

),

-- Estimate score differential using cumulative points within each game
-- This is an approximation; true differential needs play-by-play data
game_scoring as (

    select
        *,

        -- cumulative points scored by player's team in this game up to this shot
        sum(case when shot_made = 1 then
            case when shot_type = '3PT Field Goal' then 3 else 2 end
            else 0 end)
            over (
                partition by game_id, team_id
                order by period, minutes_remaining desc, seconds_remaining desc
                rows between unbounded preceding and 1 preceding
            ) as team_pts_before,

        -- cumulative points by opposing team
        sum(case when shot_made = 1 then
            case when shot_type = '3PT Field Goal' then 3 else 2 end
            else 0 end)
            over (
                partition by game_id
                order by period, minutes_remaining desc, seconds_remaining desc
                rows between unbounded preceding and 1 preceding
            ) as game_pts_before

    from enriched

),

with_differential as (

    select
        *,
        -- score_differential = my team's points - opponent's points (approx)
        coalesce(team_pts_before, 0)
            - coalesce(game_pts_before - team_pts_before, 0)
            as score_differential
    from game_scoring

)

select
    -- keys
    shot_id,
    game_id,
    player_id,
    team_id,

    -- shot details
    shot_type,
    action_type,
    event_type,
    shot_made,
    loc_x,
    loc_y,

    -- zone & distance
    shot_distance,
    shot_zone_basic,
    shot_zone_area,
    shot_zone_range,
    shot_zone_category,

    -- timing
    period,
    minutes_remaining,
    seconds_remaining,
    total_seconds_remaining,

    -- game state
    score_differential,

    -- fatigue
    rest_days,
    is_back_to_back,

    -- shot quality score
    {{ shot_quality_score(
        'shot_zone_category',
        'shot_distance',
        'is_back_to_back',
        'rest_days',
        'total_seconds_remaining',
        'score_differential',
        'period'
    ) }} as shot_quality_score

from with_differential
