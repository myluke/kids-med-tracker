export type User = {
  id: string
  email: string
}

export type Bindings = {
  ASSETS: Fetcher
  DB: D1Database

  ACCESS_AUD: string
  ACCESS_ISS: string

  TURNSTILE_SITE_KEY: string
  TURNSTILE_SECRET_KEY: string

  INVITE_TOKEN_PEPPER: string

  ENV: 'production' | 'preview' | 'local'
}

export type AppEnv = {
  Bindings: Bindings
  Variables: {
    user?: User
    familyId?: string
    familyRole?: 'owner' | 'member'
  }
}
