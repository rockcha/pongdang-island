// @vitest-environment node
import { beforeAll, afterAll, expect, it } from 'vitest'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'

let db: Awaited<ReturnType<typeof createLocalDatabase>>
beforeAll(async () => { db = await createLocalDatabase(); await replayMigrations(db) }, 60000)
afterAll(async () => { await db.close() })

it('uses inclusive KST start and exclusive end while ordinary species remain available', async () => {
 for (const [at, allowed] of [
  ['2026-10-23T23:59:59.999+09:00', false],
  ['2026-10-24T00:00:00+09:00', true],
  ['2026-10-31T23:59:59.999+09:00', true],
  ['2026-11-01T00:00:00+09:00', false],
 ] as const) {
  const { rows } = await db.query('select app_private.collectible_available_at($1,$2::timestamptz) event, app_private.collectible_available_at($3,$2::timestamptz) ordinary', ['halloween-test-fish', at, 'ordinary-fish'])
  expect(rows[0]).toEqual({ event: allowed, ordinary: true })
 }
})

it('excludes closed event fish before fallback and restores draws only during the event', async () => {
 await db.exec(`begin;
 insert into auth.users(id) values('00000000-0000-0000-0000-000000008888');
 select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000008888',true);
 insert into public.collectible_species(id,name,description,kind,rarity,thumbnail_path,sprite_sheet_path,sell_price,size,speed,swim_y_min,swim_y_max)
 values ('halloween-test-fish','Event fixture','Test fixture','fish','mythic','test.png','test_sprite.png',1,52,0.05,0.2,0.7);
 update app_private.collectible_event_windows set starts_at=now()+interval '1 day',ends_at=now()+interval '2 days';
 insert into public.player_discoveries(user_id,species_id)
 select auth.uid(),id from public.collectible_species where id<>'halloween-test-fish';`)
 try {
  expect((await db.query("select app_private.pick_habitat_group(array['halloween-test-fish'],'pongdang') id")).rows[0].id).toBeNull()
  const profile = { id: 'bait_first_greeting', effect_kind: 'undiscovered', target_kinds: ['fish', 'trash', 'decoration'] }
  expect((await db.query("select app_private.pick_profile_collectible('pongdang','mythic',$1::jsonb) id", [JSON.stringify(profile)])).rows[0].id).toBeNull()
  const rule = { kind: 'discovery_only', success_bp: 10000, mythic_bp: 10000, epic_bp: 0, rare_bp: 0, home_multiplier: 1 }
  expect((await db.query("select app_private.harbor_draw('pongdang',$1::jsonb) id", [JSON.stringify(rule)])).rows[0].id).toBeNull()
  // Only a closed event mythic is undiscovered; an eligible common must still be found.
  await db.exec("delete from public.player_discoveries where user_id=auth.uid() and species_id=(select id from public.collectible_species where kind='fish' and rarity='common' and id not like 'halloween-%' limit 1)")
  const fallback = (await db.query("select s.rarity from public.collectible_species s where s.id=app_private.pick_profile_collectible('pongdang','mythic',$1::jsonb)", [JSON.stringify(profile)])).rows
  expect(fallback[0].rarity).toBe('common')
  await db.exec("update app_private.collectible_event_windows set starts_at=now()-interval '1 day',ends_at=now()+interval '1 day'")
  expect((await db.query("select app_private.pick_habitat_group(array['halloween-test-fish'],'pongdang') id")).rows[0].id).toBe('halloween-test-fish')
  expect((await db.query("select app_private.harbor_draw('pongdang',$1::jsonb) id", [JSON.stringify(rule)])).rows[0].id).toBe('halloween-test-fish')
  await db.exec("update app_private.collectible_event_windows set starts_at=now()-interval '2 days',ends_at=now()-interval '1 day'")
  expect((await db.query("select app_private.pick_habitat_group(array['halloween-test-fish'],'pongdang') id")).rows[0].id).toBeNull()
 } finally { await db.exec('rollback') }
},30000)

it('keeps event configuration and time overrides inaccessible to clients', async () => {
 const { rows } = await db.query(`select has_table_privilege('authenticated','app_private.collectible_event_windows','UPDATE') writable,
 has_function_privilege('authenticated','app_private.collectible_available_at(text,timestamptz)','EXECUTE') callable,
 has_function_privilege('anon','app_private.collectible_available_at(text,timestamptz)','EXECUTE') anonymous`)
 expect(rows[0]).toEqual({ writable: false, callable: false, anonymous: false })
})
