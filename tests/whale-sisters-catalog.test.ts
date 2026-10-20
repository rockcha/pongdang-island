// @vitest-environment node
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'
import { catalogSql } from '../scripts/db/catalog.mjs'
const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
let db
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('names the younger sister and updates a retained older sister without recreating or changing other attributes',async()=>{
 expect((await db.query("select name from public.collectible_species where id='pongdang-whale'")).rows[0].name).toBe('퐁당 고래 동생')
 const sql=catalogSql(catalog,{tables:['retained_species_details']})
 await db.exec(sql)
 expect((await db.query("select * from public.collectible_species where id='pongdang-native-whale'")).rows).toHaveLength(0)
 await db.exec("begin;set constraints all deferred;insert into public.collectible_species(id,kind,name,description,thumbnail_path,sell_price,size,rarity,sprite_sheet_path,native_region_id,swim_y_min,swim_y_max,speed) select 'pongdang-native-whale',kind,'기존 고래',description,thumbnail_path,1000,166,rarity,sprite_sheet_path,native_region_id,swim_y_min,swim_y_max,speed from public.collectible_species where id='pongdang-whale';insert into public.collectible_habitats(species_id,region_id) values('pongdang-native-whale','pongdang');commit;")
 const before=(await db.query("select * from public.collectible_species where id='pongdang-native-whale'")).rows[0]
 await db.exec(sql)
 const after=(await db.query("select * from public.collectible_species where id='pongdang-native-whale'")).rows[0]
 expect(after.name).toBe('퐁당 고래 언니');expect(after.description).toContain('고래 자매의 언니')
 const {name:_oldName,description:_oldDescription,...oldAttributes}=before
 const {name:_newName,description:_newDescription,...newAttributes}=after
 expect(newAttributes).toEqual(oldAttributes)
})
