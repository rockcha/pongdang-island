// @vitest-environment node
import {it,expect} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'

it('purchases more than four fuel sites through both APIs and retries without charging twice',async()=>{
 const db=await createLocalDatabase(),u='00000000-0000-0000-0000-000000009883'
 try{
  await replayMigrations(db)
  await db.query('insert into auth.users(id) values($1)',[u])
  await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,10000,'{}') on conflict(user_id) do update set gold=10000",[u])
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[u]);await db.exec('set role authenticated')
  const op=crypto.randomUUID(),args=['shell-coal-mini-kiln',5,op]
  for(let i=0;i<2;i++){
   const s=(await db.query<{r:any}>('select public.production_purchase($1,$2,$3) r',args)).rows[0].r
   expect(s.sites).toHaveLength(5);expect(s.gold).toBe(8250)
  }
  const single=crypto.randomUUID()
  for(let i=0;i<2;i++){
   const s=(await db.query<{r:any}>("select public.production_action('buy',$1,'shell-coal-mini-kiln') r",[single])).rows[0].r
   expect(s.sites).toHaveLength(6);expect(s.gold).toBe(7900)
  }
  await expect(db.query('select public.production_purchase($1,101,$2)',['shell-coal-mini-kiln',crypto.randomUUID()])).rejects.toThrow(/INVALID_PRODUCTION_QUANTITY/)
 }finally{await db.close()}
},60000)
