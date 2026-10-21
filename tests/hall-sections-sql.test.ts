// @vitest-environment node
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'
import { hallCategories, funCategories } from '../src/features/hall-of-fame/categories'
import type { HallSectionWall } from '../src/features/hall-of-fame/api'
let db: Awaited<ReturnType<typeof createLocalDatabase>>
const users = ['00000000-0000-0000-0000-000000008901', '00000000-0000-0000-0000-000000008902']
async function asUser<T = HallSectionWall>(user: string, sql: string, args: unknown[] = []) {
  await db.exec('set role authenticated')
  try {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user])
    return (await db.query<{ data: T }>(sql, args)).rows[0]?.data
  } finally {
    await db.exec('reset role')
    await db.query("select set_config('request.jwt.claim.sub','',false)")
  }
}
const wall = (section = 'casts', offset = 0) =>
  asUser(users[0], 'select public.hall_section_wall($1,$2) data', [section, offset])
const act = (
  user: string,
  section: string,
  action: string,
  body = '',
  comment: string | null = null,
  value = 0,
) =>
  asUser(user, 'select public.hall_section_action($1,$2,$3,$4,$5) data', [
    section,
    action,
    body,
    comment,
    value,
  ])
beforeAll(async () => {
  db = await createLocalDatabase()
  await replayMigrations(db)
  for (const [i, u] of users.entries()) {
    await db.query('insert into auth.users(id) values($1)', [u])
    await db.query('insert into public.player_profiles(id,nickname) values($1,$2)', [
      u,
      '수다퐁' + i,
    ])
  }
}, 60000)
beforeEach(async () => await db.exec('truncate app_private.hall_section_comments cascade'))

it('saves, switches and clears emotions without counting them as likes or dislikes', async () => {
  const id = (await act(users[0], 'casts', 'comment', 'emotions')).comments[0].id
  expect((await act(users[1], 'casts', 'react', '', id, 2)).comments[0]).toMatchObject({
    sad: 1,
    angry: 0,
    likes: 0,
    dislikes: 0,
    myReaction: 2,
  })
  expect((await act(users[1], 'casts', 'react', '', id, 3)).comments[0]).toMatchObject({
    sad: 0,
    angry: 1,
    myReaction: 3,
  })
  expect((await act(users[1], 'casts', 'react', '', id, 0)).comments[0]).toMatchObject({
    sad: 0,
    angry: 0,
    myReaction: 0,
  })
  await expect(act(users[0], 'casts', 'react', '', id, 2)).rejects.toThrow('HALL_SELF_REACTION')
  await expect(act(users[1], 'casts', 'react', '', id, 4)).rejects.toThrow('INVALID_HALL')
})
afterAll(async () => await db?.close())
it('registers exactly the visible sections, without retired records', async () => {
  const ids = (
    await db.query<{ id: string }>('select id from app_private.hall_sections order by id')
  ).rows.map((r) => r.id)
  expect(ids).toEqual([...hallCategories, ...funCategories].map((c) => c.id).sort())
  await expect(wall('success_run')).rejects.toThrow('HALL_NOT_FOUND')
  await expect(wall('days')).rejects.toThrow('HALL_NOT_FOUND')
})
it('keeps comments on a section even with no ranked player and isolates other sections', async () => {
  const result = await act(users[0], 'casts', 'comment', '  @수다퐁1 낚시 같이 해요!  ')
  expect(result.total).toBe(1)
  expect(result.comments[0]).toMatchObject({
    body: '@수다퐁1 낚시 같이 해요!',
    author_id: users[0],
    likes: 0,
    dislikes: 0,
    myReaction: 0,
  })
  expect((await wall()).total).toBe(1)
  expect((await wall('fish')).total).toBe(0)
  const counts = await asUser<Record<string, number>>(
    users[0],
    'select public.hall_section_counts() data',
  )
  expect(counts.casts).toBe(1)
  expect(counts.fish).toBe(0)
})
it('enforces author deletion, section identity, length and a cross-section rate limit', async () => {
  await expect(act(users[0], 'casts', 'comment', ' ')).rejects.toThrow('INVALID_HALL')
  await expect(act(users[0], 'casts', 'comment', 'x'.repeat(501))).rejects.toThrow('INVALID_HALL')
  const comment = (await act(users[0], 'casts', 'comment', '축하합니다')).comments[0]
  await expect(act(users[0], 'fish', 'comment', '연속 댓글')).rejects.toThrow('HALL_RATE_LIMIT')
  await expect(act(users[1], 'casts', 'delete_comment', '', comment.id)).rejects.toThrow(
    'NOT_ALLOWED',
  )
  await expect(act(users[0], 'fish', 'delete_comment', '', comment.id)).rejects.toThrow(
    'NOT_ALLOWED',
  )
  expect((await act(users[0], 'casts', 'delete_comment', '', comment.id)).total).toBe(0)
})
it('keeps a single reaction per comment, switches and removes it, and rejects self/cross-section votes', async () => {
  const id = (await act(users[0], 'casts', 'comment', '이야기 시작')).comments[0].id
  for (let i = 0; i < 2; i++)
    expect((await act(users[1], 'casts', 'react', '', id, 1)).comments[0]).toMatchObject({
      likes: 1,
      dislikes: 0,
      myReaction: 1,
    })
  expect((await act(users[1], 'casts', 'react', '', id, -1)).comments[0]).toMatchObject({
    likes: 0,
    dislikes: 1,
    myReaction: -1,
  })
  expect((await act(users[1], 'casts', 'react', '', id, 0)).comments[0]).toMatchObject({
    likes: 0,
    dislikes: 0,
    myReaction: 0,
  })
  await expect(act(users[0], 'casts', 'react', '', id, 1)).rejects.toThrow('HALL_SELF_REACTION')
  await expect(act(users[1], 'fish', 'react', '', id, 1)).rejects.toThrow('HALL_NOT_FOUND')
  await expect(act(users[1], 'casts', 'react', '', id, 4)).rejects.toThrow('INVALID_HALL')
  await act(users[1], 'casts', 'react', '', id, 1)
  const rankings = await asUser<{ rankings: Record<string, { id: string; value: number }[]> }>(
    users[0],
    'select public.hall_of_fame() data',
  )
  expect(rankings.rankings.likes.find((p) => p.id === users[0])?.value).toBe(1)
  await act(users[0], 'casts', 'delete_comment', '', id)
  expect(
    (await db.query('select * from app_private.hall_section_comment_reactions')).rows,
  ).toHaveLength(0)
})
it('paginates equal timestamps without duplication and rejects invalid offsets', async () => {
  await db.query(
    "insert into app_private.hall_section_comments(section_id,author_id,body,created_at) select 'casts',$1,i::text,timestamptz '2026-01-01 00:00+00' from generate_series(1,35)i",
    [users[0]],
  )
  const first = await wall(),
    second = await wall('casts', 30)
  expect(first.comments).toHaveLength(30)
  expect(second.comments).toHaveLength(5)
  expect(new Set([...first.comments, ...second.comments].map((c) => c.id)).size).toBe(35)
  await expect(wall('casts', -1)).rejects.toThrow('INVALID_HALL')
})
it('retains legacy player comments without assigning them to arbitrary sections', async () => {
  const old = (
    await db.query<{ id: string }>(
      "insert into app_private.hall_comments(target_id,author_id,body) values($1,$2,'기존 개인 댓글') returning id",
      users,
    )
  ).rows[0].id
  await act(users[0], 'casts', 'comment', '새 항목 댓글')
  expect(
    (await db.query('select body from app_private.hall_comments where id=$1', [old])).rows,
  ).toEqual([{ body: '기존 개인 댓글' }])
  expect((await wall()).comments.map((c) => c.body)).toEqual(['새 항목 댓글'])
})
it('requires authentication and blocks direct reads/writes to all discussion tables', async () => {
  await expect(db.query("select public.hall_section_wall('casts')")).rejects.toThrow(
    'AUTH_REQUIRED',
  )
  for (const table of ['hall_sections', 'hall_section_comments', 'hall_section_comment_reactions'])
    await expect(asUser(users[0], 'select * from app_private.' + table)).rejects.toThrow(
      /permission denied/,
    )
  await db.exec('set role anon')
  try {
    for (const sql of [
      "select public.hall_section_wall('casts')",
      'select public.hall_section_counts()',
      "select public.hall_section_action('casts','comment','test')",
    ])
      await expect(db.query(sql)).rejects.toThrow(/permission denied/)
  } finally {
    await db.exec('reset role')
  }
})
