# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本仓库中工作提供指导。

## 工作原则

### 基本规范

- **语言要求**：使用简体中文回复用户问题
- **代码质量**：我们的代码会被 Linus Review，要避免被他骂！
- **高标准执行**：重视代码质量、安全性、可维护性
- **国际化**：所有界面文本必须支持国际化（i18n），严禁硬编码
- **如果有方案文档输出，就全部输出到 `./docs/` 目录下**
- **不明白的地方反问我，先不着急编码**

## 项目概述

宝贝用药追踪 (Kids Med Tracker) 是一个 Vue 3 PWA 应用，用于在急性疾病期间追踪儿童的用药、体温和咳嗽症状。专为多孩家庭设计，支持颜色区分的孩子切换和智能用药间隔计时。

## 常用命令

```bash
# 前端开发
pnpm install          # 安装依赖 (Node.js >= 18, pnpm >= 8)
pnpm dev              # 启动开发服务器 http://localhost:5173
pnpm build            # 生产构建到 dist/
pnpm preview          # 预览生产构建
pnpm lint             # ESLint 检查并自动修复

# 测试
pnpm test             # Vitest 一次性运行
pnpm test:watch       # Vitest 监听模式
pnpm test:coverage    # 覆盖率报告

# Worker 后端
pnpm worker:dev       # Worker 本地开发 http://localhost:8787
pnpm worker:deploy    # 部署到 Cloudflare Workers
```

## 架构

**技术栈：** Vue 3 (Composition API) + Vite + TailwindCSS + Pinia + Chart.js + Hono + Supabase

### 目录结构

```
client/                    # 前端 Vue 应用
├── main.js               # 应用入口 + 路由配置
├── App.vue               # 根组件
├── views/                # 路由页面 (*View.vue)
├── components/           # UI 组件
│   ├── profile/          # 个人资料相关组件
│   └── skeleton/         # 骨架屏组件
├── stores/               # Pinia 状态管理
├── services/             # API 服务层
├── i18n/                 # 国际化配置 (zh-CN, en-US)
├── config/               # 应用配置
├── lib/                  # 第三方库封装
└── utils/                # 工具函数

worker/                    # Cloudflare Worker 后端 (TypeScript)
├── index.ts              # Worker 入口
├── routes/               # API 路由
├── services/             # 业务逻辑层
├── middleware/           # 中间件 (auth, turnstile)
├── lib/                  # Supabase 客户端
├── utils/                # 工具函数
└── errors/               # 错误定义

supabase/
└── schema.sql            # 数据库 Schema + RLS 策略

docs/                      # 方案文档和迁移脚本
```

### 前端路由

| 路径 | 页面 | 需认证 |
|------|------|--------|
| `/login` | 登录页 | 否 |
| `/` | 首页 | 是 |
| `/stats` | 统计页 | 是 |
| `/episodes` | 病程历史 | 是 |
| `/profile` | 个人资料 | 是 |
| `/no-family` | 无家庭提示 | 是 |
| `/invite/:token` | 邀请接受 | 否 |
| `/auth/callback` | 认证回调 | 否 |

### Pinia Store 结构

| Store | 职责 |
|-------|------|
| `useUserStore` | 用户认证状态 |
| `useFamilyStore` | 家庭列表和当前家庭 |
| `useChildrenStore` | 孩子列表和当前选中孩子 |
| `useRecordsStore` | 记录缓存（按孩子分组）、今日统计、退烧药计时 |
| `useEpisodesStore` | 当前病程和历史病程 |
| `pullRefreshState` | 下拉刷新状态 |

### 后端 API 路由

```
/api/health                # 健康检查
/api/auth/*               # 认证 (登录、登出、me)
/api/invites/verify/:token # 邀请验证 (无需认证)
/api/families/*           # 家庭 CRUD (需认证)
/api/invites/*            # 邀请链接管理
/api/children/*           # 孩子 CRUD
/api/records/*            # 记录 CRUD
/api/episodes/*           # 病程 CRUD
```

### 数据流

- 前端通过 `/api/*` 调用 Worker 后端
- Worker 使用 Supabase 进行数据存储和认证
- 记录类型：`med`（用药）、`cough`（咳嗽）、`temp`（体温）、`note`（备注）
- API 响应格式：`{ ok: true, data }` 或 `{ ok: false, error }`

## 数据库模型

| 表 | 说明 |
|----|------|
| `families` | 家庭 |
| `family_members` | 家庭成员（多对多，含 role: owner/member） |
| `children` | 孩子信息（name, emoji, color, gender, age） |
| `illness_episodes` | 病程（status: active/recovered） |
| `records` | 记录（type, time, payload_json, 软删除） |
| `invites` | 邀请链接（token_hash, expires_at） |
| `user_profiles` | 用户档案（has_password） |

所有表启用 RLS，通过 `is_family_member()` 函数实现家庭级数据隔离。

## 认证流程

- **Email OTP**：发送验证码到邮箱登录
- **密码登录**：支持设置密码后使用密码登录
- **Turnstile**：Cloudflare 人机验证保护登录接口
- **JWT**：Worker 中间件验证 access_token

## 国际化

- **配置位置**：`client/i18n/`
- **支持语言**：`zh-CN`（默认）、`en-US`
- **翻译文件**：`zh-CN.json`、`en-US.json`
- **使用方式**：`{{ $t('key') }}` 或 `t('key')`

## 主题系统

CSS 类 `.theme-dabo` / `.theme-erbao` 切换孩子专属配色。

**Tailwind 颜色变量：**
- `dabo-*`：大宝主题（蓝紫色）
- `erbao-*`：二宝主题（珊瑚粉色）
- `warm-*`：背景色（浅蓝灰白）
- `mint-*`：强调色（薄荷绿）

## 编码规范

- Vue 3 单文件组件，使用 Composition API + `<script setup>`
- 2 空格缩进、单引号、不写分号
- 组件命名：`PascalCase.vue`；页面命名：`*View.vue`
- 优先使用 TailwindCSS；共享样式放在 `client/style.css`
- 提交信息遵循 Conventional Commits：`feat:`、`fix:`、`docs:`

## 测试

- **框架**：Vitest
- **测试文件位置**：`client/stores/__tests__/`、`worker/services/__tests__/`
- **提交前**：运行 `pnpm test` 确保测试通过，运行 `pnpm build` 验证构建成功

## 自定义配置点

- **药物配置**：`client/config/medications.js`
  - `name`：药物名称
  - `icon`：显示图标
  - `isFeverMed`：是否为退烧药（用于智能计时）
  - `interval`：用药间隔（小时，0 表示无限制）

## 环境变量

**前端 (.env)**
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_TURNSTILE_SITE_KEY
```

**Worker (.dev.vars / wrangler.toml)**
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
APP_URL
INVITE_TOKEN_PEPPER
TURNSTILE_SECRET_KEY
ENV  # production | preview | local
```
