-- Apply after 41. Upload the two replacement sheets before applying.
-- Stable species IDs preserve owned individuals and discoveries.
begin;
update public.collectible_species set
 name=case id when 'pongdang-shark' then '햇물결 상어' else '물결날개 고래' end,
 description=case id when 'pongdang-shark' then '청록빛 몸 위로 햇살 같은 금빛 물결이 흐르는 상어. 꼬리와 지느러미를 힘차게 저으며 여러 바다의 따뜻한 물살을 누빈다.' else '파도처럼 유려한 지느러미와 진주빛 배를 가진 고래. 커다란 꼬리를 천천히 저으며 먼 해역까지 잔잔한 물결을 전한다.' end,
 sprite_sheet_path=case id when 'pongdang-shark' then 'fish/epic/sunwave-shark_sprite.png' else 'fish/epic/wavefin-whale_sprite.png' end,
 native_region_id=null,facing_direction='right',flip_with_direction=true
where id in ('pongdang-shark','pongdang-whale');
insert into public.collectible_habitats(species_id,region_id)
select s.id,r.id from public.collectible_species s cross join public.regions r
where s.id in ('pongdang-shark','pongdang-whale') on conflict do nothing;
commit;
