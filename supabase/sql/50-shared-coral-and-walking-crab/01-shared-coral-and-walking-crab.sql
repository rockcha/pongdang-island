-- Apply after 49. Upload assets/storage-upload/new/20261015-195827/ first.
-- Repeatable. Keeps species IDs, ownership, discoveries and placed individuals.
begin;
update public.collectible_species set native_region_id=null,
 description=case id
 when 'coralfan-butterflyfish' then '둥근 몸에 살구빛과 민트빛 무늬가 부채처럼 겹친다. 넓은 지느러미를 꽃잎처럼 펼치며 여러 바다의 물살을 누빈다.'
 when 'crimson-fin-seabream' then '크림빛 몸을 따라 붉은 꽃잎 같은 지느러미가 펼쳐진다. 잔잔한 물살 위를 지나면 붉은 꽃 한 송이가 흘러가는 듯하다.'
 when 'rubyeye-moray' then '짙은 청록빛 몸과 홍옥 같은 눈동자를 가진 곰치. 살구색 등지느러미를 길게 펼치며 여러 바다의 바위 그늘을 지난다.'
 when 'flowerveil-jellyfish' then '겹겹의 살구빛 꽃잎 같은 종 아래로 진주빛 촉수가 흐른다. 안쪽의 은은한 빛이 고요한 바닷길을 밝힌다.'
 end
where id in ('coralfan-butterflyfish','crimson-fin-seabream','rubyeye-moray','flowerveil-jellyfish') and kind='fish';

-- Clear native metadata before adding habitats: native species must have exactly one.
insert into public.collectible_habitats(species_id,region_id)
select s.id,r.id from public.collectible_species s cross join public.regions r
where s.id in ('coralfan-butterflyfish','crimson-fin-seabream','rubyeye-moray','flowerveil-jellyfish') and s.kind='fish'
on conflict(species_id,region_id) do nothing;

update public.collectible_species
set movement_type='crawl',speed=0.01,swim_y_min=0.84,swim_y_max=0.94,
 flip_with_direction=true,travel_direction='both',facing_direction='right',idle_animated=false,
 sprite_sheet_path='fish/mythic/ancient-coral-giant-crab-walk_sprite.png',
 description='천년 동안 자란 산호 군락을 등에 품은 거대한 게. 묵직한 다리로 여울 바닥을 천천히 걷고 커다란 집게발로 길을 살핀다.'
where id='ancient-coral-giant-crab' and kind='fish';
notify pgrst,'reload schema';
commit;

select s.id,s.name,s.rarity,s.is_native,s.native_region_id,s.movement_type,s.speed,s.description,
 array_agg(h.region_id order by h.region_id) habitats
from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id
where s.id in ('coralfan-butterflyfish','crimson-fin-seabream','rubyeye-moray','flowerveil-jellyfish','ancient-coral-giant-crab')
group by s.id order by s.id;
