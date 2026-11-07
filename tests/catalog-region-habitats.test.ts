// @vitest-environment node
import {expect,it} from 'vitest'
import {PGlite} from '@electric-sql/pglite'
import {catalogSql} from '../scripts/db/catalog.mjs'

const catalog={formatVersion:1,regions:[{id:'hologram',name:'Hologram'},{id:'old',name:'Old'}],collectible_species:[{id:'new-fish',kind:'fish',sell_price:65},{id:'shared',kind:'decoration',sell_price:40}],collectible_habitats:[{species_id:'new-fish',region_id:'hologram'},{species_id:'shared',region_id:'old'},{species_id:'shared',region_id:'hologram'}]}
it('adds a shared habitat idempotently without changing existing species or remote-only habitats',async()=>{
 const db=new PGlite()
 try{
  await db.exec(`create table public.regions(id text primary key,name text);create table public.collectible_species(id text primary key,kind text,sell_price integer);create table public.collectible_habitats(species_id text references public.collectible_species(id),region_id text references public.regions(id),primary key(species_id,region_id));insert into public.regions values('old','Old'),('remote-only','Remote');insert into public.collectible_species values('shared','decoration',999);insert into public.collectible_habitats values('shared','old'),('shared','remote-only');`)
  const sql=catalogSql(catalog,{tables:['regions','collectible_species'],ids:['hologram','new-fish'],habitatRegion:'hologram'})
  await db.exec(sql);await db.exec(sql)
  expect((await db.query("select sell_price from public.collectible_species where id='shared'")).rows).toEqual([{sell_price:999}])
  expect((await db.query("select region_id from public.collectible_habitats where species_id='shared' order by region_id")).rows).toEqual([{region_id:'hologram'},{region_id:'old'},{region_id:'remote-only'}])
  expect((await db.query("select * from public.collectible_habitats where species_id='new-fish'")).rows).toEqual([{species_id:'new-fish',region_id:'hologram'}])
 }finally{await db.close()}
})
it('rejects broad or price-only use of habitat additions',()=>{
 expect(()=>catalogSql(catalog,{habitatRegion:'hologram'})).toThrow(/explicitly scoped/)
 expect(()=>catalogSql(catalog,{tables:['collectible_species'],ids:['new-fish'],pricesOnly:true,habitatRegion:'hologram'})).toThrow(/explicitly scoped/)
 expect(()=>catalogSql(catalog,{tables:['collectible_species'],ids:['new-fish'],habitatRegion:'missing'})).toThrow(/known region/)
})
