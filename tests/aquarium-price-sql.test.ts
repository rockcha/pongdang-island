// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const uid='00000000-0000-0000-0000-000000000701'
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db);await db.query('insert into auth.users(id) values($1)',[uid]);await db.query('insert into public.player_wallets(user_id,gold) values($1,349)',[uid]);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec('set role authenticated')},60000)
afterAll(async()=>{await db?.close()})
it('quotes and charges 350, rejects insufficient gold and preserves replay safety',async()=>{
 const state=(await db.query('select public.aquarium_state() s')).rows[0].s
 expect(state.tankPrice).toBe(350)
 const operation=crypto.randomUUID()
 await expect(db.query('select public.buy_aquarium_tank($1)',[operation])).rejects.toThrow(/INSUFFICIENT_GOLD/)
 await db.exec('reset role')
 await db.query('update public.player_wallets set gold=350 where user_id=$1',[uid])
 await db.exec('set role authenticated')
 const purchased=(await db.query('select public.buy_aquarium_tank($1) s',[operation])).rows[0].s
 expect(purchased).toMatchObject({gold:0,delta:-350})
 expect((await db.query('select public.buy_aquarium_tank($1) s',[operation])).rows[0].s).toMatchObject({gold:0,delta:0})
 expect((await db.query('select public.aquarium_state() s')).rows[0].s.tanks).toHaveLength(2)
})
