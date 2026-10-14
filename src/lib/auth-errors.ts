export function authErrorMessage(cause: unknown) {
  const code = (cause as { code?: string } | null)?.code
  switch (code) {
    case 'invalid_credentials': return '이메일 또는 비밀번호를 확인해주세요.'
    case 'user_already_exists':
    case 'email_exists': return '이미 가입된 이메일이에요. 로그인하거나 비밀번호를 재설정해주세요.'
    case 'email_address_invalid':
    case 'validation_failed': return '이메일 주소와 입력 내용을 확인해주세요.'
    case 'weak_password': return '비밀번호를 8자 이상으로, 더 안전하게 입력해주세요.'
    case 'email_not_confirmed': return '아직 로그인할 수 없는 계정이에요. 이전에 가입했다면 관리자에게 계정 확인을 요청해주세요.'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit': return '요청이 많아요. 잠시 후 다시 시도해주세요.'
    default: return '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.'
  }
}
