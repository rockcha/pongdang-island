// @vitest-environment node
import {readFileSync} from 'node:fs'
import {expect,it} from 'vitest'
import {catalogSql} from '../scripts/db/catalog.mjs'
it('generates a scoped boat catalog migration without touching creatures, habitats or other catalogs',()=>{
 const c=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
 const sql=catalogSql(c,{tables:['harbor_vessels']})
 expect(sql).toContain('insert into public.harbor_vessels')
 expect(sql).toContain('해넘이 원양어선')
 expect(sql).not.toContain('delete from')
 expect(sql).not.toContain('public.collectible_species')
 expect(sql).not.toContain('public.regions')
 expect(()=>catalogSql(c,{tables:['player_wallets']})).toThrow(/Unsupported/)
})
