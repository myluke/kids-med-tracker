type TurnstileVerifyResult = {
  success: boolean
  'error-codes'?: string[]
}

export async function verifyTurnstile(secret: string, responseToken: string, remoteIp?: string) {
  const body = new URLSearchParams()
  body.set('secret', secret)
  body.set('response', responseToken)
  if (remoteIp) body.set('remoteip', remoteIp)

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  })

  if (!res.ok) {
    return { ok: false, errorCodes: ['turnstile_fetch_failed'] }
  }

  const data = (await res.json()) as TurnstileVerifyResult
  return { ok: data.success, errorCodes: data['error-codes'] ?? [] }
}
