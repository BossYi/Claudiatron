import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Sparkles, ExternalLink, Settings, Book, Coffee } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type {
  SetupWizardState,
  ApiConfiguration,
  RepositoryConfiguration,
  EnvironmentStatus
} from '@/types/setupWizard'
import { WizardStep } from '@/types/setupWizard'

interface CompletionStepProps {
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
 * 完成步骤组件
 *
 * 向导的最后一步，显示设置摘要和后续建议
 */
export const CompletionStep: React.FC<CompletionStepProps> = ({ state, onComplete }) => {
  const [showConfetti, setShowConfetti] = useState(false)

  // 自动完成此步骤
  useEffect(() => {
    onComplete(WizardStep.COMPLETION)
    setShowConfetti(true)

    // 3秒后隐藏彩带效果
    const timer = setTimeout(() => {
      setShowConfetti(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [onComplete])

  // 设置摘要数据
  const setupSummary = {
    environment: {
      git: state.userData.environmentStatus?.git || false,
      nodejs: state.userData.environmentStatus?.nodejs || false,
      claudeCli: state.userData.environmentStatus?.claudeCli || false
    },
    apiConfiguration: {
      configured: !!state.userData.apiConfiguration?.apiKey,
      apiUrl: state.userData.apiConfiguration?.apiUrl || ''
    },
    repository: {
      configured: !!state.userData.repository?.localPath,
      projectName: state.userData.repository?.projectName || '',
      localPath: state.userData.repository?.localPath || ''
    }
  }

  // 后续步骤建议
  const nextSteps = [
    {
      title: '探索代码助手功能',
      description: '尝试使用Claude Code进行代码生成、优化和问题解答',
      icon: <Sparkles className="w-5 h-5" />,
      action: '开始编码'
    },
    {
      title: '查看使用文档',
      description: '了解更多高级功能和最佳实践',
      icon: <Book className="w-5 h-5" />,
      action: '查看文档'
    },
    {
      title: '自定义设置',
      description: '根据您的需求调整应用设置和偏好',
      icon: <Settings className="w-5 h-5" />,
      action: '打开设置'
    }
  ]

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto relative">
      {/* 庆祝动画背景 */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-6xl">🎉</div>
          </motion.div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        {/* 完成庆祝 */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full"
          >
            <CheckCircle className="w-10 h-10 text-green-600" />
          </motion.div>

          <div>
            <h1 className="text-3xl font-bold text-green-800 dark:text-green-200">设置完成！</h1>
            <p className="text-lg text-muted-foreground mt-2">
              Catalyst 已成功配置，您现在可以开始使用了
            </p>
          </div>
        </div>

        {/* 设置摘要 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              设置摘要
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 环境检测摘要 */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div>
                <h3 className="font-medium">开发环境</h3>
                <p className="text-sm text-muted-foreground">Git, Node.js, Claude CLI 检测状态</p>
              </div>
              <div className="flex items-center gap-2">
                {setupSummary.environment.git && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" title="Git已安装" />
                )}
                {setupSummary.environment.nodejs && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" title="Node.js已安装" />
                )}
                {setupSummary.environment.claudeCli && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" title="Claude CLI已安装" />
                )}
                <span className="text-sm text-green-600 font-medium">已配置</span>
              </div>
            </div>

            {/* API配置摘要 */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div>
                <h3 className="font-medium">Claude API</h3>
                <p className="text-sm text-muted-foreground">
                  {setupSummary.apiConfiguration.apiUrl}
                </p>
              </div>
              <span className="text-sm text-green-600 font-medium">
                {setupSummary.apiConfiguration.configured ? '已配置' : '未配置'}
              </span>
            </div>

            {/* 项目摘要 */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div>
                <h3 className="font-medium">项目</h3>
                <p className="text-sm text-muted-foreground">
                  {setupSummary.repository.projectName || '未配置项目'}
                </p>
                {setupSummary.repository.localPath && (
                  <p className="text-xs text-muted-foreground">
                    {setupSummary.repository.localPath}
                  </p>
                )}
              </div>
              <span className="text-sm text-green-600 font-medium">
                {setupSummary.repository.configured ? '已导入' : '未配置'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 后续步骤建议 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">接下来您可以：</h2>

          <div className="grid gap-4">
            {nextSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * (index + 1) }}
              >
                <Card className="hover:shadow-md transition-all cursor-pointer group">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                        {step.icon}
                      </div>
                      <div>
                        <h3 className="font-medium group-hover:text-primary transition-colors">
                          {step.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    >
                      {step.action}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 底部感谢信息 */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="text-center p-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Coffee className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-primary">感谢您选择 Catalyst</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              如果您在使用过程中遇到任何问题，请查看我们的文档或联系支持团队。 祝您编码愉快！
            </p>
            <div className="flex justify-center gap-3 mt-4">
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Book className="w-4 h-4" />
                用户手册
                <ExternalLink className="w-3 h-3" />
              </Button>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                问题反馈
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default CompletionStep
