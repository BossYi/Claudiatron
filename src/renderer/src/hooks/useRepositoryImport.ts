import { useState, useCallback } from 'react'
import type {
  RepositoryConfiguration,
  RepositoryCloneProgress,
  AoneAuthInfo
} from '@/types/setupWizard'
import { WizardStep, RepositoryType } from '@/types/setupWizard'
import { api } from '@/lib/api'

interface ValidationResult {
  valid: boolean
  error?: string
  repoInfo?: any
  projectInfo?: any
}

export interface UseRepositoryImportProps {
  onComplete: (step: WizardStep) => void
  onError: (step: WizardStep, error: string) => void
  onClearError: (step: WizardStep) => void
  updateRepositoryConfiguration: (config: Partial<RepositoryConfiguration>) => void
}

export function useRepositoryImport({
  onComplete,
  onError,
  onClearError,
  updateRepositoryConfiguration
}: UseRepositoryImportProps) {
  const [importing, setImporting] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [cloneProgress, setCloneProgress] = useState<RepositoryCloneProgress | null>(null)
  const [urlValidating, setUrlValidating] = useState(false)

  // 验证仓库URL
  const validateRepositoryUrl = useCallback(async (url: string) => {
    if (!url.trim()) return

    setUrlValidating(true)
    try {
      const result = await api.setupWizardValidateRepository(url)
      if (result.success && result.data) {
        return result.data
      } else {
        throw new Error(result.error || '仓库验证失败')
      }
    } catch (error) {
      console.error('Repository validation failed:', error)
      return null
    } finally {
      setUrlValidating(false)
    }
  }, [])

  // 克隆仓库
  const cloneRepository = useCallback(
    async (
      cloneUrl: string,
      clonePath: string,
      cloneBranch: string,
      repositoryType: RepositoryType,
      aoneAuth?: AoneAuthInfo
    ) => {
      // 首先验证仓库URL
      const validation = await validateRepositoryUrl(cloneUrl)
      if (!validation || !validation.valid) {
        throw new Error(validation?.error || '仓库URL无效')
      }

      // 执行克隆
      const result = await api.setupWizardCloneRepository({
        url: cloneUrl,
        localPath: clonePath || undefined,
        repositoryType,
        aoneAuth: repositoryType === 'aone' ? aoneAuth : undefined,
        options: {
          branch: cloneBranch || 'master',
          depth: 1 // 浅克隆以提高速度
        }
      })

      if (!result.success) {
        throw new Error(result.error || '仓库克隆失败')
      }

      const config: Partial<RepositoryConfiguration> = {
        url: cloneUrl,
        localPath: result.data.localPath,
        projectName: validation.repoName,
        branch: cloneBranch || 'master',
        isPrivate: validation.isPrivate
      }

      setValidationResult({
        valid: true,
        repoInfo: validation,
        projectInfo: result.data.projectInfo
      })

      return config
    },
    [validateRepositoryUrl]
  )

  // 导入本地项目
  const importLocalProject = useCallback(async (localPath: string) => {
    if (!localPath.trim()) {
      throw new Error('项目路径不能为空')
    }

    const result = await api.setupWizardImportProject(localPath)

    if (!result.success) {
      throw new Error(result.error || '项目导入失败')
    }

    const config: Partial<RepositoryConfiguration> = {
      localPath: localPath,
      projectName: result.data.project?.name || localPath.split('/').pop() || 'project'
    }

    setValidationResult({
      valid: true,
      projectInfo: result.data.project
    })

    return config
  }, [])

  // 创建新项目
  const createNewProject = useCallback(async (projectName: string, projectPath: string) => {
    if (!projectName.trim()) {
      throw new Error('项目名称不能为空')
    }
    if (!projectPath.trim()) {
      throw new Error('项目路径不能为空')
    }

    const fullPath = `${projectPath}/${projectName}`

    const config: Partial<RepositoryConfiguration> = {
      projectName: projectName,
      localPath: fullPath
    }

    setValidationResult({ valid: true })

    return config
  }, [])

  // 主导入函数
  const importProject = useCallback(
    async (
      type: 'clone' | 'local' | 'create',
      options: {
        // 克隆选项
        cloneUrl?: string
        clonePath?: string
        cloneBranch?: string
        repositoryType?: RepositoryType
        aoneAuth?: AoneAuthInfo
        // 本地项目选项
        localPath?: string
        // 新项目选项
        projectName?: string
        projectPath?: string
      }
    ) => {
      setImporting(true)
      onClearError(WizardStep.REPOSITORY_IMPORT)
      setValidationResult(null)
      setCloneProgress(null)

      try {
        let config: Partial<RepositoryConfiguration>

        switch (type) {
          case 'clone':
            if (!options.cloneUrl) {
              throw new Error('仓库URL不能为空')
            }
            config = await cloneRepository(
              options.cloneUrl,
              options.clonePath || '',
              options.cloneBranch || 'master',
              options.repositoryType || RepositoryType.OTHER,
              options.aoneAuth
            )
            break

          case 'local':
            if (!options.localPath) {
              throw new Error('项目路径不能为空')
            }
            config = await importLocalProject(options.localPath)
            break

          case 'create':
            if (!options.projectName || !options.projectPath) {
              throw new Error('项目名称和路径不能为空')
            }
            config = await createNewProject(options.projectName, options.projectPath)
            break

          default:
            throw new Error('未知的导入类型')
        }

        updateRepositoryConfiguration(config)
        onComplete(WizardStep.REPOSITORY_IMPORT)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        onError(WizardStep.REPOSITORY_IMPORT, `导入失败: ${errorMessage}`)
        setValidationResult({ valid: false, error: errorMessage })
      } finally {
        setImporting(false)
        setCloneProgress(null)
      }
    },
    [
      cloneRepository,
      importLocalProject,
      createNewProject,
      onComplete,
      onError,
      onClearError,
      updateRepositoryConfiguration
    ]
  )

  return {
    importing,
    validationResult,
    cloneProgress,
    urlValidating,
    validateRepositoryUrl,
    importProject,
    setCloneProgress
  }
}
