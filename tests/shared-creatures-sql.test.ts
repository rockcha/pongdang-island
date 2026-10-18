// @vitest-environment node
import {beforeAll,afterAll,expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {createLocalDatabase,replayMigrations,readCatalog,canonical} from '../scripts/db/local.mjs'
import {catalogSql} from '../scripts/db/catalog.mjs'
const added=JSON.parse(readFileSync('assets/storage-upload/new/20261018-114000/manifest.json','utf8')).species
let db
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('replays the migration and registers twelve shared species across every region',async()=>{
 const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
 expect(canonical(await readCatalog(db))).toBe(canonical(catalog))
 expect(added.filter(s=>s.rarity==='rare')).toHaveLength(5)
 expect(added.filter(s=>s.rarity==='epic')).toHaveLength(4)
 expect(added.filter(s=>s.rarity==='mythic')).toHaveLength(3)
 for(const s of added){const result=(await db.query('select s.rarity,s.native_region_id,s.movement_type,count(h.region_id)::int as habitats from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id where s.id=$1 group by s.id',[s.id])).rows[0];expect(result).toEqual({rarity:s.rarity,native_region_id:null,movement_type:s.movement_type,habitats:catalog.regions.length})}
})
it('keeps all three snails fixed and preserves ownership and wallets on repeated catalog application',async()=>{
 expect(added.filter(s=>s.movement_type==='fixed').map(s=>s.id).sort()).toEqual(['amber-lantern-snail','celadon-dewdrop-snail','celadon-spiral-whelk'])
 const uid='00000000-0000-0000-0000-000000009982'
 await db.query('insert into auth.users(id) values($1)',[uid]);await db.query('insert into public.player_wallets(user_id,gold) values($1,456)',[uid]);await db.query("insert into public.player_collectibles(user_id,species_id) values($1,'celadon-dewdrop-snail')",[uid])
 const before=(await db.query('select * from public.player_collectibles where user_id=$1',[uid])).rows
 const sql=catalogSql(JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8')))
 await db.exec(sql);await db.exec(sql)
 expect((await db.query('select * from public.player_collectibles where user_id=$1',[uid])).rows).toEqual(before)
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows).toEqual([{gold:456}])
})
