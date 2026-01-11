# 仓库指南

## 工作原则

### 基本规范

- **语言要求**:使用简体中文回复用户问题
- **代码质量**:我们的代码会被 Linus Review,要避免被他骂!
- **高标准执行**:重视代码质量、安全性、可维护性
- **国际化**: 所有界面文本必须支持国际化（i18n），严禁硬编码。
- **如果有方案文档输出，就全部输出到./docs/ 目录下。**
- **不明白的地方反问我，先不着急编码**

## 项目结构与模块组织

- `src/` — Vue 应用源码（`main.js`、`App.vue`）
  - `src/components/` — 可复用组件（PascalCase，例如 `MedPanel.vue`）
  - `src/views/` — 路由页面（`HomeView.vue`、`StatsView.vue`）
  - `src/stores/` — Pinia 状态管理（`records.js`）
- `public/` — 静态资源（PWA 图标位于 `public/icons/`）
- 根目录配置：`vite.config.js`（PWA + `@` → `src` 别名）、`tailwind.config.js`、`postcss.config.js`

## 构建、测试与开发命令

- `pnpm install` — 安装依赖（Node.js >= 18；推荐 pnpm）
- `pnpm dev` — 启动 Vite 开发服务器（默认：http://localhost:5173）
- `pnpm build` — 构建生产版本到 `dist/`
- `pnpm preview` — 本地预览 `dist/`
- `pnpm lint` — 运行 ESLint 并自动修复

## 编码风格与命名规范

- 使用 Vue 3 单文件组件（SFC）；新代码优先 Composition API + `<script setup>`。
- 保持与现有代码一致：2 空格缩进、单引号、不写分号。
- 命名：组件 `PascalCase.vue`；页面 `*View.vue`；store 放在 `src/stores/*.js`。
- 样式：优先使用 Tailwind；全局/共享样式放在 `src/style.css`。

## 测试指南

- 目前未配置自动化测试。提交前至少完成：`pnpm dev` 冒烟检查 + `pnpm build` 构建通过。
- 如需引入测试，请同时新增 `pnpm test` 脚本，并采用统一目录结构（例如 `tests/**/*.test.js`）。

## 提交与 Pull Request 指南

- 提交信息遵循 Conventional Commits（当前历史使用 `feat:`），例如 `fix: 修复导出空数据`、`docs: 更新部署说明`。
- PR 需要：简要描述、手动验证步骤；UI 变更请附截图/GIF。变更保持聚焦；如影响使用方式或部署流程，请同步更新 `README.md`/`DEPLOY.md`。

## 安全与配置提示

- 本项目为纯前端应用，数据默认仅保存在浏览器本地；除非明确需求，否则不要引入默认上报/发送健康数据的逻辑。
- 不要提交敏感信息：使用 `.env.local`（已在 `.gitignore` 中忽略）存放本地环境变量。
