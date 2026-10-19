// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const owner='00000000-0000-0000-0000-000000000801',other='00000000-0000-0000-0000-000000000802',empty='00000000-0000-0000-0000-000000000803'
async function asUser(uid,sql,params=[]){await db.exec(uid?'set role authenticated':'set role anon');try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid??'']);return await db.query(sql,params)}finally{await db.exec('reset role')}}
async function library(uid=owner,imported=null){return (await asUser(uid,'select public.music_library($1::jsonb) result',[imported===null?null:JSON.stringify(imported)])).rows[0].result}
async function edit(action,id,title='',name='',uid=owner){return (await asUser(uid,'select public.music_edit($1,$2,$3,$4) result',[action,id,title,name])).rows[0].result}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db);for(const id of [owner,other,empty])await db.query('insert into auth.users(id) values($1)',[id])},60000)
afterAll(async()=>{await db?.close()})
it('copies DB defaults once and keeps deletion across reloads',async()=>{
 const initial=await library();expect(initial.map(t=>t.id)).toEqual(['28kGcceYcOI','fqSVyUeiduI','icKtd3wUBug'])
 for(const track of initial)await edit('delete',track.id)
 expect(await library()).toEqual([])
})
it('imports local names once, isolates owners, and preserves an intentionally empty import',async()=>{
 const imported=[{id:'28kGcceYcOI',title:'원래 제목',customName:'내 음악'}]
 expect(await library(other,imported)).toEqual(imported)
 expect(await library(other,[])).toEqual(imported)
 expect(await library(empty,[])).toEqual([])
 expect(await library(empty)).toEqual([])
 expect((await asUser(owner,'select * from public.music_tracks')).rows).toEqual([])
})
it('adds, renames, updates title and deletes only the caller music',async()=>{
 await edit('add','icKtd3wUBug','원래 제목','내 제목')
 expect(await edit('rename','icKtd3wUBug','','')).toEqual([{id:'icKtd3wUBug',title:'원래 제목',customName:''}])
 expect(await edit('title','icKtd3wUBug','새 제목')).toEqual([{id:'icKtd3wUBug',title:'새 제목',customName:''}])
 await edit('delete','28kGcceYcOI')
 expect(await library(other)).toHaveLength(1)
})
it('rejects anonymous access, direct writes, invalid input and oversized import',async()=>{
 await expect(library(null)).rejects.toThrow(/permission denied/)
 await expect(asUser(owner,"update public.music_defaults set title='bad'")).rejects.toThrow(/permission denied/)
 await expect(asUser(owner,'delete from public.music_tracks')).rejects.toThrow(/permission denied/)
 await expect(edit('add','bad')).rejects.toThrow(/INVALID_MUSIC/)
 await expect(edit('rename','icKtd3wUBug','','x'.repeat(151))).rejects.toThrow(/INVALID_MUSIC/)
 await expect(library(owner,[{id:'28kGcceYcOI',title:1,customName:''}])).rejects.toThrow(/INVALID_MUSIC_IMPORT/)
 await expect(library(owner,Array(201).fill({id:'28kGcceYcOI',title:'',customName:''}))).rejects.toThrow(/MUSIC_LIMIT/)
})
