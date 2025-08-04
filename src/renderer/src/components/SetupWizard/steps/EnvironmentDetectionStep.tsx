import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type {
  SetupWizardState,
  ApiConfiguration,
  RepositoryConfiguration,
  EnvironmentStatus
} from '@/types/setupWizard'
import { WizardStep } from '@/types/setupWizard'

interface EnvironmentDetectionStepProps {
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

interface SoftwareStatus {
  name: string
  installed: boolean
  version?: string
  path?: string
  error?: string
  checking: boolean
}

/**
 * 环境检测步骤组件
 *
 * 检测系统环境中必要软件的安装状态
 */
export const EnvironmentDetectionStep: React.FC<EnvironmentDetectionStepProps> = ({
  onComplete,
  onError,
  onClearError,
  updateEnvironmentStatus
}) => {
  const [detecting, setDetecting] = useState(false)
  const [softwareStatus, setSoftwareStatus] = useState<SoftwareStatus[]>([
    { name: 'Git', installed: false, checking: false },
    { name: 'Node.js', installed: false, checking: false },
    { name: 'Claude CLI', installed: false, checking: false }
  ])

  // 检测环境
  const detectEnvironment = async () => {
    setDetecting(true)
    onClearError(WizardStep.ENVIRONMENT_DETECTION)

    try {
      // 更新所有软件为检测中状态
      setSoftwareStatus((prev) => prev.map((item) => ({ ...item, checking: true })))

      // 模拟检测过程（实际实现需要调用API）
      for (let i = 0; i < softwareStatus.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000)) // 模拟检测延迟

        // 这里应该调用实际的检测API
        const mockResults = [
          { name: 'Git', installed: true, version: '2.41.0', path: '/usr/bin/git' },
          { name: 'Node.js', installed: true, version: '18.17.0', path: '/usr/bin/node' },
          { name: 'Claude CLI', installed: false, error: 'Claude CLI not found in PATH' }
        ]

        setSoftwareStatus((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, ...mockResults[i], checking: false } : item
          )
        )
      }

      // 更新环境状态
      const allInstalled = softwareStatus.every((item) => item.installed)
      updateEnvironmentStatus({
        git: softwareStatus[0].installed,
        nodejs: softwareStatus[1].installed,
        claudeCli: softwareStatus[2].installed,
        systemInfo: {
          platform: 'darwin' as NodeJS.Platform,
          arch: 'x64',
          version: '10.15.7',
          homeDir: '/Users/user'
        }
      })

      if (allInstalled) {
        onComplete(WizardStep.ENVIRONMENT_DETECTION)
      } else {
        onError(WizardStep.ENVIRONMENT_DETECTION, '部分必要软件未安装')
      }
    } catch (error) {
      onError(WizardStep.ENVIRONMENT_DETECTION, `检测失败: ${error}`)
    } finally {
      setDetecting(false)
    }
  }

  // 组件挂载时自动检测
  useEffect(() => {
    detectEnvironment()
  }, [])

  // 获取状态图标
  const getStatusIcon = (item: SoftwareStatus) => {
    if (item.checking) {
      return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
    } else if (item.installed) {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    } else {
      return <XCircle className="w-5 h-5 text-red-500" />
    }
  }

  const allInstalled = softwareStatus.every((item) => item.installed)
  const hasErrors = softwareStatus.some((item) => !item.installed && !item.checking)

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* 检测状态总览 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Search className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">环境检测</h2>
              <p className="text-sm text-muted-foreground">正在检测系统环境中的必要软件...</p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={detectEnvironment}
            disabled={detecting}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${detecting ? 'animate-spin' : ''}`} />
            重新检测
          </Button>
        </div>

        {/* 软件检测结果 */}
        <div className="space-y-4">
          {softwareStatus.map((item) => (
            <Card key={item.name}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  {getStatusIcon(item)}
                  <div>
                    <h3 className="font-medium">{item.name}</h3>
                    {item.version && (
                      <p className="text-sm text-muted-foreground">版本: {item.version}</p>
                    )}
                    {item.path && (
                      <p className="text-xs text-muted-foreground">路径: {item.path}</p>
                    )}
                    {item.error && <p className="text-sm text-red-500">{item.error}</p>}
                  </div>
                </div>

                <div className="text-right">
                  {item.installed ? (
                    <span className="text-sm text-green-600 font-medium">已安装</span>
                  ) : item.checking ? (
                    <span className="text-sm text-blue-600">检测中...</span>
                  ) : (
                    <span className="text-sm text-red-600 font-medium">未安装</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 错误提示和解决方案 */}
        {hasErrors && !detecting && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                <AlertCircle className="w-5 h-5" />
                需要安装缺失的软件
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-orange-600 dark:text-orange-300">
                为了正常使用Claudiatron，您需要安装以下缺失的软件：
              </p>

              {!softwareStatus[2].installed && (
                <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-lg">
                  <h4 className="font-medium text-orange-800 dark:text-orange-200">Claude CLI</h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    请访问 Claude Code 官网下载并安装 Claude CLI 工具
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  自动安装
                </Button>
                <Button variant="outline" size="sm">
                  查看安装指南
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 成功提示 */}
        {allInstalled && !detecting && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-medium text-green-800 dark:text-green-200">环境检测完成</h3>
                <p className="text-sm text-green-600 dark:text-green-300">
                  所有必要软件已正确安装，可以继续下一步设置
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  )
}

export default EnvironmentDetectionStep
