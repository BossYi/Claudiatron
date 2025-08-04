# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Claudiatron 是一个基于 Electron + React + TypeScript 的桌面应用，作为 Claude Code 的 GUI 工具。该项目从原始的 Tauri 版本迁移而来，提供完整的 Claude Code 集成功能。

## 常用开发命令

```bash
# 安装依赖 (使用 pn
pnpm install

# 开发模式
pnpm dev

# 代码检查
pnpm lint
pnpm typecheck

# 格式化代码
pnpm format

# 构建应用
pnpm build:win     # Windows
pnpm build:mac     # macOS
pnpm build:linux   # Linux
```

## 架构概览

### 核心架构

- **主进程**: `src/main/` - Electron 主进程代码，管理应用生命周期
- **预加载脚本**: `src/preload/` - 桥接主进程和渲染进程的安全通信层
- **渲染进程**: `src/renderer/` - React 应用界面
- **构建工具**: electron-vite + electron-builder
- **数据库**: SQLite (通过 TypeORM + better-sqlite3)

### 主要目录结构

```
src/
├── main/
│   ├── api/                    # IPC API 处理器
│   │   ├── agents.ts          # AI 代理管理
│   │   ├── claude.ts          # Claude Code 会话管理
│   │   ├── mcp.ts             # MCP 服务器管理
│   │   ├── storage.ts         # 数据库操作
│   │   ├── usage.ts           # 使用情况统计
│   │   ├── hooks.ts           # 钩子管理
│   │   └── slashCommands.ts   # 斜杠命令
│   ├── database/              # 数据库层
│   │   ├── connection.ts      # 数据库连接管理
│   │   ├── entities/          # TypeORM 实体
│   │   └── services/          # 数据库服务层
│   ├── detection/             # Claude 二进制文件检测
│   └── process/               # 进程管理
├── preload/
│   └── index.ts              # 安全的 IPC 接口定义
└── renderer/
    └── src/
        ├── components/        # React 组件
        ├── lib/              # 工具库和 API 客户端
        │   ├── api/          # 模块化API层 (已重构)
        │   │   ├── types/    # TypeScript 类型定义
        │   │   ├── modules/  # 功能API模块
        │   │   └── utils/    # API工具和兼容性
        │   └── api.ts        # 统一API入口
        └── types/            # 全局 TypeScript 类型定义
```

### API 模块化架构 (已重构)

为了提升代码可维护性，原始的2285行`api.ts`已被重构为模块化结构：

```
src/renderer/src/lib/api/
├── api.ts                     # 统一API入口，向后兼容
├── types/                     # 类型定义模块 (7个文件)
│   ├── index.ts              # 统一类型导出
│   ├── core.ts               # 核心类型 (Project, Session, Claude配置等)
│   ├── agent.ts              # 代理相关类型
│   ├── usage.ts              # 使用统计类型
│   ├── checkpoint.ts         # 检查点系统类型
│   ├── mcp.ts                # MCP服务器类型
│   └── misc.ts               # 其他杂项类型
├── modules/                   # 功能API模块 (10个文件)
│   ├── projects.ts           # 项目管理API (65行)
│   ├── claude.ts             # Claude核心功能API (161行)
│   ├── agents.ts             # 代理管理API (418行)
│   ├── usage.ts              # 使用统计API (63行)
│   ├── checkpoints.ts        # 检查点系统API (226行)
│   ├── mcp.ts                # MCP服务器管理API (172行)
│   ├── installations.ts      # Claude安装检测API (39行)
│   ├── storage.ts            # 数据库存储API (105行)
│   ├── hooks.ts              # 钩子管理API (82行)
│   ├── slashCommands.ts      # 斜杠命令API (82行)
│   └── setupWizard.ts        # 设置向导API (190行)
└── utils/                     # 工具函数 (2个文件)
    ├── apiClient.ts          # API基础客户端和错误处理
    └── compatibility.ts      # Tauri兼容函数

```

**重构收益**:

- **可维护性**: 每个模块平均100-200行，易于理解和修改
- **类型安全**: 统一的TypeScript类型管理，零类型错误
- **向后兼容**: 保持原有API接口不变，无需修改现有代码
- **团队协作**: 不同开发者可并行修改不同模块
- **代码复用**: 统一的错误处理和API调用模式

## 关键功能模块

### 1. Claude Code 集成

- **二进制检测**: 自动检测系统中的 Claude CLI 安装
- **会话管理**: 创建、恢复和管理 Claude Code 会话
- **流式输出**: 实时显示 Claude 响应
- **进程管理**: 安全的子进程生命周期管理

### 2. 项目管理

- **项目扫描**: 扫描和管理 `~/.claude/projects/` 中的项目
- **CLAUDE.md 编辑**: 内置的项目配置文件编辑器
- **会话历史**: 项目级别的会话历史记录

### 3. AI 代理系统

- **代理创建**: 创建和配置自定义 AI 代理
- **GitHub 导入**: 从 GitHub 导入预定义代理
- **执行监控**: 代理运行状态和输出监控

### 4. 数据存储

- **SQLite 数据库**: 使用 TypeORM 管理代理、运行记录等数据
- **使用统计**: API 使用情况和成本跟踪
- **设置管理**: 应用配置和用户偏好

## IPC 通信架构

### 通信模式

- **类型安全**: 所有 IPC 调用都有完整的 TypeScript 类型定义
- **错误处理**: 统一的错误处理和响应格式
- **安全隔离**: 通过 preload 脚本确保安全的跨进程通信

### API 映射

```typescript
// 前端调用
const projects = await api.getProjects();
const session = await api.createClaudeSession(projectPath);

// 主进程处理器 (src/main/api/)
ipcMain.handle('get-projects', async () => { ... });
ipcMain.handle('create-claude-session', async (_, projectPath) => { ... });
```

## 开发注意事项

### 技术栈

- **包管理器**: pnpm (严格使用，不要使用 npm 或 yarn)
- **TypeScript**: 严格类型检查，确保类型安全
- **UI 组件**: shadcn/ui 组件库 + Tailwind CSS v4
- **动画**: framer-motion 用于 UI 动画
- **状态管理**: React hooks + 组件级状态

### 安全考虑

- **沙箱环境**: 渲染进程运行在受限环境中
- **输入验证**: 验证所有用户输入和 IPC 参数
- **进程隔离**: 所有系统调用都通过主进程代理

### 性能优化

- **代码分割**: 使用动态导入和手动分块
- **流式处理**: 大量数据采用流式传输
- **缓存策略**: 输出缓存和检测结果缓存

## 常见问题处理

### Claude 二进制文件检测

- 检查 PATH 环境变量
- 验证 Claude CLI 版本兼容性
- Windows WSL 环境特殊处理

### 数据库问题

- 数据库文件位置: `~/AppData/Roaming/claudiatron/claudiatron.db` (Windows)
- 自动迁移和表结构同步
- TypeORM 日志调试: 在 `connection.ts` 中设置 `logging: true`

### 进程管理

- 使用 `execa` 管理子进程
- `tree-kill` 确保进程树清理
- 跨平台信号处理

## 组件开发规范

### UI 组件

- 使用 shadcn/ui 组件作为基础
- 保持组件的单一职责
- 使用 TypeScript 接口定义 props

### API 集成

- **统一入口**: 所有 API 调用都通过 `src/renderer/src/lib/api.ts`
- **模块化结构**: API按功能拆分为独立模块，位于 `src/renderer/src/lib/api/modules/`
- **类型安全**: 所有类型定义统一管理在 `src/renderer/src/lib/api/types/`
- **错误处理**: 统一的错误处理机制，通过 `ApiClient` 基类实现
- **向后兼容**: 重构后的API保持与原有接口完全兼容
- **使用 React hooks 管理异步状态**

**API模块使用示例**:

```typescript
// 直接使用统一API入口 (推荐)
import { api } from '@/lib/api'
const projects = await api.listProjects()

// 或直接使用特定模块 (高级用法)
import { ProjectsApi } from '@/lib/api/modules/projects'
const projects = await ProjectsApi.listProjects()

// 类型导入
import type { Project, Agent } from '@/lib/api'
```

### 样式规范

- Tailwind CSS v4 优先
- 响应式设计考虑
- 深色/浅色主题支持

## UI 设计与实现风格

### 空间效率优化原则

- **一屏显示**: 关键内容应在标准屏幕尺寸下一屏内完整显示，使用 `justify-start` 确保重要内容优先显示
- **响应式紧凑**: 移动端使用紧凑间距（`space-y-3`, `py-2`），桌面端适度放松（`space-y-4`, `py-6`）
- **水平布局优先**: 桌面端使用 `flex-row` 水平排列节省垂直空间
- **信息密度平衡**: 功能导向设计，每个像素都有明确目的，避免无意义的空白

### 组件架构模式

- **状态管理**: 复杂功能使用专用的 `useFeatureState` 和 `useFeaturePersist` hooks
- **分层结构**: 复杂功能按 `FeatureMain.tsx` → `steps/` → `components/` 三层组织
- **动画交互**: 使用 framer-motion 的横向滑动（`x: 50 → 0 → -50`）和渐进式加载动画

### 设计系统一致性

- **间距系统**: 紧凑 `space-y-2` (卡片内) / 标准 `space-y-3 md:space-y-4` (组件间) / 大 `space-y-4 md:space-y-6` (节段间)
- **响应式策略**: 移动端紧凑 → 平板端 `md:` 适度 → 桌面端 `lg:` 水平布局优先
- **状态色彩**: 进行中蓝色 / 完成绿色 / 错误红色 / 未开始灰色，配合对应图标

## 禁止事项

- **不要直接编辑** `src/renderer/src/components/ui/` 中的 shadcn 生成组件
- **不要在渲染进程中** 直接访问 Node.js API
- **不要绕过 IPC** 进行跨进程通信
- **不要在主进程中** 执行长时间运行的同步操作
- **不要破坏API模块化结构**:
  - 不要在 `api.ts` 主入口文件中直接添加新的API实现
  - 不要跨模块直接调用其他模块的内部方法
  - 不要绕过 `ApiClient` 基类直接实现API调用

## API 模块开发规范

### 新增API模块

当需要添加新的API功能时，请遵循以下步骤：

1. **创建类型定义** (如需要):

   ```bash
   # 在 src/renderer/src/lib/api/types/ 中添加类型文件
   # 然后在 types/index.ts 中导出
   ```

2. **创建API模块**:

   ```typescript
   // src/renderer/src/lib/api/modules/newFeature.ts
   import { ApiClient } from '../utils/apiClient'
   import type { NewFeatureType } from '../types'

   export class NewFeatureApi extends ApiClient {
     static async someMethod(): Promise<NewFeatureType> {
       return this.handleApiCall(async () => {
         const api = this.getApi()
         return await api.someMethod()
       }, 'Failed to execute some method')
     }
   }
   ```

3. **在主入口中注册**:

   ```typescript
   // src/renderer/src/lib/api.ts
   import { NewFeatureApi } from './api/modules/newFeature'

   export const api = {
     // ... 现有方法
     someMethod: NewFeatureApi.someMethod.bind(NewFeatureApi)
   }
   ```

### 错误处理规范

- 所有API方法必须使用 `handleApiCall` 包装
- 错误消息应该简洁明了，以 'Failed to' 开头
- 对于非关键错误，考虑返回默认值而不是抛出异常

### 类型安全要求

- 所有API方法必须有完整的TypeScript类型定义
- 使用 `import type` 导入类型，避免运行时开销
- 复杂类型应拆分为多个接口，提高可读性

## 重要注意事项

### 渲染进程中的平台检测

**❌ 错误做法**: 在渲染进程中直接使用 `process.platform`

```typescript
// 这会导致 "process is not defined" 错误
if (process.platform === 'win32') { ... }
```

**✅ 正确做法**: 使用 electron-toolkit 暴露的安全接口

```typescript
// 使用预加载脚本暴露的平台信息
if (window.electron.process.platform === 'win32') { ... }
```

### Windows 路径解码

**问题**: Windows 项目路径编码格式 `C--Users-Name-Project` 需要特殊处理

**解决方案**: 在路径解码函数中检测 Windows 盘符模式并正确转换为 `C:\Users\Name\Project`
