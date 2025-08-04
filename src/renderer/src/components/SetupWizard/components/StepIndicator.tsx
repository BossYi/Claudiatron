import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, AlertCircle, Loader2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WizardStep, StepStatus } from '@/types/setupWizard'

interface StepConfig {
  step: WizardStep
  title: string
  description: string
}

interface StepIndicatorProps {
  /**
   * 步骤配置数组
   */
  steps: StepConfig[]
  /**
   * 当前步骤
   */
  currentStep: WizardStep
  /**
   * 各步骤状态
   */
  stepStatus: Record<WizardStep, StepStatus>
  /**
   * 步骤点击回调
   */
  onStepClick?: (step: WizardStep) => void
  /**
   * 可选的CSS类名
   */
  className?: string
}

/**
 * 横向步骤指示器组件
 *
 * 以横向进度条形式显示设置向导的进度和各步骤状态，支持点击跳转到已完成步骤
 */
export const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
  stepStatus,
  onStepClick,
  className
}) => {
  // 获取步骤状态图标和样式
  const getStepIcon = (step: WizardStep, stepIndex: number) => {
    const status = stepStatus[step]
    const isCurrentStep = step === currentStep
    const isCompleted = status === StepStatus.COMPLETED
    const isError = status === StepStatus.ERROR
    const isInProgress = status === StepStatus.IN_PROGRESS || isCurrentStep

    // 图标容器样式
    const iconContainerClassName = cn(
      'relative z-10 flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full border-2 transition-all duration-300',
      {
        // 已完成状态
        'bg-green-500 border-green-500 text-white': isCompleted,
        // 错误状态
        'bg-red-500 border-red-500 text-white': isError,
        // 当前步骤或进行中
        'bg-blue-500 border-blue-500 text-white': isInProgress && !isError,
        // 未开始状态
        'bg-white border-gray-300 text-gray-400': !isCompleted && !isError && !isInProgress
      }
    )

    // 渲染图标
    const renderIcon = () => {
      if (isCompleted) {
        return <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
      } else if (isError) {
        return <AlertCircle className="w-4 h-4 md:w-5 md:h-5" />
      } else if (isInProgress) {
        return status === StepStatus.IN_PROGRESS ? (
          <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
        ) : (
          <span className="text-xs md:text-sm font-semibold">{stepIndex + 1}</span>
        )
      } else {
        return <Circle className="w-4 h-4 md:w-5 md:h-5" />
      }
    }

    return <div className={iconContainerClassName}>{renderIcon()}</div>
  }

  // 获取连接线样式
  const getConnectorClassName = (stepIndex: number) => {
    const currentStepIndex = steps.findIndex((s) => s.step === currentStep)
    const isCompleted =
      stepIndex < currentStepIndex || stepStatus[steps[stepIndex].step] === StepStatus.COMPLETED

    return cn(
      'absolute top-4 md:top-5 left-4 md:left-5 right-4 md:right-5 h-0.5 transition-all duration-500',
      isCompleted ? 'bg-green-500' : 'bg-gray-300'
    )
  }

  // 获取步骤标题样式
  const getStepTitleClassName = (step: WizardStep) => {
    const status = stepStatus[step]
    const isCurrentStep = step === currentStep
    const isCompleted = status === StepStatus.COMPLETED

    return cn('text-sm font-medium transition-colors duration-300', {
      'text-blue-600': isCurrentStep,
      'text-green-600': isCompleted,
      'text-red-600': status === StepStatus.ERROR,
      'text-gray-500': !isCurrentStep && !isCompleted && status !== StepStatus.ERROR
    })
  }

  // 处理步骤点击
  const handleStepClick = (step: WizardStep) => {
    const status = stepStatus[step]
    const isClickable = status === StepStatus.COMPLETED || step === currentStep

    if (isClickable && onStepClick) {
      onStepClick(step)
    }
  }

  // 获取步骤容器样式
  const getStepContainerClassName = (step: WizardStep) => {
    const status = stepStatus[step]
    const isCurrentStep = step === currentStep
    const isClickable = status === StepStatus.COMPLETED || isCurrentStep

    return cn('flex flex-col items-center cursor-pointer transition-all duration-300', {
      'hover:scale-105': isClickable,
      'cursor-not-allowed opacity-60': !isClickable
    })
  }

  return (
    <div className={cn('w-full', className)}>
      {/* 横向步骤容器 */}
      <div className="relative flex items-center justify-between">
        {steps.map((stepConfig, index) => (
          <motion.div
            key={stepConfig.step}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className={getStepContainerClassName(stepConfig.step)}
            onClick={() => handleStepClick(stepConfig.step)}
            style={{ flex: 1 }}
          >
            {/* 连接线 */}
            {index < steps.length - 1 && (
              <motion.div
                className={getConnectorClassName(index)}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: (index + 1) * 0.2, duration: 0.8 }}
              />
            )}

            {/* 步骤图标 */}
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              {getStepIcon(stepConfig.step, index)}
            </motion.div>

            {/* 步骤标题 */}
            <div className="mt-2 md:mt-3 text-center max-w-16 md:max-w-24">
              <h3 className={cn(getStepTitleClassName(stepConfig.step), 'text-xs md:text-sm')}>
                {stepConfig.title}
              </h3>

              {/* 在大屏幕上显示描述，小屏幕隐藏 */}
              <p className="hidden lg:block text-xs text-muted-foreground mt-1 leading-tight">
                {stepConfig.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 当前步骤描述（在小屏幕上显示） */}
      <div className="lg:hidden mt-3 md:mt-4 text-center px-4">
        <p className="text-xs md:text-sm text-muted-foreground">
          {steps.find((s) => s.step === currentStep)?.description}
        </p>
      </div>
    </div>
  )
}

export default StepIndicator
