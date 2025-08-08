/**
 * 平台 Claude 检测器抽象基类
 */

// 移除fs、join、homedir导入，不再需要文件缓存操作
import type {
  ClaudeDetectionResult,
  ProcessResult,
  ExecutionOptions,
  ClaudeExecutor
} from '../types'

export abstract class PlatformClaudeDetector implements ClaudeExecutor {
  protected claudePath?: string
  protected version?: string

  constructor() {
    // 移除缓存文件相关初始化
  }

  /**
   * 执行 Claude 检测
   */
  abstract detect(): Promise<ClaudeDetectionResult>

  /**
   * 验证 Claude 可执行文件
   */
  abstract verify(path: string): Promise<boolean>

  /**
   * 执行 Claude 命令
   */
  abstract execute(
    args: string[],
    workingDir: string,
    options?: ExecutionOptions
  ): Promise<ProcessResult>

  /**
   * 启动交互式 Claude 会话
   */
  abstract startInteractiveSession(
    workingDir: string,
    args?: string[]
  ): Promise<import('child_process').ChildProcess>

  /**
   * 检查 Claude 是否可用
   */
  isAvailable(): boolean {
    return !!this.claudePath
  }

  /**
   * 获取 Claude 版本
   */
  async getVersion(): Promise<string> {
    if (this.version) {
      return this.version
    }

    if (!this.claudePath) {
      throw new Error('Claude not detected')
    }

    try {
      const result = await this.execute(['--version'], process.cwd())
      this.version = this.parseVersion(result.stdout)
      return this.version
    } catch (error) {
      throw new Error(
        `Failed to get Claude version: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  // 移除所有缓存相关方法，改为实时检测

  /**
   * 解析版本号
   */
  protected parseVersion(output: string): string {
    const versionMatch = output.match(/(\d+\.\d+\.\d+)/)
    return versionMatch ? versionMatch[1] : 'unknown'
  }

  /**
   * 创建检测失败结果
   */
  protected createNotFoundResult(): ClaudeDetectionResult {
    return {
      success: false,
      platform: process.platform as 'darwin' | 'linux' | 'win32',
      executionMethod: 'native',
      error: {
        type: 'NOT_FOUND',
        message: 'Claude Code not found',
        platform: process.platform
      },
      suggestions: this.generateInstallationSuggestions()
    }
  }

  /**
   * 生成安装建议
   */
  protected generateInstallationSuggestions(): string[] {
    switch (process.platform) {
      case 'darwin':
        return [
          '安装 Claude Code: npm install -g @anthropic-ai/claude-code',
          '或使用 Homebrew: brew install claude-code',
          '确保 npm 全局 bin 目录在 PATH 中',
          '重启终端并重试'
        ]

      case 'linux':
        return [
          '安装 Claude Code: npm install -g @anthropic-ai/claude-code',
          '或使用包管理器安装 Node.js 和 npm',
          '检查 PATH 环境变量配置',
          '重新加载 shell 配置: source ~/.bashrc'
        ]

      case 'win32':
        return [
          'Install Git for Windows from https://git-scm.com/download/win',
          'Install Node.js from https://nodejs.org/',
          'Install Claude Code: npm install -g @anthropic-ai/claude-code',
          'Restart the application after installation',
          'Verify installation: open Git Bash and run "claude --version"'
        ]

      default:
        return ['不支持的平台']
    }
  }

  /**
   * 获取帮助链接
   */
  protected getHelpLinks(): string[] {
    const common = ['https://docs.anthropic.com/claude/reference/claude-cli']

    switch (process.platform) {
      case 'win32':
        return [...common, 'https://git-scm.com/download/win', 'https://nodejs.org/']
      default:
        return common
    }
  }
}
