import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkEmailDomain, validateEmail } from '@/lib/email-validation'

afterEach(() => vi.unstubAllGlobals())
function dns(...answers: unknown[]) {
  const mock = vi.fn()
  for (const answer of answers) mock.mockResolvedValueOnce({ ok: true, json: async () => answer })
  vi.stubGlobal('fetch', mock)
  return mock
}
describe('email format', () => {
  it.each(['fisher@gmail.com', '  fisher+game@sub.example.co.kr  ', 'fisher@xn--example.com'])('accepts %s', value => expect(validateEmail(value)).toBeNull())
  it.each(['', 'fisher', 'fisher@@gmail.com', 'a b@gmail.com', 'a..b@gmail.com', '.a@gmail.com', 'a@gmail', 'a@-gmail.com', 'a@gmail..com', `${'a'.repeat(65)}@gmail.com`])('rejects %s', value => expect(validateEmail(value)).not.toBeNull())
})
describe('domain mail configuration', () => {
  it('checks MX without sending the mailbox name', async () => {
    const mock = dns({ Status: 0, Answer: [{ type: 15, data: '10 mx.example.com.' }] })
    expect(await checkEmailDomain('private-name@example.com')).toBe('receivable')
    expect(mock.mock.calls[0][0]).toContain('name=example.com')
    expect(mock.mock.calls[0][0]).not.toContain('private-name')
  })
  it('rejects domains that do not exist', async () => {
    dns({ Status: 3 })
    expect(await checkEmailDomain('a@missing.example')).toBe('invalid')
  })
  it('rejects Null MX domains that explicitly do not accept mail', async () => {
    dns({ Status: 0, Answer: [{ type: 15, data: '0 .' }] })
    expect(await checkEmailDomain('a@example.com')).toBe('invalid')
  })
  it('allows SMTP address fallback when no MX record exists', async () => {
    dns({ Status: 0 }, { Status: 0, Answer: [{ type: 1, data: '192.0.2.1' }] }, { Status: 0 })
    expect(await checkEmailDomain('a@example.com')).toBe('receivable')
  })
  it('does not classify network errors or DNS outages as invalid email', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await checkEmailDomain('a@example.com')).toBe('unknown')
    dns({ Status: 2 })
    expect(await checkEmailDomain('a@example.com')).toBe('unknown')
  })
})
