import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Download,
  Wrench
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import type {
  SetupWizardState,
  ApiConfiguration,
  RepositoryConfiguration,
  EnvironmentStatus,
  InstallationProgress
} from '@/types/setupWizard'
import { WizardStep } from '@/types/setupWizard'
import { api } from '@/lib/api'

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

interface ExtendedSoftwareStatus {
  name: string
  key: 'git' | 'nodejs' | 'npm' | 'claudeCli'
  installed: boolean
  version?: string
  path?: string
  error?: string
  checking: boolean
  installing: boolean
  installProgress?: InstallationProgress
  needsUpdate?: boolean
  critical: boolean // 是否为必须安装的软件
  autoInstallable: boolean // 是否支持自动安装
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
  const [autoInstalling, setAutoInstalling] = useState(false)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)

  // 添加 ref 来追踪检测状态，防止并发和重复初始化
  const hasInitialDetectionRef = useRef(false)
  const detectingRef = useRef(false)
  const [softwareStatus, setSoftwareStatus] = useState<ExtendedSoftwareStatus[]>([
    {
      name: 'Git',
      key: 'git',
      installed: false,
      checking: false,
      installing: false,
      critical: true,
      autoInstallable: true
    },
    {
      name: 'Node.js',
      key: 'nodejs',
      installed: false,
      checking: false,
      installing: false,
      critical: true,
      autoInstallable: true
    },
    {
      name: 'npm',
      key: 'npm',
      installed: false,
      checking: false,
      installing: false,
      critical: true,
      autoInstallable: false
    },
    {
      name: 'Claude CLI',
      key: 'claudeCli',
      installed: false,
      checking: false,
      installing: false,
      critical: true,
      autoInstallable: true
    }
  ])

  // 检测环境
  const detectEnvironment = useCallback(async () => {
    // 防止并发调用
    if (detectingRef.current) {
      console.log('检测已在进行中，跳过重复调用')
      return
    }

    detectingRef.current = true
    setDetecting(true)
    onClearError(WizardStep.ENVIRONMENT_DETECTION)

    try {
      // 更新所有软件为检测中状态
      setSoftwareStatus((prev) =>
        prev.map((item) => ({ ...item, checking: true, error: undefined }))
      )

      // 调用实际的环境检测API
      const result = await api.setupWizardDetectEnvironment({
        checkGit: true,
        checkNodejs: true,
        checkClaudeCli: true
      })

      if (result.success && result.data) {
        const { status } = result.data

        // 更新软件状态
        setSoftwareStatus((prev) =>
          prev.map((item) => {
            const statusData = status[item.key]
            return {
              ...item,
              installed: statusData?.installed || false,
              version: statusData?.version,
              path: statusData?.path,
              error: statusData?.error,
              needsUpdate: statusData?.needsUpdate,
              checking: false
            }
          })
        )

        // 更新环境状态
        updateEnvironmentStatus({
          git: status.git?.installed || false,
          nodejs: status.nodejs?.installed || false,
          claudeCli: status.claudeCli?.installed || false,
          systemInfo: status.systemInfo
        })

        // 检查是否所有关键软件都已安装
        const allCriticalInstalled = [status.git, status.nodejs, status.claudeCli].every(
          (s) => s?.installed
        )

        if (allCriticalInstalled) {
          onComplete(WizardStep.ENVIRONMENT_DETECTION)
        } else {
          onError(WizardStep.ENVIRONMENT_DETECTION, '部分必要软件未安装')
        }
      } else {
        throw new Error(result.error || '环境检测失败')
      }
    } catch (error) {
      console.error('环境检测失败:', error)
      onError(
        WizardStep.ENVIRONMENT_DETECTION,
        `检测失败: ${error instanceof Error ? error.message : String(error)}`
      )

      // 重置所有软件状态为未检测
      setSoftwareStatus((prev) =>
        prev.map((item) => ({ ...item, checking: false, error: '检测失败' }))
      )
    } finally {
      detectingRef.current = false
      setDetecting(false)
    }
  }, [onComplete, onError, onClearError, updateEnvironmentStatus])

  // 组件挂载时自动检测（只执行一次）
  useEffect(() => {
    if (!hasInitialDetectionRef.current) {
      hasInitialDetectionRef.current = true
      detectEnvironment()
    }
  }, []) // 移除 detectEnvironment 依赖，只在初始化时执行一次

  // 监听安装进度事件
  useEffect(() => {
    const handleInstallationProgress = (
      _: any,
      data: { software: string; progress: InstallationProgress }
    ) => {
      const { software, progress } = data

      setSoftwareStatus((prev) =>
        prev.map((item) =>
          item.key === software ? { ...item, installing: true, installProgress: progress } : item
        )
      )
    }

    const handleInstallationCompleted = (_: any, data: { software: string; result: any }) => {
      const { software, result } = data

      setSoftwareStatus((prev) =>
        prev.map((item) =>
          item.key === software
            ? {
                ...item,
                installing: false,
                installed: result.success,
                version: result.version,
                path: result.executablePath,
                error: result.success ? undefined : result.error,
                installProgress: undefined
              }
            : item
        )
      )

      // 安装完成后重新检测环境
      if (result.success) {
        setTimeout(() => detectEnvironment(), 1000)
      }
    }

    // 注册事件监听器
    if (window.electron) {
      window.electron.ipcRenderer.on(
        'setup-wizard-installation-progress',
        handleInstallationProgress
      )
      window.electron.ipcRenderer.on(
        'setup-wizard-installation-completed',
        handleInstallationCompleted
      )
    }

    return () => {
      // 清理事件监听器
      if (window.electron) {
        window.electron.ipcRenderer.removeAllListeners('setup-wizard-installation-progress')
        window.electron.ipcRenderer.removeAllListeners('setup-wizard-installation-completed')
      }
    }
  }, [detectEnvironment])

  // 安装单个软件
  const installSoftware = async (software: ExtendedSoftwareStatus) => {
    if (!software.autoInstallable) {
      console.warn(`${software.name} 不支持自动安装`)
      return
    }

    try {
      setSoftwareStatus((prev) =>
        prev.map((item) =>
          item.key === software.key ? { ...item, installing: true, error: undefined } : item
        )
      )

      const result = await api.setupWizardInstallDependencies(software.key)

      if (!result.success) {
        throw new Error(result.error || `${software.name} 安装失败`)
      }

      console.log(`${software.name} 安装成功`)
    } catch (error) {
      console.error(`${software.name} 安装失败:`, error)
      setSoftwareStatus((prev) =>
        prev.map((item) =>
          item.key === software.key
            ? {
                ...item,
                installing: false,
                error: error instanceof Error ? error.message : String(error)
              }
            : item
        )
      )
    }
  }

  // 批量自动安装
  const startAutoInstall = async () => {
    const missingCriticalSoftware = softwareStatus.filter(
      (s) => s.critical && !s.installed && s.autoInstallable
    )

    if (missingCriticalSoftware.length === 0) {
      return
    }

    setAutoInstalling(true)
    onClearError(WizardStep.ENVIRONMENT_DETECTION)

    try {
      const softwareList = missingCriticalSoftware.map((s) => s.key)
      const result = await api.setupWizardBatchInstall(softwareList)

      if (result.success) {
        console.log('批量安装完成:', result.data)
        // 安装完成后重新检测环境
        setTimeout(() => detectEnvironment(), 2000)
      } else {
        throw new Error(result.error || '批量安装失败')
      }
    } catch (error) {
      console.error('批量安装失败:', error)
      onError(
        WizardStep.ENVIRONMENT_DETECTION,
        `批量安装失败: ${error instanceof Error ? error.message : String(error)}`
      )
    } finally {
      setAutoInstalling(false)
    }
  }

  // 获取状态图标
  const getStatusIcon = (item: ExtendedSoftwareStatus) => {
    if (item.installing) {
      return <Download className="w-5 h-5 text-blue-500 animate-pulse" />
    } else if (item.checking) {
      return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
    } else if (item.installed) {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    } else {
      return <XCircle className="w-5 h-5 text-red-500" />
    }
  }

  // 获取状态文本
  const getStatusText = (item: ExtendedSoftwareStatus) => {
    if (item.installing) {
      return item.installProgress ? `安装中... ${item.installProgress.progress}%` : '准备安装...'
    } else if (item.checking) {
      return '检测中...'
    } else if (item.installed) {
      return item.needsUpdate ? '已安装 (建议更新)' : '已安装'
    } else {
      return '未安装'
    }
  }

  // 获取状态颜色
  const getStatusColor = (item: ExtendedSoftwareStatus) => {
    if (item.installing) {
      return 'text-blue-600'
    } else if (item.checking) {
      return 'text-blue-600'
    } else if (item.installed) {
      return item.needsUpdate ? 'text-yellow-600' : 'text-green-600'
    } else {
      return 'text-red-600'
    }
  }

  const allCriticalInstalled = softwareStatus
    .filter((s) => s.critical)
    .every((item) => item.installed)
  const hasErrors = softwareStatus.some(
    (item) => item.critical && !item.installed && !item.checking && !item.installing
  )
  const hasInstalling = softwareStatus.some((item) => item.installing)
  const missingCriticalCount = softwareStatus.filter((s) => s.critical && !s.installed).length
  const autoInstallableCount = softwareStatus.filter(
    (s) => s.critical && !s.installed && s.autoInstallable
  ).length

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
        <div className="space-y-4 max-w-lg mx-auto">
          {softwareStatus.map((item) => (
            <Card key={item.name} className={item.critical ? 'border-primary/20' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(item)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{item.name}</h3>
                        {item.critical && (
                          <Badge variant="secondary" className="text-xs">
                            必需
                          </Badge>
                        )}
                        {item.needsUpdate && (
                          <Badge
                            variant="outline"
                            className="text-xs text-yellow-600 border-yellow-600"
                          >
                            需要更新
                          </Badge>
                        )}
                      </div>
                      {item.version && (
                        <p className="text-sm text-muted-foreground">版本: {item.version}</p>
                      )}
                      {item.path && !item.installing && (
                        <p className="text-xs text-muted-foreground">路径: {item.path}</p>
                      )}
                      {item.error && !item.installing && (
                        <p className="text-sm text-red-500">{item.error}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${getStatusColor(item)}`}>
                      {getStatusText(item)}
                    </span>

                    {/* 单独安装按钮 */}
                    {!item.installed &&
                      !item.installing &&
                      !item.checking &&
                      item.autoInstallable && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => installSoftware(item)}
                          className="flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          安装
                        </Button>
                      )}
                  </div>
                </div>

                {/* 安装进度条 */}
                {item.installing && item.installProgress && (
                  <div className="space-y-2">
                    <Progress value={item.installProgress.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">{item.installProgress.message}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 错误提示和解决方案 */}
        {hasErrors && !detecting && !hasInstalling && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800 max-w-lg mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                <AlertCircle className="w-5 h-5" />
                需要安装缺失的软件 ({missingCriticalCount} 项)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-orange-600 dark:text-orange-300">
                为了正常使用Catalyst，您需要安装以下缺失的软件：
              </p>

              {/* 列出缺失的关键软件 */}
              <div className="space-y-2">
                {softwareStatus
                  .filter((s) => s.critical && !s.installed)
                  .map((software) => (
                    <div
                      key={software.key}
                      className="bg-orange-100 dark:bg-orange-900 p-3 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-orange-800 dark:text-orange-200">
                            {software.name}
                          </h4>
                          <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                            {software.error || `${software.name} 未安装`}
                          </p>
                        </div>
                        {software.autoInstallable && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => installSoftware(software)}
                            disabled={software.installing}
                            className="border-orange-300 text-orange-700 hover:bg-orange-200"
                          >
                            {software.installing ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                安装中
                              </>
                            ) : (
                              <>
                                <Download className="w-3 h-3 mr-1" />
                                安装
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {/* 批量自动安装按钮 */}
                {autoInstallableCount > 0 && (
                  <Button
                    onClick={startAutoInstall}
                    disabled={autoInstalling || hasInstalling}
                    className="flex items-center gap-2"
                  >
                    {autoInstalling ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        正在安装 ({autoInstallableCount} 项)
                      </>
                    ) : (
                      <>
                        <Wrench className="w-4 h-4" />
                        一键安装全部 ({autoInstallableCount} 项)
                      </>
                    )}
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                >
                  {showAdvancedOptions ? '隐藏' : '显示'}高级选项
                </Button>
              </div>

              {/* 高级选项 */}
              {showAdvancedOptions && (
                <div className="border-t border-orange-200 dark:border-orange-800 pt-4 mt-4">
                  <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">
                    高级安装选项
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-orange-700 dark:text-orange-300">
                      • 自动安装会下载官方推荐版本的软件
                    </p>
                    <p className="text-orange-700 dark:text-orange-300">
                      • 安装过程可能需要管理员权限
                    </p>
                    <p className="text-orange-700 dark:text-orange-300">
                      • 您也可以手动安装后点击"重新检测"
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 安装进行中状态 */}
        {hasInstalling && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 max-w-lg mx-auto">
            <CardContent className="flex items-center gap-3 p-4">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <div>
                <h3 className="font-medium text-blue-800 dark:text-blue-200">正在安装软件...</h3>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  请耐心等待，安装完成后会自动验证
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 成功提示 */}
        {allCriticalInstalled && !detecting && !hasInstalling && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 max-w-lg mx-auto">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="font-medium text-green-800 dark:text-green-200">环境检测完成</h3>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    所有必要软件已正确安装，可以继续下一步配置
                  </p>
                </div>
              </div>

              {/* 显示已安装的软件版本 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-green-200 dark:border-green-800">
                {softwareStatus
                  .filter((s) => s.critical && s.installed)
                  .map((software) => (
                    <div key={software.key} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-700 dark:text-green-300">
                        {software.name} {software.version}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  )
}

export default EnvironmentDetectionStep
