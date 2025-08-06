// Export all types
export * from './api/types'

// Import API modules
import { ProjectsApi } from './api/modules/projects'
import { ClaudeApi } from './api/modules/claude'
import { AgentsApi } from './api/modules/agents'
import { UsageApi } from './api/modules/usage'
import { CheckpointsApi } from './api/modules/checkpoints'
import { MCPApi } from './api/modules/mcp'
import { InstallationsApi } from './api/modules/installations'
import { StorageApi } from './api/modules/storage'
import { HooksApi } from './api/modules/hooks'
import { SlashCommandsApi } from './api/modules/slashCommands'
import { SetupWizardApi } from './api/modules/setupWizard'
import { AoneApi } from './api/modules/aone'

// Export compatibility functions
export * from './api/utils/compatibility'

/**
 * Main API client for interacting with the Electron backend
 * Provides a unified interface compatible with the original api.ts structure
 */
export const api = {
  // Project management
  listProjects: ProjectsApi.listProjects.bind(ProjectsApi),
  getProjectSessions: ProjectsApi.getProjectSessions.bind(ProjectsApi),
  findClaudeMdFiles: ProjectsApi.findClaudeMdFiles.bind(ProjectsApi),
  readClaudeMdFile: ProjectsApi.readClaudeMdFile.bind(ProjectsApi),
  saveClaudeMdFile: ProjectsApi.saveClaudeMdFile.bind(ProjectsApi),

  // Claude core functionality
  getClaudeSettings: ClaudeApi.getClaudeSettings.bind(ClaudeApi),
  saveClaudeSettings: ClaudeApi.saveClaudeSettings.bind(ClaudeApi),
  getSystemPrompt: ClaudeApi.getSystemPrompt.bind(ClaudeApi),
  saveSystemPrompt: ClaudeApi.saveSystemPrompt.bind(ClaudeApi),
  checkClaudeVersion: ClaudeApi.checkClaudeVersion.bind(ClaudeApi),
  executeClaudeCode: ClaudeApi.executeClaudeCode.bind(ClaudeApi),
  continueClaudeCode: ClaudeApi.continueClaudeCode.bind(ClaudeApi),
  resumeClaudeCode: ClaudeApi.resumeClaudeCode.bind(ClaudeApi),
  cancelClaudeExecution: ClaudeApi.cancelClaudeExecution.bind(ClaudeApi),
  listRunningClaudeSessions: ClaudeApi.listRunningClaudeSessions.bind(ClaudeApi),
  getClaudeSessionOutput: ClaudeApi.getClaudeSessionOutput.bind(ClaudeApi),
  updateSessionId: ClaudeApi.updateSessionId.bind(ClaudeApi),
  loadSessionHistory: ClaudeApi.loadSessionHistory.bind(ClaudeApi),

  // Agent management
  listAgents: AgentsApi.listAgents.bind(AgentsApi),
  createAgent: AgentsApi.createAgent.bind(AgentsApi),
  updateAgent: AgentsApi.updateAgent.bind(AgentsApi),
  deleteAgent: AgentsApi.deleteAgent.bind(AgentsApi),
  getAgent: AgentsApi.getAgent.bind(AgentsApi),
  exportAgent: AgentsApi.exportAgent.bind(AgentsApi),
  importAgent: AgentsApi.importAgent.bind(AgentsApi),
  importAgentFromFile: AgentsApi.importAgentFromFile.bind(AgentsApi),
  executeAgent: AgentsApi.executeAgent.bind(AgentsApi),
  listAgentRuns: AgentsApi.listAgentRuns.bind(AgentsApi),
  getAgentRun: AgentsApi.getAgentRun.bind(AgentsApi),
  getAgentRunWithRealTimeMetrics: AgentsApi.getAgentRunWithRealTimeMetrics.bind(AgentsApi),
  listRunningAgentSessions: AgentsApi.listRunningAgentSessions.bind(AgentsApi),
  killAgentSession: AgentsApi.killAgentSession.bind(AgentsApi),
  getSessionStatus: AgentsApi.getSessionStatus.bind(AgentsApi),
  cleanupFinishedProcesses: AgentsApi.cleanupFinishedProcesses.bind(AgentsApi),
  getSessionOutput: AgentsApi.getSessionOutput.bind(AgentsApi),
  getLiveSessionOutput: AgentsApi.getLiveSessionOutput.bind(AgentsApi),
  streamSessionOutput: AgentsApi.streamSessionOutput.bind(AgentsApi),
  loadAgentSessionHistory: AgentsApi.loadAgentSessionHistory.bind(AgentsApi),

  // GitHub integration (placeholder)
  fetchGitHubAgents: AgentsApi.fetchGitHubAgents.bind(AgentsApi),
  fetchGitHubAgentContent: AgentsApi.fetchGitHubAgentContent.bind(AgentsApi),
  importAgentFromGitHub: AgentsApi.importAgentFromGitHub.bind(AgentsApi),

  // Usage statistics
  getUsageStats: UsageApi.getUsageStats.bind(UsageApi),
  getUsageByDateRange: UsageApi.getUsageByDateRange.bind(UsageApi),
  getSessionStats: UsageApi.getSessionStats.bind(UsageApi),
  getUsageDetails: UsageApi.getUsageDetails.bind(UsageApi),

  // Checkpoints
  createCheckpoint: CheckpointsApi.createCheckpoint.bind(CheckpointsApi),
  restoreCheckpoint: CheckpointsApi.restoreCheckpoint.bind(CheckpointsApi),
  listCheckpoints: CheckpointsApi.listCheckpoints.bind(CheckpointsApi),
  forkFromCheckpoint: CheckpointsApi.forkFromCheckpoint.bind(CheckpointsApi),
  getSessionTimeline: CheckpointsApi.getSessionTimeline.bind(CheckpointsApi),
  updateCheckpointSettings: CheckpointsApi.updateCheckpointSettings.bind(CheckpointsApi),
  getCheckpointDiff: CheckpointsApi.getCheckpointDiff.bind(CheckpointsApi),
  trackCheckpointMessage: CheckpointsApi.trackCheckpointMessage.bind(CheckpointsApi),
  checkAutoCheckpoint: CheckpointsApi.checkAutoCheckpoint.bind(CheckpointsApi),
  cleanupOldCheckpoints: CheckpointsApi.cleanupOldCheckpoints.bind(CheckpointsApi),
  getCheckpointSettings: CheckpointsApi.getCheckpointSettings.bind(CheckpointsApi),
  clearCheckpointManager: CheckpointsApi.clearCheckpointManager.bind(CheckpointsApi),
  trackSessionMessages: CheckpointsApi.trackSessionMessages.bind(CheckpointsApi),

  // MCP server management
  mcpAdd: MCPApi.mcpAdd.bind(MCPApi),
  mcpList: MCPApi.mcpList.bind(MCPApi),
  mcpGet: MCPApi.mcpGet.bind(MCPApi),
  mcpRemove: MCPApi.mcpRemove.bind(MCPApi),
  mcpAddJson: MCPApi.mcpAddJson.bind(MCPApi),
  mcpImportFromClaudeDesktop: MCPApi.mcpImportFromClaudeDesktop.bind(MCPApi),
  mcpServe: MCPApi.mcpServe.bind(MCPApi),
  mcpTestConnection: MCPApi.mcpTestConnection.bind(MCPApi),
  mcpResetProjectChoices: MCPApi.mcpResetProjectChoices.bind(MCPApi),
  mcpGetServerStatus: MCPApi.mcpGetServerStatus.bind(MCPApi),
  mcpReadProjectConfig: MCPApi.mcpReadProjectConfig.bind(MCPApi),
  mcpSaveProjectConfig: MCPApi.mcpSaveProjectConfig.bind(MCPApi),

  // Claude installations
  getClaudeBinaryPath: InstallationsApi.getClaudeBinaryPath.bind(InstallationsApi),
  setClaudeBinaryPath: InstallationsApi.setClaudeBinaryPath.bind(InstallationsApi),
  listClaudeInstallations: InstallationsApi.listClaudeInstallations.bind(InstallationsApi),

  // Storage
  storageListTables: StorageApi.storageListTables.bind(StorageApi),
  storageReadTable: StorageApi.storageReadTable.bind(StorageApi),
  storageUpdateRow: StorageApi.storageUpdateRow.bind(StorageApi),
  storageDeleteRow: StorageApi.storageDeleteRow.bind(StorageApi),
  storageInsertRow: StorageApi.storageInsertRow.bind(StorageApi),
  storageExecuteSql: StorageApi.storageExecuteSql.bind(StorageApi),
  storageResetDatabase: StorageApi.storageResetDatabase.bind(StorageApi),

  // Hooks management
  getHooksConfig: HooksApi.getHooksConfig.bind(HooksApi),
  updateHooksConfig: HooksApi.updateHooksConfig.bind(HooksApi),
  validateHookCommand: HooksApi.validateHookCommand.bind(HooksApi),
  getMergedHooksConfig: HooksApi.getMergedHooksConfig.bind(HooksApi),

  // Slash commands
  slashCommandsList: SlashCommandsApi.slashCommandsList.bind(SlashCommandsApi),
  slashCommandGet: SlashCommandsApi.slashCommandGet.bind(SlashCommandsApi),
  slashCommandSave: SlashCommandsApi.slashCommandSave.bind(SlashCommandsApi),
  slashCommandDelete: SlashCommandsApi.slashCommandDelete.bind(SlashCommandsApi),

  // Setup wizard
  setupWizardGetState: SetupWizardApi.setupWizardGetState.bind(SetupWizardApi),
  setupWizardSaveState: SetupWizardApi.setupWizardSaveState.bind(SetupWizardApi),
  setupWizardReset: SetupWizardApi.setupWizardReset.bind(SetupWizardApi),
  setupWizardDetectEnvironment: SetupWizardApi.setupWizardDetectEnvironment.bind(SetupWizardApi),
  setupWizardValidateClaudeConfig:
    SetupWizardApi.setupWizardValidateClaudeConfig.bind(SetupWizardApi),
  setupWizardCloneRepository: SetupWizardApi.setupWizardCloneRepository.bind(SetupWizardApi),
  setupWizardCompleteSetup: SetupWizardApi.setupWizardCompleteSetup.bind(SetupWizardApi),
  setupWizardInstallDependencies:
    SetupWizardApi.setupWizardInstallDependencies.bind(SetupWizardApi),
  setupWizardShouldShow: SetupWizardApi.setupWizardShouldShow.bind(SetupWizardApi),
  setupWizardGetProgress: SetupWizardApi.setupWizardGetProgress.bind(SetupWizardApi),
  setupWizardClearCache: SetupWizardApi.setupWizardClearCache.bind(SetupWizardApi),
  setupWizardBatchInstall: SetupWizardApi.setupWizardBatchInstall.bind(SetupWizardApi),
  setupWizardValidateRepository: SetupWizardApi.setupWizardValidateRepository.bind(SetupWizardApi),
  setupWizardImportProject: SetupWizardApi.setupWizardImportProject.bind(SetupWizardApi),
  getPresetRepositoryConfig: SetupWizardApi.getPresetRepositoryConfig.bind(SetupWizardApi),
  searchPresetRepositories: SetupWizardApi.searchPresetRepositories.bind(SetupWizardApi),
  getGlobalAuthStatus: SetupWizardApi.getGlobalAuthStatus.bind(SetupWizardApi),

  // Aone credentials management
  getAoneCredentials: AoneApi.getAoneCredentials.bind(AoneApi),
  saveAoneCredentials: AoneApi.saveAoneCredentials.bind(AoneApi),
  deleteAoneCredentials: AoneApi.deleteAoneCredentials.bind(AoneApi),
  hasAoneCredentials: AoneApi.hasAoneCredentials.bind(AoneApi),
  getAoneCredentialsInfo: AoneApi.getAoneCredentialsInfo.bind(AoneApi),

  // File system utilities (from compatibility)
  listDirectoryContents: async (directoryPath: string) => {
    const { listDirectoryContents } = await import('./api/utils/compatibility')
    return listDirectoryContents(directoryPath)
  },
  searchFiles: async (basePath: string, query: string) => {
    const { searchFiles } = await import('./api/utils/compatibility')
    return searchFiles(basePath, query)
  },

  // New session placeholder
  openNewSession: async (path?: string) => {
    const { openNewSession } = await import('./api/utils/compatibility')
    return openNewSession(path)
  }
}
