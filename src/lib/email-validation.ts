export function validateEmail(value: string): string | null {
  const email = value.trim()
  if (!email) return '이메일 주소를 입력해주세요.'
  if (email.length > 254) return '이메일 주소가 너무 길어요.'
  const parts = email.split('@')
  if (parts.length !== 2) return '올바른 이메일 주소를 입력해주세요.'
  const [local, domain] = parts
  if (!local || local.length > 64 || !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local) || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return '올바른 이메일 주소를 입력해주세요.'
  if (!domain.includes('.') || domain.length > 253 || domain.split('.').some(label => !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(label))) return '이메일의 도메인 주소를 확인해주세요.'
  return null
}

type DnsAnswer = { Status: number; TC?: boolean; Answer?: { type: number; data: string }[] }
export type EmailDomainStatus = 'receivable' | 'invalid' | 'unknown'

// Only the domain is sent to Google Public DNS, never the email's local part or password.
// MX/A records cannot establish that an individual mailbox exists or belongs to the user.
export async function checkEmailDomain(email: string): Promise<EmailDomainStatus> {
  if (validateEmail(email)) return 'invalid'
  const domain = email.trim().split('@')[1].toLowerCase()
  const signal = AbortSignal.timeout(2500)
  async function lookup(type: string): Promise<DnsAnswer> {
    const query = new URLSearchParams({ name: domain, type, edns_client_subnet: '0.0.0.0/0' })
    const response = await fetch(`https://dns.google/resolve?${query}`, { signal, credentials: 'omit', referrerPolicy: 'no-referrer' })
    if (!response.ok) throw new Error('DNS request failed')
    const answer = await response.json() as DnsAnswer
    if (typeof answer.Status !== 'number' || answer.TC) throw new Error('Incomplete DNS answer')
    return answer
  }
  try {
    const mx = await lookup('MX')
    if (mx.Status === 3) return 'invalid'
    if (mx.Status !== 0) return 'unknown'
    const records = mx.Answer?.filter(record => record.type === 15) ?? []
    if (records.length) {
      if (records.every(record => /^0\s+\.$/.test(record.data.trim()))) return 'invalid'
      return 'receivable'
    }
    // SMTP permits A/AAAA fallback when there is no MX record.
    const addresses = await Promise.all([lookup('A'), lookup('AAAA')])
    if (addresses.some(answer => answer.Status === 0 && answer.Answer?.some(record => record.type === 1 || record.type === 28))) return 'receivable'
    return addresses.every(answer => answer.Status === 0 || answer.Status === 3) ? 'invalid' : 'unknown'
  } catch { return 'unknown' }
}
