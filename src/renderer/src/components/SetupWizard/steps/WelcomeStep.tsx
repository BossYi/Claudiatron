import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type {
  SetupWizardState,
  ApiConfiguration,
  RepositoryConfiguration,
  EnvironmentStatus
} from '@/types/setupWizard'
import { WizardStep, StepStatus } from '@/types/setupWizard'

interface WelcomeStepProps {
  state: SetupWizardState
  onNext: () => Promise<void>
  onPrevious: () => Promise<void>
  onComplete: (step: WizardStep) => void
  onError: (step: WizardStep, error: string) => void
  onClearError: (step: WizardStep) => void
  updateApiConfiguration: (config: Partial<ApiConfiguration>) => void
  updateRepositoryConfiguration: (config: Partial<RepositoryConfiguration>) => void
  updateEnvironmentStatus: (status: Partial<EnvironmentStatus>) => void
  canProceed: boolean
}

/**
 * 欢迎步骤组件
 *
 * 向导的第一步，为用户介绍Catalyst和设置流程
 */
export const WelcomeStep: React.FC<WelcomeStepProps> = ({ state, onNext, onComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false)

  // 自动完成此步骤
  useEffect(() => {
    onComplete(WizardStep.WELCOME)
  }, [onComplete])

  const handleGetStarted = async () => {
    try {
      setIsProcessing(true)

      // 确保当前步骤已完成
      const currentStepStatus = state.stepStatus[WizardStep.WELCOME]
      if (currentStepStatus !== StepStatus.COMPLETED) {
        onComplete(WizardStep.WELCOME)
        // 给状态更新一些时间
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      // 调用下一步
      await onNext()
    } catch (error) {
      console.error('Failed to proceed to next step:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-start h-full max-w-3xl mx-auto text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-3 md:space-y-4"
      >
        {/* 欢迎标题 */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Catalyst 设置向导</h1>
          <p className="text-lg text-muted-foreground">您的智能代码助手桌面应用</p>
        </div>

        {/* 功能介绍 */}
        <Card className="text-left">
          <CardHeader>
            <CardTitle>我们将帮助您设置以下内容：</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 py-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-semibold text-primary">1</span>
              </div>
              <div>
                <h3 className="font-medium">环境检测</h3>
                <p className="text-sm text-muted-foreground">
                  检查您的系统环境，确保Git、Node.js和Claude CLI已正确安装
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-semibold text-primary">2</span>
              </div>
              <div>
                <h3 className="font-medium">Claude 配置</h3>
                <p className="text-sm text-muted-foreground">配置您的Claude API密钥和连接设置</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-semibold text-primary">3</span>
              </div>
              <div>
                <h3 className="font-medium">项目导入</h3>
                <p className="text-sm text-muted-foreground">导入现有项目或创建新的代码仓库</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 开始按钮 */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-center sm:gap-8 gap-4">
          <Button
            size="lg"
            onClick={handleGetStarted}
            disabled={isProcessing}
            className="flex items-center gap-2 sm:flex-shrink-0"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                启动中...
              </>
            ) : (
              <>
                开始设置
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
          <p className="text-sm text-muted-foreground text-center sm:text-left sm:max-w-xs">
            此设置向导将引导您完成Catalyst的初始配置。整个过程大约需要5-10分钟。
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default WelcomeStep
