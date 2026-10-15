// @vitest-environment node
import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import {expect,it} from 'vitest'
import reviewed from '@/features/aquarium/artwork-facing.json'

it('backfills reviewed paths, preserves overrides and rejects invalid directions',async()=>{
 const db=new PGlite()
 try{
  await db.exec('create table public.collectible_species(id text primary key,kind text,sprite_sheet_path text,thumbnail_path text,flip_with_direction boolean default true)')
  for(const art of reviewed)await db.query('insert into public.collectible_species(id,kind,sprite_sheet_path) values($1,$2,$3)',[art.id,'fish',art.path])
  await db.exec("update public.collectible_species set sprite_sheet_path='replacement.png' where id='aurora-eel'")
  const sql=readFileSync('supabase/sql/39-artwork-facing/01-artwork-facing.sql','utf8')
  await db.exec(sql)
  const {rows}=await db.query<{id:string;facing_direction:string|null}>('select id,facing_direction from public.collectible_species')
  for(const row of rows)expect(row.facing_direction).toBe(row.id==='aurora-eel'?null:reviewed.find(art=>art.id===row.id)!.facing)
  await db.exec("update public.collectible_species set facing_direction='right' where id='bean-pufferfish'")
  await db.exec(sql)
  expect((await db.query("select facing_direction from public.collectible_species where id='bean-pufferfish'")).rows[0]).toEqual({facing_direction:'right'})
  await expect(db.exec("update public.collectible_species set facing_direction='up' where id='bean-pufferfish'")).rejects.toThrow()
 }finally{await db.close()}
},30000)
