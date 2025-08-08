/**
 * Claude Binary Manager 适配器
 * 将新的检测系统适配到现有的 claudeBinaryManager 接口
 */

import { claudeDetectionManager } from './ClaudeDetectionManager'
import { appSettingsService } from '../database/services'
import type { ClaudeDetectionResult } from './types'

export interface ClaudeInstallation {
  path: string
  version?: string
  source: string
  installation_type: 'Bundled' | 'System' | 'Custom'
  resolvedPath?: string
  nodeVersion?: string
}

export interface ClaudeVersionInfo {
  is_installed: boolean
  version?: string
  output: string
}

/**
 * 兼容原有 ClaudeBinaryManager 接口的适配器
 */
class ClaudeBinaryManagerAdapter {
  /**
   * 查找 Claude 二进制文件路径
   * 兼容原有 findClaudeBinary() 接口
   */
  async findClaudeBinary(): Promise<string> {
    console.log('ClaudeBinaryManagerAdapter: Finding Claude binary...')

    // 每次都执行新的检测，不使用缓存
    const result = await claudeDetectionManager.detectClaude()

    if (result.success && result.claudePath) {
      console.log('Claude detected successfully:', result.claudePath)

      // 不再保存检测结果到数据库，避免产生多个条目

      return result.claudePath
    } else {
      // 检测失败，抛出兼容的错误
      const errorMessage = this.createCompatibleErrorMessage(result)
      throw new Error(errorMessage)
    }
  }

  /**
   * 检查 Claude 版本
   * 兼容原有 checkClaudeVersion() 接口
   */
  async checkClaudeVersion(): Promise<ClaudeVersionInfo> {
    console.log('ClaudeBinaryManagerAdapter: Checking Claude version...')

    try {
      // 确保 Claude 已检测
      await this.findClaudeBinary()

      if (claudeDetectionManager.isAvailable()) {
        const version = await claudeDetectionManager.getVersion()

        return {
          is_installed: true,
          version,
          output: `Claude Code version ${version}`
        }
      } else {
        return {
          is_installed: false,
          output: 'Claude Code not found'
        }
      }
    } catch (error) {
      return {
        is_installed: false,
        output:
          (error instanceof Error ? error.message : String(error)) || 'Claude Code detection failed'
      }
    }
  }

  /**
   * 设置自定义二进制文件路径
   * 兼容原有 setCustomBinaryPath() 接口
   */
  async setCustomBinaryPath(path: string): Promise<void> {
    console.log('ClaudeBinaryManagerAdapter: Setting custom binary path:', path)

    // 验证路径是否有效
    const isValid = await claudeDetectionManager.verifyClaude(path)
    if (!isValid) {
      throw new Error(`Invalid Claude binary path: ${path}`)
    }

    // 保存到数据库设置
    await appSettingsService.setClaudeBinaryPath(path)

    // 强制重新检测
  }

  /**
   * 重置为自动发现
   * 兼容原有 resetToAutoDiscovery() 接口
   */
  async resetToAutoDiscovery(): Promise<void> {
    console.log('ClaudeBinaryManagerAdapter: Resetting to auto discovery...')

    // 清除数据库中的自定义路径
    await appSettingsService.setClaudeBinaryPath('')

    // 重新检测
    await claudeDetectionManager.redetectClaude()
  }

  /**
   * 获取所有安装
   * 兼容原有 getAllInstallations() 和 listClaudeInstallations() 接口
   */
  async getAllInstallations(): Promise<ClaudeInstallation[]> {
    return this.listClaudeInstallations()
  }

  async listClaudeInstallations(): Promise<ClaudeInstallation[]> {
    console.log('ClaudeBinaryManagerAdapter: Listing Claude installations...')

    const installations: ClaudeInstallation[] = []
    const seenResolvedPaths = new Set<string>()

    try {
      // 每次都执行新的检测，不使用缓存
      const result = await claudeDetectionManager.redetectClaude()

      if (result.success && result.claudePath) {
        const resolvedPath = result.resolvedPath || result.claudePath

        // 检查是否已经看到这个解析路径（去重）
        if (!seenResolvedPaths.has(resolvedPath)) {
          seenResolvedPaths.add(resolvedPath)

          const installation: ClaudeInstallation = {
            path: result.claudePath,
            version: result.version,
            source: this.getSourceFromDetectionMethod(result.detectionMethod || 'unknown', result),
            installation_type: this.getInstallationType(result)
          }

          // 添加额外信息
          if (result.resolvedPath) {
            installation.resolvedPath = result.resolvedPath
          }

          if (result.metadata?.nodeVersion) {
            installation.nodeVersion = result.metadata.nodeVersion
          }

          installations.push(installation)
        }
      }

      // 检查是否有用户自定义路径
      const customPath = await appSettingsService.getClaudeBinaryPath()
      if (customPath) {
        // 检查是否已经在列表中（避免重复）
        const alreadyExists = installations.some(
          (inst) => inst.path === customPath || inst.resolvedPath === customPath
        )

        if (!alreadyExists) {
          try {
            const isValid = await claudeDetectionManager.verifyClaude(customPath)
            if (isValid) {
              installations.push({
                path: customPath,
                version: 'unknown',
                source: 'User configured',
                installation_type: 'Custom'
              })
            }
          } catch {
            // 忽略无效的自定义路径
          }
        }
      }
    } catch (error) {
      console.warn('Failed to list Claude installations:', error)
    }

    return installations
  }

  /**
   * 获取检测统计信息（新增方法）
   */
  async getDetectionStats() {
    return claudeDetectionManager.getDetectionStats()
  }

  /**
   * 重新检测 Claude（新增方法）
   */
  async redetectClaude(): Promise<ClaudeDetectionResult> {
    console.log('ClaudeBinaryManagerAdapter: Performing fresh detection...')
    const result = await claudeDetectionManager.redetectClaude()
    return result
  }

  /**
   * 获取最后的检测结果（新增方法）
   */
  getLastDetectionResult(): ClaudeDetectionResult | undefined {
    return claudeDetectionManager.getLastDetectionResult()
  }

  /**
   * 根据检测方法获取来源描述
   */
  private getSourceFromDetectionMethod(method: string, result?: ClaudeDetectionResult): string {
    // 如果有环境信息，优先显示环境描述
    if (result?.metadata?.environmentDescription) {
      return result.metadata.environmentDescription
    }

    // 如果是 fnm 安装，显示更详细的信息
    if (result?.metadata?.isFromFnm) {
      const nodeVersion = result.metadata.nodeVersion
        ? ` (Node v${result.metadata.nodeVersion})`
        : ''
      return `fnm${nodeVersion}`
    }

    // 如果有包管理器信息
    if (result?.metadata?.packageManager) {
      return `${result.metadata.packageManager} package manager`
    }

    switch (method) {
      case 'cache':
        return 'Cached result'
      case 'shell':
        return 'System PATH'
      case 'direct':
        return 'Direct execution'
      case 'git-bash':
        return 'Git Bash environment'
      case 'user':
        return 'User configured'
      default:
        return 'Auto-detected'
    }
  }

  /**
   * 根据检测结果获取安装类型
   */
  private getInstallationType(result: ClaudeDetectionResult): 'Bundled' | 'System' | 'Custom' {
    if (result.claudePath?.includes('sidecar') || result.claudePath === 'claude-code') {
      return 'Bundled'
    }

    if (result.detectionMethod === 'user') {
      return 'Custom'
    }

    return 'System'
  }

  /**
   * 创建兼容的错误消息
   */
  private createCompatibleErrorMessage(result: ClaudeDetectionResult): string {
    const baseMessage = result.error?.message || 'Claude Code not found'

    if (result.platform === 'win32' && result.error?.type === 'NOT_FOUND') {
      return (
        'Claude Code not found. Please ensure Git for Windows is installed and Claude Code is available in Git Bash. ' +
        'Install Git for Windows: https://git-scm.com/download/win, then install Claude Code: npm install -g @anthropic-ai/claude-code'
      )
    }

    const suggestions = result.suggestions?.join(', ') || ''
    return `${baseMessage}. ${suggestions}`
  }
}

// 导出单例实例以保持向后兼容
export const claudeBinaryManager = new ClaudeBinaryManagerAdapter()
