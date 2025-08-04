import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  FolderOpen,
  GitBranch,
  Download,
  Plus,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  SetupWizardState,
  ApiConfiguration,
  RepositoryConfiguration,
  EnvironmentStatus
} from '@/types/setupWizard'
import { WizardStep } from '@/types/setupWizard'

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
  } | null>(null)

  // 验证并导入项目
  const importProject = async () => {
    setImporting(true)
    onClearError(WizardStep.REPOSITORY_IMPORT)
    setValidationResult(null)

    try {
      let config: Partial<RepositoryConfiguration> = {}

      switch (activeTab) {
        case 'clone':
          if (!cloneUrl.trim()) {
            throw new Error('仓库URL不能为空')
          }
          if (!clonePath.trim()) {
            throw new Error('本地路径不能为空')
          }

          // 这里应该调用实际的克隆API
          // await window.api.setupWizardCloneRepository({
          //   url: cloneUrl,
          //   localPath: clonePath,
          //   options: { branch: cloneBranch }
          // })

          // 模拟克隆过程
          await new Promise((resolve) => setTimeout(resolve, 3000))

          config = {
            url: cloneUrl,
            localPath: clonePath,
            projectName: cloneUrl.split('/').pop()?.replace('.git', '') || 'project',
            branch: cloneBranch
          }
          break

        case 'local':
          if (!localPath.trim()) {
            throw new Error('项目路径不能为空')
          }

          // 验证本地路径
          config = {
            localPath: localPath,
            projectName: localPath.split('/').pop() || 'project'
          }
          break

        case 'create':
          if (!projectName.trim()) {
            throw new Error('项目名称不能为空')
          }
          if (!projectPath.trim()) {
            throw new Error('项目路径不能为空')
          }

          // 创建新项目
          config = {
            projectName: projectName,
            localPath: `${projectPath}/${projectName}`
          }
          break
      }

      updateRepositoryConfiguration(config)
      setValidationResult({ valid: true })
      onComplete(WizardStep.REPOSITORY_IMPORT)
    } catch (error) {
      const errorMessage = `导入失败: ${error}`
      onError(WizardStep.REPOSITORY_IMPORT, errorMessage)
      setValidationResult({ valid: false, error: errorMessage })
    } finally {
      setImporting(false)
    }
  }

  // 选择本地文件夹
  const selectFolder = async (type: 'clone' | 'local' | 'create') => {
    try {
      // 这里应该调用文件选择API
      // const result = await window.api.selectDirectory()

      // 模拟文件选择
      const mockPath = '/Users/user/Projects'

      switch (type) {
        case 'clone':
          setClonePath(mockPath)
          break
        case 'local':
          setLocalPath(mockPath)
          break
        case 'create':
          setProjectPath(mockPath)
          break
      }
    } catch (error) {
      console.error('Failed to select folder:', error)
    }
  }

  const canImport = () => {
    switch (activeTab) {
      case 'clone':
        return cloneUrl.trim() && clonePath.trim()
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
                  <Input
                    id="cloneUrl"
                    type="url"
                    value={cloneUrl}
                    onChange={(e) => setCloneUrl(e.target.value)}
                    placeholder="https://github.com/username/repository.git"
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clonePath">本地目录</Label>
                  <div className="flex gap-2">
                    <Input
                      id="clonePath"
                      value={clonePath}
                      onChange={(e) => setClonePath(e.target.value)}
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
                    placeholder="main"
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
                      onChange={(e) => setLocalPath(e.target.value)}
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
                      onChange={(e) => setProjectPath(e.target.value)}
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
            <CardContent className="flex items-center gap-3 p-4">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">正在导入项目...</p>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  {activeTab === 'clone' && '正在克隆远程仓库...'}
                  {activeTab === 'local' && '正在验证本地项目...'}
                  {activeTab === 'create' && '正在创建新项目...'}
                </p>
              </div>
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
            <CardContent className="flex items-start gap-3 p-4">
              {validationResult.valid ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
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
