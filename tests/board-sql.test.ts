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
it('keeps replies one level deep and sends each recipient one notification per comment', async () => {
  await action(other, 'comment', { post_id: post, id: comment, body: '댓글' })
  await action(other, 'comment', { post_id: post, id: comment, body: '댓글' })
  expect(
    (
      await db.query('select count(*)::int n from public.notifications where board_post_id=$1', [
        post,
      ])
    ).rows[0].n,
  ).toBe(1)
  await action(author, 'comment', { post_id: post, id: reply, parent_id: comment, body: '답글' })
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
