with player_source as (

    select distinct
        player_id,
        player_name,
        team_id,
        team_name
    from `nbaanalyzer`.`nba_analytics_dev_staging`.`stg_shots`

),

player_stats as (

    select
        player_id,
        count(*)                                    as total_fga,
        sum(shot_made)                              as total_fgm,
        round(safe_divide(sum(shot_made), count(*)), 3) as fg_pct,
        count(distinct game_id)                     as games_played,
        round(avg(shot_distance), 1)                as avg_shot_distance
    from `nbaanalyzer`.`nba_analytics_dev_staging`.`stg_shots`
    group by player_id

)

select
    p.player_id,
    p.player_name,
    p.team_id,
    p.team_name,
    s.total_fga,
    s.total_fgm,
    s.fg_pct,
    s.games_played,
    s.avg_shot_distance
from player_source p
inner join player_stats s using (player_id)