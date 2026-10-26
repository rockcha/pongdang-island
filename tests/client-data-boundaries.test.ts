import { expect, it } from 'vitest'
// @ts-expect-error The CLI module is plain JavaScript, shared with this test.
import { inspectSource } from '../scripts/check-client-data.mjs'

it('rejects RPC reads and writes introduced directly in screens or unmanaged API functions', () => {
  expect(
    inspectSource('src/features/example/page.tsx', `function Page(){return client.rpc('state')}`),
  ).toHaveLength(1)
  expect(
    inspectSource(
      'src/features/example/api.ts',
      `export async function load(){return client.rpc('state')}`,
    ),
  ).toHaveLength(1)
  expect(
    inspectSource(
      'src/features/example/api.ts',
      `export async function buy(){return client.rpc('buy')}`,
    ),
  ).toHaveLength(1)
  expect(
    inspectSource(
      'api.ts',
      `export const load=()=>readAccountResource('items',signal=>client.rpc('state'))`,
    ),
  ).toHaveLength(1)
})
it('accepts shared resources, cancellable readers, and commands without retry wrappers', () => {
  expect(
    inspectSource(
      'src/features/example/api.ts',
      `
  export const load=()=>readAccountResource(['items',page],signal=>client.rpc('state').abortSignal(signal))
  export function read(signal:AbortSignal){return client.rpc('state').abortSignal(signal)}
  export const buy=()=>accountCommand(()=>client.rpc('buy'),{invalidate:['items']})
 `,
    ),
  ).toEqual([])
})
it('fingerprints legacy behavior changes but tolerates comments and formatting', () => {
  const inspect = (text: string) => inspectSource('api.ts', text)[0].fingerprint
  expect(inspect(`function old(){ return client.rpc('state') }`)).toBe(
    inspect(`function old() { /* explanation */ return client.rpc('state'); }`),
  )
  expect(inspect(`function old(){return client.rpc('state')}`)).not.toBe(
    inspect(`function old(){return client.rpc('new_state')}`),
  )
})
it('keeps legacy JSX fingerprints stable across Windows checkout line endings', () => {
  const lf = "function Legacy(){client.rpc('state');return <button>\n  Vote\n</button>}"
  expect(inspectSource('page.tsx', lf.replaceAll('\n', '\r\n'))).toEqual(
    inspectSource('page.tsx', lf),
  )
})
