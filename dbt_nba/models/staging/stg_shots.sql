with source as (

    select * from {{ source('nba_raw', 'shots_with_rest') }}

),

renamed as (

    select
        -- identifiers
        {{ dbt_utils.generate_surrogate_key(['GAME_ID', 'GAME_EVENT_ID', 'PLAYER_ID']) }}
            as shot_id,
        cast(GAME_ID as string)     as game_id,
        cast(PLAYER_ID as int64)    as player_id,
        PLAYER_NAME                 as player_name,
        cast(TEAM_ID as int64)      as team_id,
        TEAM_NAME                   as team_name,

        -- game context
        GAME_DATE                   as game_date,
        HTM                         as home_team_abbr,
        VTM                         as away_team_abbr,

        -- shot location
        cast(LOC_X as float64)      as loc_x,
        cast(LOC_Y as float64)      as loc_y,
        cast(SHOT_DISTANCE as int64) as shot_distance,

        -- shot classification
        SHOT_TYPE                   as shot_type,
        SHOT_ZONE_BASIC             as shot_zone_basic,
        SHOT_ZONE_AREA              as shot_zone_area,
        SHOT_ZONE_RANGE             as shot_zone_range,
        ACTION_TYPE                 as action_type,
        EVENT_TYPE                  as event_type,

        -- timing
        cast(PERIOD as int64)       as period,
        cast(MINUTES_REMAINING as int64)  as minutes_remaining,
        cast(SECONDS_REMAINING as int64)  as seconds_remaining,

        -- outcome
        cast(SHOT_MADE_FLAG as int64)      as shot_made,
        cast(SHOT_ATTEMPTED_FLAG as int64) as shot_attempted,

        -- rest / fatigue
        cast(REST_DAYS as float64)  as rest_days

    from source

)

select * from renamed
