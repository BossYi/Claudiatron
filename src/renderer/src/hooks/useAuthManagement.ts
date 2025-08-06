import { useState, useEffect } from 'react'
import type { AoneAuthInfo, GlobalAuthStatus, PresetRepositoryConfig } from '@/types/setupWizard'
import { ImportMode } from '@/types/setupWizard'
import { api } from '@/lib/api'

export function useAuthManagement() {
  // 导入模式状态
  const [importMode, setImportMode] = useState<ImportMode>(ImportMode.PRESET)

  // 全局认证状态
  const [globalAuthStatus, setGlobalAuthStatus] = useState<GlobalAuthStatus>({
    isAuthenticated: false,
    authType: null,
    credentials: null,
    lastChecked: null
  })

  // 预置仓库配置
  const [presetConfig, setPresetConfig] = useState<PresetRepositoryConfig | null>(null)

  // 认证相关状态
  const [showAuthSetup, setShowAuthSetup] = useState(false)
  const [showAuthExpiredDialog, setShowAuthExpiredDialog] = useState(false)
  const [authSetupType, setAuthSetupType] = useState<'aone' | 'github'>('aone')
  const [setupCredentials, setSetupCredentials] = useState<AoneAuthInfo>({
    domainAccount: '',
    privateToken: ''
  })
  const [authValidating, setAuthValidating] = useState(false)
  const [authValidationResult, setAuthValidationResult] = useState<{
    valid: boolean
    error?: string
  } | null>(null)

  // 加载状态
  const [loadingAuthStatus, setLoadingAuthStatus] = useState(false)

  // 加载预置仓库配置
  useEffect(() => {
    const loadPresetConfig = async () => {
      try {
        const result = await api.getPresetRepositoryConfig()
        if (result.success && result.data) {
          setPresetConfig(result.data)
        } else {
          console.warn('加载预置仓库配置失败:', result.error)
          // 降级到自定义模式
          setImportMode(ImportMode.CUSTOM)
        }
      } catch (error) {
        console.error('加载预置仓库配置失败:', error)
        setImportMode(ImportMode.CUSTOM)
      }
    }

    loadPresetConfig()
  }, [])

  // 加载全局认证状态
  useEffect(() => {
    const loadGlobalAuthStatus = async () => {
      setLoadingAuthStatus(true)
      try {
        const result = await api.getGlobalAuthStatus()
        if (result.success && result.data) {
          const authData = result.data
          if (authData.hasCredentials) {
            // 有认证信息，加载完整凭据
            const credentials = await api.getAoneCredentials()
            setGlobalAuthStatus({
              isAuthenticated: true,
              authType: authData.authType,
              credentials: credentials,
              lastChecked: new Date(),
              accountInfo: authData.accountInfo
            })
          } else {
            setGlobalAuthStatus({
              isAuthenticated: false,
              authType: null,
              credentials: null,
              lastChecked: new Date()
            })
          }
        }
      } catch (error) {
        console.error('加载全局认证状态失败:', error)
        setGlobalAuthStatus({
          isAuthenticated: false,
          authType: null,
          credentials: null,
          lastChecked: new Date()
        })
      } finally {
        setLoadingAuthStatus(false)
      }
    }

    loadGlobalAuthStatus()
  }, [])

  // 保存认证信息
  const saveCredentials = async () => {
    setAuthValidating(true)
    try {
      await api.saveAoneCredentials(setupCredentials)
      setAuthValidationResult({ valid: true })
      setGlobalAuthStatus((prev) => ({
        ...prev,
        isAuthenticated: true,
        authType: 'aone',
        credentials: setupCredentials,
        lastChecked: new Date(),
        accountInfo: {
          domainAccount: setupCredentials.domainAccount
        }
      }))
      // 2秒后关闭弹窗
      setTimeout(() => {
        setShowAuthSetup(false)
        setAuthValidationResult(null)
      }, 2000)
    } catch (error) {
      setAuthValidationResult({
        valid: false,
        error: error instanceof Error ? error.message : '保存失败'
      })
    } finally {
      setAuthValidating(false)
    }
  }

  return {
    // 状态
    importMode,
    globalAuthStatus,
    presetConfig,
    showAuthSetup,
    showAuthExpiredDialog,
    authSetupType,
    setupCredentials,
    authValidating,
    authValidationResult,
    loadingAuthStatus,

    // 设置函数
    setImportMode,
    setGlobalAuthStatus,
    setShowAuthSetup,
    setShowAuthExpiredDialog,
    setAuthSetupType,
    setSetupCredentials,
    setAuthValidationResult,

    // 操作函数
    saveCredentials
  }
}
