-- Reviewed name-only projection of the scoped catalog generation. Preserve all other fields.
begin;
with renamed(id,name) as (values
('halloween-bone-armored-shark-necras','가라앉은 무덤의 파수꾼, 골갑상어 네크라스'),
('halloween-cathedral-ray-morne','달빛 성당의 마지막 수호자, 성상가오리 모르네'),
('halloween-crimson-megalodon','피의 파도를 가르는 자, 붉은 메갈로돈 크림슨'),
('halloween-dullahan-seahorse','잃어버린 새벽의 기수, 두라한 해마'),
('halloween-echo-dolphin-echomor','마지막 비명의 메아리, 유령돌고래 에코모르'),
('halloween-moonwolf-shark-lugar','보름달을 삼킨 야수, 월랑상어 루가르'),
('halloween-tomb-dragon-sahet','모래 없는 무덤의 왕, 영면룡어 사헤트'),
('halloween-witch-jellyfish-malefica','검은 마법의 속삭임, 마녀해파리 말레피카')
) update public.collectible_species s set name=r.name from renamed r where s.id=r.id and s.name is distinct from r.name;

with renamed(id,name) as (values
('halloween-bone-armored-shark-necras','가라앉은 무덤의 파수꾼, 골갑상어 네크라스'),
('halloween-cathedral-ray-morne','달빛 성당의 마지막 수호자, 성상가오리 모르네'),
('halloween-crimson-megalodon','피의 파도를 가르는 자, 붉은 메갈로돈 크림슨'),
('halloween-dullahan-seahorse','잃어버린 새벽의 기수, 두라한 해마'),
('halloween-echo-dolphin-echomor','마지막 비명의 메아리, 유령돌고래 에코모르'),
('halloween-moonwolf-shark-lugar','보름달을 삼킨 야수, 월랑상어 루가르'),
('halloween-tomb-dragon-sahet','모래 없는 무덤의 왕, 영면룡어 사헤트'),
('halloween-witch-jellyfish-malefica','검은 마법의 속삭임, 마녀해파리 말레피카')
) update public.fishing_showcase_posts p set species=jsonb_set(p.species,'{name}',to_jsonb(r.name),false) from renamed r where p.species->>'id'=r.id and p.species->>'name' is distinct from r.name;
notify pgrst, 'reload schema';
commit;
