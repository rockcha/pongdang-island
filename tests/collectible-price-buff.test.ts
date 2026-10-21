import {expect,it} from 'vitest'
import {createLocalDatabase,migrationFiles,readSql} from '../scripts/db/local.mjs'
import existingSpecies from './fixtures/existing-species-price-buff.json'

it('adds exactly the rarity bonus to every existing species and remains idempotent',async()=>{
 const db=await createLocalDatabase()
 try{
  const migration='20261021015952_buff_collectible_sell_prices.sql'
  for(const file of migrationFiles()){
   if(file===migration)break
   await db.exec(readSql(`supabase/migrations/${file}`))
  }
  const before=(await db.query<{id:string;rarity:string;sell_price:number}>('select id,rarity,sell_price from public.collectible_species order by id')).rows
  const sql=readSql(`supabase/migrations/${migration}`)
  await db.exec(sql)
  const after=(await db.query<{id:string;rarity:string;sell_price:number}>('select id,rarity,sell_price from public.collectible_species order by id')).rows
  const bonus:Record<string,number>={common:10,rare:10,epic:20,mythic:30}
  expect(after).toEqual(before.map(row=>({...row,sell_price:row.sell_price+bonus[row.rarity]})))
  await db.exec(sql)
  expect((await db.query('select id,rarity,sell_price from public.collectible_species order by id')).rows).toEqual(after)
 }finally{await db.close()}
},30000)

it('buffs omitted existing species without recreating absent species or double buffing managed rows',async()=>{
 const db=await createLocalDatabase()
 try{
  const migration='20261021021403_complete_collectible_price_buff.sql'
  for(const file of migrationFiles()){
   if(file===migration)break
   await db.exec(readSql(`supabase/migrations/${file}`))
  }
  // Historical asset definitions were absent from the locally replayed catalog.
  // Reproduce their historical definitions' price and rarity without importing old SQL.
  for(const row of existingSpecies){
   const kind=row.kind??'fish'
   const moving=kind==='fish'||kind==='trash'
   await db.query(`insert into public.collectible_species(id,kind,name,description,speed,size,rarity,thumbnail_path,sell_price,sprite_sheet_path,swim_y_min,swim_y_max)
    values ($1,$2,$3,'Existing species fixture',$9,40,$4,'fixture.png',$5,$6,$7,$8)`,[row.id,kind,row.name,row.rarity,row.price,kind==='fish'?'fixture_sprite.png':null,moving ? .2 : null,moving ? .8 : null,moving ? .02 : 0])
  }
  const managed=(await db.query("select sell_price from public.collectible_species where id='orange-clownfish'")).rows
  const sql=readSql(`supabase/migrations/${migration}`)
  expect(sql).not.toMatch(/insert into|delete from/i)
  const bonus:Record<string,number>={common:10,rare:10,epic:20,mythic:30}
  for(let repeat=0;repeat<2;repeat++){
   await db.exec(sql)
   for(const row of existingSpecies){
    const result=await db.query<{sell_price:number}>('select sell_price from public.collectible_species where id=$1',[row.id])
    expect(result.rows[0].sell_price,row.id).toBe(row.price+bonus[row.rarity])
   }
   expect((await db.query("select sell_price from public.collectible_species where id='orange-clownfish'")).rows).toEqual(managed)
  }
  await db.query("delete from public.collectible_species where id='rusty-bottle-cap'")
  await db.exec(sql)
  expect((await db.query("select id from public.collectible_species where id='rusty-bottle-cap'")).rows).toEqual([])
 }finally{await db.close()}
},30000)
