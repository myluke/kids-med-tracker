# Cloudflare Worker + D1 全量重构实施方案

> 目标：将现有纯前端本地存储应用，重构为 **Cloudflare Worker 托管前端静态资源 + 同域 API**，并使用 **Cloudflare D1** 作为唯一数据源（纯远程读写）。
>
> 认证：使用 **Cloudflare Access**（同时支持 **Google 登录**与**邮箱验证码 OTP**），面向中国大陆用户可用。
>
> 协作：支持“家庭”多成员协作与角色权限（`owner` / `member`）。

---

## 1. 范围与关键决策

### 1.1 需求（已确认）

- **部署形态**：一个 Cloudflare Worker 同时托管 SPA 前端与 `/api/*`。
- **数据存储**：纯 D1 远程读写（不再使用 localStorage 作为持久化数据源）。
- **身份认证**：Cloudflare Access
  - 登录方式：Google + Email OTP（必须支持中国大陆用户）
  - Access 策略：允许任意已认证用户进入应用
  - 数据权限：由应用层（D1）决定，未加入家庭的用户看不到任何家庭数据。
- **家庭协作**：
  - 角色区分：`owner`、`member`
  - 邀请方式：一次性邀请码/链接，默认有效期 **7 天**
  - `member` 权限：
    - `children`：只读
    - `records`：可读全量；新增允许；编辑/删除仅限自己创建的记录
- **风控**：
  - Turnstile：选 T1（用于易被滥用的公共/敏感入口）
  - 创建家庭：Turnstile + 频控 + 创建次数限制
    - 上限 `N=3`（每用户最多创建 3 个家庭）
    - 频控 `M=3/10min`（每用户每 10 分钟最多 3 次创建尝试）
- **国际化**：一次性完成 i18n，语言：`zh-CN` + `en-US`

### 1.2 非目标（本期不做）

- 不做本地离线缓存/离线队列（纯远程读写意味着断网不可用）。
- 不做自研邮箱验证码/密码登录（认证完全交由 Cloudflare Access）。
- 不做端到端加密（如需后续补充，可在 `payload_json` 层做加密）。

---

## 2. 最终架构

### 2.1 组件

- **Cloudflare Access**：统一登录门禁，提供用户身份 JWT。
- **Cloudflare Worker（Hono）**：
  - 静态资源：提供 Vite 构建产物
  - API：`/api/*`（同域，免 CORS）
  - 认证：验证 `Cf-Access-Jwt-Assertion`
  - 授权：根据 D1 的家庭成员与角色判断
- **Cloudflare D1**：主数据存储

### 2.2 请求流（简图）

1) 用户访问站点 → Access 拦截 → Google/OTP 登录
2) 登录后访问 SPA / 调用 `/api/*`
3) Worker：
   - 校验 Access JWT
   - upsert 用户
   - 基于 `family_members` 判断授权
   - 读写 D1

---

## 3. 工程结构建议

建议新增 `worker/` 目录集中管理后端（Hono + D1 + 中间件），前端仍在 `src/`。

```
.
├── src/                          # Vue 前端
│   ├── i18n/
│   │   ├── index.ts
│   │   ├── zh-CN.json
│   │   └── en-US.json
│   ├── stores/                   # Pinia：改为远程 API store
│   ├── views/
│   │   ├── InviteView.vue
│   │   ├── NoFamilyView.vue
│   │   └── ...
│   └── ...
├── worker/                       # Cloudflare Worker (Hono)
│   ├── index.ts                  # 入口：API + 静态资源 + SPA fallback
│   ├── middleware/
│   │   ├── auth.ts               # Access JWT 校验与 user 注入
│   │   ├── turnstile.ts          # Turnstile 校验
│   │   ├── rateLimit.ts          # family_create 频控
│   │   └── requireRole.ts        # owner/member 授权
│   ├── routes/
│   │   ├── auth.ts               # /api/auth/me
│   │   ├── families.ts
│   │   ├── invites.ts
│   │   ├── children.ts
│   │   └── records.ts
│   └── db/
│       ├── schema.sql
│       └── migrations/
├── wrangler.toml                 # Worker + Assets + D1 + vars
└── docs/
    └── IMPLEMENTATION_PLAN.md
```

---

## 4. Cloudflare 配置清单

### 4.1 Access（Google + Email OTP）

- 创建 Access Application（Self-hosted）：保护 `https://<your-domain>/*`
- 启用登录方式：
  - Google
  - One-time PIN（Email OTP）
- Policy：Allow any authenticated user
- 记录配置项：
  - `AUD`（Application Audience / Aud Tag）
  - `ISS`（Issuer/team domain）

Worker 校验 JWT 时会用到：
- 公钥地址：`https://<your-domain>/cdn-cgi/access/certs`
- 请求头：`Cf-Access-Jwt-Assertion`

### 4.2 Turnstile

- 配置站点密钥：
  - `TURNSTILE_SITE_KEY`（前端可用，非敏感）
  - `TURNSTILE_SECRET_KEY`（后端敏感，必须用 secret）

Turnstile 用于：
- `POST /api/families`（创建家庭）
- `POST /api/invites/accept`（接受邀请）

### 4.3 D1

- 创建数据库（prod/preview 可分环境）：
  - `wrangler d1 create <db-name>`
- 绑定到 Worker：`[[d1_databases]] binding = "DB" ...`
- Migrations：
  - `wrangler d1 migrations create <db-name> init`
  - `wrangler d1 migrations apply <db-name> --local`
  - `wrangler d1 migrations apply <db-name> --remote`

---

## 5. 数据模型（D1 Schema）

> 核心原则：所有业务数据归属 `family_id`，认证身份归属 `user_id`。

### 5.1 表结构（建议）

#### users
- `id TEXT PRIMARY KEY`（建议使用 Access JWT 的 `sub`）
- `email TEXT UNIQUE NOT NULL`
- `created_at TEXT NOT NULL`
- `last_login_at TEXT NOT NULL`

#### families
- `id TEXT PRIMARY KEY`
- `name TEXT NOT NULL`
- `created_by_user_id TEXT NOT NULL`
- `created_at TEXT NOT NULL`

#### family_members
- `family_id TEXT NOT NULL`
- `user_id TEXT NOT NULL`
- `role TEXT NOT NULL`（`owner` / `member`）
- `created_at TEXT NOT NULL`
- PRIMARY KEY (`family_id`, `user_id`)

#### invites（一次性邀请链接）
- `id TEXT PRIMARY KEY`
- `family_id TEXT NOT NULL`
- `created_by_user_id TEXT NOT NULL`
- `role TEXT NOT NULL`（通常 `member`）
- `token_hash TEXT UNIQUE NOT NULL`（只存 hash）
- `expires_at TEXT NOT NULL`（默认 7 天）
- `used_at TEXT`
- `used_by_user_id TEXT`
- `created_at TEXT NOT NULL`

#### children
- `id TEXT PRIMARY KEY`
- `family_id TEXT NOT NULL`
- `name TEXT NOT NULL`
- `emoji TEXT`
- `color TEXT`
- `created_at TEXT NOT NULL`

#### records（纯远程读写必须有稳定 id）
- `id TEXT PRIMARY KEY`（UUID）
- `family_id TEXT NOT NULL`
- `child_id TEXT NOT NULL`
- `type TEXT NOT NULL`（`med` / `cough` / `temp` / `note`）
- `time TEXT NOT NULL`（ISO）
- `payload_json TEXT NOT NULL`（JSON 字符串）
- `created_by_user_id TEXT NOT NULL`（member 的编辑/删除权限依据）
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`
- `deleted_at TEXT`

#### rate_limits（频控，仅用 D1）
- `key TEXT PRIMARY KEY`（`${userId}:${action}:${windowStart}`）
- `user_id TEXT NOT NULL`
- `action TEXT NOT NULL`（`family_create`）
- `window_start TEXT NOT NULL`
- `count INTEGER NOT NULL`
- `updated_at TEXT NOT NULL`

### 5.2 索引建议

- `records(family_id, child_id, time)`
- `family_members(user_id)`
- `invites(token_hash)`（unique 即可）

---

## 6. 权限与授权规则（最终版）

### 6.1 角色权限

- `owner`
  - children：CRUD
  - records：CRUD（全量）
  - invites：创建、可选撤销
  - members：可选移除成员/转移 owner

- `member`
  - children：只读
  - records：
    - 读全量
    - 可新增
    - 编辑/删除：仅限 `created_by_user_id == 自己`

### 6.2 SQL 级强约束（member 写操作）

- 更新/删除记录必须带：
  - `WHERE id = ? AND family_id = ? AND created_by_user_id = ?`

---

## 7. API 设计（Hono）

### 7.1 通用约定

- 所有 `/api/*`：
  - 必须验证 Access JWT（`Cf-Access-Jwt-Assertion`）
  - 禁止缓存：`Cache-Control: no-store`
- 统一 JSON：
  - 成功：`{ ok: true, data: ... }`
  - 失败：`{ ok: false, error: { code, message } }`

### 7.2 端点清单（建议）

#### 身份
- `GET /api/auth/me`
  - upsert `users`
  - 返回 `user` + `families` 概览（可选）

#### 家庭
- `GET /api/families`
- `POST /api/families`
  - Turnstile ✅
  - 频控 ✅（3/10min）
  - 创建上限 ✅（N=3）
  - 创建后写 `family_members` 为 `owner`

#### 邀请
- `POST /api/invites`（owner-only）
  - 返回邀请链接 `/invite/<token>`
  - `expires_at = now + 7 days`
- `POST /api/invites/accept`（T1 + Turnstile）
  - Turnstile ✅
  - token 一次性 ✅

#### 孩子
- `GET /api/children?familyId=...`（member/owner 皆可）
- `POST /api/children`（owner-only）
- `PATCH /api/children/:id`（owner-only）
- `DELETE /api/children/:id`（owner-only）

#### 记录
- `GET /api/records?familyId=...&childId=...&since=...&limit=...`
- `POST /api/records`（member/owner）
  - 后端强制写 `created_by_user_id = user_id`
- `PATCH /api/records/:id`
  - owner：允许
  - member：限制 created_by
- `DELETE /api/records/:id`
  - owner：允许
  - member：限制 created_by

---

## 8. 频控与限制实现（family_create）

### 8.1 频控 M=3/10min

- 计算窗口：`windowStart = floor(now / 10min) * 10min`
- `key = ${userId}:family_create:${windowStartISO}`
- 流程：
  1) 读 `rate_limits.count`
  2) 若 `count >= 3` 返回 429
  3) 否则 `count++`（插入或更新）

> 备注：D1 并发下可能存在轻微竞态。因为还叠加 Turnstile，且这是防滥用而非金融级限流，该风险可接受。若需要强一致限流，可改用 Durable Objects。

### 8.2 创建上限 N=3

- `SELECT COUNT(*) FROM families WHERE created_by_user_id = ?`
- `>= 3` 返回 403（提示通过邀请加入已有家庭）

---

## 9. 邀请 token 安全方案

- token 生成：高熵随机（>= 32 bytes）
- 明文 token 只出现在邀请链接中（客户端持有）
- D1 只存：`token_hash = sha256(token + PEPPER)`
  - `PEPPER` 存 Worker secret（不可提交仓库）
- 接受邀请：对请求 token 做同样 hash，再查库

---

## 10. 前端重构与 i18n 计划

### 10.1 关键页面/状态

- 未加入任何家庭：`NoFamilyView`
  - 创建家庭（需要 Turnstile）
  - 提示通过邀请链接加入
- 邀请接受页：`InviteView`（路由 `/invite/:token`）
  - 展示说明 + Turnstile + 接受邀请
- 正常业务页：Home/Stats

### 10.2 store 重写（纯 API 驱动）

- 不再使用 `localStorage` 保存 records
- 启动加载：
  - `/api/auth/me` → `/api/families` → 选定 family → `/api/children` → `/api/records`

### 10.3 i18n（一次性完成）

- 引入 `vue-i18n`
- 建立 `zh-CN.json`、`en-US.json`
- 所有文本（按钮、标题、toast、错误、空状态）全部替换为 `t('...')`
- 时间格式：基于当前 locale 做 `Intl.DateTimeFormat`

---

## 11. 本地开发策略（Access 本地不可用）

现实情况：`wrangler dev` 本地通常拿不到 Access JWT。

建议：实现严格的 dev-only bypass（只在本地启用）：
- `ENV=local` 时允许通过 `X-Dev-User` 或 `DEV_USER_EMAIL` 注入测试身份
- 生产环境必须要求 `Cf-Access-Jwt-Assertion`

---

## 12. 验收清单（建议按阶段验收）

### 阶段 A：基础运行
- Worker 能托管静态资源
- SPA 刷新不 404（fallback index.html）
- `/api/health` 正常

### 阶段 B：认证与权限
- 未登录访问被 Access 拦截
- 登录后 `/api/auth/me` 返回 user
- 未加入家庭 → 前端显示“未加入家庭”状态

### 阶段 C：家庭与邀请
- 创建家庭：Turnstile 生效；频控 3/10min 生效；上限 N=3 生效
- owner 创建邀请，链接 7 天过期
- member 通过链接接受邀请（Turnstile 生效）

### 阶段 D：数据协作
- owner 可增删改孩子
- member 只读孩子
- member 只能编辑/删除自己创建的记录（后端强制 403）

### 阶段 E：i18n
- UI 可切换中文/英文
- 无硬编码中文残留（含 toast/错误）

---

## 13. 风险与注意事项

- **Email OTP 送达率**：必须实测 `qq.com/163.com/gmail/企业邮箱` 的验证码送达与垃圾箱情况。
- **纯远程读写**：断网即不可用，需要产品层提示。
- **D1 限流竞态**：D1 实现频控存在并发竞态风险，但结合 Turnstile 可接受；如需更强一致可改 Durable Objects。

---

## 14. 下一步输入（实施前需要的配置值）

实施时需要你提供或在 Cloudflare 控制台获得：
- Access `AUD`
- Access `ISS`
- Worker 自定义域名
- D1 数据库名（prod/preview）
- Turnstile `SITE_KEY` 与 `SECRET_KEY`

### 14.1 获取这些配置值的操作步骤（Dashboard 明细）

> Cloudflare 控制台页面命名会随版本变化（例如 `Triggers` / `Domains & Routes`），但入口路径基本一致。优先使用自定义域名（例如 `med.example.com`），不要只依赖 `*.workers.dev`。

#### A) Worker 自定义域名

1. 登录 Cloudflare Dashboard → `Workers & Pages`。
2. 进入你的 Worker（没有则先 `Create` → `Worker` 创建一个占位 Worker）。
3. 进入 Worker 的 `Triggers`（或 `Domains & Routes`）。
4. 添加自定义域名：`Add Custom Domain`（或添加路由 `med.example.com/*`）。
5. 保存后，记录最终访问域名：`med.example.com`。

#### B) D1 数据库名（prod/preview）与 `database_id`

1. Dashboard → `Workers & Pages` → `D1 SQL Database`。
2. 点击 `Create database`。
3. 分别创建两套：
   - `prod`：例如 `kids-med-prod`
   - `preview`：例如 `kids-med-preview`
4. 点进每个数据库详情页，记录：
   - `database_name`：你创建时填写的名字
   - `database_id`：页面展示的 UUID

> 这两项会写入 `wrangler.toml` 的 `[[d1_databases]]` 配置中。

#### C) Turnstile `SITE_KEY` 与 `SECRET_KEY`

1. Dashboard → `Turnstile`。
2. `Add site`。
3. Domain 填你的 Worker 自定义域名（例如 `med.example.com`）。
4. 创建后进入该站点详情页，复制：
   - `Site key` → `TURNSTILE_SITE_KEY`（前端使用，非敏感）
   - `Secret key` → `TURNSTILE_SECRET_KEY`（后端使用，敏感，必须作为 Worker secret）

#### D) Access：同时启用 Google + Email OTP，并获取 `AUD` / `ISS`

##### D.1 进入 Zero Trust 并启用登录方式

1. Dashboard → `Zero Trust`（首次进入会引导创建组织/team domain）。
2. 在 Zero Trust 控制台中：`Settings` → `Authentication`（或 `Login methods` / `Identity providers`）。
3. 启用：
   - `Google`
   - `One-time PIN`（Email OTP）

##### D.2 创建 Access Application（保护你的站点）

1. Zero Trust → `Access` → `Applications` → `Add an application`。
2. 选择 `Self-hosted`。
3. 配置 Domain：`med.example.com`，Path：`/*`，保存。
4. 在该 Application 的 `Policies` 中新增策略：
   - Action：`Allow`
   - Include：选择 `Everyone` / `All authenticated users`（任意已认证用户）

##### D.3 获取 `AUD`

1. 进入：Zero Trust → `Access` → `Applications` → 选中你的应用。
2. 在 `Overview` / `Settings` / `Application Configuration` 中查找：
   - `Audience` / `AUD Tag` / `Application Audience`。
3. 复制该值作为 `ACCESS_AUD`（Worker 验证 JWT 用）。

##### D.4 获取 `ISS`

`ISS` 通常是你的 Access 发行者地址（和 team domain 相关），常见形态：
- `https://<your-team>.cloudflareaccess.com`

获取方式（推荐两种二选一）：

- 方式 1（从 Zero Trust 信息定位）：
  1. Zero Trust → `Settings` → `General`（或 `Authentication`）中找到 team domain。
  2. 以该 team domain 组成 `ISS`（如上示例）。

- 方式 2（从真实 JWT 的 `iss` 字段确认，最可靠）：
  1. 用浏览器通过 Access 登录后，访问一个会触发 API 的页面。
  2. 在浏览器 DevTools → Network 中找到任一 `/api/*` 请求。
  3. 查看 Request Headers，复制 `Cf-Access-Jwt-Assertion`（JWT）。
  4. 解码 JWT payload（只看不验证即可）并读取 `iss` 字段作为 `ISS`。

> Worker 运行时会从 `https://<your-domain>/cdn-cgi/access/certs` 拉取 JWK 公钥用于验签；`AUD` 与 `ISS` 用于 claims 校验。
