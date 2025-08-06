import React, { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FolderOpen, GitBranch, Plus, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { SetupWizardState, RepositoryConfiguration } from '@/types/setupWizard'
import { WizardStep, ImportMode } from '@/types/setupWizard'

// 导入自定义 Hook
import { useRepositoryImport } from '@/hooks/useRepositoryImport'
import { useAuthManagement } from '@/hooks/useAuthManagement'
import { useFolderSelection } from '@/hooks/useFolderSelection'

// 导入子组件
import { ImportModeSelector } from './components/ImportModeSelector'
import { PresetRepositoryPanel } from './components/PresetRepositoryPanel'
import { CustomRepositoryPanel } from './components/CustomRepositoryPanel'
import { LocalProjectPanel } from './components/LocalProjectPanel'
import { NewProjectPanel } from './components/NewProjectPanel'
import { ImportStatusCard } from './components/ImportStatusCard'
import { AuthenticationDialog } from './components/AuthenticationDialog'

interface RepositoryImportStepProps {
  state: SetupWizardState
  onNext: () => Promise<void>
  onPrevious: () => Promise<void>
  onComplete: (step: WizardStep) => void
  onError: (step: WizardStep, error: string) => void
  onClearError: (step: WizardStep) => void
  updateApiConfiguration: (config: any) => void
  updateRepositoryConfiguration: (config: Partial<RepositoryConfiguration>) => void
  updateEnvironmentStatus: (status: any) => void
  canProceed: boolean
}

export const RepositoryImportStep: React.FC<RepositoryImportStepProps> = ({
  state,
  onComplete,
  onError,
  onClearError,
  updateRepositoryConfiguration
}) => {
  const [activeTab, setActiveTab] = useState<'clone' | 'local' | 'create'>('clone')

  // URL 验证状态
  const [cloneUrl, setCloneUrl] = useState('')
  const [cloneBranch, setCloneBranch] = useState('master')
  const [projectName, setProjectName] = useState('')

  // 使用自定义 Hook
  const repositoryImport = useRepositoryImport({
    onComplete,
    onError,
    onClearError,
    updateRepositoryConfiguration
  })

  const authManagement = useAuthManagement()
  const folderSelection = useFolderSelection()

  // 设置用户主目录
  useEffect(() => {
    const homeDir = state.userData.environmentStatus?.systemInfo?.homeDir
    if (homeDir) {
      folderSelection.setHomeDir(homeDir)
    }
  }, [state.userData.environmentStatus?.systemInfo?.homeDir])

  // URL变化时自动验证
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (cloneUrl.trim() && activeTab === 'clone') {
        repositoryImport.validateRepositoryUrl(cloneUrl)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [cloneUrl, activeTab, repositoryImport.validateRepositoryUrl])

  // 监听克隆进度事件
  useEffect(() => {
    const handleCloneProgress = (_: any, data: any) => {
      repositoryImport.setCloneProgress(data)
    }

    if (window.electron) {
      window.electron.ipcRenderer.on('setup-wizard-clone-progress', handleCloneProgress)
    }

    return () => {
      if (window.electron) {
        window.electron.ipcRenderer.removeAllListeners('setup-wizard-clone-progress')
      }
    }
  }, [repositoryImport.setCloneProgress])

  // 导入项目处理函数
  const handleImportProject = useCallback(async () => {
    switch (activeTab) {
      case 'clone':
        await repositoryImport.importProject('clone', {
          cloneUrl,
          clonePath: folderSelection.clonePath,
          cloneBranch
          // Note: 自定义模式的仓库类型和认证信息由 CustomRepositoryPanel 内部处理
        })
        break

      case 'local':
        await repositoryImport.importProject('local', {
          localPath: folderSelection.localPath
        })
        break

      case 'create':
        await repositoryImport.importProject('create', {
          projectName,
          projectPath: folderSelection.projectPath
        })
        break
    }
  }, [
    activeTab,
    cloneUrl,
    cloneBranch,
    projectName,
    folderSelection.clonePath,
    folderSelection.localPath,
    folderSelection.projectPath,
    repositoryImport.importProject
  ])

  // 检查是否可以导入
  const canImport = useCallback(() => {
    switch (activeTab) {
      case 'clone':
        if (authManagement.importMode === ImportMode.PRESET) {
          // 预置模式需要认证
          return (
            cloneUrl.trim() &&
            !repositoryImport.urlValidating &&
            authManagement.globalAuthStatus.isAuthenticated
          )
        } else {
          // 自定义模式的验证逻辑在 CustomRepositoryPanel 中处理
          return cloneUrl.trim() && !repositoryImport.urlValidating
        }
      case 'local':
        return folderSelection.localPath.trim()
      case 'create':
        return projectName.trim() && folderSelection.projectPath.trim()
      default:
        return false
    }
  }, [
    activeTab,
    cloneUrl,
    projectName,
    authManagement.importMode,
    authManagement.globalAuthStatus.isAuthenticated,
    repositoryImport.urlValidating,
    folderSelection.localPath,
    folderSelection.projectPath
  ])

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
            <ImportModeSelector
              importMode={authManagement.importMode}
              onModeChange={authManagement.setImportMode}
            />

            {authManagement.importMode === ImportMode.PRESET && (
              <PresetRepositoryPanel
                globalAuthStatus={authManagement.globalAuthStatus}
                presetConfig={authManagement.presetConfig}
                loadingAuthStatus={authManagement.loadingAuthStatus}
                onShowAuthSetup={() => authManagement.setShowAuthSetup(true)}
              />
            )}

            {authManagement.importMode === ImportMode.CUSTOM && (
              <CustomRepositoryPanel
                cloneUrl={cloneUrl}
                onUrlChange={setCloneUrl}
                clonePath={folderSelection.clonePath}
                onPathChange={folderSelection.updatePath.bind(null, 'clone')}
                cloneBranch={cloneBranch}
                onBranchChange={setCloneBranch}
                defaultClonePath={folderSelection.defaultClonePath}
                urlValidating={repositoryImport.urlValidating}
                onSelectFolder={() => folderSelection.selectFolder('clone')}
              />
            )}
          </TabsContent>

          {/* 导入本地项目 */}
          <TabsContent value="local" className="space-y-4">
            <LocalProjectPanel
              localPath={folderSelection.localPath}
              onPathChange={folderSelection.updatePath.bind(null, 'local')}
              onSelectFolder={() => folderSelection.selectFolder('local')}
            />
          </TabsContent>

          {/* 创建新项目 */}
          <TabsContent value="create" className="space-y-4">
            <NewProjectPanel
              projectName={projectName}
              onNameChange={setProjectName}
              projectPath={folderSelection.projectPath}
              onPathChange={folderSelection.updatePath.bind(null, 'create')}
              onSelectFolder={() => folderSelection.selectFolder('create')}
            />
          </TabsContent>
        </Tabs>

        {/* 状态显示 */}
        <ImportStatusCard
          importing={repositoryImport.importing}
          activeTab={activeTab}
          cloneProgress={repositoryImport.cloneProgress}
          validationResult={repositoryImport.validationResult}
          folderSelectError={folderSelection.folderSelectError}
        />

        {/* 导入按钮 */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleImportProject}
            disabled={repositoryImport.importing || !canImport()}
            className="flex items-center gap-2"
          >
            {repositoryImport.importing && <Loader2 className="w-4 h-4 animate-spin" />}
            <Download className="w-4 h-4" />
            {repositoryImport.importing ? '导入中...' : '导入项目'}
          </Button>
        </div>

        {/* 认证对话框 */}
        <AuthenticationDialog
          showAuthSetup={authManagement.showAuthSetup}
          onToggleAuthSetup={authManagement.setShowAuthSetup}
          authSetupType={authManagement.authSetupType}
          onSetupTypeChange={authManagement.setAuthSetupType}
          setupCredentials={authManagement.setupCredentials}
          onCredentialsChange={authManagement.setSetupCredentials}
          authValidating={authManagement.authValidating}
          authValidationResult={authManagement.authValidationResult}
          onSaveCredentials={authManagement.saveCredentials}
          showAuthExpiredDialog={authManagement.showAuthExpiredDialog}
          onToggleAuthExpiredDialog={authManagement.setShowAuthExpiredDialog}
        />
      </motion.div>
    </div>
  )
}

export default RepositoryImportStep
