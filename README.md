# 🏥 Kids Med Tracker | 宝贝用药追踪

<p align="center">
  <img src="./public/logo.svg" width="120" alt="logo">
</p>

<p align="center">
  <strong>专为多孩家庭设计的儿童用药与症状追踪工具</strong>
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#部署指南">部署指南</a> •
  <a href="#技术栈">技术栈</a> •
  <a href="#贡献指南">贡献指南</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/vue-3.4-brightgreen" alt="Vue 3">
  <img src="https://img.shields.io/badge/tailwindcss-3.4-blue" alt="TailwindCSS">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs Welcome">
</p>

---

## 📖 项目背景

作为两个孩子的父亲，当孩子们同时感冒发烧时，我发现了一个痛点：

- **"刚才给谁吃的药？"**
- **"上次吃退烧药是几点？现在能再吃吗？"**
- **"今天咳嗽是不是比昨天严重了？"**

市面上的用药提醒App主要为慢性病设计，不适合这种"多孩子急性病"的场景。于是我做了这个工具。

## ✨ 功能特性

### 核心功能

| 功能 | 描述 |
|------|------|
| 🧒 **多孩子管理** | 支持多个孩子独立追踪，颜色区分防混淆 |
| ⏱️ **退烧药计时** | 自动计算距上次用药时间，智能提醒是否可再次用药 |
| 💊 **快速用药记录** | 预设常用药物，一键记录，支持剂量和体温 |
| 🫁 **咳嗽追踪** | 记录咳嗽频次和程度，观察病情趋势 |
| 🌡️ **体温记录** | 快捷温度按钮 + 自定义输入 |
| 📊 **趋势图表** | 体温曲线 + 咳嗽频次可视化 |
| 📤 **数据导出** | 一键导出记录，就诊时给医生参考 |
| 📱 **PWA支持** | 可添加到手机主屏幕，离线可用 |

### 设计原则

- **零思考录入**：一次点击完成记录，不需要打字
- **防混淆设计**：孩子间视觉强区分
- **极简操作**：为睡眠不足的父母设计
- **数据本地化**：所有数据存储在本地，保护隐私

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8（推荐）或 npm >= 9

### 本地开发

```bash
# 克隆项目
git clone https://github.com/your-username/kids-med-tracker.git
cd kids-med-tracker

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览生产版本
pnpm preview
```

访问 http://localhost:5173 查看应用。

## 📦 部署指南

### 方式一：Cloudflare Pages（推荐）

**自动部署（推荐）**

1. Fork 本仓库到你的 GitHub
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. 进入 `Workers & Pages` → `Create application` → `Pages`
4. 选择 `Connect to Git`，授权并选择你 Fork 的仓库
5. 配置构建设置：
   - **Framework preset**: `Vue`
   - **Build command**: `pnpm build`
   - **Build output directory**: `dist`
   - **Node.js version**: `18`（在 Environment variables 中设置 `NODE_VERSION=18`）
6. 点击 `Save and Deploy`

**手动部署**

```bash
# 安装 Wrangler CLI
pnpm add -g wrangler

# 登录 Cloudflare
wrangler login

# 构建项目
pnpm build

# 部署到 Cloudflare Pages
wrangler pages deploy dist --project-name=kids-med-tracker
```

### 方式二：Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/kids-med-tracker)

或手动部署：

```bash
# 安装 Vercel CLI
pnpm add -g vercel

# 部署
vercel
```

### 方式三：Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/your-username/kids-med-tracker)

### 方式四：静态托管

构建后直接将 `dist` 目录部署到任何静态托管服务：

```bash
pnpm build
# 将 dist 目录上传到你的服务器
```

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| [Vue 3](https://vuejs.org/) | 前端框架 |
| [Vite](https://vitejs.dev/) | 构建工具 |
| [TailwindCSS](https://tailwindcss.com/) | CSS框架 |
| [Pinia](https://pinia.vuejs.org/) | 状态管理 |
| [VueUse](https://vueuse.org/) | 组合式工具库 |
| [Chart.js](https://www.chartjs.org/) | 图表库 |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | PWA支持 |

## 📁 项目结构

```
kids-med-tracker/
├── public/
│   ├── logo.svg              # 应用Logo
│   └── icons/                # PWA图标
├── src/
│   ├── components/           # Vue组件
│   │   ├── ChildTabs.vue     # 孩子切换标签
│   │   ├── MedTimer.vue      # 用药计时器
│   │   ├── QuickActions.vue  # 快速操作按钮
│   │   ├── MedPanel.vue      # 用药记录面板
│   │   ├── CoughPanel.vue    # 咳嗽记录面板
│   │   ├── TempPanel.vue     # 体温记录面板
│   │   ├── TodayStats.vue    # 今日统计
│   │   ├── HistoryList.vue   # 历史记录
│   │   ├── TempChart.vue     # 体温图表
│   │   └── CoughChart.vue    # 咳嗽图表
│   ├── stores/
│   │   └── records.js        # Pinia状态管理
│   ├── composables/
│   │   └── useTimer.js       # 计时器逻辑
│   ├── utils/
│   │   └── export.js         # 数据导出工具
│   ├── views/
│   │   ├── HomeView.vue      # 首页
│   │   └── StatsView.vue     # 统计页
│   ├── App.vue               # 根组件
│   ├── main.js               # 入口文件
│   └── style.css             # 全局样式
├── index.html
├── vite.config.js            # Vite配置
├── tailwind.config.js        # TailwindCSS配置
├── postcss.config.js         # PostCSS配置
├── package.json
└── README.md
```

## 🎨 自定义配置

### 添加/修改孩子

编辑 `src/stores/records.js` 中的 `children` 配置：

```javascript
export const children = [
  { 
    id: 'child1', 
    name: '大宝', 
    age: '8岁', 
    gender: 'boy',
    color: '#4A90D9'  // 主题色
  },
  { 
    id: 'child2', 
    name: '二宝', 
    age: '2岁', 
    gender: 'girl',
    color: '#E85D75'
  },
  // 添加更多孩子...
]
```

### 添加/修改预设药物

编辑 `src/components/MedPanel.vue` 中的 `medications` 数组：

```javascript
const medications = [
  { name: '布洛芬', icon: '🔥', interval: 6 },      // 最小间隔小时数
  { name: '对乙酰氨基酚', icon: '💧', interval: 4 },
  { name: '奥司他韦', icon: '💊', interval: 12 },
  // 添加更多药物...
]
```

### 修改退烧药间隔规则

编辑 `src/composables/useTimer.js`：

```javascript
// 退烧药名单（用于计时提醒）
export const feverMeds = ['布洛芬', '对乙酰氨基酚']

// 安全间隔（小时）
export const safeInterval = 4   // 最短间隔
export const fullInterval = 6   // 推荐间隔
```

## 🔒 隐私说明

- ✅ **所有数据存储在本地浏览器**（localStorage）
- ✅ **不收集任何用户信息**
- ✅ **不发送任何数据到服务器**
- ✅ **无需注册登录**
- ✅ **完全开源可审计**

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 开发规范

- 使用 Vue 3 Composition API
- 遵循 Vue 官方风格指南
- 组件命名使用 PascalCase
- 使用 ESLint + Prettier 格式化代码

### Issue 反馈

如有问题或建议，欢迎 [提交 Issue](https://github.com/your-username/kids-med-tracker/issues)。

## 📋 Roadmap

- [x] 基础用药记录
- [x] 多孩子支持
- [x] 咳嗽追踪
- [x] 体温图表
- [x] 数据导出
- [ ] 多语言支持 (i18n)
- [ ] 数据云同步（可选）
- [ ] 用药提醒通知
- [ ] 家庭成员共享
- [ ] 深色模式

## 📄 License

[MIT License](./LICENSE) © 2025

---

## 💡 致谢

感谢所有为孩子健康操心的父母们。希望这个小工具能在你疲惫的深夜提供一点帮助。

**孩子们早日康复！** 🙏

---

<p align="center">
  如果这个项目对你有帮助，欢迎 ⭐ Star 支持一下！
</p>
