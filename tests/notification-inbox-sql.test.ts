// @vitest-environment node
import { afterAll, beforeAll, expect, it } from 'vitest'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'
let db
const owner = crypto.randomUUID(),
  other = crypto.randomUUID()
async function asUser(id: string | null, sql = 'select public.notification_inbox() value') {
  await db.exec(id ? 'set role authenticated' : 'set role anon')
  try {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? ''])
    return (await db.query(sql)).rows[0]?.value
  } finally {
    await db.exec('reset role')
  }
}
beforeAll(async () => {
  db = await createLocalDatabase()
  await replayMigrations(db)
  for (const [id, name] of [
    [owner, 'Owner'],
    [other, 'Other'],
  ]) {
    await db.query('insert into auth.users(id) values($1)', [id])
    await db.query('insert into public.player_profiles(id,nickname) values($1,$2)', [id, name])
  }
  await db.query('delete from public.notifications where recipient_id in ($1,$2)', [owner, other])
}, 60000)
afterAll(async () => {
  await db?.close()
})
it('counts beyond the 100-item page, excludes other accounts and keeps deterministic order', async () => {
  await db.query(
    "insert into public.notifications(recipient_id,category,kind,title,created_at) select $1,'general','system','own-'||n,now()-(106-n)*interval '1 second' from generate_series(1,105) n",
    [owner],
  )
  await db.query(
    "insert into public.notifications(recipient_id,category,kind,title) values($1,'general','system','private-other')",
    [other],
  )
  const inbox = await asUser(owner)
  expect(inbox.notifications).toHaveLength(100)
  expect(inbox.notifications[0].title).toBe('own-105')
  expect(inbox.notifications[99].title).toBe('own-6')
  expect(inbox.unread.general).toBe(105)
  expect(inbox.notifications.some((n) => n.recipient_id !== owner)).toBe(false)
  expect((await asUser(other)).unread.general).toBe(1)
  await expect(asUser(null)).rejects.toThrow(/permission denied/)
  await db.exec('set role authenticated')
  await db.query("select set_config('request.jwt.claim.sub','',false)")
  await expect(db.query('select public.notification_inbox()')).rejects.toThrow('AUTH_REQUIRED')
  await db.exec('reset role')
})
it('counts pending gifts independently of read notices and excludes exchange escrow', async () => {
  const baseline = (await asUser(owner)).unread.gift
  for (const hold of [false, true])
    await db.query(
      `insert into public.collectible_gifts(sender_id,recipient_id,sender_name,recipient_name,operation_id,collectible_ids,species,quantity,exchange_hold,source,reward_kind)
    values($1,$2,'Other','Owner',$3,'{}','{}',100,$4,'exchange','gold')`,
      [other, owner, crypto.randomUUID(), hold],
    )
  await db.query(
    "update public.notifications set read_at=now() where recipient_id=$1 and category='gift'",
    [owner],
  )
  expect((await asUser(owner)).unread.gift).toBe(baseline + 1)
})
it('retains the published-notice visibility policy and the embedded request contract', async () => {
  const request = crypto.randomUUID(),
    notice = crypto.randomUUID()
  await db.query('insert into public.friend_requests(id,sender_id,recipient_id) values($1,$2,$3)', [
    request,
    other,
    owner,
  ])
  await db.query(
    "insert into public.notifications(recipient_id,actor_id,category,kind,title,request_id) values($1,$2,'friend','friend_request','Request',$3) on conflict do nothing",
    [owner, other, request],
  )
  await db.query(
    "insert into public.notices(id,category,title,body,status,author_id) values($1,'update','Draft','Hidden','draft',$2)",
    [notice, other],
  )
  await db.query(
    "insert into public.notifications(recipient_id,category,kind,title,notice_id) values($1,'notice','announcement','Hidden notice',$2)",
    [owner, notice],
  )
  const inbox = await asUser(owner)
  expect(inbox.unread.notice).toBe(0)
  expect(inbox.notifications.some((n) => n.notice_id === notice)).toBe(false)
  const item = inbox.notifications.find((n) => n.request_id === request)
  expect(item?.request).toMatchObject({
    id: request,
    sender_id: other,
    recipient_id: owner,
    status: 'pending',
  })
})
