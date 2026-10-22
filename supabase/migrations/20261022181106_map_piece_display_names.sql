-- Name each rare map piece by its fixed position in the complete map.
begin;
create or replace function app_private.prepare_fishing_map_piece() returns trigger
language plpgsql security definer set search_path='' as $$
declare chosen record;pieces integer;species integer;
begin
 if not new.eligible or new.rarity<>'rare' or not coalesce((new.bait_snapshot->'target_kinds') ? 'fish',false) then return new;end if;
 select count(*) into pieces from public.fishing_map_blueprints b join public.regions r on r.id=b.region_id
 cross join lateral generate_series(1,b.piece_count) n(piece_number)
 where b.enabled and r.requires_map_fragment
 and not exists(select 1 from public.player_map_fragments f where f.user_id=new.user_id and f.region_id=b.region_id)
 and not exists(select 1 from app_private.player_fishing_map_pieces f where f.user_id=new.user_id and f.region_id=b.region_id and f.piece_number=n.piece_number);
 if pieces=0 then return new;end if;
 select count(*) into species from public.collectible_species s where s.rarity='rare'
 and (new.bait_snapshot->'target_kinds') ? s.kind::text
 and (new.bait_snapshot->>'effect_kind'<>'common_only' or not s.is_native)
 and (new.bait_snapshot->>'effect_kind'<>'undiscovered' or not exists(select 1 from public.player_discoveries d where d.user_id=new.user_id and d.species_id=s.id));
 -- Each missing piece occupies one slot in the rare catch pool, never an extra rarity roll.
 if random()*(species+pieces)>=pieces then return new;end if;
 select b.region_id,b.piece_count,b.thumbnail_path,r.name,n.piece_number into chosen
 from public.fishing_map_blueprints b join public.regions r on r.id=b.region_id
 cross join lateral generate_series(1,b.piece_count) n(piece_number)
 where b.enabled and r.requires_map_fragment
 and not exists(select 1 from public.player_map_fragments f where f.user_id=new.user_id and f.region_id=b.region_id)
 and not exists(select 1 from app_private.player_fishing_map_pieces f where f.user_id=new.user_id and f.region_id=b.region_id and f.piece_number=n.piece_number)
 order by random() limit 1;
 if not found then return new;end if;
 new.map_region_id:=chosen.region_id;new.map_piece_number:=chosen.piece_number;
 new.species_id:=null;new.rarity:='rare';
 new.snapshot:=jsonb_build_object('id','map-piece-'||chosen.region_id||'-'||chosen.piece_number,
 'kind','map','rarity','rare','name',chosen.name||'의 지도 조각 ( '||chosen.piece_number||'/'||chosen.piece_count||' )',
 'description','모든 지도 조각을 모으면 해역이 열려요. 지도에서 수집 현황을 확인하세요.',
 'thumbnail_path',chosen.thumbnail_path,'sell_price',0,'speed',0,'size',1,
 'mapPiece',true,'mapRegionId',chosen.region_id,'pieceNumber',chosen.piece_number,'pieceCount',chosen.piece_count);
 return new;
end $$;
revoke all on function app_private.prepare_fishing_map_piece() from public,anon,authenticated;
commit;
