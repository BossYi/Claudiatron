// 主容器组件
export { default as SetupWizardMain } from './SetupWizardMain'

// 步骤组件
export { default as WelcomeStep } from './steps/WelcomeStep'
export { default as EnvironmentDetectionStep } from './steps/EnvironmentDetectionStep'
export { default as ClaudeConfigurationStep } from './steps/ClaudeConfigurationStep'
export { default as RepositoryImportStep } from './steps/RepositoryImportStep'
export { default as CompletionStep } from './steps/CompletionStep'

// 共享组件
export { default as StepIndicator } from './components/StepIndicator'
export { default as ProgressDisplay } from './components/ProgressDisplay'
export { default as ErrorHandler } from './components/ErrorHandler'
export { default as GitInstallProgress } from './components/GitInstallProgress'
export { default as ClaudeInstallProgress } from './components/ClaudeInstallProgress'
export { default as AutoInstaller } from './components/AutoInstaller'

// 类型重新导出（方便使用）
export type {
  SetupWizardState,
  ApiConfiguration,
  RepositoryConfiguration,
  EnvironmentStatus,
  InstallationProgress,
  SetupWizardError,
  WizardStep,
  StepStatus
} from '@/types/setupWizard'
