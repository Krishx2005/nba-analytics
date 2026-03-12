/*
    Enriches staged shots with:
    - total seconds remaining in regulation
    - is_back_to_back flag
    - shot zone category for quality scoring
    - score differential (estimated from period + time context)
*/

with shots as (

    select * from {{ ref('stg_shots') }}

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
