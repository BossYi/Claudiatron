/**
 * Unix 平台 Claude 检测器（macOS 和 Linux）
 */

import { ChildProcess } from 'child_process'
import { PlatformClaudeDetector } from '../base/PlatformClaudeDetector'
import {
  executeCommand,
  getCommandPath,
  verifyExecutable,
  getProgramVersion,
  spawnProcess,
  resolveSymlink,
  extractFnmInfo
} from '../utils/execUtils'
import type { ClaudeDetectionResult, ProcessResult, ExecutionOptions } from '../types'

export class UnixClaudeDetector extends PlatformClaudeDetector {
  private lastDetectionResult?: ClaudeDetectionResult
  /**
   * 执行 Claude 检测
   */
  async detect(): Promise<ClaudeDetectionResult> {
    console.log('Starting Unix Claude detection...')

    // 跳过缓存检查，每次都重新检测以确保获取最新的安装信息

    // 1. Shell 环境检测（最可靠的方式）
    const shellResult = await this.detectViaShell()
    if (shellResult.success) {
      this.claudePath = shellResult.claudePath
      this.version = shellResult.version
      this.lastDetectionResult = shellResult
      return shellResult
    }

    // 2. 直接执行尝试
    const directResult = await this.tryDirectExecution()
    if (directResult.success) {
      this.claudePath = directResult.claudePath
      this.version = directResult.version
      this.lastDetectionResult = directResult
      return directResult
    }

    // 3. 检查用户配置
    const userResult = await this.checkUserConfig()
    if (userResult.success) {
      this.claudePath = userResult.claudePath
      this.version = userResult.version
      this.lastDetectionResult = userResult
      return userResult
    }

    // 5. 未找到 Claude
    console.log('Claude not found on Unix system')
    const notFoundResult = this.createNotFoundResult()
    this.lastDetectionResult = notFoundResult
    return notFoundResult
  }

  /**
   * 通过 Shell 环境检测 Claude
   */
  private async detectViaShell(): Promise<ClaudeDetectionResult> {
    console.log('Detecting Claude via shell commands...')

    // 首先尝试通过 Node.js 包管理器检测
    const packageManagerResult = await this.detectViaPackageManagers()
    if (packageManagerResult.success) {
      return packageManagerResult
    }

    const commands = ['claude']

    for (const cmd of commands) {
      try {
        const claudePath = await getCommandPath(cmd)
        if (claudePath && (await this.verify(claudePath))) {
          // 解析符号链接到实际路径
          const resolvedPath = await resolveSymlink(claudePath)
          const version = await getProgramVersion(claudePath)
          console.log(
            `Found Claude via shell: ${claudePath}, resolved to: ${resolvedPath}, version: ${version}`
          )

          // 提取 fnm 信息
          const fnmInfo = extractFnmInfo(resolvedPath)

          const result: ClaudeDetectionResult = {
            success: true,
            platform: process.platform as 'darwin' | 'linux',
            executionMethod: 'native',
            claudePath,
            version: version || 'unknown',
            detectionMethod: 'shell'
          }

          // 添加额外信息
          if (resolvedPath !== claudePath) {
            result.resolvedPath = resolvedPath
          }

          if (fnmInfo.isFromFnm) {
            result.metadata = {
              isFromFnm: true,
              nodeVersion: fnmInfo.nodeVersion,
              packageManager: 'fnm'
            }
          }

          return result
        }
      } catch (error) {
        console.warn(
          `Shell detection failed for ${cmd}:`,
          error instanceof Error ? error.message : String(error)
        )
        continue
      }
    }

    return {
      success: false,
      platform: process.platform as 'darwin' | 'linux',
      executionMethod: 'native'
    }
  }

  /**
   * 检测可用的 Node.js 包管理器
   */
  private async detectNodePackageManagers(): Promise<Array<{ name: string; command: string }>> {
    const managers = [
      { name: 'vfox', command: 'vfox' },
      { name: 'fnm', command: 'fnm' },
      { name: 'nvm', command: 'nvm' },
      { name: 'n', command: 'n' },
      { name: 'volta', command: 'volta' },
      { name: 'nodenv', command: 'nodenv' }
    ]

    const availableManagers: Array<{ name: string; command: string }> = []
    const shell = process.env.SHELL || '/bin/bash'

    for (const manager of managers) {
      try {
        const checkCmd = `${shell} -l -c "command -v ${manager.command}"`
        const result = await executeCommand(checkCmd, { timeout: 3000 })

        if (result.exitCode === 0 && result.stdout.trim()) {
          availableManagers.push(manager)
          console.log(`Found package manager: ${manager.name}`)
        }
      } catch (error) {
        // 忽略错误，继续检测下一个
      }
    }

    return availableManagers
  }

  /**
   * 通过 Node.js 包管理器检测 Claude
   */
  private async detectViaPackageManagers(): Promise<ClaudeDetectionResult> {
    console.log('Detecting Claude via Node.js package managers...')

    const availableManagers = await this.detectNodePackageManagers()

    if (availableManagers.length === 0) {
      console.log('No Node.js package managers found')
      return {
        success: false,
        platform: process.platform as 'darwin' | 'linux',
        executionMethod: 'native'
      }
    }

    const shell = process.env.SHELL || '/bin/bash'

    // 按优先级检测
    for (const manager of availableManagers) {
      try {
        let claudeCmd: string

        switch (manager.name) {
          case 'vfox':
            claudeCmd = `${shell} -l -c "~/.version-fox/shims/claude --version 2>/dev/null && echo ~/.version-fox/shims/claude || true"`
            break
          case 'fnm':
            claudeCmd = `${shell} -l -c "fnm exec --using=default -- which claude 2>/dev/null || true"`
            break
          case 'nvm':
            claudeCmd = `${shell} -l -c "source ~/.nvm/nvm.sh && nvm exec default which claude 2>/dev/null || true"`
            break
          case 'volta':
            claudeCmd = `${shell} -l -c "volta run which claude 2>/dev/null || true"`
            break
          case 'nodenv':
            claudeCmd = `${shell} -l -c "nodenv exec which claude 2>/dev/null || true"`
            break
          case 'n':
            claudeCmd = `${shell} -l -c "which claude 2>/dev/null || true"`
            break
          default:
            continue
        }

        const result = await executeCommand(claudeCmd, { timeout: 10000 })

        if (result.exitCode === 0 && result.stdout.trim()) {
          const claudePath = result.stdout.trim()
          console.log(`Found Claude via ${manager.name}: ${claudePath}`)

          // 验证并获取版本
          let versionCmd: string
          switch (manager.name) {
            case 'vfox':
              versionCmd = `${shell} -l -c "~/.version-fox/shims/claude --version"`
              break
            case 'fnm':
              versionCmd = `${shell} -l -c "fnm exec --using=default -- claude --version"`
              break
            case 'nvm':
              versionCmd = `${shell} -l -c "source ~/.nvm/nvm.sh && nvm exec default claude --version"`
              break
            case 'volta':
              versionCmd = `${shell} -l -c "volta run claude --version"`
              break
            case 'nodenv':
              versionCmd = `${shell} -l -c "nodenv exec claude --version"`
              break
            default:
              versionCmd = `${shell} -l -c "claude --version"`
          }

          const versionResult = await executeCommand(versionCmd, { timeout: 5000 })
          const version =
            versionResult.exitCode === 0 ? this.parseVersion(versionResult.stdout) : 'unknown'

          // 解析符号链接
          const resolvedPath = await resolveSymlink(claudePath)
          const pathInfo = this.extractPackageManagerInfo(resolvedPath)

          return {
            success: true,
            platform: process.platform as 'darwin' | 'linux',
            executionMethod: 'native',
            claudePath,
            version,
            detectionMethod: manager.name,
            resolvedPath: resolvedPath !== claudePath ? resolvedPath : undefined,
            metadata: {
              packageManager: manager.name,
              ...pathInfo
            }
          }
        }
      } catch (error) {
        console.warn(`${manager.name} detection failed:`, error)
        continue
      }
    }

    return {
      success: false,
      platform: process.platform as 'darwin' | 'linux',
      executionMethod: 'native'
    }
  }

  /**
   * 从路径中提取包管理器信息
   */
  private extractPackageManagerInfo(path: string): Record<string, any> {
    const info: Record<string, any> = {}

    // vfox 信息
    const vfoxMatch = path.match(/\.version-fox[\/\\](?:shims|cache[\/\\]nodejs[\/\\]current)/)
    if (vfoxMatch) {
      info.isFromVfox = true
      // 尝试从当前目录结构推断 Node.js 版本
      const versionMatch = path.match(/\.version-fox[\/\\]cache[\/\\]nodejs[\/\\]v([^\/\\]+)/)
      if (versionMatch) {
        info.nodeVersion = versionMatch[1]
      }
    }

    // fnm 信息
    const fnmMatch = path.match(
      /fnm[\/\\](?:node-versions[\/\\]v([^\/\\]+)|aliases[\/\\]([^\/\\]+))/
    )
    if (fnmMatch) {
      info.isFromFnm = true
      info.nodeVersion = fnmMatch[1] || fnmMatch[2]
    }

    // nvm 信息
    const nvmMatch = path.match(/nvm[\/\\]versions[\/\\]node[\/\\]v([^\/\\]+)/)
    if (nvmMatch) {
      info.isFromNvm = true
      info.nodeVersion = nvmMatch[1]
    }

    // volta 信息
    const voltaMatch = path.match(/volta[\/\\]tools[\/\\]image[\/\\]node[\/\\]([^\/\\]+)/)
    if (voltaMatch) {
      info.isFromVolta = true
      info.nodeVersion = voltaMatch[1]
    }

    // nodenv 信息
    const nodenvMatch = path.match(/nodenv[\/\\]versions[\/\\]([^\/\\]+)/)
    if (nodenvMatch) {
      info.isFromNodev = true
      info.nodeVersion = nodenvMatch[1]
    }

    return info
  }

  /**
   * 尝试直接执行检测
   */
  private async tryDirectExecution(): Promise<ClaudeDetectionResult> {
    console.log('Trying direct Claude execution...')

    const commands = ['claude']

    for (const cmd of commands) {
      try {
        const result = await executeCommand(`${cmd} --version`, { timeout: 3000 })
        if (result.exitCode === 0 && result.stdout.includes('claude')) {
          const version = this.parseVersion(result.stdout)
          console.log(`Claude found via direct execution: ${cmd}, version: ${version}`)

          return {
            success: true,
            platform: process.platform as 'darwin' | 'linux',
            executionMethod: 'native',
            claudePath: cmd,
            version,
            detectionMethod: 'direct'
          }
        }
      } catch (error) {
        console.warn(
          `Direct execution failed for ${cmd}:`,
          error instanceof Error ? error.message : String(error)
        )
        continue
      }
    }

    return {
      success: false,
      platform: process.platform as 'darwin' | 'linux',
      executionMethod: 'native'
    }
  }

  /**
   * 检查用户配置的 Claude 路径
   */
  private async checkUserConfig(): Promise<ClaudeDetectionResult> {
    try {
      const { appSettingsService } = await import('../../database/services')
      const customPath = await appSettingsService.getClaudeBinaryPath()

      if (customPath && (await this.verify(customPath))) {
        const version = await getProgramVersion(customPath)
        console.log(`Found Claude via user config: ${customPath}, version: ${version}`)

        return {
          success: true,
          platform: process.platform as 'darwin' | 'linux',
          executionMethod: 'native',
          claudePath: customPath,
          version: version || 'unknown',
          detectionMethod: 'user',
          metadata: {
            environment: 'native',
            environmentDescription: 'User configured'
          }
        }
      }
    } catch (error) {
      console.warn('Failed to check user config:', error)
    }

    return {
      success: false,
      platform: process.platform as 'darwin' | 'linux',
      executionMethod: 'native'
    }
  }

  /**
   * 验证 Claude 可执行文件
   */
  async verify(path: string): Promise<boolean> {
    try {
      const isExecutable = await verifyExecutable(path, '--version')
      if (!isExecutable) {
        return false
      }

      // 进一步验证是否确实是 Claude
      const version = await getProgramVersion(path)
      return version !== null
    } catch (error) {
      console.warn(
        `Failed to verify Claude at ${path}:`,
        error instanceof Error ? error.message : String(error)
      )
      return false
    }
  }

  /**
   * 执行 Claude 命令
   */
  async execute(
    args: string[],
    workingDir: string,
    options: ExecutionOptions = {}
  ): Promise<ProcessResult> {
    if (!this.claudePath) {
      throw new Error('Claude not detected. Please run detection first.')
    }

    // 如果检测到是通过包管理器安装的，使用对应的包管理器执行
    const packageManager = this.lastDetectionResult?.metadata?.packageManager

    if (packageManager) {
      const shell = process.env.SHELL || '/bin/bash'
      let command: string

      switch (packageManager) {
        case 'vfox':
          command = `${shell} -l -c "cd '${workingDir}' && ~/.version-fox/shims/claude ${args.join(' ')}"`
          break
        case 'fnm':
          command = `${shell} -l -c "cd '${workingDir}' && fnm exec --using=default -- claude ${args.join(' ')}"`
          break
        case 'nvm':
          command = `${shell} -l -c "cd '${workingDir}' && source ~/.nvm/nvm.sh && nvm exec default claude ${args.join(' ')}"`
          break
        case 'volta':
          command = `${shell} -l -c "cd '${workingDir}' && volta run claude ${args.join(' ')}"`
          break
        case 'nodenv':
          command = `${shell} -l -c "cd '${workingDir}' && nodenv exec claude ${args.join(' ')}"`
          break
        default:
          command = `${shell} -l -c "cd '${workingDir}' && claude ${args.join(' ')}"`
      }

      console.log(`Executing Claude via ${packageManager}: ${command}`)

      return executeCommand(command, {
        cwd: workingDir,
        timeout: 300000, // 5 分钟默认超时
        ...options
      })
    }

    const command = `"${this.claudePath}" ${args.join(' ')}`
    console.log(`Executing Claude command: ${command}`)

    return executeCommand(command, {
      cwd: workingDir,
      timeout: 300000, // 5 分钟默认超时
      ...options,
      useLoginShell: true // 确保使用登录 shell
    })
  }

  /**
   * 启动交互式 Claude 会话
   */
  async startInteractiveSession(workingDir: string, args: string[] = []): Promise<ChildProcess> {
    if (!this.claudePath) {
      throw new Error('Claude not detected. Please run detection first.')
    }

    console.log(`Starting interactive Claude session in ${workingDir}`)

    // 如果检测到是通过包管理器安装的，使用对应的包管理器启动
    const packageManager = this.lastDetectionResult?.metadata?.packageManager
    const shell = process.env.SHELL || '/bin/bash'

    if (packageManager) {
      let sessionCommand: string

      switch (packageManager) {
        case 'vfox':
          sessionCommand = `cd '${workingDir}' && ~/.version-fox/shims/claude ${args.join(' ')}`
          break
        case 'fnm':
          sessionCommand = `cd '${workingDir}' && fnm exec --using=default -- claude ${args.join(' ')}`
          break
        case 'nvm':
          sessionCommand = `cd '${workingDir}' && source ~/.nvm/nvm.sh && nvm exec default claude ${args.join(' ')}`
          break
        case 'volta':
          sessionCommand = `cd '${workingDir}' && volta run claude ${args.join(' ')}`
          break
        case 'nodenv':
          sessionCommand = `cd '${workingDir}' && nodenv exec claude ${args.join(' ')}`
          break
        default:
          sessionCommand = `cd '${workingDir}' && claude ${args.join(' ')}`
      }

      return spawnProcess(shell, ['-l', '-c', sessionCommand], {
        cwd: workingDir
      })
    }

    // 使用登录 shell 来启动
    return spawnProcess(shell, ['-l', '-c', `cd '${workingDir}' && claude ${args.join(' ')}`], {
      cwd: workingDir
    })
  }

  /**
   * 生成平台特定的安装建议
   */
  protected generateInstallationSuggestions(): string[] {
    const platform = process.platform

    if (platform === 'darwin') {
      return [
        '使用 npm 安装: npm install -g @anthropic-ai/claude-code',
        '使用 Homebrew 安装: brew install claude-code',
        '确保 npm 全局 bin 目录在 PATH 中',
        '重启终端应用程序',
        '验证安装: claude --version'
      ]
    } else if (platform === 'linux') {
      return [
        '使用 npm 安装: npm install -g @anthropic-ai/claude-code',
        '或使用系统包管理器安装 Node.js',
        '检查 ~/.bashrc 或 ~/.zshrc 中的 PATH 配置',
        '重新加载 shell 配置: source ~/.bashrc',
        '验证安装: claude --version'
      ]
    }

    return super.generateInstallationSuggestions()
  }
}
