import React from 'react'
import { motion } from 'framer-motion'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { WizardStep, StepStatus } from '@/types/setupWizard'

interface ProgressDisplayProps {
  /**
   * 当前步骤
   */
  currentStep: WizardStep
  /**
   * 各步骤状态
   */
  stepStatus: Record<WizardStep, StepStatus>
  /**
   * 总步骤数
   */
  totalSteps?: number
  /**
   * 显示百分比文本
   */
  showPercentage?: boolean
  /**
   * 显示步骤信息
   */
  showStepInfo?: boolean
  /**
   * 可选的CSS类名
   */
  className?: string
}

/**
 * 进度显示组件
 *
 * 显示设置向导的整体进度，包括进度条和百分比
 */
export const ProgressDisplay: React.FC<ProgressDisplayProps> = ({
  currentStep,
  stepStatus,
  totalSteps = 5,
  showPercentage = true,
  showStepInfo = true,
  className
}) => {
  // 计算完成的步骤数
  const completedSteps = Object.values(stepStatus).filter(
    (status) => status === StepStatus.COMPLETED
  ).length

  // 计算进度百分比
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100)

  // 当前步骤的进度（包括进行中的步骤）
  const currentProgress = Math.round(
    ((completedSteps + (stepStatus[currentStep] === StepStatus.IN_PROGRESS ? 0.5 : 0)) /
      totalSteps) *
      100
  )

  // 获取状态文本
  const getStatusText = () => {
    if (completedSteps === totalSteps) {
      return '设置完成'
    } else if (stepStatus[currentStep] === StepStatus.ERROR) {
      return '出现错误'
    } else if (stepStatus[currentStep] === StepStatus.IN_PROGRESS) {
      return '正在进行'
    } else {
      return '等待中'
    }
  }

  // 获取状态颜色
  const getStatusColor = () => {
    if (completedSteps === totalSteps) {
      return 'text-green-600'
    } else if (stepStatus[currentStep] === StepStatus.ERROR) {
      return 'text-red-600'
    } else if (stepStatus[currentStep] === StepStatus.IN_PROGRESS) {
      return 'text-blue-600'
    } else {
      return 'text-muted-foreground'
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* 进度条 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          {showStepInfo && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                步骤 {currentStep} / {totalSteps}
              </span>
              <span className={cn('text-sm', getStatusColor())}>{getStatusText()}</span>
            </div>
          )}

          {showPercentage && (
            <span className="text-sm font-medium text-muted-foreground">{progressPercentage}%</span>
          )}
        </div>

        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 0.5 }}
        >
          <Progress
            value={currentProgress}
            className="h-2"
            // 自定义进度条颜色
            style={{
              // @ts-ignore - CSS custom property assignment not recognized by TypeScript
              '--progress-foreground':
                completedSteps === totalSteps
                  ? 'hsl(var(--success))'
                  : stepStatus[currentStep] === StepStatus.ERROR
                    ? 'hsl(var(--destructive))'
                    : 'hsl(var(--primary))'
            }}
          />
        </motion.div>
      </div>

      {/* 详细进度信息 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{completedSteps} 步骤已完成</span>
        {totalSteps - completedSteps > 0 && <span>{totalSteps - completedSteps} 步骤待完成</span>}
      </div>
    </div>
  )
}

export default ProgressDisplay
