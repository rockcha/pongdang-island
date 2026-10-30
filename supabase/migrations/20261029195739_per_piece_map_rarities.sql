begin;
-- NULL keeps every existing region's blueprint-wide grade unchanged.
alter table public.fishing_map_blueprints add column piece_rarities jsonb;
alter table public.fishing_map_blueprints add constraint fishing_map_piece_rarities_valid
 check(piece_rarities is null or (jsonb_typeof(piece_rarities)='array'
 and jsonb_array_length(piece_rarities)=piece_count
 and piece_rarities <@ '["common","rare","epic","mythic"]'::jsonb));

create or replace function app_private.fishing_discovery_candidates(p_rarity public.game_rarity)
returns table(category text,reward_id text,region_id text,piece_number integer)
language sql stable set search_path='' as $function$
 select 'map'::text,'map-piece-'||b.region_id||'-'||n.piece_number,b.region_id,n.piece_number
 from public.fishing_map_blueprints b join public.regions r on r.id=b.region_id
 cross join lateral generate_series(1,b.piece_count) n(piece_number)
 where b.enabled and r.requires_map_fragment
 and coalesce((b.piece_rarities->>(n.piece_number-1))::public.game_rarity,b.rarity)=p_rarity
 and not exists(select 1 from public.player_map_fragments f where f.user_id=auth.uid() and f.region_id=b.region_id)
 and not exists(select 1 from app_private.player_fishing_map_pieces f where f.user_id=auth.uid()
  and f.region_id=b.region_id and f.piece_number=n.piece_number)
 union all
 select 'relic',r.id,null::text,null::integer from public.fishing_relics r
 where r.enabled and r.rarity=p_rarity
$function$;

create or replace function app_private.fishing_map_piece_payload(p_region text,p_piece integer,p_user uuid)
returns jsonb language sql stable set search_path='' as $function$
 select jsonb_build_object('id','map-piece-'||b.region_id||'-'||p_piece,'kind','map',
 'rarity',coalesce((b.piece_rarities->>(p_piece-1))::public.game_rarity,b.rarity),
 'name',r.name||'의 '||p_piece||'번째 조각 ('||progress.found||'/'||b.piece_count||')',
 'description','모든 지도 조각을 모으면 해역이 열려요. 지도와 도감에서 수집 현황을 확인하세요.',
 'thumbnail_path',b.thumbnail_path,'sell_price',0,'speed',0,'size',1,'swim_y_min',null,'swim_y_max',null,
 'sprite_sheet_path',null,'movement_type','fixed','is_native',false,'native_region_id',null,
 'mapPiece',true,'mapRegionId',b.region_id,'pieceNumber',p_piece,'pieceCount',b.piece_count,
 'pieceFoundCount',progress.found)
 from public.fishing_map_blueprints b join public.regions r on r.id=b.region_id
 cross join lateral (select count(*)::integer found from app_private.player_fishing_map_pieces f
  where f.user_id=p_user and f.region_id=b.region_id) progress
 where b.region_id=p_region and p_piece between 1 and b.piece_count
$function$;

create or replace function app_private.region_map()
returns jsonb language plpgsql security definer set search_path='' as $function$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 insert into public.player_navigation(user_id) values(v_uid) on conflict do nothing;
 return jsonb_build_object('currentRegion',(select region_id from public.player_navigation where user_id=v_uid),
 'canTestLocks',coalesce((select test_lock_controls from app_private.region_settings where id),false),
 'regions',(select jsonb_agg((to_jsonb(r)-'rarity')||jsonb_build_object('map_image_path',coalesce(b.thumbnail_path,m.thumbnail_path),
 'unlocked',not r.requires_map_fragment or f.region_id is not null,'hasFragment',f.region_id is not null,
 'mapPieceCount',b.piece_count,'mapPieceRarities',case when b.region_id is not null then
 coalesce(b.piece_rarities,to_jsonb(array_fill(b.rarity,array[b.piece_count]))) end,
 'mapPieces',(select coalesce(jsonb_agg(p.piece_number order by p.piece_number),'[]'::jsonb)
 from app_private.player_fishing_map_pieces p where p.user_id=v_uid and p.region_id=r.id)) order by r.sort_order)
 from public.regions r left join public.player_map_fragments f on f.region_id=r.id and f.user_id=v_uid
 left join public.region_maps m on m.region_id=r.id left join public.fishing_map_blueprints b on b.region_id=r.id));
end $function$;
notify pgrst,'reload schema';
commit;
