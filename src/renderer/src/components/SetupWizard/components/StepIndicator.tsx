import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, AlertCircle, Loader2, Circle, ChevronRight } from 'lucide-react'
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

    // 外圈容器样式
    const outerContainerClassName = cn(
      'relative flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full transition-all duration-300',
      {
        // 已完成状态 - 绿色外圈
        'bg-green-500': isCompleted,
        // 错误状态 - 红色外圈
        'bg-red-500': isError,
        // 当前步骤或进行中 - 蓝色外圈
        'bg-blue-500': isInProgress && !isError,
        // 未开始状态 - 灰色边框
        'bg-white border-2 border-gray-300': !isCompleted && !isError && !isInProgress
      }
    )

    // 内圈样式
    const innerContainerClassName = cn(
      'flex items-center justify-center rounded-full transition-all duration-300',
      {
        // 有状态的步骤需要白色内圈
        'w-6 h-6 md:w-8 md:h-8 bg-white': isCompleted || isError || (isInProgress && !isError),
        // 未开始状态不需要内圈
        'w-full h-full': !isCompleted && !isError && !isInProgress
      }
    )

    // 图标样式
    const iconClassName = cn({
      'text-green-500': isCompleted,
      'text-red-500': isError,
      'text-blue-500': isInProgress && !isError,
      'text-gray-400': !isCompleted && !isError && !isInProgress
    })

    // 渲染图标
    const renderIcon = () => {
      if (isCompleted) {
        return <CheckCircle className={cn('w-4 h-4 md:w-5 md:h-5', iconClassName)} />
      } else if (isError) {
        return <AlertCircle className={cn('w-4 h-4 md:w-5 md:h-5', iconClassName)} />
      } else if (isInProgress) {
        return status === StepStatus.IN_PROGRESS ? (
          <Loader2 className={cn('w-4 h-4 md:w-5 md:h-5 animate-spin', iconClassName)} />
        ) : (
          <span className={cn('text-xs md:text-sm font-semibold', iconClassName)}>
            {stepIndex + 1}
          </span>
        )
      } else {
        return <Circle className={cn('w-4 h-4 md:w-5 md:h-5', iconClassName)} />
      }
    }

    return (
      <div className={outerContainerClassName}>
        <div className={innerContainerClassName}>{renderIcon()}</div>
      </div>
    )
  }

  // 获取箭头样式
  const getArrowClassName = (stepIndex: number) => {
    const currentStepIndex = steps.findIndex((s) => s.step === currentStep)
    const isCompleted =
      stepIndex < currentStepIndex || stepStatus[steps[stepIndex].step] === StepStatus.COMPLETED

    return cn('mx-2 md:mx-4 transition-colors duration-300', {
      'text-green-500': isCompleted,
      'text-gray-300': !isCompleted
    })
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

    return cn('flex flex-col items-center transition-all duration-300 mx-2 md:mx-3', {
      'cursor-pointer': isClickable,
      'cursor-not-allowed opacity-60': !isClickable
    })
  }

  return (
    <div className={cn('w-full', className)}>
      {/* 横向步骤容器 */}
      <div className="flex items-center justify-center">
        {steps.map((stepConfig, index) => (
          <React.Fragment key={stepConfig.step}>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className={getStepContainerClassName(stepConfig.step)}
              onClick={() => handleStepClick(stepConfig.step)}
            >
              {/* 步骤图标 */}
              <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {getStepIcon(stepConfig.step, index)}
              </motion.div>

              {/* 步骤标题 */}
              <div className="mt-2 md:mt-3 text-center">
                <h3
                  className={cn(
                    getStepTitleClassName(stepConfig.step),
                    'text-xs md:text-sm max-w-16 md:max-w-24'
                  )}
                >
                  {stepConfig.title}
                </h3>

                {/* 描述文字 - 保持最小高度以对齐所有步骤 */}
                <p className="text-xs text-muted-foreground mt-1 leading-tight min-h-[2.5rem] max-w-24 md:max-w-32 flex items-start justify-center">
                  <span className="block">{stepConfig.description}</span>
                </p>
              </div>
            </motion.div>

            {/* 步骤之间的箭头 */}
            {index < steps.length - 1 && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (index + 0.5) * 0.1, duration: 0.3 }}
                className="flex items-center self-start mt-3 md:mt-4"
              >
                <ChevronRight className={cn('w-5 h-5 md:w-6 md:h-6', getArrowClassName(index))} />
              </motion.div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* 移除移动端单独的描述显示，因为现在描述始终可见 */}
    </div>
  )
}

export default StepIndicator
