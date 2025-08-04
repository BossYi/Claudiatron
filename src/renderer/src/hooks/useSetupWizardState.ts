import { useState, useCallback, useMemo, useEffect } from 'react'
import type {
  SetupWizardState,
  ApiConfiguration,
  RepositoryConfiguration,
  EnvironmentStatus,
  SetupWizardError
} from '@/types/setupWizard'
import { WizardStep, StepStatus, ERROR_CODES } from '@/types/setupWizard'

interface UseSetupWizardStateOptions {
  autoSave?: boolean
  debounceMs?: number
}

interface UseSetupWizardStateReturn {
  // State
  state: SetupWizardState
  isLoading: boolean
  error: SetupWizardError | null

  // Navigation
  currentStep: WizardStep
  canGoNext: boolean
  canGoPrevious: boolean
  canProceed: boolean

  // Actions
  nextStep: () => Promise<void>
  previousStep: () => Promise<void>
  jumpToStep: (step: WizardStep) => Promise<void>

  // State Updates
  updateApiConfiguration: (config: Partial<ApiConfiguration>) => void
  updateRepositoryConfiguration: (config: Partial<RepositoryConfiguration>) => void
  updateEnvironmentStatus: (status: Partial<EnvironmentStatus>) => void

  // Step Management
  completeStep: (step: WizardStep) => void
  setStepError: (step: WizardStep, error: string) => void
  clearStepError: (step: WizardStep) => void

  // State Operations
  resetState: () => Promise<void>
  saveState: () => Promise<void>
  loadState: () => Promise<void>
}

const initialState: SetupWizardState = {
  currentStep: WizardStep.WELCOME,
  stepStatus: {
    [WizardStep.WELCOME]: StepStatus.PENDING,
    [WizardStep.ENVIRONMENT_DETECTION]: StepStatus.PENDING,
    [WizardStep.CLAUDE_CONFIGURATION]: StepStatus.PENDING,
    [WizardStep.REPOSITORY_IMPORT]: StepStatus.PENDING,
    [WizardStep.COMPLETION]: StepStatus.PENDING
  },
  userData: {},
  errors: {
    [WizardStep.WELCOME]: [],
    [WizardStep.ENVIRONMENT_DETECTION]: [],
    [WizardStep.CLAUDE_CONFIGURATION]: [],
    [WizardStep.REPOSITORY_IMPORT]: [],
    [WizardStep.COMPLETION]: []
  },
  canProceed: true,
  isFirstRun: true,
  startedAt: new Date().toISOString()
}

/**
 * Setup Wizard状态管理钩子
 *
 * 负责管理设置向导的完整状态，包括：
 * - 步骤导航和状态管理
 * - 用户数据的收集和验证
 * - 错误处理和恢复
 * - 状态持久化集成
 */
export function useSetupWizardState(
  options: UseSetupWizardStateOptions = {}
): UseSetupWizardStateReturn {
  const { autoSave = true } = options

  const [state, setState] = useState<SetupWizardState>(initialState)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<SetupWizardError | null>(null)

  // 步骤导航逻辑
  const canGoNext = useMemo(() => {
    const currentStepStatus = state.stepStatus[state.currentStep]
    return currentStepStatus === StepStatus.COMPLETED && state.canProceed
  }, [state.stepStatus, state.currentStep, state.canProceed])

  const canGoPrevious = useMemo(() => {
    return state.currentStep > WizardStep.WELCOME
  }, [state.currentStep])

  const canProceed = useMemo(() => {
    const currentStepStatus = state.stepStatus[state.currentStep]
    const hasErrors = state.errors[state.currentStep].length > 0
    return currentStepStatus !== StepStatus.ERROR && !hasErrors
  }, [state.stepStatus, state.currentStep, state.errors])

  // 更新canProceed状态
  useEffect(() => {
    if (state.canProceed !== canProceed) {
      setState((prev) => ({ ...prev, canProceed }))
    }
  }, [canProceed, state.canProceed])

  // 步骤验证逻辑 (currently unused but available for future use)
  // const validateStep = useCallback(
  //   async (step: WizardStep): Promise<boolean> => {
  //     try {
  //       switch (step) {
  //         case WizardStep.WELCOME:
  //           return true // 欢迎步骤总是有效

  //         case WizardStep.ENVIRONMENT_DETECTION:
  //           // 检查是否已经检测过环境
  //           return !!state.userData.environmentStatus

  //         case WizardStep.CLAUDE_CONFIGURATION: {
  //           // 检查API配置是否完整
  //           const apiConfig = state.userData.apiConfiguration
  //           return !!(apiConfig?.apiKey && apiConfig?.apiUrl)
  //         }

  //         case WizardStep.REPOSITORY_IMPORT: {
  //           // 检查仓库配置是否完整
  //           const repoConfig = state.userData.repository
  //           return !!(repoConfig?.url && repoConfig?.localPath)
  //         }

  //         case WizardStep.COMPLETION:
  //           // 检查前面所有步骤是否完成
  //           return Object.values(state.stepStatus).every(
  //             (status) => status === StepStatus.COMPLETED
  //           )

  //         default:
  //           return false
  //       }
  //     } catch (error) {
  //       console.error('Step validation error:', error)
  //       return false
  //     }
  //   },
  //   [state.userData, state.stepStatus]
  // )

  // 步骤导航
  const nextStep = useCallback(async () => {
    if (!canGoNext) return

    const nextStepValue = (state.currentStep + 1) as WizardStep
    if (nextStepValue <= WizardStep.COMPLETION) {
      setState((prev) => ({
        ...prev,
        currentStep: nextStepValue,
        stepStatus: {
          ...prev.stepStatus,
          [nextStepValue]: StepStatus.IN_PROGRESS
        }
      }))

      if (autoSave) {
        await saveState()
      }
    }
  }, [canGoNext, state.currentStep, autoSave])

  const previousStep = useCallback(async () => {
    if (!canGoPrevious) return

    const prevStepValue = (state.currentStep - 1) as WizardStep
    if (prevStepValue >= WizardStep.WELCOME) {
      setState((prev) => ({
        ...prev,
        currentStep: prevStepValue
      }))

      if (autoSave) {
        await saveState()
      }
    }
  }, [canGoPrevious, state.currentStep, autoSave])

  const jumpToStep = useCallback(
    async (step: WizardStep) => {
      // 只允许跳转到已完成的步骤或当前步骤
      const canJump = step <= state.currentStep || state.stepStatus[step] === StepStatus.COMPLETED

      if (canJump) {
        setState((prev) => ({
          ...prev,
          currentStep: step
        }))

        if (autoSave) {
          await saveState()
        }
      }
    },
    [state.currentStep, state.stepStatus, autoSave]
  )

  // 状态更新
  const updateApiConfiguration = useCallback((config: Partial<ApiConfiguration>) => {
    setState((prev) => ({
      ...prev,
      userData: {
        ...prev.userData,
        apiConfiguration: {
          ...prev.userData.apiConfiguration,
          ...config
        } as ApiConfiguration
      }
    }))
  }, [])

  const updateRepositoryConfiguration = useCallback((config: Partial<RepositoryConfiguration>) => {
    setState((prev) => ({
      ...prev,
      userData: {
        ...prev.userData,
        repository: {
          ...prev.userData.repository,
          ...config
        } as RepositoryConfiguration
      }
    }))
  }, [])

  const updateEnvironmentStatus = useCallback((status: Partial<EnvironmentStatus>) => {
    setState((prev) => ({
      ...prev,
      userData: {
        ...prev.userData,
        environmentStatus: {
          ...prev.userData.environmentStatus,
          ...status
        } as EnvironmentStatus
      }
    }))
  }, [])

  // 步骤状态管理
  const completeStep = useCallback((step: WizardStep) => {
    setState((prev) => ({
      ...prev,
      stepStatus: {
        ...prev.stepStatus,
        [step]: StepStatus.COMPLETED
      },
      errors: {
        ...prev.errors,
        [step]: [] // 清除该步骤的错误
      }
    }))
  }, [])

  const setStepError = useCallback((step: WizardStep, errorMessage: string) => {
    const errorObj: SetupWizardError = {
      code: ERROR_CODES.VALIDATION_FAILED,
      message: errorMessage,
      step,
      recoverable: true
    }

    setState((prev) => ({
      ...prev,
      stepStatus: {
        ...prev.stepStatus,
        [step]: StepStatus.ERROR
      },
      errors: {
        ...prev.errors,
        [step]: [...prev.errors[step], errorMessage]
      }
    }))

    setError(errorObj)
  }, [])

  const clearStepError = useCallback(
    (step: WizardStep) => {
      setState((prev) => ({
        ...prev,
        errors: {
          ...prev.errors,
          [step]: []
        }
      }))

      // 如果清除的是当前错误，也清除全局错误
      if (error && error.step === step) {
        setError(null)
      }
    },
    [error]
  )

  // 状态操作
  const saveState = useCallback(async () => {
    if (!window.api?.setupWizardSaveState) {
      console.warn('Setup wizard API not available')
      return
    }

    try {
      setIsLoading(true)
      const result = await window.api.setupWizardSaveState(state)

      if (!result.success) {
        throw new Error(result.error || 'Failed to save state')
      }
    } catch (error) {
      console.error('Failed to save wizard state:', error)
      const errorObj: SetupWizardError = {
        code: ERROR_CODES.UNKNOWN_ERROR,
        message: 'Failed to save wizard state',
        step: state.currentStep,
        recoverable: true
      }
      setError(errorObj)
    } finally {
      setIsLoading(false)
    }
  }, [state])

  const loadState = useCallback(async () => {
    if (!window.api?.setupWizardGetState) {
      console.warn('Setup wizard API not available')
      return
    }

    try {
      setIsLoading(true)
      const result = await window.api.setupWizardGetState()

      if (result.success && result.data) {
        setState(result.data)
      }
    } catch (error) {
      console.error('Failed to load wizard state:', error)
      const errorObj: SetupWizardError = {
        code: ERROR_CODES.UNKNOWN_ERROR,
        message: 'Failed to load wizard state',
        step: WizardStep.WELCOME,
        recoverable: true
      }
      setError(errorObj)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const resetState = useCallback(async () => {
    if (!window.api?.setupWizardReset) {
      console.warn('Setup wizard API not available')
      return
    }

    try {
      setIsLoading(true)
      const result = await window.api.setupWizardReset()

      if (result.success) {
        setState(initialState)
        setError(null)
      } else {
        throw new Error(result.error || 'Failed to reset state')
      }
    } catch (error) {
      console.error('Failed to reset wizard state:', error)
      const errorObj: SetupWizardError = {
        code: ERROR_CODES.UNKNOWN_ERROR,
        message: 'Failed to reset wizard state',
        step: state.currentStep,
        recoverable: false
      }
      setError(errorObj)
    } finally {
      setIsLoading(false)
    }
  }, [state.currentStep])

  // 初始化时加载状态
  useEffect(() => {
    loadState()
  }, [loadState])

  return {
    // State
    state,
    isLoading,
    error,

    // Navigation
    currentStep: state.currentStep,
    canGoNext,
    canGoPrevious,
    canProceed,

    // Actions
    nextStep,
    previousStep,
    jumpToStep,

    // State Updates
    updateApiConfiguration,
    updateRepositoryConfiguration,
    updateEnvironmentStatus,

    // Step Management
    completeStep,
    setStepError,
    clearStepError,

    // State Operations
    resetState,
    saveState,
    loadState
  }
}
