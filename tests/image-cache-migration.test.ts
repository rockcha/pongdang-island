// @vitest-environment node
import {expect,it,vi} from 'vitest'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
const source=readFileSync('public/image-cache-migration.js','utf8')
const base='https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/'
function setup(){
 const stores=new Map<string,Map<string,Response>>()
 const caches={keys:async()=>[...stores.keys()],delete:vi.fn(async(name:string)=>stores.delete(name)),open:async(name:string)=>{
  const data=stores.get(name)??new Map<string,Response>();stores.set(name,data)
  return {keys:async()=>[...data.keys()].map(url=>({url})),match:async(request:{url:string})=>data.get(request.url)?.clone(),put:async(request:{url:string},response:Response)=>{data.set(request.url,response.clone())},delete:async(request:{url:string})=>data.delete(request.url)}
 }}
 let listener:(event:any)=>void
 const fetch=vi.fn(()=>{throw Error('Migration must not fetch')})
 runInNewContext(source,{self:{addEventListener:(_name:string,fn:any)=>{listener=fn}},caches,URL,fetch})
 return {stores,caches,fetch,activate:async()=>{let result:Promise<void>;listener!({waitUntil:(promise:Promise<void>)=>{result=promise}});await result!}}
}
it('moves cached bytes locally, retains versioned keys and preserves a newer entry',async()=>{
 const t=setup(),sprite=base+'collectibles/fish/rare/fish_v1_sprite.png?v=1',thumb=base+'collectibles/fish/rare/fish_thumbnail.png',background=base+'aquarium-backgrounds/default.png?v=2'
 t.stores.set('public-game-art-v1',new Map([[sprite,new Response('old sprite')],[thumb,new Response('thumbnail')],[background,new Response('background')]]))
 t.stores.set('game-art-sprites-v1',new Map([[sprite,new Response('new sprite')]]))
 await t.activate()
 expect(await t.stores.get('game-art-sprites-v1')!.get(sprite)!.text()).toBe('new sprite')
 expect(await t.stores.get('game-art-thumbnails-v1')!.get(thumb)!.text()).toBe('thumbnail')
 expect(await t.stores.get('game-art-backgrounds-v1')!.get(background)!.text()).toBe('background')
 expect(t.stores.has('public-game-art-v1')).toBe(false);expect(t.fetch).not.toHaveBeenCalled()
})
it('does nothing on subsequent activations and retains remaining originals if CacheStorage fails',async()=>{
 const t=setup();await t.activate();expect(t.stores.size).toBe(0)
 const key=base+'collectibles/fish/rare/fish_thumbnail.png'
 t.stores.set('public-game-art-v1',new Map([[key,new Response('original')]]))
 const open=t.caches.open;t.caches.open=async name=>{if(name!=='public-game-art-v1')throw Error('quota');return open(name)}
 await t.activate();expect(t.stores.get('public-game-art-v1')?.has(key)).toBe(true)
 t.caches.open=open;await t.activate();expect(t.stores.has('public-game-art-v1')).toBe(false)
 expect(t.fetch).not.toHaveBeenCalled()
})
