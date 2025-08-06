/**
 * TypeScript types for Setup Wizard functionality
 */

// 步骤状态枚举
export enum StepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ERROR = 'error'
}

// 向导步骤枚举
export enum WizardStep {
  WELCOME = 1,
  ENVIRONMENT_DETECTION = 2,
  CLAUDE_CONFIGURATION = 3,
  REPOSITORY_IMPORT = 4,
  COMPLETION = 5
}

// API配置类型
export interface ApiConfiguration {
  apiUrl: string
  apiKey: string
  isCustomUrl?: boolean
  lastValidated?: string
  validatedConfigHash?: string
}

// 仓库配置类型
export interface RepositoryConfiguration {
  url: string
  localPath: string
  projectName: string
  cloneDepth?: number
  branch?: string
  isPrivate?: boolean
}

// 环境检测状态
export interface EnvironmentStatus {
  git: boolean
  nodejs: boolean
  claudeCli: boolean
  systemInfo: {
    platform: NodeJS.Platform
    arch: string
    version: string
    homeDir: string
  }
}

// 各个软件的详细状态
export interface SoftwareStatus {
  installed: boolean
  version?: string
  path?: string
  error?: string
  needsUpdate?: boolean
}

// 详细的环境检测结果
export interface DetailedEnvironmentStatus {
  git: SoftwareStatus
  nodejs: SoftwareStatus
  npm: SoftwareStatus
  claudeCli: SoftwareStatus
  systemInfo: {
    platform: NodeJS.Platform
    arch: string
    version: string
    homeDir: string
    tempDir: string
  }
}

// 安装进度信息
export interface InstallationProgress {
  software: 'git' | 'nodejs' | 'claude-code'
  status: 'downloading' | 'installing' | 'configuring' | 'verifying' | 'completed' | 'failed'
  progress: number // 0-100
  message: string
  error?: string
}

// 向导状态主接口
export interface SetupWizardState {
  currentStep: WizardStep
  stepStatus: Record<WizardStep, StepStatus>
  userData: {
    apiConfiguration?: ApiConfiguration
    repository?: RepositoryConfiguration
    environmentStatus?: EnvironmentStatus
  }
  errors: Record<WizardStep, string[]>
  canProceed: boolean
  isFirstRun: boolean
  completedAt?: string
  startedAt?: string
}

// 向导持久化数据
export interface SetupWizardPersistData {
  state: SetupWizardState
  version: string
  lastUpdated: string
}

// API请求/响应类型
export interface SetupWizardApiRequest {
  action: string
  data?: any
}

export interface SetupWizardApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// 环境检测请求
export interface EnvironmentDetectionRequest {
  checkGit: boolean
  checkNodejs: boolean
  checkClaudeCli: boolean
}

// 环境检测响应
export interface EnvironmentDetectionResponse {
  status: DetailedEnvironmentStatus
  recommendations: string[]
  fromCache?: boolean
}

// Claude配置验证请求
export interface ClaudeConfigValidationRequest {
  apiUrl: string
  apiKey: string
}

// Claude配置验证响应
export interface ClaudeConfigValidationResponse {
  valid: boolean
  error?: string
  apiInfo?: {
    version: string
    capabilities: string[]
  }
}

// 仓库类型枚举
export enum RepositoryType {
  AONE = 'aone',
  GITHUB = 'github',
  GITLAB = 'gitlab',
  BITBUCKET = 'bitbucket',
  OTHER = 'other'
}

// Aone 认证信息
export interface AoneAuthInfo {
  domainAccount: string
  privateToken: string
}

// 仓库克隆请求
export interface RepositoryCloneRequest {
  url: string
  localPath: string
  repositoryType?: RepositoryType
  aoneAuth?: AoneAuthInfo
  options?: {
    depth?: number
    branch?: string
    recursive?: boolean
  }
}

// 仓库克隆进度
export interface RepositoryCloneProgress {
  status: 'validating' | 'cloning' | 'completed' | 'failed'
  progress: number
  message: string
  error?: string
}

// 自动安装请求
export interface AutoInstallRequest {
  software: 'git' | 'nodejs' | 'claude-code'
  version?: string
}

// 向导事件类型
export interface SetupWizardEvent {
  type: 'step_changed' | 'status_changed' | 'error' | 'progress' | 'completed'
  data: any
  timestamp: string
}

// 向导配置
export interface SetupWizardConfig {
  skipWelcome?: boolean
  autoInstall?: boolean
  defaultApiUrl?: string
  projectsDirectory?: string
  theme?: 'light' | 'dark' | 'system'
}

// 错误类型
export interface SetupWizardError {
  code: string
  message: string
  step: WizardStep
  details?: any
  recoverable: boolean
}

// 常用错误代码
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  INSTALLATION_FAILED: 'INSTALLATION_FAILED',
  CLONE_FAILED: 'CLONE_FAILED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const

// 导入模式枚举
export enum ImportMode {
  PRESET = 'preset',
  CUSTOM = 'custom'
}

// 全局认证状态
export interface GlobalAuthStatus {
  isAuthenticated: boolean
  authType: 'aone' | 'github' | 'gitlab' | null
  credentials: AoneAuthInfo | null
  lastChecked: Date | null
  accountInfo?: {
    domainAccount: string
  }
}

// 预置仓库项目
export interface PresetRepository {
  repoId: string
  name: string
  description: string
  url: string
  type: RepositoryType
  defaultBranch: string
  isPrivate: boolean
  tags?: string[]
  lastUpdated?: string
  accessLevel?: 'public' | 'internal' | 'private'
}

// 业务团队
export interface BusinessTeam {
  teamId: string
  teamName: string
  teamDesc: string
  teamIcon?: string
  repositories: PresetRepository[]
  tags?: string[]
  displayOrder?: number
}

// 预置仓库根配置
export interface PresetRepositoryConfig {
  version: string
  lastUpdated: string
  businessTeams: BusinessTeam[]
  popularTags: string[]
  settings?: {
    enableSearch: boolean
    enableTagFilter: boolean
    defaultImportMode: ImportMode
  }
}

// 预置仓库搜索结果
export interface PresetSearchResult {
  repositories: PresetRepository[]
  teams: BusinessTeam[]
  totalCount: number
  searchQuery: string
  appliedTags: string[]
}

// 认证状态检查响应
export interface AuthStatusResponse {
  hasCredentials: boolean
  authType: 'aone' | 'github' | 'gitlab' | null
  accountInfo?: {
    domainAccount: string
  }
  lastSaved?: string
}

// 导出类型守卫
export function isSetupWizardState(obj: any): obj is SetupWizardState {
  return (
    obj &&
    typeof obj.currentStep === 'number' &&
    typeof obj.stepStatus === 'object' &&
    typeof obj.canProceed === 'boolean' &&
    typeof obj.isFirstRun === 'boolean'
  )
}

export function isApiConfiguration(obj: any): obj is ApiConfiguration {
  return obj && typeof obj.apiUrl === 'string' && typeof obj.apiKey === 'string'
}

export function isRepositoryConfiguration(obj: any): obj is RepositoryConfiguration {
  return (
    obj &&
    typeof obj.url === 'string' &&
    typeof obj.localPath === 'string' &&
    typeof obj.projectName === 'string'
  )
}

export function isPresetRepositoryConfig(obj: any): obj is PresetRepositoryConfig {
  return (
    obj &&
    typeof obj.version === 'string' &&
    typeof obj.lastUpdated === 'string' &&
    Array.isArray(obj.businessTeams) &&
    Array.isArray(obj.popularTags)
  )
}

export function isBusinessTeam(obj: any): obj is BusinessTeam {
  return (
    obj &&
    typeof obj.teamId === 'string' &&
    typeof obj.teamName === 'string' &&
    typeof obj.teamDesc === 'string' &&
    Array.isArray(obj.repositories)
  )
}

export function isPresetRepository(obj: any): obj is PresetRepository {
  return (
    obj &&
    typeof obj.repoId === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.url === 'string' &&
    typeof obj.defaultBranch === 'string' &&
    typeof obj.isPrivate === 'boolean'
  )
}

export function isGlobalAuthStatus(obj: any): obj is GlobalAuthStatus {
  return (
    obj &&
    typeof obj.isAuthenticated === 'boolean' &&
    (obj.authType === null || typeof obj.authType === 'string')
  )
}
