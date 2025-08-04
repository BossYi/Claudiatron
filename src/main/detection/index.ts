/**
 * 检测服务模块导出
 *
 * 提供Claude Code和Git的检测能力
 */

// Claude检测相关
export { ClaudeDetectionManager, claudeDetectionManager } from './ClaudeDetectionManager'
export { claudeBinaryManager } from './ClaudeBinaryManagerAdapter'

// Git检测相关
export { GitDetectionService, gitDetectionService } from './GitDetectionService'

// 基础类和工具
export { PlatformClaudeDetector } from './base/PlatformClaudeDetector'
export { UnixClaudeDetector } from './detectors/UnixClaudeDetector'
export { WindowsClaudeDetector } from './detectors/WindowsClaudeDetector'

// 类型定义
export type * from './types'

// Git相关类型
export type {
  GitInstallationInfo,
  GitCompatibilityAnalysis,
  GitInstallationRequirements,
  GitEnvironmentCheck,
  ComprehensiveGitStatus
} from './GitDetectionService'
