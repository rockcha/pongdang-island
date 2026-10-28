begin;
create or replace function app_private.flea_post_payload(p_id uuid) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',p.id,'owner_id',p.owner_id,'owner_name',u.nickname,'owner_avatar_path',u.avatar_path,
 'side',p.side,'title',p.title,'status',p.status,'escrow_gold',p.escrow_gold,'created_at',p.created_at,
 'items',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'asset',l.asset,'quantity',l.quantity,
 'remaining',l.remaining,'unit_price',l.unit_price) order by l.kind,l.item_id) from app_private.flea_lines l where l.post_id=p.id),'[]'::jsonb))
 from app_private.flea_posts p join public.player_profiles u on u.id=p.owner_id where p.id=p_id
$$;
notify pgrst,'reload schema';
commit;
