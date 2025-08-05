<div align="center">
  <img src="./build/icon.png" alt="Catalyst Logo" width="120" height="120">

  <h1>Catalyst</h1>
  
  <p>
    <strong>强大的 Claude Code GUI 桌面应用</strong>
  </p>
  <p>
    <strong>基于 Electron + React + TypeScript 构建，提供完整的 Claude Code 集成功能</strong>
  </p>
  
  <p>
    <a href="#功能特性"><img src="https://img.shields.io/badge/功能特性-✨-blue?style=for-the-badge" alt="Features"></a>
    <a href="#安装部署"><img src="https://img.shields.io/badge/安装部署-🚀-green?style=for-the-badge" alt="Installation"></a>
    <a href="#使用指南"><img src="https://img.shields.io/badge/使用指南-📖-purple?style=for-the-badge" alt="Usage"></a>
    <a href="#开发文档"><img src="https://img.shields.io/badge/开发文档-🛠️-orange?style=for-the-badge" alt="Development"></a>
  </p>
  
  <p>
    <strong>中文</strong> | <a href="README.md">English</a>
  </p>
</div>

---

## 🌟 项目概述

**Catalyst** 是一个基于 Electron + React + TypeScript 开发的现代化桌面应用，作为 Claude Code 的可视化图形界面。它从原始的 Tauri 版本演进而来，提供了更加完善和稳定的 Claude Code 集成体验。

Catalyst 是您使用 Claude Code 的全能控制中心，将命令行工具与直观的可视化界面完美结合，让 AI 辅助开发变得更加高效和便捷。

## 📋 目录结构

- [🌟 项目概述](#-项目概述)
- [✨ 功能特性](#-功能特性)
  - [🗂️ 项目与会话管理](#️-项目与会话管理)
  - [🤖 AI 代理系统](#-ai-代理系统)
  - [📊 使用分析仪表板](#-使用分析仪表板)
  - [🔌 MCP 服务器管理](#-mcp-服务器管理)
  - [📝 CLAUDE.md 管理](#-claudemd-管理)
  - [🌐 国际化支持](#-国际化支持)
  - [🎨 现代化界面](#-现代化界面)
- [📖 使用指南](#-使用指南)
- [🚀 安装部署](#-安装部署)
- [🔨 从源码构建](#-从源码构建)
- [🛠️ 开发文档](#️-开发文档)
- [🔒 安全性](#-安全性)
- [🤝 贡献指南](#-贡献指南)
- [📄 开源协议](#-开源协议)

## ✨ 功能特性

### 🗂️ **项目与会话管理**

- **可视化项目浏览器**: 直观浏览 `~/.claude/projects/` 目录中的所有项目
- **会话历史管理**: 查看和恢复历史编程会话，保留完整上下文
- **智能搜索功能**: 内置搜索快速定位项目和会话
- **会话详情视图**: 显示首条消息、时间戳和会话元数据

### 🤖 **AI 代理系统**

- **自定义 AI 代理**: 创建具有专用系统提示和行为的专业代理
- **代理库管理**: 构建针对不同任务的专用代理集合
- **后台执行**: 在独立进程中运行代理，避免阻塞操作
- **执行历史**: 跟踪所有代理运行记录，包含详细日志和性能指标
- **GitHub 代理导入**: 从 GitHub 导入预定义的代理配置

### 📊 **使用分析仪表板**

- **成本跟踪**: 实时监控 Claude API 使用情况和成本
- **Token 分析**: 按模型、项目和时间段详细分解使用情况
- **可视化图表**: 美观的图表展示使用趋势和模式
- **数据导出**: 导出使用数据用于会计和分析

### 🔌 **MCP 服务器管理**

- **服务器注册中心**: 从统一界面管理模型上下文协议服务器
- **简易配置**: 通过 UI 添加服务器或导入现有配置
- **连接测试**: 使用前验证服务器连接性
- **Claude Desktop 导入**: 从 Claude Desktop 导入服务器配置
- **批量导入导出**: 支持配置的批量导入和导出

### 📝 **CLAUDE.md 管理**

- **内置编辑器**: 直接在应用内编辑 CLAUDE.md 文件
- **实时预览**: 实时查看 Markdown 渲染效果
- **项目扫描器**: 在项目中查找所有 CLAUDE.md 文件
- **语法高亮**: 完整的 Markdown 支持与语法高亮

### 🌐 **国际化支持**

- **多语言界面**: 支持中文和英文界面
- **智能语言检测**: 自动检测系统语言并应用
- **动态切换**: 运行时无缝切换语言
- **完整本地化**: 所有界面元素均已本地化

### 🎨 **现代化界面**

- **响应式设计**: 适配不同屏幕尺寸和分辨率
- **深色/浅色主题**: 支持系统主题自动切换
- **流畅动画**: 使用 Framer Motion 实现流畅的界面动画
- **Material Design**: 基于 shadcn/ui 和 Radix UI 的现代组件库

## 📖 使用指南

### 快速开始

1. **启动应用**: 安装后打开 Catalyst
2. **欢迎界面**: 选择 CC Agents 或 CC Projects
3. **首次设置**: 应用会自动检测您的 `~/.claude` 目录

### 项目管理

```
CC Projects → 选择项目 → 查看会话 → 恢复或新建会话
```

- 点击任意项目查看其会话列表
- 每个会话显示首条消息和时间戳
- 直接恢复会话或开始新会话

### 创建代理

```
CC Agents → 创建代理 → 配置设置 → 执行任务
```

1. **设计代理**: 设置名称、图标和系统提示
2. **配置模型**: 选择可用的 Claude 模型
3. **设置权限**: 配置文件读写和网络访问权限
4. **执行任务**: 在任意项目上运行代理

### 使用分析

```
菜单 → 使用仪表板 → 查看分析
```

- 按模型、项目和日期监控成本
- 导出数据生成报告
- 设置使用警报（即将推出）

### MCP 服务器

```
菜单 → MCP 管理器 → 添加服务器 → 配置
```

- 手动添加服务器或通过 JSON 配置
- 从 Claude Desktop 配置导入
- 使用前测试连接

## 🚀 安装部署

### 系统要求

- **操作系统**: Windows 10/11, macOS 11+, 或 Linux (Ubuntu 20.04+)
- **内存**: 最少 4GB (推荐 8GB)
- **存储**: 至少 1GB 可用空间

### 前置条件

- **Claude Code CLI**: 从 [Claude 官网](https://claude.ai/code) 安装

### 发布版本

发布版本即将提供下载。

## 🔨 从源码构建

### 开发环境要求

1. **Node.js** (18.0.0 或更高版本)

   ```bash
   # 通过 nvm 安装（推荐）
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   ```

2. **pnpm** (最新版本)

   ```bash
   # 安装 pnpm
   npm install -g pnpm
   ```

3. **Git**

   ```bash
   # 通常已预装，如果没有：
   # Ubuntu/Debian: sudo apt install git
   # macOS: brew install git
   # Windows: 从 https://git-scm.com 下载
   ```

4. **Claude Code CLI**
   - 从 [Claude 官网](https://claude.ai/code) 下载并安装
   - 确保 `claude` 命令在您的 PATH 中可用

### 构建步骤

1. **克隆仓库**

   ```bash
   git clone https://github.com/Haleclipse/Catalyst.git
   cd Catalyst
   ```

2. **安装依赖**

   ```bash
   pnpm install
   ```

3. **构建应用**

   **开发模式（热重载）**

   ```bash
   pnpm dev
   ```

   **生产构建**

   ```bash
   # 构建应用
   pnpm build

   # 平台特定构建
   pnpm build:win     # Windows
   pnpm build:mac     # macOS
   pnpm build:linux   # Linux
   ```

### 开发命令

```bash
# 启动开发服务器
pnpm dev

# 代码检查
pnpm lint
pnpm typecheck

# 代码格式化
pnpm format

# 构建生产版本
pnpm build
```

## 🛠️ 开发文档

### 技术栈

- **前端**: React 19 + TypeScript + Vite 6
- **后端**: Electron + Node.js
- **UI 框架**: Tailwind CSS v4 + shadcn/ui
- **数据库**: SQLite (通过 TypeORM + better-sqlite3)
- **包管理器**: pnpm
- **动画**: Framer Motion
- **国际化**: react-i18next

### 项目结构

```
catalyst/
├── src/
│   ├── main/                  # Electron 主进程
│   │   ├── api/              # IPC API 处理器
│   │   ├── database/         # 数据库层
│   │   ├── detection/        # Claude 检测
│   │   └── process/          # 进程管理
│   ├── preload/              # 预加载脚本
│   └── renderer/             # React 渲染进程
│       ├── src/
│       │   ├── components/   # UI 组件
│       │   ├── lib/         # API 客户端和工具
│       │   ├── i18n/        # 国际化
│       │   └── types/       # TypeScript 类型
│       └── assets/          # 静态资源
├── build/                    # 构建资源
└── dist/                     # 构建输出
```

### 核心架构

- **主进程**: 管理应用生命周期、文件系统访问、子进程管理
- **预加载脚本**: 提供安全的主进程与渲染进程通信桥梁
- **渲染进程**: React 应用界面，处理用户交互
- **数据库**: SQLite 存储应用数据、会话历史、使用统计

### IPC 通信

项目使用类型安全的 IPC 通信：

```typescript
// 渲染进程调用
const projects = await api.getProjects()
const session = await api.createClaudeSession(projectPath)

// 主进程处理器
ipcMain.handle('get-projects', async () => { ... })
ipcMain.handle('create-claude-session', async (_, projectPath) => { ... })
```

## 🔒 安全性

Catalyst 优先考虑您的隐私和安全：

1. **进程隔离**: 代理在独立进程中运行
2. **权限控制**: 为每个代理配置文件和网络访问权限
3. **本地存储**: 所有数据保存在您的机器上
4. **无遥测**: 不收集或跟踪任何数据
5. **开源透明**: 通过开源代码提供完全透明度
6. **沙箱环境**: 渲染进程运行在受限环境中

## 🤝 贡献指南

我们欢迎各种形式的贡献！

### 贡献领域

- 🐛 错误修复和改进
- ✨ 新功能和增强
- 📚 文档改进
- 🎨 UI/UX 优化
- 🧪 测试覆盖
- 🌐 国际化

### 开发流程

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 发起 Pull Request

## 📄 开源协议

本项目采用 GNU Affero General Public License v3.0 (AGPL-3.0) 协议 - 查看 [LICENSE](LICENSE) 文件了解详情。

**重要说明**: 本项目基于 [Claudia](https://github.com/getAsterisk/claudia) 开发，该项目使用 AGPL-3.0 协议。根据 AGPL-3.0 协议条款要求，所有派生作品必须维持相同的协议。

---

<div align="center">
  <p>
    <strong>基于 Electron 构建的现代化桌面应用</strong>
  </p>
  <p>
    <a href="https://github.com/Haleclipse/Catalyst/issues">报告问题</a>
    ·
    <a href="https://github.com/Haleclipse/Catalyst/issues">功能请求</a>
  </p>
</div>
