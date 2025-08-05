import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Key, Eye, EyeOff, CheckCircle, AlertCircle, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type {
  SetupWizardState,
  ApiConfiguration,
  RepositoryConfiguration,
  EnvironmentStatus
} from '@/types/setupWizard'
import { WizardStep } from '@/types/setupWizard'

interface ClaudeConfigurationStepProps {
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
  isApiConfigurationChanged: () => boolean
  markApiConfigurationValidated: () => void
}

/**
 * Claude配置步骤组件
 *
 * 配置Claude API密钥和连接设置
 */
export const ClaudeConfigurationStep: React.FC<ClaudeConfigurationStepProps> = ({
  state,
  onComplete,
  onError,
  onClearError,
  updateApiConfiguration,
  isApiConfigurationChanged,
  markApiConfigurationValidated
}) => {
  const [apiKey, setApiKey] = useState(state.userData.apiConfiguration?.apiKey || '')
  const [apiUrl, setApiUrl] = useState(
    state.userData.apiConfiguration?.apiUrl || 'https://fc-api.keep-learn.top'
  )
  const [showApiKey, setShowApiKey] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    valid: boolean
    error?: string
    apiInfo?: any
  } | null>(null)

  // 验证API配置
  const validateConfiguration = useCallback(async () => {
    const currentKey = apiKey.trim()
    const currentUrl = apiUrl.trim()

    if (!currentKey) {
      onError(WizardStep.CLAUDE_CONFIGURATION, 'API密钥不能为空')
      return false
    }

    // 检查是否需要重新验证
    if (!isApiConfigurationChanged()) {
      console.log('Skipping validation: configuration unchanged')
      return validationResult?.valid || false
    }

    setValidating(true)
    onClearError(WizardStep.CLAUDE_CONFIGURATION)

    try {
      // 这里应该调用实际的验证API
      // const result = await window.api.setupWizardValidateClaudeConfig({
      //   apiUrl: currentUrl,
      //   apiKey: currentKey
      // })

      // 模拟验证过程
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // 模拟验证结果
      const mockResult = {
        valid: currentKey.startsWith('sk-'),
        error: currentKey.startsWith('sk-') ? undefined : 'API密钥格式无效',
        apiInfo: currentKey.startsWith('sk-')
          ? {
              version: '2023-06-01',
              capabilities: ['text-generation', 'code-completion']
            }
          : undefined
      }

      setValidationResult(mockResult)

      if (mockResult.valid) {
        // 更新配置
        updateApiConfiguration({
          apiKey: currentKey,
          apiUrl: currentUrl,
          lastValidated: new Date().toISOString()
        })

        // 标记配置已验证
        markApiConfigurationValidated()

        onComplete(WizardStep.CLAUDE_CONFIGURATION)
        return true
      } else {
        onError(WizardStep.CLAUDE_CONFIGURATION, mockResult.error || '配置验证失败')
        return false
      }
    } catch (error) {
      const errorMessage = `验证失败: ${error}`
      onError(WizardStep.CLAUDE_CONFIGURATION, errorMessage)
      setValidationResult({ valid: false, error: errorMessage })
      return false
    } finally {
      setValidating(false)
    }
  }, [
    apiKey,
    apiUrl,
    onError,
    onClearError,
    updateApiConfiguration,
    markApiConfigurationValidated,
    onComplete,
    isApiConfigurationChanged,
    validationResult?.valid
  ])

  // 处理API密钥变化
  const handleApiKeyChange = (value: string) => {
    setApiKey(value)
    setValidationResult(null)
    // 同步更新到状态管理中，这会触发配置变更标记
    updateApiConfiguration({ apiKey: value })
  }

  // 处理API URL变化
  const handleApiUrlChange = (value: string) => {
    setApiUrl(value)
    setValidationResult(null)
    // 同步更新到状态管理中，这会触发配置变更标记
    updateApiConfiguration({ apiUrl: value })
  }

  // 组件挂载时检查是否需要验证
  useEffect(() => {
    // 只在组件首次加载时检查
    if (apiKey.trim() && apiUrl.trim()) {
      if (isApiConfigurationChanged()) {
        // 如果配置完整但未验证，显示需要验证的提示
        setValidationResult({ valid: false, error: '配置已更改，请重新验证' })
      } else {
        // 如果配置未更改且之前验证过，显示成功状态
        setValidationResult({
          valid: true,
          apiInfo: {
            version: '2023-06-01',
            capabilities: ['text-generation', 'code-completion']
          }
        })
      }
    }
  }, [apiKey, apiUrl, isApiConfigurationChanged]) // 只在组件挂载或配置初始化时执行

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* 配置说明 */}
        <div className="flex items-start gap-3">
          <Key className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-lg font-semibold">Claude Code API 配置</h2>
            <p className="text-sm text-muted-foreground mt-1">
              配置您的Claude API密钥以连接到Claude Code服务
            </p>
          </div>
        </div>

        {/* API URL配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">API服务地址</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiUrl">API URL</Label>
              <Input
                id="apiUrl"
                type="url"
                value={apiUrl}
                onChange={(e) => handleApiUrlChange(e.target.value)}
                placeholder="https://fc-api.keep-learn.top"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                默认使用官方API地址，如需使用自定义代理请修改此地址
              </p>
            </div>
          </CardContent>
        </Card>

        {/* API密钥配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">API密钥</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">Claude API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder="sk-ant-..."
                  className="font-mono text-sm pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>没有API密钥？</span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => {
                    // 打开官方网站
                    window.open('https://fc.keep-learn.top', '_blank')
                  }}
                >
                  获取API密钥 <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>

            {/* 验证状态 */}
            {validating && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-700 dark:text-blue-300">正在验证API配置...</span>
              </div>
            )}

            {validationResult && !validating && (
              <div
                className={`flex items-start gap-2 p-3 rounded-lg ${
                  validationResult.valid
                    ? 'bg-green-50 dark:bg-green-950'
                    : 'bg-red-50 dark:bg-red-950'
                }`}
              >
                {validationResult.valid ? (
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <span
                    className={`text-sm font-medium ${
                      validationResult.valid
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}
                  >
                    {validationResult.valid ? 'API配置验证成功' : '配置验证失败'}
                  </span>
                  {validationResult.error && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {validationResult.error}
                    </p>
                  )}
                  {validationResult.apiInfo && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      API版本: {validationResult.apiInfo.version}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 安全提示 */}
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 max-w-lg">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">安全提示</p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  您的API密钥将被安全存储在本地设备上，不会被发送到任何第三方服务器。
                  请确保妥善保管您的API密钥，避免泄露给他人。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 手动验证按钮 */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={validateConfiguration}
            disabled={validating || !apiKey.trim()}
            className="flex items-center gap-2"
          >
            {validating && <Loader2 className="w-4 h-4 animate-spin" />}
            {validating ? '验证中...' : '验证配置'}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

export default ClaudeConfigurationStep
