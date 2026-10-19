-- Reviewed catalog delta: preserve unrelated remote catalog fields and habitats.
begin;
update public.fishing_baits set price=65 where id='bait_safe';
update public.collectible_species s set size=v.size from (values
 ('diver-pongdang',86),
 ('dreaming-dumbo-octopus',86),
 ('glass-dome-barreleye',86),
 ('muk-celadon-ink-whelk',86),
 ('muk-landscape-back-carp',86),
 ('muk-screenwing-lionfish',86),
 ('muk-unfinished-carp',86),
 ('pongi-statue',86),
 ('scrap-curiosity-hermit-crab',86),
 ('scrap-garden-nudibranch',86),
 ('sleeping-survey-pod',86)
) v(id,size) where s.id=v.id;
notify pgrst,'reload schema';
commit;
