// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'
import type { HallFeed, HallWall } from '../src/features/hall-of-fame/api'

let db: Awaited<ReturnType<typeof createLocalDatabase>>
const ids = Array.from(
  { length: 7 },
  (_, i) => `00000000-0000-0000-0000-${String(800 + i).padStart(12, '0')}`,
)
async function asUser<T>(user: string, sql: string, args: unknown[] = []) {
  await db.exec('set role authenticated')
  try {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user])
    return (await db.query<{ data: T }>(sql, args)).rows[0]?.data
  } finally {
    await db.exec('reset role')
    await db.query("select set_config('request.jwt.claim.sub','',false)")
  }
}
const feed = () => asUser<HallFeed>(ids[0], 'select public.hall_of_fame() data')
const wall = () => asUser<HallWall>(ids[1], 'select public.hall_wall($1) data', [ids[0]])
const react = (value: number, user = ids[1]) =>
  asUser<HallWall>(user, "select public.hall_action($1,'react',$2) data", [ids[0], value])

beforeAll(async () => {
  db = await createLocalDatabase()
  await replayMigrations(db)
  for (const [i, id] of ids.entries()) {
    await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)', [
      id,
      JSON.stringify({ game_nickname: `기록퐁${i}` }),
    ])
    await asUser(id, 'select public.sync_player_profile() data')
  }
  const fish = (
    await db.query<{ id: string }>(
      "select id from public.collectible_species where kind='fish' and rarity='mythic' order by id limit 1",
    )
  ).rows[0].id
  // Three Korean calendar days: 40, 30, 30 casts. 60 successes followed by 40 failures.
  await db.query(
    `insert into app_private.title_fishing_log(user_id,event_key,occurred_at,source,kind,rarity,species_id)
    select $1,'fixture:'||i,timestamptz '2025-12-31 15:00:00+00'
    + case when i<=40 then interval '0 day' when i<=70 then interval '1 day' else interval '2 days' end
    + i*interval '1 minute','manual',case when i<=60 then 'fish' end,
    case when i=1 then 'mythic' when i<=60 then 'common' end,case when i<=60 then $2 end
    from generate_series(1,100) i`,
    [ids[0], fish],
  )
  for (let i = 1; i <= 6; i++) {
    await db.query(
      `insert into app_private.title_fishing_log(user_id,event_key,occurred_at,source,kind,rarity,species_id)
      select $1,'small:'||i,now(),'manual','fish','common',$2 from generate_series(1,$3::integer) i`,
      [ids[i], fish, i],
    )
  }
  await db.query(
    `insert into app_private.title_fishing_log(user_id,event_key,occurred_at,source,kind,rarity,species_id)
    values($1,'trap:1',now(),'expedition','fish','mythic',$2),($1,'trash:1',now(),'expedition','trash','common',$2)`,
    [ids[0], fish],
  )
  const vessel = (
    await db.query<{ id: string }>('select id from public.harbor_vessels order by id limit 1')
  ).rows[0].id
  const boat = (
    await db.query<{ id: string }>(
      'insert into public.harbor_boats(user_id,vessel_id,instance_no) values($1,$2,1) returning id',
      [ids[0], vessel],
    )
  ).rows[0].id
  await db.query(
    `insert into public.harbor_voyages(user_id,vessel_id,boat_id,vessel_snapshot,departed_at,returns_at,claimed_at,result)
    values($1,$2,$3,'{}',now()-interval '30 days',now()-interval '1 hour',now(),$4)`,
    [
      ids[0],
      vessel,
      boat,
      JSON.stringify({
        items: [
          { species: { id: fish, kind: 'fish', rarity: 'mythic' } },
          { species: { id: fish, kind: 'decoration', rarity: 'common' } },
        ],
      }),
    ],
  )
  // Merely owning a mythic (e.g. a received gift) is not acquisition evidence.
  await db.query('insert into public.player_collectibles(user_id,species_id) values($1,$2)', [
    ids[0],
    fish,
  ])
  await db.query(
    'insert into public.player_discoveries(user_id,species_id) values($1,$2) on conflict do nothing',
    [ids[0], fish],
  )
  await db.query(
    `insert into public.aquarium_feedings(visitor_id,owner_id,operation_id,clicks,completed_at)
    values($1,$2,gen_random_uuid(),3,now()),($1,$2,gen_random_uuid(),1,null)`,
    [ids[0], ids[1]],
  )
  await db.query(
    `insert into public.aquarium_cleanings(visitor_id,owner_id,operation_id,strokes,completed_at)
    values($1,$2,gen_random_uuid(),3,now())`,
    [ids[0], ids[1]],
  )
  const expedition = (
    await db.query<{ id: string }>(
      `insert into public.fishing_expeditions(user_id,vessel_id,region_id,cargo,vessel_snapshot,returns_at)
    values($1,(select id from public.fishing_vessels order by id limit 1),'pongdang','{}','{}',now()+interval '1 hour') returning id`,
      [ids[1]],
    )
  ).rows[0].id
  await db.query(
    `insert into app_private.expedition_boosts(expedition_id,helper_id,nickname,minutes) values($1,$2,'기록퐁0',10)`,
    [expedition, ids[0]],
  )
  await db.query(
    `insert into public.memory_game_runs(user_id,operation_id) values($1,gen_random_uuid());`,
    [ids[0]],
  )
  await db.query(
    `insert into public.shadow_game_runs(user_id,operation_id) values($1,gen_random_uuid());`,
    [ids[0]],
  )
}, 60000)
beforeEach(async () => {
  await db.exec('truncate app_private.hall_comments,app_private.hall_reactions')
})
afterAll(async () => {
  await db.close()
})

describe('hall of fame rankings', () => {
  it('ranks a player with no activity at zero and preserves zero-rate eligibility',async()=>{
    await db.exec('begin')
    try{
      const newcomer='00000000-0000-0000-0000-000000000899'
      await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[newcomer,JSON.stringify({game_nickname:'새내기퐁'})])
      await asUser(newcomer,'select public.sync_player_profile() data')
      const result=await asUser<HallFeed>(newcomer,'select public.hall_of_fame() data')
      expect(result.rankings.casts).toHaveLength(8)
      expect(result.rankings.casts.at(-1)).toMatchObject({id:newcomer,rank:8,value:0})
      expect(result.personal?.casts).toMatchObject({rank:8,value:0})
      expect(result.personal?.casts.neighbors.some(p=>p.id===newcomer)).toBe(true)
      expect(result.rankings.trash.every(p=>p.value===0)).toBe(true)
      expect(result.rankings.trash.at(-1)).toMatchObject({id:newcomer,rank:8})
      expect(result.rankings.mythic_rate.some(p=>p.id===newcomer)).toBe(false)
      await db.query("update app_private.title_fishing_log set rarity='common' where user_id=$1 and source='manual'",[ids[0]])
      expect((await feed()).rankings.mythic_rate).toEqual([expect.objectContaining({id:ids[0],rank:1,value:0})])
    }finally{await db.exec('rollback')}
  })
  it('uses the same signup-time and UUID tie order for all ranks, personal rank and neighbors',async()=>{
    await db.exec('begin')
    try{
      await db.query('update public.player_profiles set created_at=$1 where id=any($2::uuid[])',['2026-01-02T00:00:00Z',ids])
      await db.query('update public.player_profiles set created_at=$1 where id=$2',['2026-01-01T00:00:00Z',ids[6]])
      for(const user of ids)await db.query(`insert into app_private.ladder_runs(user_id,operation_id,mode,stake,choice,bridges,payouts,destination,reward) values($1,gen_random_uuid(),'calm',20,0,array_fill(0,array[12]),array[0,20,20,40],0,0)`,[user])
      const result=await asUser<HallFeed>(ids[3],'select public.hall_of_fame() data')
      expect(result.rankings.ladder_plays.map(p=>p.id)).toEqual([ids[6],...ids.slice(0,6)])
      expect(result.personal?.ladder_plays.rank).toBe(5)
      expect(result.personal?.ladder_plays.neighbors.map(p=>p.id)).toEqual(ids.slice(1,6))
      expect(result.personal?.ladder_plays.neighbors.map(p=>p.rank)).toEqual([3,4,5,6,7])
    }finally{await db.exec('rollback')}
  })
  it('returns every rank beyond TOP 5 along with exact personal rank and neighbors from the same ordered snapshot',async()=>{
    const result=await asUser<HallFeed>(ids[1],'select public.hall_of_fame() data')
    expect(result.rankings.casts.some(p=>p.id===ids[1])).toBe(true)
    expect(result.personal?.casts).toMatchObject({rank:7,value:1})
    expect(result.personal?.casts.neighbors.map(p=>p.rank)).toEqual([5,6,7])
    const middle=await asUser<HallFeed>(ids[4],'select public.hall_of_fame() data')
    expect(middle.personal?.casts.rank).toBe(4)
    expect(middle.personal?.casts.neighbors.map(p=>p.rank)).toEqual([2,3,4,5,6])
    expect(middle.personal?.mythic_rate).toMatchObject({rank:null,value:0,neighbors:[]})
    expect(middle.personal?.cleanings).toMatchObject({value:0})
  })
  it('splits arcade starts by game, counts each run once, and preserves account exclusion rules',async()=>{
    await db.exec('begin')
    try{
      for(const [i,user] of ids.entries())await db.query(`insert into app_private.ladder_runs(user_id,operation_id,mode,stake,choice,bridges,payouts,destination,reward)
       select $1,gen_random_uuid(),'calm',20,0,array_fill(0,array[12]),array[0,20,20,40],0,0 from generate_series(1,$2::int)`,[user,i+1])
      await db.query(`insert into public.odd_even_runs(user_id,operation_id,wins,round,stage) values($1,gen_random_uuid(),5,6,'decision')`,[ids[0]])
      await db.query(`insert into public.brick_game_runs(user_id,operation_id,seed,finished_at) select $1,gen_random_uuid(),i,case when i<3 then now() else null end from generate_series(1,3)i`,[ids[0]])
      let rankings=(await feed()).rankings
      expect(rankings.ladder_plays).toHaveLength(7)
      expect(rankings.ladder_plays[0]).toMatchObject({id:ids[6],value:7,rank:1})
      expect(rankings.odd_even_plays[0]).toMatchObject({id:ids[0],value:1})
      expect(rankings.brick_plays[0]).toMatchObject({id:ids[0],value:3})
      expect(rankings.shadow_plays[0]).toMatchObject({id:ids[0],value:1})
      expect(rankings.memory_plays[0]).toMatchObject({id:ids[0],value:1})
      expect(rankings.games[0]).toMatchObject({id:ids[0],value:7})
      const sections=await asUser<Record<string,number>>(ids[0],'select public.hall_section_counts() data')
      for(const key of ['ladder_plays','odd_even_plays','brick_plays','shadow_plays','memory_plays'])expect(sections[key]).toBe(0)
      await db.query('update auth.users set email=$1 where id=$2',['1@1.com',ids[6]])
      rankings=(await feed()).rankings
      expect(rankings.ladder_plays[0]).toMatchObject({id:ids[5],value:6,rank:1})
      expect(rankings.ladder_plays).toHaveLength(6)
      expect(rankings.ladder_plays.some(p=>p.id===ids[6])).toBe(false)
    }finally{await db.exec('rollback')}
  })
  it('combines catch sources, excludes gifts and non-fish, and includes every eligible participant', async () => {
    const { rankings } = await feed()
    expect(rankings.casts).toHaveLength(7)
    expect(rankings.casts[0]).toMatchObject({ id: ids[0], value: 100, rank: 1 })
    expect(rankings.casts[1]).toMatchObject({ id: ids[6], value: 6 })
    expect(rankings.fish[0].value).toBe(62)
    expect(rankings.mythic[0].value).toBe(3)
    expect(rankings.failure_rate).toHaveLength(1)
    expect(rankings.failure_rate[0].value).toBe(40)
    expect(rankings.casts.map(p=>p.rank)).toEqual([1,2,3,4,5,6,7])
  })
  it('uses ordered results and Korean calendar days for personal bests', async () => {
    const { rankings } = await feed()
    expect(rankings.daily[0].value).toBe(40)
    expect(rankings.success_run).toBeUndefined()
    expect(rankings.failure_run[0].value).toBe(40)
    expect(rankings.days).toBeUndefined()
    expect(rankings.trash).toHaveLength(7)
    expect(rankings.trash.every(p=>p.value===0)).toBe(true) // Expedition trash is not manual fishing trash.
    expect(rankings.collection[0].value).toBeGreaterThan(0)
  })
  it('counts completed help actions once and combines different minigames', async () => {
    const { rankings } = await feed()
    expect(rankings.helps[0]).toMatchObject({ id: ids[0], value: 3 })
    expect(rankings.games[0]).toMatchObject({ id: ids[0], value: 2 })
    expect(rankings.cleanings[0]).toMatchObject({ id: ids[0], value: 1 })
    expect(rankings.feedings[0]).toMatchObject({ id: ids[0], value: 1 })
    expect(rankings.voyages[0]).toMatchObject({ id: ids[0], value: 1 })
    expect(rankings.decorations[0]).toMatchObject({ id: ids[0], value: 1 })
    expect(rankings.mythic_rate).toHaveLength(1)
    expect(rankings.mythic_rate[0]).toMatchObject({ id: ids[0], value: 1 })
  })
  it('excludes the requested account before ranking all participants in every category', async () => {
    await db.exec('begin')
    try {
      await db.query('update auth.users set email=$1 where id=$2', ['1@1.com', ids[0]])
      const { rankings } = await feed()
      expect(rankings.casts).toHaveLength(6)
      expect(rankings.casts[0]).toMatchObject({ id: ids[6], value: 6, rank: 1 })
      for (const rows of Object.values(rankings))
        expect(rows.some((p) => p.id === ids[0])).toBe(false)
      expect(JSON.stringify(rankings)).not.toContain('1@1.com')
    } finally {
      await db.exec('rollback')
    }
  })
  it('separates arcade income and spend, gift sends, completed trades, titles and control misses', async () => {
    await db.exec('begin')
    try {
      await db.query(
        `insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values
        ($1,gen_random_uuid(),'charge','arcade:brick-breaker:fixture',120),
        ($1,gen_random_uuid(),'charge','arcade:ladder:fixture',80),
        ($1,gen_random_uuid(),'buy','arcade:memory',-10),
        ($1,gen_random_uuid(),'buy','arcade:ladder:fixture',-50),
        ($1,gen_random_uuid(),'charge','quest:fixture',999),
        ($1,gen_random_uuid(),'buy','fishing:bait',-999)`,
        [ids[0]],
      )
      await db.query(
        `insert into public.collectible_gifts(sender_id,recipient_id,sender_name,recipient_name,
        operation_id,collectible_ids,species,quantity,source) values
        ($1,$2,'보낸퐁','받은퐁',gen_random_uuid(),array[gen_random_uuid(),gen_random_uuid()],'[]',2,'friend')`,
        [ids[0], ids[1]],
      )
      await db.query(
        `insert into public.player_wallets(user_id,gold,inventory) values
        ($1,10000,'{"bait":10}'),($2,10000,'{"bait":10}')
        on conflict(user_id) do update set gold=excluded.gold,inventory=excluded.inventory`,
        [ids[0], ids[1]],
      )
      for (const state of ['completed', 'cancelled', 'active']) {
        const listing = await asUser<{ id: string }>(
          ids[0],
          "select public.exchange_post('sell','bait','bait',1,'gold','gold',100,$1) data",
          [crypto.randomUUID()],
        )
        if (state === 'completed')
          await asUser(ids[1], "select public.exchange_action($1,'accept') data", [listing.id])
        if (state === 'cancelled')
          await asUser(ids[0], "select public.exchange_action($1,'cancel') data", [listing.id])
      }
      await db.query(
        `insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,
        eligible,rarity,wait_seconds,failure_at,failure_reason,expires_at,finished_at,result)
        select $1,gen_random_uuid(),'pongdang','bait',false,'common',3,5,'bait',now(),now(),
        jsonb_build_object('failure_reason',reason) from unnest(array['minigame','minigame','expired','bait','escape','wave']) reason`,
        [ids[0]],
      )
      const { rankings } = await feed()
      expect(rankings.arcade_earned[0]).toMatchObject({ id: ids[0], value: 200 })
      expect(rankings.arcade_spent[0]).toMatchObject({ id: ids[0], value: 60 })
      expect(rankings.gifts[0]).toMatchObject({ id: ids[0], value: 1 })
      expect(rankings.sales[0]).toMatchObject({ id: ids[0], value: 1 })
      expect(rankings.purchases[0]).toMatchObject({ id: ids[1], value: 1 })
      expect(rankings.control_miss[0]).toMatchObject({ id: ids[0], value: 2 })
      const titleCount = (
        await db.query<{ n: number }>(
          'select count(*)::int n from public.player_titles where user_id=$1',
          [ids[0]],
        )
      ).rows[0].n
      expect(titleCount).toBeGreaterThan(0)
      expect(rankings.titles.find((p) => p.id === ids[0])?.value).toBe(titleCount)
    } finally {
      await db.exec('rollback')
    }
  })
})

describe('hall player walls', () => {
  it('keeps one vote per voter across categories, allows switching and undo, and ranks received votes', async () => {
    expect(await react(1)).toMatchObject({ likes: 1, dislikes: 0, myReaction: 1 })
    expect(await react(1)).toMatchObject({ likes: 1 })
    expect((await feed()).rankings.likes[0]).toMatchObject({ id: ids[0], value: 1 })
    expect(await react(-1)).toMatchObject({ likes: 0, dislikes: 1, myReaction: -1 })
    expect((await feed()).rankings.dislikes[0].value).toBe(1)
    expect(await react(0)).toMatchObject({ likes: 0, dislikes: 0, myReaction: 0 })
    await expect(react(1, ids[0])).rejects.toThrow('HALL_SELF_REACTION')
    await expect(react(2)).rejects.toThrow('INVALID_HALL')
  })
  it('enforces comment ownership, length, rate limits, and bounded pagination', async () => {
    const data = await asUser<HallWall>(
      ids[1],
      "select public.hall_action($1,'comment',0,'  축하해요!  ') data",
      [ids[0]],
    )
    expect(data.total).toBe(1)
    expect(data.comments[0]).toMatchObject({ body: '축하해요!', author_id: ids[1] })
    await expect(
      asUser(ids[1], "select public.hall_action($1,'comment',0,'또 댓글') data", [ids[0]]),
    ).rejects.toThrow('HALL_RATE_LIMIT')
    await expect(
      asUser(ids[2], "select public.hall_action($1,'delete_comment',0,'',$2) data", [
        ids[0],
        data.comments[0].id,
      ]),
    ).rejects.toThrow('NOT_ALLOWED')
    await expect(
      asUser(ids[2], "select public.hall_action($1,'comment',0,$2) data", [
        ids[0],
        'x'.repeat(501),
      ]),
    ).rejects.toThrow('INVALID_HALL')
    expect((await wall()).comments).toHaveLength(1)
    await asUser(ids[1], "select public.hall_action($1,'delete_comment',0,'',$2) data", [
      ids[0],
      data.comments[0].id,
    ])
    expect((await wall()).total).toBe(0)
    await expect(asUser(ids[1], 'select public.hall_wall($1,-1) data', [ids[0]])).rejects.toThrow(
      'INVALID_HALL',
    )
  })
  it('blocks direct private writes and unauthenticated RPC access', async () => {
    await expect(
      asUser(ids[1], 'insert into app_private.hall_reactions values($1,$2,1)', [ids[0], ids[1]]),
    ).rejects.toThrow(/permission denied/)
    await expect(db.query('select public.hall_of_fame()')).rejects.toThrow('AUTH_REQUIRED')
    await db.exec('set role anon')
    try {
      await expect(db.query('select public.hall_of_fame()')).rejects.toThrow(/permission denied/)
    } finally {
      await db.exec('reset role')
    }
  })
  it('paginates comments deterministically even when timestamps are equal', async () => {
    await db.query(
      `insert into app_private.hall_comments(target_id,author_id,body,created_at)
      select $1,$2,i::text,timestamptz '2026-01-01 00:00+00' from generate_series(1,35) i`,
      [ids[0], ids[1]],
    )
    const first = await wall()
    const second = await asUser<HallWall>(ids[1], 'select public.hall_wall($1,30) data', [ids[0]])
    expect(first.comments).toHaveLength(30)
    expect(second.comments).toHaveLength(5)
    expect(new Set([...first.comments, ...second.comments].map((c) => c.id)).size).toBe(35)
  })
})
