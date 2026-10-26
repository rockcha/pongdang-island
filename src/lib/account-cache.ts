import { QueryClient, queryOptions } from '@tanstack/react-query'

export const accountQueryKey = (owner: string, resource: string) =>
  ['account', owner, resource] as const
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

/** Called synchronously by Auth before publishing the next session to React. */
export function setQueryAccount(owner: string | null) {
  if ((scope?.owner ?? null) === owner) return
  scope = owner ? { owner, generation: ++generation } : null
  void appQueryClient.cancelQueries({ queryKey: ['account'] })
  appQueryClient.removeQueries({ queryKey: ['account'] })
}

export function accountOptions<T>(
  owner: string,
  resource: string,
  read: (signal: AbortSignal) => Promise<T>,
) {
  return queryOptions({
    queryKey: accountQueryKey(owner, resource),
    queryFn: ({ signal }) => read(signal),
  })
}

/** Imperative screens and query observers share the same key and in-flight request. */
export async function readAccountResource<T>(
  resource: string,
  read: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const current = scope
  // Standalone development screens can mount outside the authenticated app shell.
  if (!current) return read(new AbortController().signal)
  const options = accountOptions(current.owner, resource, read)
  const data = await appQueryClient.fetchQuery(options)
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

export function invalidateAccountResource(resource: string, owner = scope?.owner) {
  if (!owner) return
  void appQueryClient.cancelQueries({ queryKey: accountQueryKey(owner, resource) })
  void appQueryClient.invalidateQueries(
    { queryKey: accountQueryKey(owner, resource) },
    { cancelRefetch: false },
  )
}

/** Only a confirmed response from the current account may replace private cached data. */
export function publishAccountResource<T>(
  resource: string,
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
  const updated = publishAccountResource(resource, data, started)
  window.dispatchEvent(
    new CustomEvent(event, { detail: { owner: started?.owner, resource, updated } }),
  )
}

const resourceEvents: Record<string, string[]> = {
  'wallet-changed': ['wallet'],
  'attendance-changed': ['wallet'],
  'experience-changed': ['experience'],
  'production-changed': ['production', 'menu-status'],
  'bait-production-changed': ['bait-production', 'menu-status'],
  'harbor-changed': ['harbor', 'menu-status'],
  'expedition-changed': ['expedition', 'menu-status'],
  'savings-changed': ['savings', 'menu-status'],
  'relic-loadout-changed': ['relics', 'production', 'bait-production', 'harbor', 'menu-status'],
}
let subscribers = 0
function onResourceEvent(event: Event) {
  const detail = (event as CustomEvent<{ owner?: string; resource?: string; updated?: boolean }>)
    .detail
  if (detail?.owner && detail.owner !== scope?.owner) return
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
