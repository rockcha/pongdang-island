import { QueryClient, queryOptions, hashKey } from '@tanstack/react-query'

export type AccountResource = string | readonly [string, ...unknown[]]
export const resourceParts = (resource: AccountResource) =>
  typeof resource === 'string' ? [resource] : resource
export const accountQueryKey = (owner: string, resource: AccountResource) =>
  ['account', owner, ...resourceParts(resource)] as const
export const appQueryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, gcTime: 300_000, retry: false, refetchOnWindowFocus: true },
    // Financial commands retain their existing operation IDs and explicit retry flow.
    mutations: { retry: false },
  },
})

type Scope = { owner: string; generation: number }
let scope: Scope | null = null
let generation = 0
export const getQueryAccount = () => scope
export class AccountChangedError extends Error {
  constructor() {
    super('ACCOUNT_CHANGED')
    this.name = 'AccountChangedError'
  }
}
export const isCurrentAccount = (started: Scope | null) => started === scope

/** Called synchronously by Auth before publishing the next session to React. */
export function setQueryAccount(owner: string | null) {
  if ((scope?.owner ?? null) === owner) return
  scope = owner ? { owner, generation: ++generation } : null
  void appQueryClient.cancelQueries({ queryKey: ['account'] })
  appQueryClient.removeQueries({ queryKey: ['account'] })
}

export function accountOptions<T>(
  owner: string,
  resource: AccountResource,
  read: (signal: AbortSignal) => Promise<T>,
) {
  return queryOptions({
    queryKey: accountQueryKey(owner, resource),
    queryFn: ({ signal }) => read(signal),
  })
}

/** Imperative screens and query observers share the same key and in-flight request. */
export async function readAccountResource<T>(
  resource: AccountResource,
  read: (signal: AbortSignal) => Promise<T>,
  refresh: { fresh?: boolean } = {},
): Promise<T> {
  const current = scope
  // Standalone development screens can mount outside the authenticated app shell.
  if (!current) {
    const data = await read(new AbortController().signal)
    if (!isCurrentAccount(current)) throw new AccountChangedError()
    return data
  }
  const options = accountOptions(current.owner, resource, read)
  const data = await appQueryClient.fetchQuery({
    ...options,
    ...(refresh.fresh ? { staleTime: 0 } : {}),
  })
  if (!isCurrentAccount(current)) throw new AccountChangedError()
  // Legacy imperative screens sample serverNow when applying a snapshot. A cache
  // hit must advance that sample, otherwise their countdown would restart.
  if (
    data &&
    typeof data === 'object' &&
    'serverNow' in data &&
    typeof data.serverNow === 'string'
  ) {
    const sampledAt = appQueryClient.getQueryState(options.queryKey)?.dataUpdatedAt ?? Date.now()
    return {
      ...data,
      serverNow: new Date(
        Date.parse(data.serverNow) + Math.max(0, Date.now() - sampledAt),
      ).toISOString(),
    }
  }
  return data
}

export function invalidateAccountResource(
  resource: AccountResource,
  owner = scope?.owner,
  except?: AccountResource,
) {
  if (!owner) return
  const excluded = except ? hashKey(accountQueryKey(owner, except)) : undefined
  const filters = {
    queryKey: accountQueryKey(owner, resource),
    predicate: (query: { queryHash: string }) => query.queryHash !== excluded,
  }
  void appQueryClient.cancelQueries(filters)
  void appQueryClient.invalidateQueries(filters, { cancelRefetch: false })
}

/** Only a confirmed response from the current account may replace private cached data. */
export function publishAccountResource<T>(
  resource: AccountResource,
  data: T,
  started: Scope | null,
  standaloneOwner?: string,
) {
  const owner = started?.owner ?? standaloneOwner
  if (!owner || started !== scope) return false
  const queryKey = accountQueryKey(owner, resource)
  void appQueryClient.cancelQueries({ queryKey })
  appQueryClient.setQueryData(queryKey, data)
  return true
}

export function resourceChanged<T>(
  resource: string,
  event: string,
  data: T,
  started: Scope | null,
) {
  if (!isCurrentAccount(started)) return
  const updated = publishAccountResource(resource, data, started)
  window.dispatchEvent(
    new CustomEvent(event, { detail: { owner: started?.owner, resource, updated } }),
  )
}

export const resourceEvents: Record<string, string[]> = {
  'board-changed':['new-content'],
  'exchange-changed':['new-content','flea','menu-status','flea-inventory'],
  'showcase-changed':['new-content'],
  'flea-changed':['flea','new-content','menu-status'],
  'wallet-changed': ['wallet','flea-inventory','flea','menu-status'],
  'attendance-changed': ['wallet'],
  'experience-changed': ['experience'],
  'personal-bait-changed': ['menu-status'],
  'production-changed': ['push-active','production', 'wallet', 'menu-status','flea-inventory','flea'],
  'bait-production-changed': ['push-active','bait-production', 'wallet', 'menu-status','flea-inventory','flea'],
  'harbor-changed': ['push-active','harbor', 'wallet', 'menu-status','flea-inventory','flea'],
  'expedition-changed': ['push-active','expedition', 'wallet', 'menu-status','flea-inventory','flea'],
  'savings-changed': ['savings', 'wallet', 'menu-status'],
  'relic-loadout-changed': [
    'relics',
    'wallet',
    'fishing',
    'production',
    'bait-production',
    'harbor',
    'menu-status',
  ],
  'collectibles-changed': [
    'today-fishing-records',
    'flea',
    'flea-inventory',
    'merchant',
    'menu-status',
    'aquarium',
    'storage',
    'collection',
    'relics',
    'exchange-inventory',
    'titles',
  ],
  'aquarium-changed': ['aquarium', 'storage', 'collection', 'merchant', 'menu-status','flea-inventory','flea'],
  'gifts-changed': ['gifts', 'gift', 'aquarium', 'storage', 'collection', 'inbox', 'merchant', 'menu-status','flea-inventory','flea'],
  'friends-changed': ['friend-aquarium', 'aquarium-likes', 'friend-expedition'],
}
let subscribers = 0
function onResourceEvent(event: Event) {
  const detail = (
    event as CustomEvent<{
      owner?: string
      resource?: string
      updated?: boolean
      invalidated?: boolean
    }>
  ).detail
  if (detail?.owner && detail.owner !== scope?.owner) return
  if (detail?.invalidated) return
  for (const resource of resourceEvents[event.type] ?? []) {
    if (detail?.updated && detail.resource === resource) continue
    // Include explicitly mounted observers in standalone previews, too.
    const owners = new Set(
      appQueryClient
        .getQueryCache()
        .findAll({ queryKey: ['account'] })
        .filter((query) => query.queryKey[2] === resource)
        .map((query) => query.queryKey[1] as string),
    )
    if (scope) owners.add(scope.owner)
    for (const owner of owners) invalidateAccountResource(resource, owner)
  }
}
export function subscribeResourceEvents() {
  if (subscribers++ === 0)
    for (const event of Object.keys(resourceEvents))
      window.addEventListener(event, onResourceEvent, true)
  return () => {
    if (--subscribers === 0)
      for (const event of Object.keys(resourceEvents))
        window.removeEventListener(event, onResourceEvent, true)
  }
}
