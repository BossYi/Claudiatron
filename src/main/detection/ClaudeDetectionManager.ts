/**
 * Claude 检测管理器 - 统一的跨平台检测接口
 */

import { PlatformClaudeDetector } from './base/PlatformClaudeDetector'
import { UnixClaudeDetector } from './detectors/UnixClaudeDetector'
import { WindowsClaudeDetector } from './detectors/WindowsClaudeDetector'
import type {
  ClaudeDetectionResult,
  ProcessResult,
  ExecutionOptions,
  ClaudeExecutor
} from './types'
import { ChildProcess } from 'child_process'

export class ClaudeDetectionManager implements ClaudeExecutor {
  private detector: PlatformClaudeDetector
  private lastDetectionResult?: ClaudeDetectionResult

  constructor() {
    this.detector = this.createPlatformDetector()
  }

  /**
   * 创建平台特定的检测器
   */
  private createPlatformDetector(): PlatformClaudeDetector {
    switch (process.platform) {
      case 'darwin':
      case 'linux':
        console.log(`Creating Unix Claude detector for ${process.platform}`)
        return new UnixClaudeDetector()

      case 'win32':
        console.log('Creating Windows Claude detector')
        return new WindowsClaudeDetector()

      default:
        throw new Error(`Unsupported platform: ${process.platform}`)
    }
  }

  /**
   * 检测 Claude Code
   */
  async detectClaude(): Promise<ClaudeDetectionResult> {
    try {
      console.log('Starting Claude detection...')
      const result = await this.detector.detect()
      this.lastDetectionResult = result

      if (result.success) {
        console.log(`Claude detected successfully: ${result.claudePath} (${result.version})`)
      } else {
        console.log('Claude detection failed:', result.error?.message)
      }

      return result
    } catch (error) {
      console.error('Claude detection error:', error)

      const result: ClaudeDetectionResult = {
        success: false,
        platform: process.platform as 'darwin' | 'linux' | 'win32',
        executionMethod: 'native',
        error: {
          type: 'EXECUTION_FAILED',
          message:
            (error instanceof Error ? error.message : String(error)) || 'Unknown detection error',
          platform: process.platform,
          details: error
        },
        suggestions: this.getGenericSuggestions()
      }

      this.lastDetectionResult = result
      return result
    }
  }

  /**
   * 重新检测 Claude
   */
  async redetectClaude(): Promise<ClaudeDetectionResult> {
    console.log('Performing fresh Claude detection...')
    return this.detectClaude()
  }

  /**
   * 获取最后的检测结果
   */
  getLastDetectionResult(): ClaudeDetectionResult | undefined {
    return this.lastDetectionResult
  }

  /**
   * 检查 Claude 是否可用
   */
  isAvailable(): boolean {
    return this.detector.isAvailable()
  }

  /**
   * 获取 Claude 版本
   */
  async getVersion(): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Claude not available. Please run detection first.')
    }

    return this.detector.getVersion()
  }

  /**
   * 执行 Claude 命令
   */
  async execute(
    args: string[],
    workingDir: string,
    options?: ExecutionOptions
  ): Promise<ProcessResult> {
    if (!this.isAvailable()) {
      throw new Error('Claude not available. Please run detection first.')
    }

    return this.detector.execute(args, workingDir, options)
  }

  /**
   * 启动交互式 Claude 会话
   */
  async startInteractiveSession(workingDir: string, args?: string[]): Promise<ChildProcess> {
    if (!this.isAvailable()) {
      throw new Error('Claude not available. Please run detection first.')
    }

    return this.detector.startInteractiveSession(workingDir, args)
  }

  /**
   * 验证 Claude 路径
   */
  async verifyClaude(path: string): Promise<boolean> {
    return this.detector.verify(path)
  }

  /**
   * 获取平台信息
   */
  getPlatformInfo(): {
    platform: string
    executionMethod: 'native'
    detectorType: string
  } {
    const platform = process.platform
    const executionMethod = 'native'
    const detectorType = platform === 'win32' ? 'WindowsClaudeDetector' : 'UnixClaudeDetector'

    return {
      platform,
      executionMethod,
      detectorType
    }
  }

  /**
   * 获取检测统计信息
   */
  async getDetectionStats(): Promise<{
    isDetected: boolean
    claudePath?: string
    version?: string
    platform: string
    executionMethod: string
    lastDetectionTime?: number
  }> {
    const result = this.lastDetectionResult || (await this.detectClaude())
    const platformInfo = this.getPlatformInfo()

    return {
      isDetected: result.success,
      claudePath: result.claudePath,
      version: result.version,
      platform: platformInfo.platform,
      executionMethod: platformInfo.executionMethod,
      lastDetectionTime: Date.now()
    }
  }

  /**
   * 获取通用建议
   */
  private getGenericSuggestions(): string[] {
    return [
      '检查 Claude Code 是否已正确安装',
      '验证安装路径是否在系统 PATH 中',
      '重启应用程序并重试',
      '查看应用程序日志获取详细错误信息'
    ]
  }

  /**
   * 销毁资源
   */
  destroy(): void {
    // 清理资源（如果需要）
    this.lastDetectionResult = undefined
  }
}

// 导出单例实例
export const claudeDetectionManager = new ClaudeDetectionManager()
