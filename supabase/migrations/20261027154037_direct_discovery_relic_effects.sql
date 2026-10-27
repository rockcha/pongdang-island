begin;

alter table public.fishing_relics drop constraint relic_effect_shape;
alter table public.fishing_relics add constraint relic_effect_shape check (
 (effect_kind='none' and effect_value=0)
 or (effect_kind in ('fuel_active_slots','bait_active_slots') and
  ((rarity='epic' and effect_value=1) or (rarity='mythic' and effect_value=2)))
 or (effect_kind='personal_bait_hours' and
  ((rarity='rare' and effect_value=2) or (rarity='epic' and effect_value=4) or (rarity='mythic' and effect_value=8)))
 or (effect_kind='fishing_wait_seconds' and
  ((rarity='rare' and effect_value=0.5) or (rarity='epic' and effect_value=1) or (rarity='mythic' and effect_value=2)))
 or (effect_kind='trap_seconds_per_bait' and
  ((rarity='rare' and effect_value=30) or (rarity='epic' and effect_value=90) or (rarity='mythic' and effect_value=180)))
 or (effect_kind='boat_discount_gold' and
  ((rarity='rare' and effect_value=50) or (rarity='epic' and effect_value=150) or (rarity='mythic' and effect_value=400)))
 or (effect_kind='bait_discount_gold' and
  ((rarity='epic' and effect_value=1) or (rarity='mythic' and effect_value=2)))
 or (effect_kind='harbor_duration_percent' and
  ((rarity='rare' and effect_value=3) or (rarity='epic' and effect_value=6) or (rarity='mythic' and effect_value=10)))
 or (effect_kind='production_auto_claim' and rarity='epic' and effect_value=1)
 or (effect_kind='pongi_whack_golden_count' and
  ((rarity='rare' and effect_value=2) or (rarity='epic' and effect_value=4) or (rarity='mythic' and effect_value=10)))
 or (effect_kind='direct_relic_chance_percent' and
  ((rarity='rare' and effect_value=1) or (rarity='epic' and effect_value=3) or (rarity='mythic' and effect_value=6)))
 or (effect_kind='direct_map_chance_percent' and
  ((rarity='rare' and effect_value=0.5) or (rarity='epic' and effect_value=2) or (rarity='mythic' and effect_value=5)))
);

-- Only discovery-enabled direct fishing calls this overload. It runs at preparation,
-- after the bait grade draw; the prepared snapshot preserves the result on retry.
-- Stable, not immutable: probabilities depend on this player's current loadout.
create or replace function app_private.fishing_reward_category(p_roll double precision,p_rarity public.game_rarity)
returns text language plpgsql stable set search_path='' as $function$
declare
 v_relic_chance numeric:=case p_rarity when 'epic' then 0.05 when 'mythic' then 0.10 else 0.03 end;
 v_map_chance numeric:=0.03;
begin
 if p_roll is null or not (p_roll>=0 and p_roll<1) then raise exception 'INVALID_REWARD_ROLL';end if;
 if p_rarity is null then raise exception 'INVALID_REWARD_RARITY';end if;
 v_relic_chance:=v_relic_chance+app_private.relic_bonus('direct_relic_chance_percent')/100;
 v_map_chance:=v_map_chance+app_private.relic_bonus('direct_map_chance_percent')/100;
 -- Disjoint ranges: increasing one category never consumes the other's interval.
 -- Missing candidates still fall back to ordinary rewards in prepare_discovery_cast.
 return case when p_roll<(1-v_relic_chance-v_map_chance)::double precision then 'ordinary'
  when p_roll<(1-v_relic_chance)::double precision then 'map' else 'relic' end;
end $function$;
revoke all on function app_private.fishing_reward_category(double precision,public.game_rarity) from public,anon,authenticated;

notify pgrst,'reload schema';
commit;
