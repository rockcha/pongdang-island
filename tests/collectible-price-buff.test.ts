import {expect,it} from 'vitest'
import {createLocalDatabase,migrationFiles,readSql} from '../scripts/db/local.mjs'

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
