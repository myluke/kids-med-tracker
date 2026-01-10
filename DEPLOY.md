# Cloudflare Pages 部署指南

## 方式一：通过 GitHub 自动部署（推荐）

### 步骤 1：准备仓库

1. 在 GitHub 创建新仓库
2. 将代码推送到仓库：

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/kids-med-tracker.git
git push -u origin main
```

### 步骤 2：连接 Cloudflare Pages

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 左侧菜单选择 `Workers & Pages`
3. 点击 `Create application` → `Pages` → `Connect to Git`
4. 授权 GitHub 并选择你的仓库

### 步骤 3：配置构建设置

| 配置项 | 值 |
|--------|-----|
| Framework preset | Vue |
| Build command | `pnpm build` |
| Build output directory | `dist` |
| Root directory | `/` |

### 步骤 4：设置环境变量

在 `Environment variables` 中添加：

| 变量名 | 值 |
|--------|-----|
| NODE_VERSION | 18 |

### 步骤 5：部署

点击 `Save and Deploy`，等待构建完成即可访问。

---

## 方式二：通过 Wrangler CLI 手动部署

### 安装 Wrangler

```bash
pnpm add -g wrangler
```

### 登录 Cloudflare

```bash
wrangler login
```

### 构建项目

```bash
pnpm build
```

### 首次部署（创建项目）

```bash
wrangler pages project create kids-med-tracker
```

### 部署

```bash
wrangler pages deploy dist --project-name=kids-med-tracker
```

---

## 自定义域名

1. 在 Cloudflare Pages 项目设置中
2. 选择 `Custom domains`
3. 添加你的域名
4. 按提示配置 DNS

---

## 常见问题

### Q: 构建失败怎么办？

检查 Node.js 版本，确保设置了 `NODE_VERSION=18` 环境变量。

### Q: 如何更新部署？

- GitHub 方式：推送代码到 main 分支即可自动重新部署
- CLI 方式：重新运行 `pnpm build && wrangler pages deploy dist`

### Q: 如何回滚到之前的版本？

在 Cloudflare Dashboard 的 Deployments 页面，选择之前的部署点击 `Rollback`。
