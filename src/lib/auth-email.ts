import type { SupabaseClient } from '@supabase/supabase-js'

export function emailRedirect(type: 'recovery') {
  return `${window.location.origin}/auth/confirm?type=${type}`
}
export async function completeEmailLink(url: URL, client: SupabaseClient) {
  const type = url.searchParams.get('type')
  if (type !== 'recovery') throw new Error('올바르지 않은 비밀번호 재설정 링크예요.')
  if (url.searchParams.has('error') || new URLSearchParams(url.hash.slice(1)).has('error')) throw new Error('인증 링크가 만료됐거나 이미 사용됐어요. 메일을 다시 요청해주세요.')
  const token = url.searchParams.get('token_hash')
  if (token) {
    const { error } = await client.auth.verifyOtp({ token_hash: token, type })
    if (error) throw new Error('인증 링크가 만료됐거나 이미 사용됐어요. 메일을 다시 요청해주세요.')
  } else {
    if (!url.searchParams.has('code')) throw new Error('이메일의 인증 링크를 통해 접속해주세요.')
    const { error } = await client.auth.initialize()
    if (error) throw new Error('인증을 시작한 브라우저에서 링크를 열거나 메일을 다시 요청해주세요.')
  }
  const { data, error } = await client.auth.getSession()
  if (error || !data.session) throw new Error('인증을 시작한 브라우저에서 다시 시도해주세요.')
  return type
}
