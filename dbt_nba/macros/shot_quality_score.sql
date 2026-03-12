/*
    Shot Quality Score formula:
    Base value by zone, adjusted for distance, fatigue, and clutch context.

    Zone base values (league-avg eFG approximations):
      paint:         0.65
      corner_3:      0.58
      above_break_3: 0.52
      midrange:      0.40

    Adjustments:
      distance:  penalty for shots farther from basket within zone
      fatigue:   penalty for back-to-back / low rest
      clutch:    bonus for shots in final 2 min of 4Q/OT with <=5 pt differential
*/

{% macro shot_quality_score(
    shot_zone_category,
    shot_distance,
    is_back_to_back,
    rest_days,
    total_seconds_remaining,
    score_differential,
    period
) %}

    round(cast(
        -- zone base value
        case {{ shot_zone_category }}
            when 'paint'         then 0.65
            when 'corner_3'      then 0.58
            when 'above_break_3' then 0.52
            when 'midrange'      then 0.40
            when 'backcourt'     then 0.05
            else 0.35
        end

        -- distance adjustment: -0.005 per foot beyond zone midpoint
        - greatest(0.0, ({{ shot_distance }} - case {{ shot_zone_category }}
            when 'paint'         then 5
            when 'midrange'      then 15
            when 'corner_3'      then 23
            when 'above_break_3' then 25
            else 20
        end) * 0.005)

        -- fatigue adjustment
        - case
            when {{ is_back_to_back }} then 0.03
            when coalesce({{ rest_days }}, 2) = 0 then 0.04
            else 0.0
        end

        -- clutch bonus: final 2 min of 4Q/OT, game within 5 pts
        + case
            when {{ period }} >= 4
                 and {{ total_seconds_remaining }} <= 120
                 and abs(coalesce({{ score_differential }}, 0)) <= 5
            then 0.05
            else 0.0
        end

    as float64), 4)

{% endmacro %}
