import React, { useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useSetupWizardState } from '@/hooks/useSetupWizardState'
import { useSetupWizardPersist } from '@/hooks/useSetupWizardPersist'
import { WizardStep, StepStatus } from '@/types/setupWizard'

// 步骤组件导入
import { WelcomeStep } from './steps/WelcomeStep'
import { EnvironmentDetectionStep } from './steps/EnvironmentDetectionStep'
import { ClaudeConfigurationStep } from './steps/ClaudeConfigurationStep'
import { RepositoryImportStep } from './steps/RepositoryImportStep'
import { CompletionStep } from './steps/CompletionStep'

// 共享组件导入
import { StepIndicator } from './components/StepIndicator'
import { ErrorHandler } from './components/ErrorHandler'

interface SetupWizardMainProps {
  /**
   * 向导完成时的回调函数
   */
  onComplete?: () => void
  /**
   * 向导关闭时的回调函数
   */
  onClose?: () => void
  /**
   * 可选的CSS类名
   */
  className?: string
}

/**
 * Setup Wizard 主容器组件
 *
 * 负责协调整个设置向导的流程，包括：
 * - 步骤导航和状态管理
 * - 动画效果和UI交互
 * - 错误处理和加载状态
 * - 持久化状态管理
 */
export const SetupWizardMain: React.FC<SetupWizardMainProps> = ({ onComplete, onClose }) => {
  // 状态管理钩子
  const {
    state,
    isLoading: stateLoading,
    error: stateError,
    currentStep,
    canGoNext,
    canGoPrevious,
    canProceed,
    nextStep,
    previousStep,
    jumpToStep,
    updateApiConfiguration,
    updateRepositoryConfiguration,
    updateEnvironmentStatus,
    completeStep,
    setStepError,
    clearStepError,
    isApiConfigurationChanged,
    markApiConfigurationValidated
  } = useSetupWizardState({ autoSave: true })

  // 持久化管理钩子
  const { isSaving, lastSaveTime, enableAutoSave, disableAutoSave } = useSetupWizardPersist({
    debounceMs: 1000,
    onSaveSuccess: () => {
      console.log('Setup wizard state saved successfully')
    },
    onSaveError: (error) => {
      console.error('Failed to save setup wizard state:', error)
    }
  })

  // 步骤配置
  const stepConfig = useMemo(
    () => [
      {
        step: WizardStep.WELCOME,
        title: '欢迎使用',
        description: 'Catalyst 设置向导'
      },
      {
        step: WizardStep.ENVIRONMENT_DETECTION,
        title: '环境检测',
        description: '检测系统环境和必要工具'
      },
      {
        step: WizardStep.CLAUDE_CONFIGURATION,
        title: 'Claude配置',
        description: '配置Claude API和连接'
      },
      {
        step: WizardStep.REPOSITORY_IMPORT,
        title: '项目导入',
        description: '导入或创建项目仓库'
      },
      {
        step: WizardStep.COMPLETION,
        title: '完成设置',
        description: '设置完成，开始使用'
      }
    ],
    []
  )

  // 自动保存启用
  useEffect(() => {
    enableAutoSave(state)
    return () => {
      disableAutoSave()
    }
  }, [state, enableAutoSave, disableAutoSave])

  // 向导完成处理
  useEffect(() => {
    if (
      currentStep === WizardStep.COMPLETION &&
      state.stepStatus[WizardStep.COMPLETION] === StepStatus.COMPLETED
    ) {
      onComplete?.()
    }
  }, [currentStep, state.stepStatus, onComplete])

  // 渲染当前步骤组件
  const renderCurrentStep = () => {
    const commonProps = {
      state,
      onNext: nextStep,
      onPrevious: previousStep,
      onComplete: completeStep,
      onError: setStepError,
      onClearError: clearStepError,
      updateApiConfiguration,
      updateRepositoryConfiguration,
      updateEnvironmentStatus,
      canProceed,
      isApiConfigurationChanged,
      markApiConfigurationValidated
    }

    switch (currentStep) {
      case WizardStep.WELCOME:
        return <WelcomeStep {...commonProps} />
      case WizardStep.ENVIRONMENT_DETECTION:
        return <EnvironmentDetectionStep {...commonProps} />
      case WizardStep.CLAUDE_CONFIGURATION:
        return <ClaudeConfigurationStep {...commonProps} />
      case WizardStep.REPOSITORY_IMPORT:
        return <RepositoryImportStep {...commonProps} />
      case WizardStep.COMPLETION:
        return <CompletionStep {...commonProps} />
      default:
        return <div>未知步骤</div>
    }
  }

  // 页面动画变量 - 横向滑动效果
  const pageVariants = {
    initial: { opacity: 0, x: 50, scale: 0.95 },
    in: { opacity: 1, x: 0, scale: 1 },
    out: { opacity: 0, x: -50, scale: 0.95 }
  }

  const pageTransition = {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
    duration: 0.4
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* 头部 - 标题和横向步骤指示器 */}
      <div className="flex-shrink-0 border-b bg-card">
        <div className="px-4 md:px-6 py-4 md:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6 gap-3">
            <h1 className="text-xl md:text-2xl font-bold">Catalyst 设置向导</h1>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground self-start sm:self-auto"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
            )}
          </div>

          {/* 横向步骤指示器 */}
          <div className="max-w-5xl mx-auto">
            <StepIndicator
              steps={stepConfig}
              currentStep={currentStep}
              stepStatus={state.stepStatus}
              onStepClick={jumpToStep}
            />
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex flex-col h-full max-w-5xl mx-auto w-full px-4 md:px-6 py-2 md:py-6">
          {/* 错误处理 */}
          {stateError && (
            <div className="mb-4 md:mb-6">
              <ErrorHandler
                error={stateError}
                onRetry={() => clearStepError(stateError.step)}
                onDismiss={() => clearStepError(stateError.step)}
              />
            </div>
          )}

          {/* 步骤内容 */}
          <div className="flex flex flex-col overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className="flex-1 flex flex-col"
              >
                {renderCurrentStep()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* 底部导航按钮 */}
          <div className="flex-shrink-0 border-t pt-4 md:pt-6 mt-6 md:mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                {isSaving && (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>保存中...</span>
                  </>
                )}
                {lastSaveTime && !isSaving && (
                  <span className="hidden sm:inline">
                    最后保存: {new Date(lastSaveTime).toLocaleTimeString()}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 sm:gap-4">
                <Button
                  variant="outline"
                  size="default"
                  onClick={previousStep}
                  disabled={!canGoPrevious || stateLoading}
                  className="flex items-center gap-2 flex-1 sm:flex-none sm:min-w-[100px]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">上一步</span>
                  <span className="sm:hidden">上一步</span>
                </Button>

                <Button
                  size="default"
                  onClick={nextStep}
                  disabled={!canGoNext || stateLoading}
                  className="flex items-center gap-2 flex-1 sm:flex-none sm:min-w-[100px] bg-blue-600 hover:bg-blue-700"
                >
                  <span className="hidden sm:inline">
                    {currentStep === WizardStep.COMPLETION ? '完成设置' : '下一步'}
                  </span>
                  <span className="sm:hidden">
                    {currentStep === WizardStep.COMPLETION ? '完成' : '下一步'}
                  </span>
                  {currentStep !== WizardStep.COMPLETION && <ArrowRight className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 全局加载状态 */}
      {stateLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="p-6">
            <CardContent className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>加载中...</span>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default SetupWizardMain
