import {readFileSync,writeFileSync} from 'node:fs'
const file=process.argv[2],plan=JSON.parse(readFileSync('artifacts/primal-expansion-plan.json','utf8')),ids=new Set(plan.map(s=>s.id))
const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
const original=readFileSync(file,'utf8');if(!original.startsWith('-- Generated from'))throw new Error('Expected generated migration')
const q=v=>v===null?'null':typeof v==='boolean'||typeof v==='number'?String(v):`'${String(v).replaceAll("'","''")}'`
const rows=catalog.collectible_species.filter(s=>ids.has(s.id)),columns=Object.keys(rows[0])
const sql=['-- Reviewed catalog diff: add 34 primal-native species only; preserve all existing species and player data.','begin;','set constraints all deferred;',
`insert into public.collectible_species (${columns.map(c=>'"'+c+'"').join(',')}) values\n${rows.map(r=>'('+columns.map(c=>q(r[c])).join(',')+')').join(',\n')}\non conflict(id) do update set ${columns.filter(c=>c!=='id').map(c=>`"${c}"=excluded."${c}"`).join(',')};`,
`delete from public.collectible_habitats where species_id in (${rows.map(r=>q(r.id)).join(',')});`,
`insert into public.collectible_habitats(species_id,region_id) values\n${rows.map(r=>`(${q(r.id)},'primal')`).join(',\n')};`,
`do $$ begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='collectible_species' and column_name='facing_direction') then
  execute ${q(`update public.collectible_species set facing_direction='right' where id in (${rows.map(r=>q(r.id)).join(',')})`)};
 end if;
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='collectible_species' and column_name='idle_animated') then
  execute ${q(`update public.collectible_species set idle_animated=true where id in (${plan.filter(s=>s.plant).map(s=>q(s.id)).join(',')})`)};
 end if;
end $$;`,"notify pgrst,'reload schema';",'commit;',''].join('\n')
writeFileSync(file,sql);console.log('Scoped migration to '+rows.length+' new species only.')
