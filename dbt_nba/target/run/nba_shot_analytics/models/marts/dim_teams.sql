
  
    

    create or replace table `nbaanalyzer`.`nba_analytics_dev_analytics`.`dim_teams`
      
    
    

    
    OPTIONS()
    as (
      with team_source as (

    select distinct
        team_id,
        team_name
    from `nbaanalyzer`.`nba_analytics_dev_staging`.`stg_shots`
    where team_id is not null

),

team_stats as (

    select
        team_id,
        count(*)                                    as team_fga,
        sum(shot_made)                              as team_fgm,
        round(safe_divide(sum(shot_made), count(*)), 3) as team_fg_pct,
        count(distinct player_id)                   as roster_size,
        count(distinct game_id)                     as games_played,
        round(avg(shot_distance), 1)                as avg_shot_distance
    from `nbaanalyzer`.`nba_analytics_dev_staging`.`stg_shots`
    group by team_id

)

select
    t.team_id,
    t.team_name,
    s.team_fga,
    s.team_fgm,
    s.team_fg_pct,
    s.roster_size,
    s.games_played,
    s.avg_shot_distance
from team_source t
inner join team_stats s using (team_id)
    );
  