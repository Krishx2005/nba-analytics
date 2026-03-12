
  
    

    create or replace table `nbaanalyzer`.`nba_analytics_dev_analytics`.`dim_games`
      
    
    

    
    OPTIONS()
    as (
      with game_shots as (

    select
        game_id,
        game_date,
        home_team_abbr,
        away_team_abbr,
        count(*)                                    as total_fga,
        sum(shot_made)                              as total_fgm,
        round(safe_divide(sum(shot_made), count(*)), 3) as game_fg_pct,
        count(distinct player_id)                   as players_count,
        max(period)                                 as final_period,
        round(avg(shot_distance), 1)                as avg_shot_distance
    from `nbaanalyzer`.`nba_analytics_dev_staging`.`stg_shots`
    group by game_id, game_date, home_team_abbr, away_team_abbr

)

select
    game_id,
    parse_date('%Y%m%d', game_date) as game_date,
    home_team_abbr,
    away_team_abbr,
    case when final_period > 4 then true else false end as went_to_overtime,
    final_period,
    total_fga,
    total_fgm,
    game_fg_pct,
    players_count,
    avg_shot_distance
from game_shots
    );
  