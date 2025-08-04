/**
 * Installation managers export
 */

export { BaseInstallationManager } from './BaseInstallationManager'
export { GitInstallationManager } from './GitInstallationManager'
export { NodeJsInstallationManager } from './NodeJsInstallationManager'
export { ClaudeCodeInstallationManager } from './ClaudeCodeInstallationManager'

export type {
  InstallationPackage,
  InstallationOptions,
  InstallationResult,
  DownloadProgress
} from './BaseInstallationManager'

export type {
  ClaudeCodeInstallOptions,
  ClaudeCodeInstallResult,
  ApiConfigurationResult
} from './ClaudeCodeInstallationManager'
