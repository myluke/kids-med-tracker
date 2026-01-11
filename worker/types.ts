export type User = {
  id: string
  email: string
}

export type Bindings = {
  ASSETS: Fetcher

  // Supabase
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string

  // 应用配置
  APP_URL: string

  // 邀请令牌加密
  INVITE_TOKEN_PEPPER: string

  ENV: 'production' | 'preview' | 'local'
}

export type AppEnv = {
  Bindings: Bindings
  Variables: {
    user?: User
    accessToken?: string
    familyId?: string
    familyRole?: 'owner' | 'member'
  }
}
