import React, { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  FolderOpen,
  GitBranch,
  Download,
  Plus,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import type {
  SetupWizardState,
  ApiConfiguration,
  RepositoryConfiguration,
  EnvironmentStatus,
  RepositoryCloneProgress
} from '@/types/setupWizard'
import { WizardStep } from '@/types/setupWizard'
import { api } from '@/lib/api'

interface RepositoryImportStepProps {
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

/**
 * 仓库导入步骤组件
 *
 * 导入现有项目或创建新项目
 */
export const RepositoryImportStep: React.FC<RepositoryImportStepProps> = ({
  onComplete,
  onError,
  onClearError,
  updateRepositoryConfiguration
}) => {
  const [activeTab, setActiveTab] = useState<'clone' | 'local' | 'create'>('clone')
  const [importing, setImporting] = useState(false)

  // 克隆仓库状态
  const [cloneUrl, setCloneUrl] = useState('')
  const [clonePath, setClonePath] = useState('')
  const [cloneBranch, setCloneBranch] = useState('main')

  // 本地项目状态
  const [localPath, setLocalPath] = useState('')

  // 新项目状态
  const [projectName, setProjectName] = useState('')
  const [projectPath, setProjectPath] = useState('')

  const [validationResult, setValidationResult] = useState<{
    valid: boolean
    error?: string
    repoInfo?: any
    projectInfo?: any
  } | null>(null)
  const [urlValidating, setUrlValidating] = useState(false)
  const [cloneProgress, setCloneProgress] = useState<RepositoryCloneProgress | null>(null)
  const [folderSelectError, setFolderSelectError] = useState<string | null>(null)

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

  // URL变化时自动验证
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (cloneUrl.trim() && activeTab === 'clone') {
        validateRepositoryUrl(cloneUrl)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [cloneUrl, activeTab, validateRepositoryUrl])

  // 监听克隆进度事件
  useEffect(() => {
    const handleCloneProgress = (_: any, data: RepositoryCloneProgress) => {
      setCloneProgress(data)
    }

    // 注册事件监听器
    if (window.electron) {
      window.electron.ipcRenderer.on('setup-wizard-clone-progress', handleCloneProgress)
    }

    return () => {
      // 清理事件监听器
      if (window.electron) {
        window.electron.ipcRenderer.removeAllListeners('setup-wizard-clone-progress')
      }
    }
  }, [])

  // 验证并导入项目
  const importProject = async () => {
    setImporting(true)
    onClearError(WizardStep.REPOSITORY_IMPORT)
    setValidationResult(null)
    setCloneProgress(null)

    try {
      let config: Partial<RepositoryConfiguration> = {}
      let result: any

      switch (activeTab) {
        case 'clone':
          if (!cloneUrl.trim()) {
            throw new Error('仓库URL不能为空')
          }

          // 首先验证仓库URL
          const validation = await validateRepositoryUrl(cloneUrl)
          if (!validation || !validation.valid) {
            throw new Error(validation?.error || '仓库URL无效')
          }

          // 执行克隆
          result = await api.setupWizardCloneRepository({
            url: cloneUrl,
            localPath: clonePath || undefined,
            options: {
              branch: cloneBranch || 'main',
              depth: 1 // 浅克隆以提高速度
            }
          })

          if (!result.success) {
            throw new Error(result.error || '仓库克隆失败')
          }

          config = {
            url: cloneUrl,
            localPath: result.data.localPath,
            projectName: validation.repoName,
            branch: cloneBranch || 'main',
            isPrivate: validation.isPrivate
          }

          setValidationResult({
            valid: true,
            repoInfo: validation,
            projectInfo: result.data.projectInfo
          })
          break

        case 'local':
          if (!localPath.trim()) {
            throw new Error('项目路径不能为空')
          }

          // 导入本地项目
          result = await api.setupWizardImportProject(localPath)

          if (!result.success) {
            throw new Error(result.error || '项目导入失败')
          }

          config = {
            localPath: localPath,
            projectName: result.data.project?.name || localPath.split('/').pop() || 'project'
          }

          setValidationResult({
            valid: true,
            projectInfo: result.data.project
          })
          break

        case 'create':
          if (!projectName.trim()) {
            throw new Error('项目名称不能为空')
          }
          if (!projectPath.trim()) {
            throw new Error('项目路径不能为空')
          }

          // 创建新项目（这里可能需要实现项目模板创建）
          const fullPath = `${projectPath}/${projectName}`

          config = {
            projectName: projectName,
            localPath: fullPath
          }

          setValidationResult({ valid: true })
          break
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
  }

  // 选择本地文件夹
  const selectFolder = async (type: 'clone' | 'local' | 'create') => {
    // 清除之前的错误
    setFolderSelectError(null)

    try {
      // 使用 Electron 的文件对话框
      const result = await window.electron.dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: `选择${type === 'clone' ? '克隆目标' : type === 'local' ? '项目' : '创建'}目录`
      })

      if (result && !result.canceled && result.filePaths.length > 0) {
        const selectedPath = result.filePaths[0]

        switch (type) {
          case 'clone':
            setClonePath(selectedPath)
            break
          case 'local':
            setLocalPath(selectedPath)
            break
          case 'create':
            setProjectPath(selectedPath)
            break
        }
      }
    } catch (error) {
      console.error('Failed to select folder:', error)
      const errorMessage = error instanceof Error ? error.message : '文件选择失败'
      setFolderSelectError(`无法打开文件选择对话框: ${errorMessage}`)
    }
  }

  const canImport = () => {
    switch (activeTab) {
      case 'clone':
        return cloneUrl.trim() && !urlValidating
      case 'local':
        return localPath.trim()
      case 'create':
        return projectName.trim() && projectPath.trim()
      default:
        return false
    }
  }

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* 步骤说明 */}
        <div className="flex items-start gap-3">
          <FolderOpen className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-lg font-semibold">项目导入</h2>
            <p className="text-sm text-muted-foreground mt-1">
              选择要使用的项目，您可以克隆远程仓库、导入本地项目或创建新项目
            </p>
          </div>
        </div>

        {/* 项目导入选项 */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as any)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="clone" className="flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              克隆仓库
            </TabsTrigger>
            <TabsTrigger value="local" className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              本地项目
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              创建新项目
            </TabsTrigger>
          </TabsList>

          {/* 克隆远程仓库 */}
          <TabsContent value="clone" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">克隆Git仓库</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cloneUrl">仓库URL</Label>
                  <div className="relative">
                    <Input
                      id="cloneUrl"
                      type="url"
                      value={cloneUrl}
                      onChange={(e) => setCloneUrl(e.target.value)}
                      placeholder="https://github.com/username/repository.git 或 username/repository"
                      className="font-mono text-sm pr-10"
                    />
                    {urlValidating && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    支持完整URL或GitHub简写形式 (如: microsoft/vscode)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clonePath">本地目录</Label>
                  <div className="flex gap-2">
                    <Input
                      id="clonePath"
                      value={clonePath}
                      onChange={(e) => {
                        setClonePath(e.target.value)
                        setFolderSelectError(null)
                      }}
                      placeholder="/Users/username/Projects"
                      className="flex-1"
                    />
                    <Button variant="outline" onClick={() => selectFolder('clone')}>
                      选择
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cloneBranch">分支 (可选)</Label>
                  <Input
                    id="cloneBranch"
                    value={cloneBranch}
                    onChange={(e) => setCloneBranch(e.target.value)}
                    placeholder="master"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 导入本地项目 */}
          <TabsContent value="local" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">导入本地项目</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="localPath">项目目录</Label>
                  <div className="flex gap-2">
                    <Input
                      id="localPath"
                      value={localPath}
                      onChange={(e) => {
                        setLocalPath(e.target.value)
                        setFolderSelectError(null)
                      }}
                      placeholder="/Users/username/my-project"
                      className="flex-1"
                    />
                    <Button variant="outline" onClick={() => selectFolder('local')}>
                      选择
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">请选择包含您项目文件的目录</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 创建新项目 */}
          <TabsContent value="create" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">创建新项目</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">项目名称</Label>
                  <Input
                    id="projectName"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="my-awesome-project"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectPath">创建位置</Label>
                  <div className="flex gap-2">
                    <Input
                      id="projectPath"
                      value={projectPath}
                      onChange={(e) => {
                        setProjectPath(e.target.value)
                        setFolderSelectError(null)
                      }}
                      placeholder="/Users/username/Projects"
                      className="flex-1"
                    />
                    <Button variant="outline" onClick={() => selectFolder('create')}>
                      选择
                    </Button>
                  </div>
                  {projectName && projectPath && (
                    <p className="text-xs text-muted-foreground">
                      项目将创建在: {projectPath}/{projectName}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 导入状态 */}
        {importing && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">正在导入项目...</p>
                  <p className="text-sm text-blue-600 dark:text-blue-300">
                    {activeTab === 'clone' && (cloneProgress?.message || '正在克隆远程仓库...')}
                    {activeTab === 'local' && '正在验证本地项目...'}
                    {activeTab === 'create' && '正在创建新项目...'}
                  </p>
                </div>
              </div>

              {/* 克隆进度条 */}
              {activeTab === 'clone' && cloneProgress && (
                <div className="space-y-2">
                  <Progress value={cloneProgress.progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{cloneProgress.status}</span>
                    <span>{cloneProgress.progress}%</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 验证结果 */}
        {validationResult && !importing && (
          <Card
            className={`${
              validationResult.valid
                ? 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800'
                : 'border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800'
            }`}
          >
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start gap-3">
                {validationResult.valid ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={`font-medium ${
                      validationResult.valid
                        ? 'text-green-800 dark:text-green-200'
                        : 'text-red-800 dark:text-red-200'
                    }`}
                  >
                    {validationResult.valid ? '项目导入成功' : '导入失败'}
                  </p>
                  {validationResult.error && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {validationResult.error}
                    </p>
                  )}
                  {validationResult.valid && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      项目已成功导入，可以继续下一步
                    </p>
                  )}
                </div>
              </div>

              {/* 项目信息展示 */}
              {validationResult.valid &&
                (validationResult.repoInfo || validationResult.projectInfo) && (
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border">
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      项目信息
                    </h4>
                    <div className="space-y-2 text-sm">
                      {validationResult.repoInfo && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">仓库:</span>
                            <div className="flex items-center gap-2">
                              <span>{validationResult.repoInfo.repoName}</span>
                              <Badge variant="outline" className="text-xs">
                                {validationResult.repoInfo.platform}
                              </Badge>
                              {validationResult.repoInfo.isPrivate && (
                                <Badge variant="secondary" className="text-xs">
                                  私有
                                </Badge>
                              )}
                            </div>
                          </div>
                          {validationResult.repoInfo.owner && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">所有者:</span>
                              <span>{validationResult.repoInfo.owner}</span>
                            </div>
                          )}
                        </>
                      )}
                      {validationResult.projectInfo && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">项目类型:</span>
                            <Badge variant="outline">{validationResult.projectInfo.type}</Badge>
                          </div>
                          {validationResult.projectInfo.description && (
                            <div>
                              <span className="text-muted-foreground">描述:</span>
                              <p className="text-xs mt-1 text-muted-foreground">
                                {validationResult.projectInfo.description}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
        )}

        {/* 文件选择错误显示 */}
        {folderSelectError && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-800 dark:text-red-200">文件选择失败</p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{folderSelectError}</p>
                  <p className="text-xs text-red-500 dark:text-red-500 mt-2">
                    您可以尝试手动输入路径，或联系技术支持。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 导入按钮 */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={importProject}
            disabled={importing || !canImport()}
            className="flex items-center gap-2"
          >
            {importing && <Loader2 className="w-4 h-4 animate-spin" />}
            <Download className="w-4 h-4" />
            {importing ? '导入中...' : '导入项目'}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

export default RepositoryImportStep
