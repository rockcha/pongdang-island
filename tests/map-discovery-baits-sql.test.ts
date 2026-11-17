// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'

let db: Awaited<ReturnType<typeof createLocalDatabase>>
let uid: string
const compass = 'bait_map_compass_jelly'
const lantern = 'bait_map_lantern_berry'
beforeAll(async () => {
  db = await createLocalDatabase()
  await replayMigrations(db)
}, 60000)
afterAll(async () => {
  await db?.close()
})
beforeEach(async () => {
  await db.exec('begin')
  uid = crypto.randomUUID()
  await db.query('insert into auth.users(id) values($1)', [uid])
  await db.query("insert into public.player_profiles(id,nickname) values($1,'지도미끼테스터')", [
    uid,
  ])
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid])
  await db.exec(`select app_private.get_gold_wallet();
    update public.player_wallets set gold=10000,inventory=jsonb_build_object('${compass}',10,'${lantern}',10) where user_id=auth.uid();
    insert into public.player_navigation(user_id,region_id) values(auth.uid(),'pongdang') on conflict(user_id) do update set region_id='pongdang';
    create or replace function app_private.fishing_weather_at(p_at timestamptz) returns jsonb language sql security definer set search_path='' as $$select null::jsonb$$;
    update public.fishing_map_blueprints set enabled=false;
    insert into public.regions(id,name,description,rarity,sort_order,image_path,requires_map_fragment)
      values('map-bait-test','Map bait test','Test','rare',999,'test.png',true);
    insert into public.fishing_map_blueprints(region_id,piece_count,thumbnail_path,enabled,rarity)
      values('map-bait-test',4,'test.png',true,'rare');`)
})
afterEach(async () => {
  await db.exec('rollback;reset role')
})
async function state() {
  return (await db.query('select public.fishing_state() s')).rows[0].s
}
async function lens() {
  await db.query(
    "insert into app_private.player_fishing_relics(user_id,relic_id) values($1,'worlds-end-lens')",
    [uid],
  )
  await db.query("select public.equip_relic('worlds-end-lens',$1,null)", [crypto.randomUUID()])
}
async function prepare(id = crypto.randomUUID(), bait = compass) {
  return (
    await db.query("select public.prepare_discovery_fishing('pongdang',$1,$2,false) p", [bait, id])
  ).rows[0].p
}
async function pinMapRoll() {
  // Pin the random input only; retain the real bonus calculation and category boundaries.
  const definition = (
    await db.query(
      "select pg_get_functiondef('app_private.fishing_reward_category(double precision,public.game_rarity,integer)'::regprocedure) d",
    )
  ).rows[0].d
  await db.exec(definition.replace('begin\n', 'begin\n p_roll:=0.90;\n'))
  await db.exec(
    `create or replace function app_private.profile_fishing_rarity(p_profile jsonb) returns public.game_rarity language sql set search_path='' as $$select 'rare'::public.game_rarity$$`,
  )
}
async function finish(id: string, won = true) {
  await db.query(
    "update app_private.prepared_fishing_casts set created_at=clock_timestamp()-interval '1 minute' where operation_id=$1 and user_id=$2",
    [id, uid],
  )
  return (await db.query('select public.finish_fishing($1,$2) r', [id, won])).rows[0].r
}
it('publishes the agreed prices, grade odds, local artwork and separate base map odds', async () => {
  const s = await state()
  for (const [id, price, common, rare, map] of [
    [compass, 160, 6700, 3000, 800],
    [lantern, 280, 3200, 6500, 1000],
  ] as const) {
    const b = s.baits.find((b) => b.id === id)
    expect(b).toMatchObject({
      price,
      common_bp: common,
      rare_bp: rare,
      epic_bp: 300,
      mythic_bp: 0,
      baseMapChanceBp: map,
      mapChanceBp: map,
    })
    expect(b.image_path).toMatch(/^\/items\/baits\/map-.+-v1\.png$/)
    const profile = (await db.query('select app_private.fishing_bait_balance_at($1) p', [id]))
      .rows[0].p
    expect(profile.map_chance_bp).toBe(map)
  }
  expect(s.baits.find((b) => b.id === 'bait').baseMapChanceBp).toBeUndefined()
})
it.each([800, 1000])(
  'uses exact category ranges for map base %i and stacks the lens without consuming relic odds',
  async (base) => {
    for (const bonus of [0, 500]) {
      if (bonus) await lens()
      for (const [grade, relic] of [
        ['common', 300],
        ['rare', 300],
        ['epic', 500],
      ] as const) {
        const rows = (
          await db.query(
            `select app_private.fishing_reward_category((n+.5)/10000.0,$1::public.game_rarity,$2) category,count(*)::integer n
        from generate_series(0,9999) n group by 1`,
            [grade, base],
          )
        ).rows
        expect(Object.fromEntries(rows.map((r) => [r.category, r.n]))).toEqual({
          ordinary: 10000 - base - bonus - relic,
          map: base + bonus,
          relic,
        })
      }
    }
  },
)
it('keeps existing bait map odds at 3% plus its original relic bonus', async () => {
  await lens()
  const rows = (
    await db.query(`select app_private.fishing_reward_category((n+.5)/10000.0,'rare') category,count(*)::integer n
    from generate_series(0,9999) n group by 1`)
  ).rows
  expect(Object.fromEntries(rows.map((r) => [r.category, r.n]))).toEqual({
    ordinary: 8900,
    map: 800,
    relic: 300,
  })
  const s = await state()
  expect(s.baits.find((b) => b.id === compass).mapChanceBp).toBe(1300)
  expect(s.baits.find((b) => b.id === lantern).mapChanceBp).toBe(1500)
})
it.each([
  [compass, 160],
  [lantern, 280],
] as const)(
  'buys %s in bulk through the existing purchase boundary without charging retries',
  async (id, price) => {
    const operation = crypto.randomUUID()
    await db.exec('set local role authenticated')
    const first = (
      await db.query('select public.buy_fishing_bait_bulk($1,3,$2,$3) r', [id, operation, price])
    ).rows[0].r
    expect(first.gold).toBe(10000 - price * 3)
    expect(first.inventory[id]).toBe(13)
    const replay = (
      await db.query('select public.buy_fishing_bait_bulk($1,3,$2,$3) r', [id, operation, price])
    ).rows[0].r
    expect(replay.delta).toBe(0)
    expect(replay.replayed).toBe(true)
  },
)
it('reserves the rolled grade and bonus once, then grants one map piece on a successful finish', async () => {
  await lens()
  await pinMapRoll()
  const p = await prepare()
  expect(p.species.kind).toBe('map')
  expect(p.rarity).toBe('rare')
  expect(p.bait_profile).toMatchObject({
    map_chance_bp: 800,
    effective_map_chance_bp: 1300,
    mythic_bp: 0,
  })
  await db.query('select public.equip_relic(null,$1,500)', [crypto.randomUUID()])
  const replay = await prepare(p.operation_id)
  expect(replay.bait_profile).toEqual(p.bait_profile)
  expect(replay.species).toEqual(p.species)
  expect(
    (await db.query('select inventory from public.player_wallets where user_id=$1', [uid])).rows[0]
      .inventory[compass],
  ).toBe(9)
  const result = await finish(p.operation_id)
  expect(result.attempt.species.kind).toBe('map')
  await finish(p.operation_id)
  expect(
    (await db.query('select * from app_private.player_fishing_map_pieces where user_id=$1', [uid]))
      .rows,
  ).toHaveLength(1)
  expect(
    (await db.query('select * from public.player_collectibles where user_id=$1', [uid])).rows,
  ).toHaveLength(0)
})
it('falls back to an ordinary catch of the same grade when no map piece remains', async () => {
  await pinMapRoll()
  await db.exec('update public.fishing_map_blueprints set enabled=false')
  const p = await prepare(crypto.randomUUID(), lantern)
  expect(p.rarity).toBe('rare')
  expect(['fish', 'trash', 'decoration']).toContain(p.species.kind)
  await finish(p.operation_id, false)
  expect(
    (await db.query('select * from app_private.player_fishing_map_pieces where user_id=$1', [uid]))
      .rows,
  ).toHaveLength(0)
})
it('grants no map on failure or expiry and keeps the category helper private', async () => {
  await pinMapRoll()
  const failed = await prepare()
  await finish(failed.operation_id, false)
  const expired = await prepare()
  await db.query(
    "update app_private.prepared_fishing_casts set expires_at=clock_timestamp()-interval '1 second' where operation_id=$1",
    [expired.operation_id],
  )
  expect((await finish(expired.operation_id)).failure_reason).toBe('expired')
  expect(
    (await db.query('select * from app_private.player_fishing_map_pieces where user_id=$1', [uid]))
      .rows,
  ).toHaveLength(0)
  for (const role of ['anon', 'authenticated']) {
    expect(
      (
        await db.query(
          "select has_function_privilege($1,'app_private.fishing_reward_category(double precision,public.game_rarity,integer)','execute') permitted",
          [role],
        )
      ).rows[0].permitted,
    ).toBe(false)
  }
})
