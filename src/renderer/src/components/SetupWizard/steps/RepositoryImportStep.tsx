import React, { useState, useCallback, useEffect } from 'react'
import type { SetupWizardState, RepositoryConfiguration } from '@/types/setupWizard'
import { WizardStep, ImportMode } from '@/types/setupWizard'

// 导入自定义 Hook
import { useRepositoryImport } from '@/hooks/useRepositoryImport'
import { useAuthManagement } from '@/hooks/useAuthManagement'
import { useFolderSelection } from '@/hooks/useFolderSelection'
import { useToast } from '@/hooks/useToast'

// 导入子组件
import { RepositoryImportLayout } from './components/RepositoryImportLayout'
import { ImportModeTabs } from './components/ImportModeTabs'
import { PresetAuthStatus } from './components/PresetAuthStatus'
import { CustomRepositoryForm } from './components/CustomRepositoryForm'
import { ImportStatusCard } from './components/ImportStatusCard'
import { TeamSelectionPanel } from './components/TeamSelectionPanel'
import { ProjectSelectionPanel } from './components/ProjectSelectionPanel'
import { AuthenticationDialog } from './components/AuthenticationDialog'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { Toast, ToastContainer } from '@/components/ui/toast'

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
  // URL 验证状态
  const [cloneUrl, setCloneUrl] = useState('')
  const [cloneBranch, setCloneBranch] = useState('master')

  // 使用自定义 Hook
  const repositoryImport = useRepositoryImport({
    onComplete,
    onError,
    onClearError,
    updateRepositoryConfiguration
  })

  const authManagement = useAuthManagement()
  const folderSelection = useFolderSelection()
  const { toast, showToast, hideToast } = useToast()

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
      if (cloneUrl.trim()) {
        repositoryImport.validateRepositoryUrl(cloneUrl)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [cloneUrl, repositoryImport.validateRepositoryUrl])

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
    try {
      // 检查是否是预置模式且已选择项目
      if (authManagement.importMode === ImportMode.PRESET && authManagement.selectedProject) {
        await repositoryImport.importProject('preset', {
          presetProject: authManagement.selectedProject,
          clonePath: folderSelection.clonePath,
          globalAuth: authManagement.globalAuthStatus.credentials || undefined
        })
        // 显示成功提示
        const projectName = authManagement.selectedProject.name
        const targetPath = `${folderSelection.clonePath}/${projectName}`
        showToast(`项目已成功导入到: ${targetPath}`, 'success')
      } else {
        // 自定义模式
        await repositoryImport.importProject('clone', {
          cloneUrl,
          clonePath: folderSelection.clonePath,
          cloneBranch
          // Note: 自定义模式的仓库类型和认证信息由 CustomRepositoryPanel 内部处理
        })
        // 显示成功提示
        const repoName = cloneUrl.split('/').pop()?.replace('.git', '') || 'repository'
        const targetPath = `${folderSelection.clonePath}/${repoName}`
        showToast(`项目已成功导入到: ${targetPath}`, 'success')
      }
    } catch (error) {
      // 错误处理由 repositoryImport 内部处理，这里只捕获未预期的错误
      const errorMessage = error instanceof Error ? error.message : '导入失败'
      showToast(errorMessage, 'error')
    }
  }, [
    cloneUrl,
    cloneBranch,
    folderSelection.clonePath,
    repositoryImport.importProject,
    authManagement.importMode,
    authManagement.selectedProject,
    authManagement.globalAuthStatus.credentials,
    showToast
  ])

  // 检查是否可以导入
  const canImport = useCallback(() => {
    if (authManagement.importMode === ImportMode.PRESET) {
      // 预置模式需要认证且选择项目
      return (
        authManagement.globalAuthStatus.isAuthenticated &&
        authManagement.selectedProject !== null &&
        !repositoryImport.importing
      )
    } else {
      // 自定义模式的验证逻辑在 CustomRepositoryForm 中处理
      return (
        Boolean(cloneUrl.trim()) && !repositoryImport.urlValidating && !repositoryImport.importing
      )
    }
  }, [
    cloneUrl,
    authManagement.importMode,
    authManagement.globalAuthStatus.isAuthenticated,
    authManagement.selectedProject,
    repositoryImport.importing,
    repositoryImport.urlValidating
  ])

  // 导入模式选择器
  const modeSelector = (
    <ImportModeTabs
      importMode={authManagement.importMode}
      onModeChange={authManagement.setImportMode}
    />
  )

  // 主内容区域 - 根据模式切换
  const mainContent = (
    <div className="h-full flex flex-col space-y-4">
      {authManagement.importMode === ImportMode.PRESET ? (
        // 预置模式
        <>
          {/* 认证状态栏 */}
          <PresetAuthStatus
            globalAuthStatus={authManagement.globalAuthStatus}
            loadingAuthStatus={authManagement.loadingAuthStatus}
            onShowAuthSetup={() => authManagement.setShowAuthSetup(true)}
          />

          {/* 团队/项目选择区域 */}
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardContent className="p-4 flex-1 flex flex-col min-h-0">
              {authManagement.presetConfig ? (
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                  {authManagement.showTeamSelection ? (
                    <TeamSelectionPanel
                      teams={authManagement.presetConfig.businessTeams}
                      onSelectTeam={authManagement.selectTeam}
                    />
                  ) : authManagement.selectedTeam ? (
                    <ProjectSelectionPanel
                      selectedTeam={authManagement.selectedTeam}
                      filteredProjects={authManagement.filteredProjects || []}
                      selectedProject={authManagement.selectedProject || null}
                      searchQuery={authManagement.searchQuery || ''}
                      onBackToTeams={authManagement.backToTeamSelection}
                      onSelectProject={authManagement.selectProject}
                      onSearchChange={authManagement.setSearchQuery}
                    />
                  ) : null}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">加载项目配置...</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        // 自定义模式
        <CustomRepositoryForm
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

      {/* 状态显示 */}
      {repositoryImport.importing && (
        <ImportStatusCard
          importing={repositoryImport.importing}
          activeTab="clone"
          cloneProgress={repositoryImport.cloneProgress}
          validationResult={repositoryImport.validationResult}
          folderSelectError={folderSelection.folderSelectError}
          clonePath={folderSelection.clonePath}
        />
      )}
    </div>
  )

  // 操作按钮区域
  const actionArea = (
    <Card>
      <CardContent className="p-3">
        <Button
          onClick={handleImportProject}
          disabled={!canImport()}
          className="w-full"
          size="default"
        >
          {repositoryImport.importing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              导入中...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              导入项目
            </>
          )}
        </Button>
        {!canImport() && !repositoryImport.importing && (
          <div className="text-xs text-muted-foreground text-center mt-2 space-y-1">
            <p>
              {authManagement.importMode === ImportMode.PRESET
                ? '请先配置认证并选择项目'
                : '请输入仓库URL'}
            </p>
            <p className="text-xs opacity-70">目标路径: {folderSelection.clonePath}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <>
      <RepositoryImportLayout
        modeSelector={modeSelector}
        mainContent={mainContent}
        actionArea={actionArea}
      />

      {/* Toast 提示 */}
      <ToastContainer>
        {toast.visible && (
          <Toast message={toast.message} type={toast.type} duration={5000} onDismiss={hideToast} />
        )}
      </ToastContainer>

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
    </>
  )
}

export default RepositoryImportStep
