import { useCallback, useEffect, useRef } from 'react'
import type { SetupWizardState } from '@/types/setupWizard'

interface UseSetupWizardPersistOptions {
  debounceMs?: number
  maxRetries?: number
  retryDelay?: number
  onSaveSuccess?: () => void
  onSaveError?: (error: Error) => void
  onLoadSuccess?: (state: SetupWizardState) => void
  onLoadError?: (error: Error) => void
}

interface UseSetupWizardPersistReturn {
  // Persistence operations
  saveState: (state: SetupWizardState) => Promise<void>
  loadState: () => Promise<SetupWizardState | null>
  resetState: () => Promise<void>

  // Auto-save management
  enableAutoSave: (state: SetupWizardState) => void
  disableAutoSave: () => void
  forceSave: (state: SetupWizardState) => Promise<void>

  // State management
  isSaving: boolean
  isLoading: boolean
  lastSaveTime: Date | null

  // Utilities
  clearCache: () => void
  validateState: (state: SetupWizardState) => boolean
}

/**
 * Setup Wizard持久化管理钩子
 *
 * 负责管理设置向导状态的持久化，包括：
 * - 自动保存机制与防抖
 * - 中断后的状态恢复
 * - 保存失败的重试机制
 * - 数据完整性验证
 * - 清理和重置功能
 */
export function useSetupWizardPersist(
  options: UseSetupWizardPersistOptions = {}
): UseSetupWizardPersistReturn {
  const {
    debounceMs = 1000,
    maxRetries = 3,
    retryDelay = 2000,
    onSaveSuccess,
    onSaveError,
    onLoadSuccess,
    onLoadError
  } = options

  // Internal state
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef(0)
  const isSavingRef = useRef(false)
  const isLoadingRef = useRef(false)
  const lastSaveTimeRef = useRef<Date | null>(null)
  const lastStateRef = useRef<SetupWizardState | null>(null)

  // 验证状态数据完整性
  const validateState = useCallback((state: SetupWizardState): boolean => {
    try {
      // 基本结构验证
      if (!state || typeof state !== 'object') return false

      // 必需字段验证
      const requiredFields = [
        'currentStep',
        'stepStatus',
        'userData',
        'errors',
        'canProceed',
        'isFirstRun'
      ]
      for (const field of requiredFields) {
        if (!(field in state)) return false
      }

      // 步骤状态验证
      if (!state.stepStatus || typeof state.stepStatus !== 'object') return false

      // 用户数据验证
      if (!state.userData || typeof state.userData !== 'object') return false

      // 错误数据验证
      if (!state.errors || typeof state.errors !== 'object') return false

      return true
    } catch (error) {
      console.error('State validation error:', error)
      return false
    }
  }, [])

  // 核心保存功能（带重试机制）
  const saveStateWithRetry = useCallback(
    async (state: SetupWizardState, retryCount: number = 0): Promise<void> => {
      if (!window.api?.setupWizardSaveState) {
        throw new Error('Setup wizard API not available')
      }

      try {
        // 验证状态
        if (!validateState(state)) {
          throw new Error('Invalid state data')
        }

        const result = await window.api.setupWizardSaveState(state)

        if (!result.success) {
          throw new Error(result.error || 'Failed to save state')
        }

        // 保存成功
        lastSaveTimeRef.current = new Date()
        lastStateRef.current = { ...state }
        retryCountRef.current = 0
        onSaveSuccess?.()
      } catch (error) {
        console.error(`Save attempt ${retryCount + 1} failed:`, error)

        // 重试逻辑
        if (retryCount < maxRetries) {
          setTimeout(
            () => {
              saveStateWithRetry(state, retryCount + 1)
            },
            retryDelay * (retryCount + 1)
          ) // 指数退避
        } else {
          retryCountRef.current = 0
          onSaveError?.(error as Error)
          throw error
        }
      }
    },
    [validateState, maxRetries, retryDelay, onSaveSuccess, onSaveError]
  )

  // 防抖保存
  const debouncedSave = useCallback(
    (state: SetupWizardState) => {
      // 清除之前的定时器
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      // 设置新的定时器
      saveTimeoutRef.current = setTimeout(async () => {
        if (isSavingRef.current) return

        try {
          isSavingRef.current = true
          await saveStateWithRetry(state)
        } catch (error) {
          console.error('Debounced save failed:', error)
        } finally {
          isSavingRef.current = false
        }
      }, debounceMs)
    },
    [debounceMs, saveStateWithRetry]
  )

  // 立即保存（绕过防抖）
  const forceSave = useCallback(
    async (state: SetupWizardState): Promise<void> => {
      // 清除防抖定时器
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      if (isSavingRef.current) {
        // 如果正在保存，等待完成
        return new Promise((resolve, reject) => {
          const checkSaving = () => {
            if (!isSavingRef.current) {
              forceSave(state).then(resolve).catch(reject)
            } else {
              setTimeout(checkSaving, 100)
            }
          }
          checkSaving()
        })
      }

      try {
        isSavingRef.current = true
        await saveStateWithRetry(state)
      } finally {
        isSavingRef.current = false
      }
    },
    [saveStateWithRetry]
  )

  // 主要保存方法
  const saveState = useCallback(
    async (state: SetupWizardState): Promise<void> => {
      return forceSave(state)
    },
    [forceSave]
  )

  // 加载状态
  const loadState = useCallback(async (): Promise<SetupWizardState | null> => {
    if (!window.api?.setupWizardGetState) {
      throw new Error('Setup wizard API not available')
    }

    try {
      isLoadingRef.current = true
      const result = await window.api.setupWizardGetState()

      if (!result.success) {
        throw new Error(result.error || 'Failed to load state')
      }

      const state = result.data
      if (state && validateState(state)) {
        lastStateRef.current = { ...state }
        onLoadSuccess?.(state)
        return state
      } else {
        console.warn('Loaded state is invalid, returning null')
        return null
      }
    } catch (error) {
      console.error('Failed to load wizard state:', error)
      onLoadError?.(error as Error)
      throw error
    } finally {
      isLoadingRef.current = false
    }
  }, [validateState, onLoadSuccess, onLoadError])

  // 重置状态
  const resetState = useCallback(async (): Promise<void> => {
    if (!window.api?.setupWizardReset) {
      throw new Error('Setup wizard API not available')
    }

    try {
      // 清除防抖定时器
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      const result = await window.api.setupWizardReset()

      if (!result.success) {
        throw new Error(result.error || 'Failed to reset state')
      }

      // 清除本地缓存
      lastStateRef.current = null
      lastSaveTimeRef.current = null
      retryCountRef.current = 0
    } catch (error) {
      console.error('Failed to reset wizard state:', error)
      throw error
    }
  }, [])

  // 自动保存管理
  const enableAutoSave = useCallback(
    (state: SetupWizardState) => {
      // 只有状态真正改变时才保存
      const hasChanged =
        !lastStateRef.current || JSON.stringify(state) !== JSON.stringify(lastStateRef.current)

      if (hasChanged) {
        debouncedSave(state)
      }
    },
    [debouncedSave]
  )

  const disableAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  // 清除缓存
  const clearCache = useCallback(() => {
    lastStateRef.current = null
    lastSaveTimeRef.current = null
    retryCountRef.current = 0

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // 窗口关闭前保存
  useEffect(() => {
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      if (saveTimeoutRef.current && lastStateRef.current) {
        // 如果有待保存的状态，同步保存
        event.preventDefault()
        try {
          await forceSave(lastStateRef.current)
        } catch (error) {
          console.error('Failed to save on unload:', error)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [forceSave])

  return {
    // Persistence operations
    saveState,
    loadState,
    resetState,

    // Auto-save management
    enableAutoSave,
    disableAutoSave,
    forceSave,

    // State management
    isSaving: isSavingRef.current,
    isLoading: isLoadingRef.current,
    lastSaveTime: lastSaveTimeRef.current,

    // Utilities
    clearCache,
    validateState
  }
}

/**
 * 高阶钩子：结合状态管理和持久化
 *
 * 提供一个统一的接口来管理设置向导的状态和持久化
 */
export function useSetupWizardWithPersistence(persistOptions?: UseSetupWizardPersistOptions) {
  const persistence = useSetupWizardPersist(persistOptions)

  return {
    ...persistence,

    // 便捷方法：保存状态的同时进行验证
    saveStateSafely: async (state: SetupWizardState) => {
      if (!persistence.validateState(state)) {
        throw new Error('Invalid state data cannot be saved')
      }
      return persistence.saveState(state)
    },

    // 便捷方法：加载状态并处理错误
    loadStateWithFallback: async (fallbackState: SetupWizardState) => {
      try {
        const state = await persistence.loadState()
        return state || fallbackState
      } catch (error) {
        console.warn('Failed to load state, using fallback:', error)
        return fallbackState
      }
    }
  }
}
