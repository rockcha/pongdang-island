// @vitest-environment node
import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {createLocalDatabase,migrationFiles} from '../scripts/db/local.mjs'

it('reduces only the intended prices, retains positive trash prices and preserves higher grades',async()=>{
 const db=await createLocalDatabase()
 const migration='20261022150134_lower_common_and_rare_sale_prices.sql'
 try{
  for(const file of migrationFiles().filter(f=>f<migration))await db.exec(readFileSync('supabase/migrations/'+file,'utf8'))
  const before=(await db.query<{id:string;rarity:string;sell_price:number}>("select id,rarity,sell_price from public.collectible_species where rarity in ('epic','mythic') order by id")).rows
  await db.exec(readFileSync('supabase/migrations/'+migration,'utf8'))
  expect((await db.query("select id,rarity,sell_price from public.collectible_species where rarity in ('epic','mythic') order by id")).rows).toEqual(before)
  const prices=(await db.query<{id:string;sell_price:number}>("select id,sell_price from public.collectible_species where id in ('shared-drift-scrap-wood','shared-industrial-wax-scraps','shared-old-kindling-rope','bluegrove-lost-ship-nameplate','bluegrove-waveworn-driftwood') order by id")).rows
  expect(Object.fromEntries(prices.map(p=>[p.id,p.sell_price]))).toEqual({
   'shared-drift-scrap-wood':1,'shared-industrial-wax-scraps':1,'shared-old-kindling-rope':1,
   'bluegrove-lost-ship-nameplate':17,'bluegrove-waveworn-driftwood':15,
  })
  expect((await db.query("select count(*)::int n from public.collectible_species where kind='trash' and sell_price<=0")).rows[0].n).toBe(0)
  expect((await db.query("select price,common_bp,rare_bp,epic_bp,mythic_bp from app_private.fishing_bait_balance_profiles where id='bait'")).rows[0]).toEqual({price:50,common_bp:8650,rare_bp:1200,epic_bp:130,mythic_bp:20})
 }finally{await db.close()}
},60000)
