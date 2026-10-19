-- Catalog review: deploy only the requested size changes, preserving remote-only species and all other values.
-- Values are generated from supabase/catalog/catalog.json after db:catalog generation.
update public.collectible_species s set size=v.size
from (values
 ('aurora-eel',94),
 ('blue-scaled-mahi-mahi',86),
 ('cloud-cloud-boat-no-face',94),
 ('cloud-cloud-umbrella-totoro',98),
 ('cloud-lantern-no-face',86),
 ('cloud-lotus-umbrella-river-spirit',98),
 ('cloud-wave-calling-ponyo',94),
 ('coral-crowned-turtle',86),
 ('diver-pongdang',52),
 ('dreaming-dumbo-octopus',61),
 ('glass-dome-barreleye',65),
 ('living-fossil-coelacanth',94),
 ('meteor-tentacle-squid',96),
 ('muk-celadon-ink-whelk',54),
 ('muk-landscape-back-carp',72),
 ('muk-screenwing-lionfish',72),
 ('muk-unfinished-carp',72),
 ('night-pouch-gulper-eel',94),
 ('scrap-abandoned-survey-robot',92),
 ('scrap-curiosity-hermit-crab',77),
 ('scrap-garden-nudibranch',58),
 ('scrap-sunken-orchestra-octopus',94),
 ('star-ray',86),
 ('starpattern-manta',101),
 ('violet-longlure-angler',86)
) as v(id,size) where s.id=v.id;
