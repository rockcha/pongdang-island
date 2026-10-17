import {readFileSync,writeFileSync} from 'node:fs'
const file='supabase/migrations/20261017093723_scrap_isle_region_and_species.sql'
if(!readFileSync(file,'utf8').startsWith('-- Generated from'))throw Error('Generate into the fresh CLI migration with db:catalog first')
const c=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8')),{species:plan}=JSON.parse(readFileSync('artifacts/scrapisle-plan.json','utf8')),ids=new Set(plan.map(s=>s.id)),rows=c.collectible_species.filter(s=>ids.has(s.id))
const q=v=>v===null?'null':typeof v==='number'||typeof v==='boolean'?String(v):"'"+String(v).replaceAll("'","''")+"'"
function upsert(table,rows,key='id'){const cols=Object.keys(rows[0]);return `insert into public.${table} (${cols.map(k=>'"'+k+'"').join(',')}) values\n${rows.map(r=>'('+cols.map(k=>q(r[k])).join(',')+')').join(',\n')}\non conflict(${key}) do update set ${cols.filter(k=>k!==key).map(k=>`"${k}"=excluded."${k}"`).join(',')};`}
const picker=`create or replace function app_private.pick_regional_collectible(p_region_id text,p_rarity public.game_rarity,p_decoration boolean,p_map_roll integer)
returns table(species_id text,map_region_id text) language plpgsql set search_path='' as $$
declare v_objects boolean;
begin
 if p_map_roll is null or p_map_roll<0 or p_map_roll>=10000 then raise exception 'INVALID_ROLL';end if;
 if p_region_id='scrapisle' and not p_decoration then
  -- Objects on80% of ordinary rolls; fall back within the same tier if pool absent.
  v_objects:=random()<0.8;
  return query select s.id,null::text from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id
  where h.region_id=p_region_id and s.rarity=p_rarity and s.kind in('fish','trash','decoration')
  order by case when (s.kind in('trash','decoration'))=v_objects then 0 else 1 end,random() limit 1;
 else
  return query select s.id,null::text from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id
  where h.region_id=p_region_id and ((p_decoration and s.kind='decoration') or (not p_decoration and s.kind in('fish','trash') and s.rarity=p_rarity))
  order by random() limit 1;
 end if;
end $$;`
const sql=['-- Reviewed diff: Scrap Isle region, map, rod,26 exclusive collectibles and region-scoped object-heavy fishing.','begin;','set constraints all deferred;',upsert('regions',c.regions.filter(r=>r.id==='scrapisle')),upsert('region_maps',c.region_maps.filter(r=>r.region_id==='scrapisle'),'region_id'),upsert('fishing_rods',[{id:'scrapisle',name:'녹빛 고철 낚싯대',price:1500,region_id:'scrapisle',failure_reduction_bp:200,native_bonus_bp:200}]),upsert('collectible_species',rows),`delete from public.collectible_habitats where species_id in (${rows.map(s=>q(s.id)).join(',')});`,`insert into public.collectible_habitats(species_id,region_id) values\n${rows.map(s=>`(${q(s.id)},'scrapisle')`).join(',\n')};`,
`do $$begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='collectible_species' and column_name='facing_direction') then execute ${q("update public.collectible_species set facing_direction='right' where id in ("+rows.map(s=>q(s.id)).join(',')+")")};end if;
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='collectible_species' and column_name='idle_animated') then execute ${q("update public.collectible_species set idle_animated=true where id in ("+plan.filter(s=>s.kind==='fish'&&s.movement==='fixed').map(s=>q(s.id)).join(',')+")")};end if;
end $$;`,picker,"notify pgrst,'reload schema';",'commit;',''].join('\n')
writeFileSync(file,sql);writeFileSync('artifacts/scrapisle-install.sql',sql);console.log('Scoped migration ready:26 new species,1 region,1 map,1 rod, existing rows preserved.')
