import {readFileSync,writeFileSync} from 'node:fs'
const ids=['pongdang','coral','bluegrove','mistmoon','whitenight','starruins','primal','dreamabyss']
const list=ids.map(id=>`'${id}'`).join(',')
const vacate=`update public.regions set sort_order=sort_order+1000 where id in (${list});`
const assign=`update public.regions set sort_order=case id\n${ids.map((id,i)=>` when '${id}' then ${i+1}`).join('\n')} end where id in (${list});`
let body=readFileSync('supabase/migrations/20261017060959_whitenight_region_catalog.sql','utf8').replace(/^begin;\r?\n/m,'').replace(/^commit;\r?\n?/m,'')
// Local expected metadata can differ from the target DB. Never add a second
// habitat to a species that the target currently designates as native.
const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
const candidates=catalog.collectible_habitats.filter(h=>h.region_id==='whitenight').map(h=>`'${h.species_id.replaceAll("'","''")}'`).join(',')
const habitats=`insert into public.collectible_habitats(species_id,region_id)\nselect s.id,'whitenight' from public.collectible_species s\nwhere s.id in (${candidates})\n and s.native_region_id is null and s.kind<>'map'\non conflict do nothing;`
body=body.replace(/insert into public\.collectible_habitats\(species_id,region_id\) values[\s\S]*?on conflict do nothing;/,habitats)
const upgrade=[
 '-- EXISTING map shop only: safely add White-night and update order. No CREATE TABLE.',
 '-- Can be rerun. Existing maps, gold and ownership are preserved.',
 'begin;',
 "do $$begin if to_regclass('public.region_maps') is null then raise exception 'Install map_shop_routes migration first';end if;end $$;",
 vacate,body,vacate,assign,'commit;',''
].join('\n')
writeFileSync('artifacts/whitenight-install.sql',upgrade)
writeFileSync('artifacts/map-shop-install.sql',upgrade)
