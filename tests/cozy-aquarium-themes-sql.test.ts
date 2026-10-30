// @vitest-environment node
import {readFileSync} from 'node:fs'
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const uid='00000000-0000-0000-0000-000000000709'
const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8')).aquarium_backgrounds
const themes=['20261019-085100','20261019-085940','20261019-090840','20261019-092750','20261021-150650','20261021-151542','20261022-cozy-doll-room','20261024-003808'].flatMap(batch=>JSON.parse(readFileSync(`assets/storage-upload/new/${batch}/manifest.json`,'utf8')).items).map(theme=>({...theme,price:catalog.find(item=>item.id===theme.id).price,image_path:catalog.find(item=>item.id===theme.id).image_path})).concat(catalog.filter(theme=>['sunlit-tropical-aquascape','black-sail-cove','fairy-dew-grove','fairy-petal-palace','fairy-moonlit-lake','halloween-pumpkin-teahouse','halloween-ghost-glasshouse','halloween-witch-lavender-room','pharaoh-sleeping-pyramid-court','pharaoh-sunken-sun-tomb'].includes(theme.id)))
const initialGold=themes.reduce((sum,theme)=>sum+theme.price,0)+10000
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query('insert into public.player_wallets(user_id,gold) values($1,$2)',[uid,initialGold])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
 await db.exec('set role authenticated')
},60000)
afterAll(async()=>{await db?.close()})
it('keeps paid theme prices within tier ranges and the starter background free',async()=>{
 const state=(await db.query('select public.aquarium_state() s')).rows[0].s
 expect(state.catalog.find(item=>item.id==='default').price).toBe(0)
 for(const [tier,min,max] of [['simple',200,400],['mood',400,800],['special',800,3000]] as const){
  const prices=state.catalog.filter(item=>item.tier===tier&&item.id!=='default').map(item=>item.price)
  expect(Math.min(...prices)).toBe(min)
  expect(Math.max(...prices)).toBe(max)
  for(const price of prices){expect(price).toBeGreaterThanOrEqual(min);expect(price).toBeLessThanOrEqual(max)}
 }
})
it('offers the three fairy themes at the requested prices as special backgrounds',async()=>{
 const state=(await db.query('select public.aquarium_state() s')).rows[0].s
 for(const [id,price] of [['fairy-dew-grove',1500],['fairy-petal-palace',1650],['fairy-moonlit-lake',1800]] as const){
  expect(state.catalog.find(row=>row.id===id)).toMatchObject({price,tier:'special',image_path:id+'-panorama-v1.png'})
 }
})
it('offers all three Halloween backgrounds at their requested prices',async()=>{
 const state=(await db.query('select public.aquarium_state() s')).rows[0].s
 for(const [id,price] of [['halloween-pumpkin-teahouse',1500],['halloween-ghost-glasshouse',1650],['halloween-witch-lavender-room',1800]] as const){
  expect(state.catalog.find(row=>row.id===id)).toMatchObject({price,tier:'special',image_path:id+'-panorama-v1.png'})
 }
})
it('offers the premium Pharaoh themes at their catalog prices',async()=>{
 const state=(await db.query('select public.aquarium_state() s')).rows[0].s
 for(const [id,name,price] of [['pharaoh-sleeping-pyramid-court','잠든 피라미드의 뜰',2500],['pharaoh-sunken-sun-tomb','태양이 잠긴 왕릉',3000]])expect(state.catalog.find(item=>item.id===id)).toMatchObject({name,price,tier:'special',image_path:id+'-panorama-v1.png'})
})
it('exposes all cozy themes and charges their catalog price exactly once',async()=>{
 const state=(await db.query('select public.aquarium_state() s')).rows[0].s
 let gold=initialGold
 for(const theme of themes){
  expect(state.catalog.find(item=>item.id===theme.id)).toMatchObject({name:theme.name,price:theme.price,image_path:theme.image_path,tier:theme.tier??'special'})
  const op=crypto.randomUUID()
  gold-=theme.price
  expect((await db.query("select public.aquarium_background($1,'buy',$2) s",[theme.id,op])).rows[0].s).toMatchObject({gold,delta:-theme.price})
  expect((await db.query("select public.aquarium_background($1,'buy',$2) s",[theme.id,op])).rows[0].s).toMatchObject({gold,delta:0})
  const equipped=(await db.query("select public.manage_aquarium_tank($1,'equip',$2) s",[state.tanks[0].id,theme.id])).rows[0].s
  expect(equipped.tanks.find(tank=>tank.id===state.tanks[0].id).background_id).toBe(theme.id)
 }
 const updated=(await db.query('select public.aquarium_state() s')).rows[0].s
 for(const theme of themes)expect(updated.owned).toContain(theme.id)
})
it('exposes all three visual tiers and rejects an invalid tier',async()=>{
 const state=(await db.query('select public.aquarium_state() s')).rows[0].s
 expect(new Set(state.catalog.map(item=>item.tier))).toEqual(new Set(['simple','mood','special']))
 await db.exec('reset role')
 await expect(db.exec("update public.aquarium_backgrounds set tier='invalid' where id='default'")).rejects.toThrow(/aquarium_backgrounds_tier_check/)
 await db.exec('set role authenticated')
})
