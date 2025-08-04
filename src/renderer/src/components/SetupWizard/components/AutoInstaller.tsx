import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Download, CheckCircle, AlertCircle, Loader2, Settings, Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { InstallationProgress, AutoInstallRequest } from '@/types/setupWizard'

interface AutoInstallerProps {
  /**
   * 待安装软件列表
   */
  softwareList: Array<{
    name: 'git' | 'nodejs' | 'claude-code'
    displayName: string
    required: boolean
    installed: boolean
  }>
  /**
   * 安装进度映射
   */
  progressMap?: Record<string, InstallationProgress>
  /**
   * 是否正在安装
   */
  isInstalling?: boolean
  /**
   * 开始安装回调
   */
  onStartInstall?: (requests: AutoInstallRequest[]) => void
  /**
   * 暂停安装回调
   */
  onPauseInstall?: () => void
  /**
   * 恢复安装回调
   */
  onResumeInstall?: () => void
  /**
   * 取消安装回调
   */
  onCancelInstall?: () => void
  /**
   * 可选的CSS类名
   */
  className?: string
}

/**
 * 自动安装器组件
 *
 * 提供批量软件自动安装功能，支持进度监控和安装控制
 */
export const AutoInstaller: React.FC<AutoInstallerProps> = ({
  softwareList,
  progressMap = {},
  isInstalling = false,
  onStartInstall,
  onPauseInstall,
  onResumeInstall,
  onCancelInstall,
  className
}) => {
  const [selectedSoftware, setSelectedSoftware] = useState<Set<string>>(new Set())
  const [isPaused, setIsPaused] = useState(false)

  // 初始化选中状态（默认选中所有未安装的必需软件）
  useEffect(() => {
    const defaultSelected = new Set(
      softwareList.filter((item) => !item.installed && item.required).map((item) => item.name)
    )
    setSelectedSoftware(defaultSelected)
  }, [softwareList])

  // 切换软件选择状态
  const toggleSoftwareSelection = (softwareName: string) => {
    const newSelected = new Set(selectedSoftware)
    if (newSelected.has(softwareName)) {
      newSelected.delete(softwareName)
    } else {
      newSelected.add(softwareName)
    }
    setSelectedSoftware(newSelected)
  }

  // 开始安装
  const handleStartInstall = () => {
    const requests: AutoInstallRequest[] = Array.from(selectedSoftware).map((name) => ({
      software: name as 'git' | 'nodejs' | 'claude-code'
    }))
    onStartInstall?.(requests)
  }

  // 暂停/恢复安装
  const handlePauseResume = () => {
    if (isPaused) {
      onResumeInstall?.()
    } else {
      onPauseInstall?.()
    }
    setIsPaused(!isPaused)
  }

  // 计算总体进度
  const calculateOverallProgress = () => {
    const selectedItems = softwareList.filter((item) => selectedSoftware.has(item.name))
    if (selectedItems.length === 0) return 0

    const totalProgress = selectedItems.reduce((sum, item) => {
      const progress = progressMap[item.name]
      if (!progress) return sum

      switch (progress.status) {
        case 'completed':
          return sum + 100
        case 'failed':
          return sum + 0
        default:
          return sum + progress.progress
      }
    }, 0)

    return Math.round(totalProgress / selectedItems.length)
  }

  // 获取安装状态统计
  const getInstallationStats = () => {
    const selectedItems = softwareList.filter((item) => selectedSoftware.has(item.name))
    let completed = 0
    let failed = 0
    let inProgress = 0

    selectedItems.forEach((item) => {
      const progress = progressMap[item.name]
      if (progress) {
        switch (progress.status) {
          case 'completed':
            completed++
            break
          case 'failed':
            failed++
            break
          default:
            inProgress++
            break
        }
      }
    })

    return { total: selectedItems.length, completed, failed, inProgress }
  }

  const overallProgress = calculateOverallProgress()
  const stats = getInstallationStats()
  const hasSelection = selectedSoftware.size > 0
  const allCompleted = stats.completed === stats.total && stats.total > 0

  return (
    <div className={cn('space-y-4', className)}>
      {/* 总体进度 */}
      {isInstalling && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                {allCompleted ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : isPaused ? (
                  <Pause className="w-5 h-5 text-orange-500" />
                ) : (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                )}
                自动安装进度
              </div>
              <span className="text-sm font-normal text-muted-foreground">
                {stats.completed}/{stats.total}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>总体进度</span>
                <span>{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{stats.completed} 已完成</span>
              {stats.inProgress > 0 && <span>{stats.inProgress} 进行中</span>}
              {stats.failed > 0 && <span className="text-red-500">{stats.failed} 失败</span>}
            </div>

            {/* 控制按钮 */}
            <div className="flex gap-2">
              {!allCompleted && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePauseResume}
                  className="flex items-center gap-1"
                >
                  {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                  {isPaused ? '恢复' : '暂停'}
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={onCancelInstall}
                className="text-red-600 hover:text-red-700"
              >
                取消安装
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 软件选择列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="w-5 h-5" />
            软件安装选择
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {softwareList.map((software) => {
              const progress = progressMap[software.name]
              const isSelected = selectedSoftware.has(software.name)
              const canToggle = !isInstalling && !software.installed

              return (
                <motion.div
                  key={software.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex items-center justify-between p-3 border rounded-lg',
                    software.installed &&
                      'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
                    isSelected &&
                      !software.installed &&
                      'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* 选择开关 */}
                    <Switch
                      checked={isSelected}
                      onCheckedChange={() => toggleSoftwareSelection(software.name)}
                      disabled={!canToggle}
                    />

                    <div className="flex items-center gap-2">
                      {/* 状态图标 */}
                      {software.installed ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : progress ? (
                        progress.status === 'completed' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : progress.status === 'failed' ? (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        )
                      ) : (
                        <Download className="w-4 h-4 text-muted-foreground" />
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <Label className="font-medium text-sm">{software.displayName}</Label>
                          {software.required && (
                            <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded">
                              必需
                            </span>
                          )}
                        </div>

                        {/* 进度信息 */}
                        {progress && !software.installed && (
                          <div className="space-y-1 mt-1">
                            <p className="text-xs text-muted-foreground">{progress.message}</p>
                            {progress.status !== 'completed' && progress.status !== 'failed' && (
                              <div className="flex items-center gap-2">
                                <Progress value={progress.progress} className="h-1 flex-1" />
                                <span className="text-xs text-muted-foreground">
                                  {progress.progress}%
                                </span>
                              </div>
                            )}
                            {progress.error && (
                              <p className="text-xs text-red-500">{progress.error}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 状态标签 */}
                  <div className="text-right">
                    {software.installed ? (
                      <span className="text-xs text-green-600 font-medium">已安装</span>
                    ) : progress ? (
                      <span
                        className={cn(
                          'text-xs font-medium',
                          progress.status === 'completed' && 'text-green-600',
                          progress.status === 'failed' && 'text-red-600',
                          !['completed', 'failed'].includes(progress.status) && 'text-blue-600'
                        )}
                      >
                        {progress.status === 'completed' && '完成'}
                        {progress.status === 'failed' && '失败'}
                        {progress.status === 'downloading' && '下载中'}
                        {progress.status === 'installing' && '安装中'}
                        {progress.status === 'configuring' && '配置中'}
                        {progress.status === 'verifying' && '验证中'}
                      </span>
                    ) : isSelected ? (
                      <span className="text-xs text-blue-600 font-medium">已选择</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">未选择</span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* 开始安装按钮 */}
          {!isInstalling && hasSelection && (
            <div className="pt-4 border-t">
              <Button
                onClick={handleStartInstall}
                className="w-full flex items-center gap-2"
                disabled={selectedSoftware.size === 0}
              >
                <Download className="w-4 h-4" />
                开始自动安装 ({selectedSoftware.size} 项)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 安装提示 */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">自动安装说明</p>
              <ul className="text-amber-700 dark:text-amber-300 mt-1 space-y-1 list-disc list-inside text-xs">
                <li>安装过程可能需要管理员权限</li>
                <li>请确保网络连接稳定</li>
                <li>安装完成后可能需要重启终端或应用</li>
                <li>如果自动安装失败，请尝试手动安装</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AutoInstaller
