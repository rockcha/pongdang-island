-- Mythic sizes from catalog; four retained remote species use explicit values.
begin;
update public.collectible_species s set size=v.size from (values
('atlantean-sentinel',132),
('bluegrove-changryu-thousand-currents',186),
('cloud-howl-moving-castle',168),
('extinction-defying-megalodon',186),
('god-devouring-leviathan',180),
('horizon-whale',162),
('mammor-frozen-memory',168),
('muk-hyeonmu',174),
('name-eating-conch',114),
('never-return-ghost-ship',178),
('nivella-snowflake-dancer',150),
('obel-sunken-crown',126),
('orpheon-abyssal-hymn',168),
('plios-blackwave-king',174),
('pongi-exploration-robot',192),
('primordial-amethyst-heart',132),
('scrap-greenark-last-collector',174),
('seila-white-sail-guardian',162),
('shared-cheolgak-sunken-harbor',180),
('shared-maru-returning-wave',162),
('shared-yurion-bottled-sea',178),
('siren-siren-last-song',192),
('siren-skalla-six-shadows',209),
('star-swallowing-priest',144),
('three-faced-oracle-fish',132),
('unmong-cloud-weaver',150),
('violiss-amethyst-trench',174),
('ancient-coral-giant-crab',158),
('dawn-narwhal',192),
('lunea-mistmoon-goddess',173),
('pongi-explorer',211)
) v(id,size) where s.id=v.id and s.rarity='mythic';
notify pgrst, 'reload schema';
commit;
