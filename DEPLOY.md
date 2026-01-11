# Cloudflare 部署指南

本项目使用 **Cloudflare Workers + D1** 全栈架构部署。

## 架构说明

| 组件 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite → `dist/` |
| 后端 | Cloudflare Workers (Hono) |
| 数据库 | Cloudflare D1 |
| 认证 | Cloudflare Access (Google + Email OTP) |
| 防滥用 | Cloudflare Turnstile |

---

## 首次部署

### 1. 前置准备（Cloudflare Dashboard）

#### 1.1 创建 D1 数据库

```bash
wrangler d1 create kids-med-prod
wrangler d1 create kids-med-preview
```

记录返回的 `database_id`，更新到 `wrangler.toml`。

#### 1.2 配置 Turnstile

1. Dashboard → Turnstile → Add site
2. Domain 填写你的 Worker 域名
3. 获取 `SITE_KEY` 和 `SECRET_KEY`

#### 1.3 配置 Cloudflare Access

1. Dashboard → Zero Trust → Access → Applications
2. 创建 Self-hosted Application，保护你的域名
3. 启用 Google + One-time PIN (Email OTP)
4. 获取 `AUD` 和 `ISS`

#### 1.4 设置 Worker Secrets

```bash
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put INVITE_PEPPER
```

### 2. 更新配置文件

编辑 `wrangler.toml`，填入你的配置值：

```toml
[vars]
ACCESS_AUD = "你的AUD"
ACCESS_ISS = "https://你的团队.cloudflareaccess.com"
TURNSTILE_SITE_KEY = "你的站点密钥"
```

### 3. 部署

```bash
# 安装依赖
pnpm install

# 构建前端
pnpm build

# 运行数据库迁移
wrangler d1 migrations apply kids-med-prod --remote

# 部署 Worker
wrangler deploy
```

---

## 日常部署

代码更新后，只需运行：

```bash
pnpm build && wrangler deploy
```

如有数据库变更，先运行迁移：

```bash
wrangler d1 migrations apply kids-med-prod --remote
```

---

## 多账户部署

如果你有多个 Cloudflare 账户，需要指定账户 ID：

```bash
# 方式 1：环境变量
CLOUDFLARE_ACCOUNT_ID=你的账户ID wrangler deploy

# 方式 2：添加到 wrangler.toml
account_id = "你的账户ID"
```

---

## 自定义域名

1. Dashboard → Workers & Pages → 你的 Worker
2. Triggers → Add Custom Domain
3. 输入域名（如 `kids.example.com`）

---

## 本地开发

```bash
# 前端开发（热重载）
pnpm dev

# Worker 本地开发（需要本地 D1）
pnpm worker:dev
```

本地开发时，可通过 `X-Dev-User` 请求头模拟用户：

```bash
curl -H "X-Dev-User: test@example.com" http://localhost:8787/api/auth/me
```

---

## 关键文件

| 文件 | 用途 |
|------|------|
| `wrangler.toml` | Worker + D1 配置 |
| `worker/index.ts` | API 入口 |
| `worker/db/migrations/` | 数据库迁移脚本 |
| `vite.config.js` | 前端构建配置 |

---

## 常见问题

### Q: 构建失败 "Expected ';' but found ')'"

检查 TypeScript 语法错误，通常是多余的括号。运行：

```bash
pnpm exec tsc --noEmit -p worker/tsconfig.json
```

### Q: 部署时提示选择账户

设置环境变量或在 `wrangler.toml` 添加 `account_id`。

### Q: 如何回滚？

在 Dashboard → Workers → 你的 Worker → Deployments，选择历史版本点击 Rollback。

### Q: 数据库迁移失败

确保数据库 ID 正确，且有权限访问。检查 `wrangler.toml` 中的 `database_id`。
