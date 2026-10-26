import {
  AccountChangedError,
  getQueryAccount,
  isCurrentAccount,
  publishAccountResource,
  invalidateAccountResource,
  resourceEvents,
  type AccountResource,
} from './account-cache'

/** Execute once. Receipt/operation IDs remain owned by the caller. Never retry writes here. */
export async function accountCommand<T>(
  execute: () => Promise<T>,
  options: {
    resource?: AccountResource
    invalidate?: AccountResource[]
    event?: string
    after?: (data: T) => void
  } = {},
): Promise<T> {
  const started = getQueryAccount()
  const data = await execute()
  // A successful old-account write must not update or invalidate the new account.
  if (!isCurrentAccount(started)) throw new AccountChangedError()
  const updated = options.resource ? publishAccountResource(options.resource, data, started) : false
  const source = options.resource
    ? String(typeof options.resource === 'string' ? options.resource : options.resource[0])
    : undefined
  const affected = [
    ...(options.invalidate ?? []),
    ...(options.event ? (resourceEvents[options.event] ?? []) : []),
  ]
  const seen = new Set<string>()
  for (const resource of affected) {
    const key = JSON.stringify(resource)
    if (seen.has(key)) continue
    seen.add(key)
    invalidateAccountResource(resource, started?.owner, updated ? options.resource : undefined)
  }
  options.after?.(data)
  if (options.event)
    window.dispatchEvent(
      new CustomEvent(options.event, {
        detail: { owner: started?.owner, resource: source, updated, invalidated: !!started },
      }),
    )
  return data
}
