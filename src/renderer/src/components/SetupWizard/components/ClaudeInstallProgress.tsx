import React from 'react'
import { motion } from 'framer-motion'
import { Download, CheckCircle, AlertCircle, Loader2, ExternalLink, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { InstallationProgress } from '@/types/setupWizard'

interface ClaudeInstallProgressProps {
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
 * Claude CLI安装进度组件
 *
 * 显示Claude CLI的自动安装进度，提供手动安装指引
 */
export const ClaudeInstallProgress: React.FC<ClaudeInstallProgressProps> = ({
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
      return '准备安装 Claude CLI'
    }

    switch (progress.status) {
      case 'downloading':
        return '正在下载 Claude CLI...'
      case 'installing':
        return '正在安装 Claude CLI...'
      case 'configuring':
        return '正在配置 Claude CLI...'
      case 'verifying':
        return '正在验证安装...'
      case 'completed':
        return 'Claude CLI 安装完成'
      case 'failed':
        return 'Claude CLI 安装失败'
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
        '访问 Claude Code 官网获取下载链接',
        '下载 Windows 版本的 Claude CLI',
        '运行安装程序（可能需要管理员权限）',
        '安装完成后重启命令提示符或PowerShell',
        '运行 "claude --version" 验证安装'
      ],
      commands: ['# 使用 PowerShell 验证安装', 'claude --version', 'claude auth login']
    },
    {
      platform: 'macOS',
      steps: [
        '访问 Claude Code 官网获取下载链接',
        '下载 macOS 版本的 Claude CLI',
        '或使用 Homebrew（如果可用）',
        '安装完成后重启终端',
        '运行 "claude --version" 验证安装'
      ],
      commands: [
        '# 使用 Homebrew 安装（如果可用）',
        'brew install claude-cli',
        '',
        '# 验证安装',
        'claude --version',
        'claude auth login'
      ]
    },
    {
      platform: 'Linux',
      steps: [
        '访问 Claude Code 官网获取下载链接',
        '下载适合您发行版的 Claude CLI',
        '使用包管理器或直接安装',
        '确保 Claude CLI 在 PATH 中',
        '运行 "claude --version" 验证安装'
      ],
      commands: [
        '# 下载并安装（示例）',
        'wget [Claude CLI 下载链接]',
        'sudo dpkg -i claude-cli.deb  # 对于 Debian/Ubuntu',
        '',
        '# 验证安装',
        'claude --version',
        'claude auth login'
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
            Claude CLI 安装
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

          {/* 重要提示 */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>注意：</strong> Claude CLI 需要有效的 Claude Code API 密钥才能正常工作。
              安装完成后，请确保配置您的 API 密钥。
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            {!isInstalling && !progress?.status && onStartInstall && (
              <Button onClick={onStartInstall} className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                自动安装 Claude CLI
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
            如果自动安装失败，您可以按照以下步骤手动安装 Claude CLI：
          </p>

          <div className="grid gap-6">
            {manualInstallSteps.map((guide, index) => (
              <div key={index} className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  {guide.platform}
                </h4>

                {/* 安装步骤 */}
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-6">
                  {guide.steps.map((step, stepIndex) => (
                    <li key={stepIndex}>{step}</li>
                  ))}
                </ol>

                {/* 命令示例 */}
                <div className="ml-6">
                  <h5 className="text-xs font-medium text-muted-foreground mb-2">命令示例：</h5>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto">
                    {guide.commands.join('\n')}
                  </pre>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => window.open('https://claude.ai/code', '_blank')}
            >
              Claude Code 官网
              <ExternalLink className="w-3 h-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => window.open('https://docs.anthropic.com/claude/docs', '_blank')}
            >
              安装文档
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ClaudeInstallProgress
