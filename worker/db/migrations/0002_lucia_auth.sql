-- 添加验证码表
CREATE TABLE email_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT,                    -- 可为空（新用户注册时）
  email TEXT NOT NULL,
  code TEXT NOT NULL,              -- 6位数字验证码
  expires_at TEXT NOT NULL,        -- 10分钟有效
  created_at TEXT NOT NULL
);
CREATE INDEX idx_email_codes_email ON email_codes(email);

-- 添加 OAuth 账号表（支持 Google 等第三方登录）
CREATE TABLE oauth_accounts (
  provider TEXT NOT NULL,          -- 'google'
  provider_user_id TEXT NOT NULL,  -- Google 用户 ID
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (provider, provider_user_id)
);
CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);

-- 添加会话表
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL,     -- Unix timestamp (Lucia 要求)
  created_at TEXT NOT NULL
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
