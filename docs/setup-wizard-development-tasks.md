# 引导式设置向导开发任务清单

## 项目概述

基于 `setup-wizard-spec.md` 规格文档，开发一个面向产品经理和非技术用户的引导式设置向导系统，实现零配置的代码理解环境。

## 核心目标

- 为非技术用户提供一键式环境配置
- 实现渐进式五步引导流程
- 支持企业自定义API配置
- 提供安全的Git克隆引导
- 实现状态持久化和中断恢复

## 技术架构设计

### 组件架构

```
SetupWizard/
├── SetupWizardMain.tsx           # 主向导容器组件
├── hooks/
│   ├── useSetupWizardState.ts    # 状态管理钩子
│   └── useSetupWizardPersist.ts  # 持久化钩子
├── steps/
│   ├── WelcomeStep.tsx           # 欢迎步骤
│   ├── EnvironmentDetectionStep.tsx # 环境检测步骤
│   ├── ClaudeConfigurationStep.tsx  # Claude配置步骤
│   ├── RepositoryImportStep.tsx     # 代码库导入步骤
│   └── CompletionStep.tsx           # 完成步骤
├── components/
│   ├── StepIndicator.tsx         # 步骤指示器
│   ├── ProgressDisplay.tsx       # 进度显示
│   ├── ErrorHandler.tsx          # 错误处理组件
│   ├── GitInstallProgress.tsx    # Git安装进度组件
│   ├── ClaudeInstallProgress.tsx # Claude Code安装进度组件
│   └── AutoInstaller.tsx         # 自动安装组件
└── types/
    └── SetupWizardTypes.ts       # 类型定义

# 主进程新增组件
src/main/
├── installation/
│   ├── GitInstallationManager.ts        # Git自动安装管理器
│   ├── NodeJsInstallationManager.ts      # Node.js自动安装管理器
│   └── ClaudeCodeInstallationManager.ts  # Claude Code自动安装管理器
├── detection/
│   ├── GitDetectionService.ts            # Git检测服务
│   └── NodeJsDetectionService.ts         # Node.js检测服务
└── services/
    └── RepositoryImportService.ts        # 仓库导入服务
```

### 状态管理设计

```typescript
interface SetupWizardState {
  currentStep: 1 | 2 | 3 | 4 | 5
  stepStatus: Record<number, 'pending' | 'in_progress' | 'completed' | 'error'>
  userData: {
    apiConfiguration?: {
      apiUrl: string
      apiKey: string
    }
    repository?: {
      url: string
      localPath: string
      projectName: string
    }
    environmentStatus?: {
      git: boolean
      nodejs: boolean
      claudeCli: boolean
      systemInfo: any
    }
  }
  errors: Record<number, string[]>
  canProceed: boolean
  isFirstRun: boolean
}
```

### IPC API扩展

```typescript
// src/main/api/setupWizard.ts 需要实现的接口
- setup-wizard-get-state
- setup-wizard-save-state
- setup-wizard-detect-environment
- setup-wizard-install-dependencies
- setup-wizard-validate-claude-config
- setup-wizard-clone-repository
- setup-wizard-complete-setup
- setup-wizard-reset

// Git安装相关新增接口
- git-install-detect-environment
- git-install-download-start
- git-install-progress-monitor
- git-install-execute
- git-install-verify
- git-install-rollback

// 仓库导入相关接口
- git-repository-validate-url
- git-repository-analyze
- git-repository-clone-start
- git-repository-clone-monitor
- git-repository-import-project

// Node.js安装相关接口
- nodejs-detect-environment
- nodejs-install-download
- nodejs-install-execute
- nodejs-install-verify

// Claude Code安装相关接口
- claude-code-install-check
- claude-code-install-start
- claude-code-install-progress
- claude-code-install-verify
- claude-code-configure-api
```

## 开发任务分解

### ✅ 阶段1：基础架构和文档 (2-3天) [已完成]

#### ✅ 任务1.1: 创建TypeScript类型定义 [已完成]

- **优先级**: 高
- **文件**: `src/renderer/src/types/setupWizard.ts`
- **描述**: 定义设置向导相关的所有TypeScript类型
- **交付物**:
  - ✅ SetupWizardState接口
  - ✅ 步骤状态枚举
  - ✅ 配置数据类型
  - ✅ 错误处理类型
- **验收标准**: ✅ 类型定义完整，与现有类型系统兼容

#### ✅ 任务1.2: 设计数据库架构 [已完成]

- **优先级**: 高
- **文件**: `src/main/database/services/SetupWizardService.ts`
- **描述**: 扩展现有数据库实体以支持向导状态持久化
- **交付物**:
  - ✅ 向导状态服务层
  - ✅ 数据库操作接口
  - ✅ 状态持久化功能
- **验收标准**: ✅ 数据库结构设计合理，支持状态持久化

### ✅ 阶段2：状态管理和数据层 (2-3天) [已完成]

#### ✅ 任务2.1: 实现状态管理钩子 [已完成]

- **优先级**: 高
- **文件**: `src/renderer/src/hooks/useSetupWizardState.ts`
- **描述**: 创建React状态管理钩子，处理向导状态
- **功能要求**:
  - ✅ 步骤导航控制
  - ✅ 状态验证逻辑
  - ✅ 错误状态管理
  - ✅ 数据持久化集成
- **验收标准**: ✅ 状态管理逻辑完整，支持复杂状态操作

#### ✅ 任务2.2: 实现持久化钩子 [已完成]

- **优先级**: 高
- **文件**: `src/renderer/src/hooks/useSetupWizardPersist.ts`
- **描述**: 处理向导状态的持久化和恢复
- **功能要求**:
  - ✅ 自动保存机制（防抖 + 重试）
  - ✅ 中断后恢复
  - ✅ 数据清理功能
- **验收标准**: ✅ 持久化机制稳定，支持中断恢复

#### ✅ 任务2.3: 创建主进程API处理器 [已完成]

- **优先级**: 高
- **文件**: `src/main/api/setupWizard.ts`
- **描述**: 实现设置向导相关的IPC API处理器
- **功能要求**:
  - ✅ 状态CRUD操作（带验证和锁机制）
  - ✅ 环境检测接口（并行检测 + 缓存）
  - ✅ 配置验证接口
  - ✅ 错误处理机制（统一错误格式）
- **验收标准**: ✅ API接口完整，错误处理健壮

### ✅ 阶段3：核心组件开发 (4-5天) [已完成]

#### ✅ 任务3.1: 创建主向导容器 [已完成]

- **优先级**: 高
- **文件**: `src/renderer/src/components/SetupWizard/SetupWizardMain.tsx`
- **描述**: 实现设置向导的主容器组件
- **功能要求**:
  - ✅ 步骤导航逻辑
  - ✅ 状态管理集成（useSetupWizardState + useSetupWizardPersist）
  - ✅ 响应式布局（Tailwind CSS v4）
  - ✅ 动画效果（framer-motion）
- **验收标准**: ✅ 容器组件功能完整，用户体验流畅

#### ✅ 任务3.2: 实现步骤指示器组件 [已完成]

- **优先级**: 中
- **文件**: `src/renderer/src/components/SetupWizard/components/StepIndicator.tsx`
- **描述**: 显示当前步骤和完成进度
- **功能要求**:
  - ✅ 可视化步骤进度（5步进度条）
  - ✅ 状态指示（完成/进行中/错误）
  - ✅ 响应式设计
- **验收标准**: ✅ 指示器清晰直观，状态显示准确

#### ✅ 任务3.3: 实现欢迎步骤组件 [已完成]

- **优先级**: 中
- **文件**: `src/renderer/src/components/SetupWizard/steps/WelcomeStep.tsx`
- **描述**: 产品介绍和用户信心建立
- **功能要求**:
  - ✅ 产品价值说明
  - ✅ 流程预览（5步流程可视化）
  - ✅ 预计时间显示
  - ✅ 开始按钮
- **验收标准**: ✅ 界面友好，能有效建立用户信心

#### ✅ 任务3.4: 实现环境检测步骤组件 [已完成]

- **优先级**: 高
- **文件**: `src/renderer/src/components/SetupWizard/steps/EnvironmentDetectionStep.tsx`
- **描述**: 环境检测和自动安装编排
- **功能要求**:
  - ✅ 并行检测Git、Node.js、Claude Code
  - ✅ 依赖链智能处理（Node.js → Claude Code）
  - ✅ 实时进度反馈和状态显示
  - ✅ 一键自动安装所有缺失组件
  - ✅ 安装失败的智能恢复机制
- **验收标准**: ✅ 检测准确，安装流程自动化

#### ✅ 任务3.5: 实现Claude配置步骤组件 [已完成]

- **优先级**: 高
- **文件**: `src/renderer/src/components/SetupWizard/steps/ClaudeConfigurationStep.tsx`
- **描述**: Claude Code API配置和验证
- **功能要求**:
  - ✅ 检测Claude Code安装状态
  - ✅ API密钥安全输入和存储
  - ✅ 企业API地址配置（可选）
  - ✅ 实时连接测试和诊断
  - ✅ 自动执行claude configure命令
  - ✅ 配置文件验证和备份
- **验收标准**: ✅ 配置自动化，连接验证准确

#### ✅ 任务3.6: 实现代码库导入步骤组件 [已完成]

- **优先级**: 高
- **文件**: `src/renderer/src/components/SetupWizard/steps/RepositoryImportStep.tsx`
- **描述**: 引导式Git克隆流程
- **功能要求**:
  - ✅ URL验证和输入
  - ✅ 路径选择和验证
  - ✅ 安全命令生成
  - ✅ 进度监控显示
- **验收标准**: ✅ 克隆流程安全，用户操作简单

#### ✅ 任务3.7: 实现完成步骤组件 [已完成]

- **优先级**: 中
- **文件**: `src/renderer/src/components/SetupWizard/steps/CompletionStep.tsx`
- **描述**: 设置完成和使用引导
- **功能要求**:
  - ✅ 配置摘要显示
  - ✅ 功能介绍
  - ✅ 快速开始指导
  - ✅ 进入主应用按钮
- **验收标准**: ✅ 完成页面信息丰富，过渡自然

#### ✅ 任务3.8: 实现共享组件 [已完成]

- **优先级**: 中
- **文件**: `src/renderer/src/components/SetupWizard/components/`
- **描述**: 开发所有共享组件
- **交付物**:
  - ✅ ProgressDisplay.tsx - 通用进度显示组件
  - ✅ ErrorHandler.tsx - 统一错误处理和恢复
  - ✅ GitInstallProgress.tsx - Git安装进度和指引
  - ✅ ClaudeInstallProgress.tsx - Claude CLI安装进度和指引
  - ✅ AutoInstaller.tsx - 批量软件自动安装器
- **验收标准**: ✅ 所有共享组件功能完整，可复用性强

#### ✅ 任务3.9: 主应用集成 [已完成]

- **优先级**: 高
- **文件**: `src/renderer/src/App.tsx`, `src/renderer/src/lib/api.ts`
- **描述**: 设置向导与主应用的完整集成
- **功能要求**:
  - ✅ 首次启动检测逻辑
  - ✅ 向导触发和完成处理
  - ✅ API接口完善
  - ✅ 视图导航集成
- **验收标准**: ✅ 集成无缝，首次启动体验完整

### ✅ 阶段4：环境检测和自动安装功能 (5-6天) [已完成]

#### ✅ 任务4.1: 实现Claude Code自动安装系统 [已完成]

- **优先级**: 高
- **文件**: `src/main/installation/ClaudeCodeInstallationManager.ts`
- **描述**: Claude Code的自动下载、安装和配置系统
- **功能要求**:
  - ✅ Node.js依赖检测和自动安装
  - ✅ npm全局包安装管理
  - ✅ Claude Code版本管理
  - ✅ API密钥自动配置
  - ✅ 安装进度监控和错误处理
- **验收标准**: ✅ 安装流程顺畅，依赖处理正确

#### ✅ 任务4.2: 实现Git自动安装系统 [已完成]

- **优先级**: 高
- **文件**: `src/main/installation/GitInstallationManager.ts`
- **描述**: Git的自动下载、安装和配置系统
- **功能要求**:
  - ✅ 跨平台Git安装包下载
  - ✅ 自动安装和环境变量配置
  - ✅ 安装进度监控和错误处理
  - ✅ 安装验证和回滚机制
- **验收标准**: ✅ 安装成功率高，用户体验流畅

#### ✅ 任务4.3: 实现Git检测服务 [已完成]

- **优先级**: 高
- **文件**: `src/main/detection/GitDetectionService.ts`
- **描述**: 增强版Git环境检测，支持自动安装决策
- **功能要求**:
  - ✅ 智能检测已安装的Git版本
  - ✅ 版本兼容性分析和建议
  - ✅ 安装需求评估
  - ✅ 系统权限和环境检查
- **验收标准**: ✅ 检测准确，支持安装决策

#### ✅ 任务4.4: 创建Git安装进度组件 [已完成]

- **优先级**: 中
- **文件**: `src/renderer/src/components/SetupWizard/components/GitInstallProgress.tsx`
- **描述**: Git安装过程的用户界面组件
- **功能要求**:
  - ✅ 实时下载进度显示
  - ✅ 安装阶段状态反馈
  - ✅ 错误处理和重试界面
  - ✅ 安装完成验证显示
- **验收标准**: ✅ 界面友好，进度反馈准确

#### ✅ 任务4.5: 实现Node.js检测和安装服务 [已完成]

- **优先级**: 高
- **文件**: `src/main/installation/NodeJsInstallationManager.ts`
- **描述**: Node.js的自动检测、下载和安装管理
- **功能要求**:
  - ✅ 跨平台Node.js版本检测
  - ✅ 最新LTS版本自动下载
  - ✅ 安装和环境变量配置
  - ✅ npm配置和镜像设置
  - ✅ 版本兼容性验证
- **验收标准**: ✅ Node.js安装成功，npm可用

#### ✅ 任务4.6: 创建Claude Code安装进度组件 [已完成]

- **优先级**: 中
- **文件**: `src/renderer/src/components/SetupWizard/components/ClaudeInstallProgress.tsx`
- **描述**: Claude Code安装过程的用户界面组件
- **功能要求**:
  - ✅ npm安装进度显示
  - ✅ 依赖下载状态监控
  - ✅ API配置界面集成
  - ✅ 连接测试反馈
  - ✅ 错误诊断和解决指导
- **验收标准**: ✅ 安装过程透明，用户体验良好

#### ✅ 任务4.7: 基础安装架构开发 [已完成]

- **优先级**: 高
- **文件**: `src/main/installation/BaseInstallationManager.ts`
- **描述**: 通用安装管理器抽象基类
- **功能要求**:
  - ✅ 跨平台文件下载与完整性校验
  - ✅ 系统权限检查与提升
  - ✅ 安装进度报告与错误处理
  - ✅ 安装后验证与日志记录
- **验收标准**: ✅ 基础设施完整，为具体安装器提供统一框架

#### ✅ 任务4.8: 增强检测服务开发 [已完成]

- **优先级**: 高
- **文件**: `src/main/detection/NodeJsDetectionService.ts`
- **描述**: Node.js检测服务和环境分析
- **功能要求**:
  - ✅ Node.js和npm版本检测
  - ✅ 版本兼容性分析（最低Node.js 16.x LTS）
  - ✅ 环境检查（PATH配置、全局包等）
  - ✅ 安装需求评估和建议
- **验收标准**: ✅ 检测准确，支持安装决策

#### ✅ 任务4.9: 仓库管理服务开发 [已完成]

- **优先级**: 高
- **文件**: `src/main/services/RepositoryImportService.ts`
- **描述**: 智能化的Git仓库导入和项目配置系统
- **功能要求**:
  - ✅ URL验证和仓库分析
  - ✅ 智能克隆策略选择
  - ✅ 克隆进度监控
  - ✅ 项目自动识别和配置
  - ✅ CLAUDE.md文件自动生成
- **验收标准**: ✅ 导入流程智能，配置准确

#### ✅ 任务4.10: API集成和UI完善 [已完成]

- **优先级**: 高
- **文件**: `src/main/api/setupWizard.ts`, UI组件
- **描述**: 将所有安装管理器连接到API层和优化用户界面
- **功能要求**:
  - ✅ 将现有占位符API连接到实际的安装管理器
  - ✅ 实现实时进度报告和IPC通信
  - ✅ 完善错误处理和日志记录系统
  - ✅ 确保API响应格式与UI组件完全兼容
- **验收标准**: ✅ API集成完整，UI交互流畅

### 阶段5：配置和集成功能 (3-4天)

#### 任务5.1: 实现Claude API配置验证

- **优先级**: 高
- **描述**: API连接测试和配置保存
- **功能要求**:
  - 连接测试逻辑
  - 错误诊断
  - 安全存储集成
  - 配置文件生成
- **验收标准**: 验证准确，存储安全

#### 任务5.2: 实现仓库导入服务

- **优先级**: 高
- **文件**: `src/main/services/RepositoryImportService.ts`
- **描述**: 智能化的Git仓库导入和项目配置系统
- **功能要求**:
  - URL验证和仓库分析
  - 智能克隆策略选择
  - 克隆进度监控
  - 项目自动识别和配置
- **验收标准**: 导入流程智能，配置准确

#### 任务5.3: 实现项目自动导入

- **优先级**: 中
- **描述**: 克隆完成后的项目集成
- **功能要求**:
  - 项目检测
  - CLAUDE.md生成
  - 项目列表更新
- **验收标准**: 导入自动，配置正确

### 阶段6：应用集成和用户体验 (2-3天)

#### ✅ 任务6.1: 集成到主应用流程 [已完成]

- **优先级**: 高
- **文件**: `src/renderer/src/App.tsx`
- **描述**: 设置向导与主应用的集成
- **功能要求**:
  - ✅ 首次启动检测
  - ✅ 向导触发逻辑
  - ✅ 完成后跳转
- **验收标准**: ✅ 集成seamless，逻辑正确

#### 任务6.2: 添加国际化支持

- **优先级**: 中
- **文件**: `src/renderer/src/i18n/locales/zh-CN/setupWizard.json`
- **描述**: 中英文翻译和本地化
- **功能要求**:
  - 完整翻译文件
  - 文化适配
  - 格式本地化
- **验收标准**: 翻译准确，本地化完整

#### 任务6.3: 实现错误处理和恢复

- **优先级**: 高
- **文件**: `src/renderer/src/components/SetupWizard/components/ErrorHandler.tsx`
- **描述**: 用户友好的错误处理系统
- **功能要求**:
  - 错误分类展示
  - 解决方案指导
  - 自动重试机制
  - 手动恢复选项
- **验收标准**: 错误处理友好，恢复机制有效

### 阶段7：测试和优化 (2-3天)

#### 任务7.1: 创建单元测试

- **优先级**: 中
- **文件**: `src/renderer/src/components/SetupWizard/__tests__/`
- **描述**: 组件和逻辑的单元测试
- **覆盖范围**:
  - 状态管理逻辑
  - 组件渲染
  - 用户交互
- **验收标准**: 测试覆盖率 > 80%

#### 任务7.2: 集成测试和用户测试

- **优先级**: 中
- **描述**: 完整流程测试和可用性测试
- **测试内容**:
  - 完整向导流程
  - 错误场景处理
  - 非技术用户测试
- **验收标准**: 功能完整，用户体验良好

#### 任务7.3: 性能优化和最终打磨

- **优先级**: 中
- **描述**: 性能优化和用户体验打磨
- **优化内容**:
  - 异步操作优化
  - 动画效果调优
  - 响应性改进
  - 兼容性修复
- **验收标准**: 性能良好，体验流畅

## 技术实施细节

### 现有系统集成点

1. **复用ClaudeDetectionManager**: 扩展现有检测系统而不是重写
2. **利用AppSettings数据库**: 使用现有数据库基础设施
3. **集成shadcn/ui组件**: 保持UI设计一致性
4. **扩展IPC API**: 基于现有模式添加新接口
5. **集成i18n系统**: 使用现有国际化基础设施

### 安全设计原则

1. **自动化安装**: 安全的自动下载和安装Git、Node.js、Claude Code，减少用户手动操作
2. **依赖链管理**: 智能处理软件依赖关系，确保安装顺序正确
3. **严格输入验证**: URL、路径、配置参数的安全验证
4. **密钥安全存储**: 使用现有的安全存储机制，避免明文存储API密钥
5. **错误边界**: 完善的错误处理和恢复机制
6. **权限控制**: 最小权限原则，仅在必要时请求系统权限

### 用户体验重点

1. **零配置理念**: 自动安装所有必需软件，无需用户手动下载
2. **智能依赖处理**: 自动解决Node.js和Claude Code的依赖关系
3. **渐进式引导**: 每步只关注一个核心任务
4. **错误友好**: 使用非技术语言描述问题
5. **状态透明**: 实时显示安装进度和操作状态
6. **中断恢复**: 支持向导流程的中断和恢复
7. **一键修复**: 环境问题的自动诊断和修复

## 质量保证

### 代码质量标准

- TypeScript严格模式
- ESLint规则遵循
- 代码注释完整
- 错误处理健壮

### 测试要求

- 单元测试覆盖率 > 80%
- 集成测试覆盖主要流程
- 用户体验测试验收
- 跨平台兼容性测试

### 文档要求

- API文档完整
- 用户使用手册
- 开发维护文档
- 故障排除指南

## 风险评估

### 技术风险

- **跨平台兼容性**: 不同操作系统的环境检测差异
- **网络连接问题**: API连接和Git克隆的网络依赖
- **用户权限问题**: 文件系统访问和安装权限

### 缓解措施

- 充分的跨平台测试
- 离线模式和重试机制
- 清晰的权限指导和错误处理

## 项目时间线

### 总体时间估算: 21-28个工作日

- **阶段1**: 2-3天 (基础架构)
- **阶段2**: 2-3天 (数据层)
- **阶段3**: 4-5天 (核心组件)
- **阶段4**: 5-6天 (环境检测和自动安装)
- **阶段5**: 3-4天 (配置集成)
- **阶段6**: 2-3天 (应用集成)
- **阶段7**: 3-4天 (测试优化)

### 里程碑

1. ✅ **Week 1**: 基础架构和状态管理完成 [已完成]
2. ✅ **Week 2**: 核心组件开发完成 [已完成]
3. ✅ **Week 3**: 自动安装功能和配置集成完成 [已完成]
4. 🔄 **Week 4**: 应用集成、测试优化和最终交付 [进行中]

### 新增时间说明

由于引入Git和Claude Code自动安装功能，相比原计划增加了3-4天的开发时间：

- Git自动安装系统开发：+1天
- Node.js检测和安装系统：+1天
- Claude Code自动安装和配置：+1天
- 安装进度监控组件：+1天
- 集成测试和跨平台验证：+1天

## 交付成果

### 代码交付

1. 完整的设置向导系统代码
2. 扩展的主进程API处理器
3. 数据库架构扩展
4. 国际化资源文件

### 文档交付

1. 技术架构文档
2. API接口文档
3. 用户使用手册
4. 开发维护文档

### 测试交付

1. 自动化测试套件
2. 用户体验测试报告
3. 性能测试报告
4. 兼容性测试报告

通过这个详细的开发计划，Catalyst将获得一个专业、用户友好的设置向导系统，实现完整的自动化环境配置，包括Git、Node.js和Claude Code的自动安装，真正为产品经理和非技术用户提供零配置的代码理解环境。
