// @vitest-environment node
import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {createLocalDatabase,migrationFiles} from '../scripts/db/local.mjs'

it('protects low-value catches and higher grades while reducing high prices without reversing their order',async()=>{
 const db=await createLocalDatabase(),migration='20261022150835_progressive_collectible_sale_prices.sql'
 try{
  for(const file of migrationFiles().filter(f=>f<migration))await db.exec(readFileSync('supabase/migrations/'+file,'utf8'))
  const before=(await db.query<{id:string;rarity:string;sell_price:number}>('select id,rarity,sell_price from public.collectible_species order by sell_price,id')).rows
  await db.exec(readFileSync('supabase/migrations/'+migration,'utf8'))
  const after=new Map((await db.query<{id:string;sell_price:number}>('select id,sell_price from public.collectible_species')).rows.map(x=>[x.id,x.sell_price]))
  expect(after.size).toBe(before.length)
  let changed=0
  for(const x of before){
   const price=after.get(x.id)!
   expect(price).toBeLessThanOrEqual(x.sell_price)
   if(x.rarity==='common'&&x.sell_price<=20||x.rarity==='rare'&&x.sell_price<=100||!['common','rare'].includes(x.rarity))expect(price).toBe(x.sell_price)
   if(price!==x.sell_price){expect(price).toBeGreaterThanOrEqual(1);changed++}
  }
  expect(changed).toBeGreaterThan(0)
  for(const grade of ['common','rare']){
   const values=before.filter(x=>x.rarity===grade).map(x=>after.get(x.id)!)
   expect(values).toEqual([...values].sort((a,b)=>a-b))
  }
 }finally{await db.close()}
},60000)
