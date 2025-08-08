import React from 'react'
import { motion } from 'framer-motion'
import { Download, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { InstallationProgress } from '@/types/setupWizard'

interface GitInstallProgressProps {
  /**
   * 安装进度信息
   */
  progress?: InstallationProgress
  /**
   * 是否正在安装
   */
  isInstalling?: boolean
  /**
   * 开始安装回调
   */
  onStartInstall?: () => void
  /**
   * 取消安装回调
   */
  onCancel?: () => void
  /**
   * 手动安装回调
   */
  onManualInstall?: () => void
  /**
   * 可选的CSS类名
   */
  className?: string
}

/**
 * Git安装进度组件
 *
 * 显示Git的自动安装进度，提供手动安装指引
 */
export const GitInstallProgress: React.FC<GitInstallProgressProps> = ({
  progress,
  isInstalling = false,
  onStartInstall,
  onCancel,
  onManualInstall,
  className
}) => {
  // 获取状态图标
  const getStatusIcon = () => {
    if (!progress) {
      return <Download className="w-5 h-5 text-muted-foreground" />
    }

    switch (progress.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
    }
  }

  // 获取状态文本
  const getStatusText = () => {
    if (!progress) {
      return '准备安装 Git'
    }

    switch (progress.status) {
      case 'downloading':
        return '正在下载 Git 安装包...'
      case 'installing':
        return '正在安装 Git...'
      case 'configuring':
        return '正在配置 Git...'
      case 'verifying':
        return '正在验证安装...'
      case 'completed':
        return 'Git 安装完成'
      case 'failed':
        return 'Git 安装失败'
      default:
        return '安装中...'
    }
  }

  // 获取状态颜色
  const getStatusColor = () => {
    if (!progress) return 'text-muted-foreground'

    switch (progress.status) {
      case 'completed':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      default:
        return 'text-blue-600'
    }
  }

  // 手动安装指引
  const manualInstallSteps = [
    {
      platform: 'Windows',
      steps: [
        '直接下载：https://github.com/git-for-windows/git/releases/download/v2.50.1.windows.1/Git-2.50.1-64-bit.exe',
        '下载适合您系统的安装包',
        '运行安装程序并按照向导完成安装',
        '重启终端或命令提示符',
        '运行 "git --version" 验证安装'
      ]
    },
    {
      platform: 'macOS',
      steps: [
        '使用 Homebrew：brew install git',
        '或访问 https://git-scm.com/download/mac 下载安装包',
        '或使用 Xcode Command Line Tools：xcode-select --install',
        '重启终端',
        '运行 "git --version" 验证安装'
      ]
    },
    {
      platform: 'Linux',
      steps: [
        'Ubuntu/Debian：sudo apt-get install git',
        'CentOS/RHEL：sudo yum install git',
        'Fedora：sudo dnf install git',
        'Arch：sudo pacman -S git',
        '运行 "git --version" 验证安装'
      ]
    }
  ]

  return (
    <div className={cn('space-y-4', className)}>
      {/* 安装状态卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {getStatusIcon()}
            Git 安装
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 状态信息 */}
          <div className="flex items-center justify-between">
            <span className={cn('text-sm font-medium', getStatusColor())}>{getStatusText()}</span>
            {progress && (
              <span className="text-sm text-muted-foreground">{progress.progress}%</span>
            )}
          </div>

          {/* 进度条 */}
          {isInstalling && progress && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Progress value={progress.progress} className="h-2" />
            </motion.div>
          )}

          {/* 错误信息 */}
          {progress?.error && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{progress.error}</p>
            </div>
          )}

          {/* 详细消息 */}
          {progress?.message && <p className="text-sm text-muted-foreground">{progress.message}</p>}

          {/* 操作按钮 */}
          <div className="flex gap-2">
            {!isInstalling && !progress?.status && onStartInstall && (
              <Button onClick={onStartInstall} className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                自动安装 Git
              </Button>
            )}

            {isInstalling && onCancel && (
              <Button variant="outline" onClick={onCancel}>
                取消安装
              </Button>
            )}

            {progress?.status === 'failed' && onStartInstall && (
              <Button
                onClick={onStartInstall}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                重试安装
              </Button>
            )}

            <Button variant="outline" onClick={onManualInstall}>
              手动安装指引
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 手动安装指引 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">手动安装指引</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            如果自动安装失败，您可以按照以下步骤手动安装 Git：
          </p>

          <div className="grid gap-4">
            {manualInstallSteps.map((guide, index) => (
              <div key={index} className="space-y-2">
                <h4 className="font-medium text-sm">{guide.platform}</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
                  {guide.steps.map((step, stepIndex) => (
                    <li key={stepIndex}>{step}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => window.open('https://git-scm.com/', '_blank')}
            >
              Git 官网
              <ExternalLink className="w-3 h-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() =>
                window.open(
                  'https://docs.github.com/en/get-started/quickstart/set-up-git',
                  '_blank'
                )
              }
            >
              GitHub 安装指南
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default GitInstallProgress
