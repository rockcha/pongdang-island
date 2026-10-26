import { createClient } from './client'

/** Check the SDK session instead of trusting a possibly stale React render. */
export async function hasBackgroundSession(owner: string) {
  const { data, error } = await createClient().auth.getSession()
  return !error && data.session?.user.id === owner &&
    (!data.session.expires_at || data.session.expires_at * 1000 > Date.now())
}

export function isAuthFailure(cause: unknown) {
  const error = cause as { status?: number; code?: string }
  return error?.status === 401 || error?.code === '42501' || error?.code === 'PGRST301' || error?.code === 'PGRST303'
}
