import { createClient } from '@/lib/client'
import { readAccountResource } from '@/lib/account-cache'
import { accountCommand } from '@/lib/account-command'

export type AquariumLikeState = {
  count: number
  liked: boolean
  nextLikeAt: string
  serverNow: string
}
export async function readAquariumLike(
  owner: string,
  signal: AbortSignal,
): Promise<AquariumLikeState> {
  const { data, error } = await createClient()
    .rpc('aquarium_like_state', { p_owner: owner })
    .abortSignal(signal)
  if (error) throw error
  return data
}
export const loadAquariumLike = (owner: string) =>
  readAccountResource(['aquarium-likes', owner], (signal) => readAquariumLike(owner, signal))
export const likeAquarium = (owner: string) =>
  accountCommand(
    async () => {
      const { data, error } = await createClient().rpc('set_aquarium_like', {
        p_owner: owner,
        p_liked: true,
      })
      if (error) throw error
      return data
    },
    { resource: ['aquarium-likes', owner] },
  )
