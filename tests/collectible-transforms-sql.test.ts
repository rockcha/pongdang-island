// @vitest-environment node
import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import {expect,it} from 'vitest'
it('saves transforms repeatably and rejects another owner',async()=>{
 const db=new PGlite()
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema app_private;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.aquarium_tanks(id uuid primary key,user_id uuid);
 create table public.collectible_species(id text primary key,kind text,movement_type text default 'fixed');
 create table public.player_collectibles(id uuid primary key,user_id uuid,tank_id uuid,species_id text,sold_at timestamptz,escrow_gift_id uuid,position_x numeric,position_y numeric,rotation numeric,scale numeric);
 insert into collectible_species(id,kind) values('fish','fish');
 insert into aquarium_tanks values('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002');
 insert into player_collectibles(id,user_id,tank_id,species_id) values('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','fish');`)
 const sql=readFileSync('supabase/sql/47-fixed-collectible-editing/01-fixed-collectible-editing.sql','utf8')
 await db.exec(sql);await db.exec(sql)
 await db.exec("set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002'")
 const call="select public.arrange_collectible('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001',.4,.6,345,1.2,true)"
 await db.exec(call)
 expect((await db.query<{flipped:boolean;rotation:string}>('select flipped,rotation from player_collectibles')).rows[0]).toMatchObject({flipped:true})
 await db.exec("update collectible_species set movement_type='swim' where id='fish'")
 await expect(db.exec(call)).rejects.toThrow('INVALID_ITEM')
 await expect(db.exec("select app_private.place_collectible('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001',.2,.3)")).rejects.toThrow('INVALID_ITEM')
 await db.exec("update collectible_species set kind='trash',movement_type='fixed' where id='fish'")
 await expect(db.exec(call)).rejects.toThrow('INVALID_ITEM')
 await db.exec("set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004'")
 await expect(db.exec(call)).rejects.toThrow('TANK_NOT_FOUND')
 }finally{await db.close()}
},30000)
