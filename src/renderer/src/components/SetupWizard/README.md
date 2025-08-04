# SetupWizard 组件

SetupWizard 是 Claudiatron 应用的初始设置向导，用于引导用户完成应用的首次配置。

## 功能概述

- **欢迎介绍**: 向用户介绍 Claudiatron 及其功能
- **环境检测**: 自动检测 Git、Node.js 和 Claude CLI 的安装状态
- **Claude 配置**: 配置 Claude API 密钥和连接设置
- **项目导入**: 支持克隆远程仓库、导入本地项目或创建新项目
- **完成设置**: 显示设置摘要和后续建议

## 架构组件

### 主容器组件

- `SetupWizardMain.tsx` - 主向导容器，管理整个流程

### 步骤组件

- `WelcomeStep.tsx` - 欢迎步骤
- `EnvironmentDetectionStep.tsx` - 环境检测步骤
- `ClaudeConfigurationStep.tsx` - Claude 配置步骤
- `RepositoryImportStep.tsx` - 项目导入步骤
- `CompletionStep.tsx` - 完成步骤

### 共享组件

- `StepIndicator.tsx` - 步骤指示器
- `ProgressDisplay.tsx` - 进度显示
- `ErrorHandler.tsx` - 错误处理
- `GitInstallProgress.tsx` - Git 安装进度
- `ClaudeInstallProgress.tsx` - Claude CLI 安装进度
- `AutoInstaller.tsx` - 自动安装器

## 使用方式

```tsx
import { SetupWizardMain } from '@/components/SetupWizard'

function App() {
  const handleComplete = () => {
    console.log('Setup wizard completed!')
    // 处理设置完成逻辑
  }

  const handleClose = () => {
    console.log('Setup wizard closed')
    // 处理关闭逻辑
  }

  return <SetupWizardMain onComplete={handleComplete} onClose={handleClose} />
}
```

## 状态管理

向导使用两个主要的 React 钩子来管理状态：

- `useSetupWizardState` - 管理向导的核心状态和导航逻辑
- `useSetupWizardPersist` - 处理状态的持久化和自动保存

## API 集成

所有后端交互通过 `window.api.setupWizard*` 方法进行：

- `setupWizardGetState()` - 获取已保存的状态
- `setupWizardSaveState(state)` - 保存当前状态
- `setupWizardDetectEnvironment()` - 检测系统环境
- `setupWizardValidateClaudeConfig(config)` - 验证 Claude 配置
- `setupWizardCloneRepository(request)` - 克隆远程仓库
- `setupWizardReset()` - 重置向导状态

## 类型安全

所有组件都使用 TypeScript 并基于 `@/types/setupWizard.ts` 中定义的类型接口。

## 样式和动画

- 使用 Tailwind CSS v4 进行样式设计
- 集成 framer-motion 提供流畅的页面切换动画
- 基于 shadcn/ui 组件库构建一致的界面

## 开发注意事项

1. 所有步骤组件都接收相同的 props 接口
2. 错误处理通过统一的 `ErrorHandler` 组件
3. 进度显示支持实时更新和用户交互
4. 支持跳转到已完成的步骤
5. 状态会自动持久化到数据库

## 扩展性

要添加新的步骤：

1. 在 `steps/` 目录中创建新的步骤组件
2. 在 `@/types/setupWizard.ts` 中添加相应的 `WizardStep` 枚举值
3. 在 `SetupWizardMain.tsx` 中的 `renderCurrentStep()` 方法中添加新步骤的渲染逻辑
4. 更新 `stepConfig` 数组包含新步骤的配置

组件设计遵循可扩展和模块化原则，便于未来功能的添加和维护。
