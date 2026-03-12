
  
    

    create or replace table `nbaanalyzer`.`nba_analytics_dev_analytics`.`fact_shots`
      
    
    

    
    OPTIONS()
    as (
      /*
    fact_shots — one row per field goal attempt
    Includes shot context, fatigue metrics, and computed shot_quality_score.

    Score differential is estimated per-game using cumulative made shots
    as a proxy (true score diff requires play-by-play data).
*/

with  __dbt__cte__int_shots_enriched as (
/*
    Enriches staged shots with:
    - total seconds remaining in regulation
    - is_back_to_back flag
    - shot zone category for quality scoring
    - score differential (estimated from period + time context)
*/

with shots as (

    select * from `nbaanalyzer`.`nba_analytics_dev_staging`.`stg_shots`

),

game_context as (

    -- derive per-player back-to-back from rest_days
    select
        *,

        -- total seconds left in regulation (periods 1-4 are 12 min each)
        case
            when period <= 4
                then (4 - period) * 720 + minutes_remaining * 60 + seconds_remaining
            else minutes_remaining * 60 + seconds_remaining  -- OT: just remaining time
        end as total_seconds_remaining,

        -- back-to-back: played yesterday (rest_days = 1)
        case when rest_days = 1 then true else false end as is_back_to_back,

        -- normalize zone names to scoring categories
        case
            when shot_zone_basic in ('Restricted Area', 'In The Paint (Non-RA)')
                then 'paint'
            when shot_zone_basic = 'Mid-Range'
                then 'midrange'
            when shot_zone_basic in ('Left Corner 3', 'Right Corner 3')
                then 'corner_3'
            when shot_zone_basic = 'Above the Break 3'
                then 'above_break_3'
            when shot_zone_basic = 'Backcourt'
                then 'backcourt'
            else 'other'
        end as shot_zone_category

    from shots

)

select * from game_context
), enriched as (

    select * from __dbt__cte__int_shots_enriched

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
    

    round(cast(
        -- zone base value
        case shot_zone_category
            when 'paint'         then 0.65
            when 'corner_3'      then 0.58
            when 'above_break_3' then 0.52
            when 'midrange'      then 0.40
            when 'backcourt'     then 0.05
            else 0.35
        end

        -- distance adjustment: -0.005 per foot beyond zone midpoint
        - greatest(0.0, (shot_distance - case shot_zone_category
            when 'paint'         then 5
            when 'midrange'      then 15
            when 'corner_3'      then 23
            when 'above_break_3' then 25
            else 20
        end) * 0.005)

        -- fatigue adjustment
        - case
            when is_back_to_back then 0.03
            when coalesce(rest_days, 2) = 0 then 0.04
            else 0.0
        end

        -- clutch bonus: final 2 min of 4Q/OT, game within 5 pts
        + case
            when period >= 4
                 and total_seconds_remaining <= 120
                 and abs(coalesce(score_differential, 0)) <= 5
            then 0.05
            else 0.0
        end

    as float64), 4)

 as shot_quality_score

from with_differential
    );
  