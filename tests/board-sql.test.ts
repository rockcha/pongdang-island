// @vitest-environment node
import { afterAll, beforeAll, expect, it } from 'vitest'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'
let db
const [author, other] = [81, 82].map(
  (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`,
)
const post = '81000000-0000-0000-0000-000000000001',
  comment = '82000000-0000-0000-0000-000000000001',
  reply = '82000000-0000-0000-0000-000000000002'
async function asUser(uid, sql, params = []) {
  await db.exec(uid ? 'set role authenticated' : 'set role anon')
  try {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid ?? ''])
    return await db.query(sql, params)
  } finally {
    await db.exec('reset role')
    await db.query("select set_config('request.jwt.claim.sub','',false)")
  }
}
async function action(uid, kind, payload) {
  return asUser(uid, 'select public.board_action($1,$2)', [kind, JSON.stringify(payload)])
}
beforeAll(async () => {
  db = await createLocalDatabase()
  await replayMigrations(db)
  for (const [i, id] of [author, other].entries()) {
    await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)', [
      id,
      JSON.stringify({ game_nickname: `board${i}` }),
    ])
    await asUser(id, 'select public.sync_player_profile()')
  }
}, 60000)
afterAll(async () => {
  await db?.close()
})
it('paginates comments from oldest to newest with stable ordering for equal timestamps',async()=>{
 const pid=crypto.randomUUID()
 await db.query("insert into public.board_posts(id,author_id,title,body) values($1,$2,'댓글 순서','본문')",[pid,author])
 await db.query("insert into public.board_comments(id,post_id,author_id,body,created_at) select ('99000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,$1,$2,n::text,'2026-10-01'::timestamptz+make_interval(secs=>(n/2)) from generate_series(1,55)n order by n desc",[pid,author])
 const load=async(offset)=>(await asUser(author,'select public.board_detail($1,$2) r',[pid,offset])).rows[0].r
 const first=await load(0),last=await load(50)
 expect(first.comments.map(c=>Number(c.body))).toEqual(Array.from({length:50},(_,i)=>i+1))
 expect(last.comments.map(c=>Number(c.body))).toEqual([51,52,53,54,55])
 expect(first.comment_total).toBe(55)
 await db.query('delete from public.board_posts where id=$1',[pid])
})
it('creates content only through authenticated APIs and denies forged ownership and image paths', async () => {
  await expect(asUser(null, 'select public.board_feed()')).rejects.toThrow(/permission denied/)
  await expect(
    asUser(
      author,
      "insert into public.board_posts(author_id,title,body) values($1,'fake','fake')",
      [other],
    ),
  ).rejects.toThrow(/permission denied/)
  await action(author, 'save', { post_id: post, title: '첫 이야기', body: '반가워요', images: [] })
  await expect(
    action(other, 'save', { post_id: post, title: '도용', body: '변조', images: [] }),
  ).rejects.toThrow(/NOT_ALLOWED/)
  await expect(action(other, 'delete', { post_id: post })).rejects.toThrow(/NOT_ALLOWED/)
  await expect(
    action(author, 'save', {
      post_id: post,
      title: '사진',
      body: '사진',
      images: [`${other}/${post}/fake.png`],
    }),
  ).rejects.toThrow(/INVALID_BOARD_IMAGE/)
  const feed = (await asUser(other, 'select public.board_feed() as feed')).rows[0].feed
  expect(feed.items[0]).toMatchObject({
    id: post,
    author_id: author,
    author_name: 'board0',
    likes: 0,
    dislikes: 0,
  })
  expect(
    (await asUser(other, "select public.board_feed('latest',true) as feed")).rows[0].feed.items,
  ).toHaveLength(0)
})
it('supports self reactions, mutually exclusive votes, cancellation and retries', async () => {
  await action(author, 'react', { post_id: post, value: 1 })
  await action(author, 'react', { post_id: post, value: 1 })
  let item = (await asUser(author, 'select public.board_detail($1) as detail', [post])).rows[0]
    .detail.post
  expect(item).toMatchObject({ likes: 1, dislikes: 0, my_reaction: 1 })
  await action(author, 'react', { post_id: post, value: -1 })
  item = (await asUser(author, 'select public.board_detail($1) as detail', [post])).rows[0].detail
    .post
  expect(item).toMatchObject({ likes: 0, dislikes: 1, my_reaction: -1 })
  await action(author, 'react', { post_id: post, value: 0 })
  expect((await db.query('select count(*)::int n from public.board_reactions')).rows[0].n).toBe(0)
})
it('rejects new replies, preserves legacy replies and sends one notification per comment', async () => {
  await action(other, 'comment', { post_id: post, id: comment, body: '댓글' })
  await action(other, 'comment', { post_id: post, id: comment, body: '댓글' })
  expect(
    (
      await db.query('select count(*)::int n from public.notifications where board_post_id=$1', [
        post,
      ])
    ).rows[0].n,
  ).toBe(1)
  await expect(action(author, 'comment', { post_id: post, id: reply, parent_id: comment, body: '답글' })).rejects.toThrow(/BOARD_REPLIES_DISABLED/)
  expect((await db.query('select count(*)::int n from public.notifications where board_post_id=$1',[post])).rows[0].n).toBe(1)
  // Seed an old reply as the database owner, representing content before the restriction.
  await db.exec('alter table public.board_comments disable trigger board_comments_no_new_replies')
  try{await db.query('insert into public.board_comments(id,post_id,author_id,parent_id,body) values($1,$2,$3,$4,$5)',[reply,post,author,comment,'기존 답글'])}
  finally{await db.exec('alter table public.board_comments enable trigger board_comments_no_new_replies')}
  await action(author,'edit_comment',{post_id:post,id:reply,body:'수정한 답글'})
  expect((await db.query('select body from public.board_comments where id=$1',[reply])).rows[0].body).toBe('수정한 답글')
  await expect(
    action(other, 'comment', {
      post_id: post,
      id: '82000000-0000-0000-0000-000000000003',
      parent_id: reply,
      body: '깊은 답글',
    }),
  ).rejects.toThrow(/INVALID_BOARD_REPLY/)
  await expect(
    action(author, 'edit_comment', { post_id: post, id: comment, body: '도용' }),
  ).rejects.toThrow(/NOT_ALLOWED/)
  await action(other, 'react', { post_id: post, comment_id: reply, value: 1 })
  const detail = (await asUser(author, 'select public.board_detail($1) as detail', [post])).rows[0]
    .detail
  expect(detail.comments.find((c) => c.id === reply)).toMatchObject({
    parent_author_name: 'board1',
    likes: 1,
  })
  await action(other, 'delete_comment', { post_id: post, id: comment })
  expect(
    (await db.query('select body,deleted from public.board_comments where id=$1', [comment]))
      .rows[0],
  ).toEqual({ body: '', deleted: true })
  expect(
    (await db.query('select id from public.board_comments where id=$1', [reply])).rows,
  ).toHaveLength(1)
})
it('deletes a post with comments, reactions and associated notifications atomically', async () => {
  await action(author, 'delete', { post_id: post })
  for (const table of ['board_posts', 'board_comments', 'board_reactions'])
    expect((await db.query(`select count(*)::int n from public.${table}`)).rows[0].n).toBe(0)
  expect(
    (
      await db.query('select count(*)::int n from public.notifications where board_post_id=$1', [
        post,
      ])
    ).rows[0].n,
  ).toBe(0)
})
it('isolates image uploads by author and prevents deleting images still used by a post',async()=>{
 const path=`${author}/${post}/10000000-0000-0000-0000-000000000001.png`
 await expect(asUser(other,"insert into storage.objects(bucket_id,name) values('board-images',$1)",[path])).rejects.toThrow(/row-level security/)
 await asUser(author,"insert into storage.objects(bucket_id,name) values('board-images',$1)",[path])
 expect((await asUser(other,"select name from storage.objects where bucket_id='board-images'")).rows).toHaveLength(0)
 await action(author,'save',{post_id:post,title:'사진 이야기',body:'사진 첨부',images:[path]})
 expect((await asUser(other,"select name from storage.objects where bucket_id='board-images'")).rows).toHaveLength(1)
 expect((await asUser(author,"delete from storage.objects where bucket_id='board-images' returning name")).rows).toHaveLength(0)
 await action(author,'save',{post_id:post,title:'사진 이야기',body:'사진 삭제',images:[]})
 expect((await asUser(author,"delete from storage.objects where bucket_id='board-images' returning name")).rows).toHaveLength(1)
 await action(author,'delete',{post_id:post})
})
