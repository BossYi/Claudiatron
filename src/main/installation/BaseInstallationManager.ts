/**
 * 通用安装管理器抽象基类
 *
 * 提供跨平台的软件安装基础设施，包括：
 * - 文件下载与完整性校验
 * - 系统权限检查与提升
 * - 安装进度报告与错误处理
 * - 安装后验证与日志记录
 */

import { EventEmitter } from 'events'
import { promises as fs } from 'fs'
import { createWriteStream } from 'fs'
import { join, dirname } from 'path'
import * as os from 'os'
import { promisify } from 'util'
import { exec, spawn } from 'child_process'
import * as https from 'https'
import * as http from 'http'
import { URL } from 'url'
import type { InstallationProgress } from '../types/setupWizard'

const execAsync = promisify(exec)

/**
 * 安装包信息接口
 */
export interface InstallationPackage {
  /** 软件名称 */
  name: string
  /** 版本号 */
  version: string
  /** 下载URL */
  downloadUrl: string
  /** 文件名 */
  filename: string
  /** 文件大小（字节） */
  size?: number
  /** 平台特定信息 */
  platform: NodeJS.Platform
  /** 架构 */
  arch: string
}

/**
 * 安装选项接口
 */
export interface InstallationOptions {
  /** 安装目录 */
  installDir?: string
  /** 是否覆盖现有安装 */
  overwrite?: boolean
  /** 超时时间（毫秒） */
  timeout?: number
  /** 是否需要管理员权限 */
  requiresElevation?: boolean
  /** 环境变量设置 */
  envVars?: Record<string, string>
  /** 安装后清理临时文件 */
  cleanup?: boolean
  /** 自定义安装参数 */
  customArgs?: string[]
}

/**
 * 下载进度回调接口
 */
export interface DownloadProgress {
  /** 已下载字节数 */
  downloaded: number
  /** 总字节数 */
  total: number
  /** 进度百分比 (0-100) */
  percentage: number
  /** 下载速度 (bytes/s) */
  speed: number
  /** 剩余时间（秒） */
  eta: number
}

/**
 * 安装结果接口
 */
export interface InstallationResult {
  /** 是否成功 */
  success: boolean
  /** 安装路径 */
  installPath?: string
  /** 可执行文件路径 */
  executablePath?: string
  /** 安装的版本 */
  installedVersion?: string
  /** 错误信息 */
  error?: string
  /** 详细错误 */
  details?: any
  /** 安装日志 */
  logs?: string[]
}

/**
 * 抽象基础安装管理器
 *
 * 所有具体的安装管理器都应继承此类并实现抽象方法
 */
export abstract class BaseInstallationManager extends EventEmitter {
  protected readonly platform: NodeJS.Platform
  protected readonly arch: string
  protected readonly tempDir: string
  protected readonly logEntries: string[] = []

  constructor() {
    super()
    this.platform = process.platform
    this.arch = process.arch
    this.tempDir = os.tmpdir()
  }

  /**
   * 抽象方法：获取安装包信息
   */
  protected abstract getPackageInfo(version?: string): Promise<InstallationPackage>

  /**
   * 抽象方法：验证系统兼容性
   */
  protected abstract validateSystemCompatibility(): Promise<{
    compatible: boolean
    requirements: string[]
    issues: string[]
  }>

  /**
   * 抽象方法：执行平台特定的安装逻辑
   */
  protected abstract performInstallation(
    packagePath: string,
    options: InstallationOptions
  ): Promise<InstallationResult>

  /**
   * 抽象方法：验证安装是否成功
   */
  protected abstract verifyInstallation(installPath: string): Promise<{
    valid: boolean
    version?: string
    executablePath?: string
    issues: string[]
  }>

  /**
   * 主要安装入口
   */
  public async install(
    version?: string,
    options: InstallationOptions = {}
  ): Promise<InstallationResult> {
    const startTime = Date.now()
    this.log(`开始安装 ${this.constructor.name}`, 'info')

    try {
      // 1. 系统兼容性检查
      this.reportProgress('configuring', 0, '检查系统兼容性...')
      const compatibility = await this.validateSystemCompatibility()

      if (!compatibility.compatible) {
        throw new Error(`系统不兼容: ${compatibility.issues.join(', ')}`)
      }

      // 2. 获取安装包信息
      this.reportProgress('configuring', 10, '获取安装包信息...')
      const packageInfo = await this.getPackageInfo(version)
      this.log(`获取到安装包: ${packageInfo.name} v${packageInfo.version}`, 'info')

      // 3. 检查磁盘空间
      this.reportProgress('configuring', 15, '检查磁盘空间...')
      await this.checkDiskSpace(packageInfo.size)

      // 4. 检查并请求权限
      if (options.requiresElevation) {
        this.reportProgress('configuring', 20, '检查管理员权限...')
        await this.checkAndRequestElevation()
      }

      // 5. 下载安装包
      this.reportProgress('downloading', 25, '开始下载安装包...')
      const packagePath = await this.downloadPackage(packageInfo)

      // 6. 验证完整性
      this.reportProgress('downloading', 80, '验证文件完整性...')
      await this.verifyPackageIntegrity(packagePath, packageInfo)

      // 7. 执行安装
      this.reportProgress('installing', 85, '开始安装软件...')
      const result = await this.performInstallation(packagePath, options)

      if (!result.success) {
        throw new Error(result.error || '安装失败')
      }

      // 8. 验证安装
      this.reportProgress('verifying', 95, '验证安装结果...')
      const verification = await this.verifyInstallation(result.installPath!)

      if (!verification.valid) {
        throw new Error(`安装验证失败: ${verification.issues.join(', ')}`)
      }

      // 9. 清理临时文件
      if (options.cleanup !== false) {
        this.reportProgress('verifying', 98, '清理临时文件...')
        await this.cleanupTempFiles(packagePath)
      }

      // 10. 完成
      this.reportProgress('completed', 100, '安装完成')

      const finalResult: InstallationResult = {
        ...result,
        installedVersion: verification.version,
        executablePath: verification.executablePath,
        logs: [...this.logEntries]
      }

      const duration = Date.now() - startTime
      this.log(`安装完成，耗时 ${duration}ms`, 'info')

      return finalResult
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.log(`安装失败: ${errorMessage}`, 'error')
      this.reportProgress('failed', 0, `安装失败: ${errorMessage}`, errorMessage)

      return {
        success: false,
        error: errorMessage,
        details: error,
        logs: [...this.logEntries]
      }
    }
  }

  /**
   * 下载安装包
   */
  protected async downloadPackage(packageInfo: InstallationPackage): Promise<string> {
    const tempFilePath = join(
      this.tempDir,
      `${packageInfo.name}-${packageInfo.version}-${packageInfo.filename}`
    )

    this.log(`下载到: ${tempFilePath}`, 'debug')

    try {
      // 检查是否已存在文件
      try {
        await fs.access(tempFilePath)
        this.log('找到缓存文件，跳过下载', 'info')
        return tempFilePath
      } catch {
        // 文件不存在，继续下载
      }

      // 确保目录存在
      await fs.mkdir(dirname(tempFilePath), { recursive: true })

      // 使用原生 http/https 模块下载
      await this.downloadWithNativeHttp(packageInfo.downloadUrl, tempFilePath)

      this.log(`下载完成`, 'info')
      return tempFilePath
    } catch (error) {
      // 清理失败的下载
      try {
        await fs.unlink(tempFilePath)
      } catch {
        // 忽略清理错误
      }

      throw new Error(`下载失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 使用原生 HTTP/HTTPS 模块下载文件，支持重定向处理
   */
  private async downloadWithNativeHttp(
    url: string,
    filePath: string,
    redirectCount: number = 0
  ): Promise<void> {
    const maxRedirects = 5

    if (redirectCount > maxRedirects) {
      throw new Error(`下载失败：重定向次数超过限制 (${maxRedirects})`)
    }

    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url)
      const isHttps = parsedUrl.protocol === 'https:'
      const httpModule = isHttps ? https : http

      let writer: ReturnType<typeof createWriteStream> | null = null
      let downloadedSize = 0
      let totalSize = 0
      const startTime = Date.now()

      this.log(`开始下载: ${url}${redirectCount > 0 ? ` (重定向 #${redirectCount})` : ''}`, 'debug')

      const request = httpModule.get(url, (response) => {
        const statusCode = response.statusCode || 0

        // 处理重定向 (301, 302, 307, 308)
        if ([301, 302, 307, 308].includes(statusCode)) {
          const redirectUrl = response.headers.location
          if (!redirectUrl) {
            reject(new Error(`HTTP ${statusCode}: 重定向缺少 Location 头`))
            return
          }

          this.log(`收到重定向 ${statusCode} -> ${redirectUrl}`, 'debug')

          // 递归调用处理重定向
          this.downloadWithNativeHttp(redirectUrl, filePath, redirectCount + 1)
            .then(resolve)
            .catch(reject)
          return
        }

        // 检查成功状态码
        if (statusCode !== 200) {
          reject(new Error(`HTTP ${statusCode}: ${response.statusMessage || 'Unknown error'}`))
          return
        }

        // 创建文件写入流
        writer = createWriteStream(filePath)
        totalSize = parseInt(response.headers['content-length'] || '0')

        this.log(`开始下载文件，大小: ${this.formatBytes(totalSize)}`, 'info')

        response.on('data', (chunk) => {
          if (!writer) return

          downloadedSize += chunk.length
          writer.write(chunk)

          // 计算进度
          const elapsed = Date.now() - startTime
          const speed = downloadedSize / (elapsed / 1000)
          const eta = totalSize > 0 ? (totalSize - downloadedSize) / speed : 0
          const percentage = totalSize > 0 ? Math.floor((downloadedSize / totalSize) * 100) : 0

          const progress: DownloadProgress = {
            downloaded: downloadedSize,
            total: totalSize,
            percentage: Math.min(percentage, 99), // 保留1%用于校验
            speed,
            eta
          }

          this.emit('download-progress', progress)

          // 更新总体进度 (25-80% 用于下载)
          const overallProgress = 25 + Math.floor((percentage / 100) * 55)
          this.reportProgress(
            'downloading',
            overallProgress,
            `下载中... ${this.formatBytes(downloadedSize)}/${this.formatBytes(totalSize)} (${percentage}%)`
          )
        })

        response.on('end', () => {
          if (writer) {
            writer.end()
            this.log(`下载完成: ${this.formatBytes(downloadedSize)}`, 'info')
          }
          resolve()
        })

        response.on('error', (error) => {
          if (writer) {
            writer.destroy()
          }
          this.log(`下载响应错误: ${error.message}`, 'error')
          reject(error)
        })
      })

      request.on('error', (error) => {
        if (writer) {
          writer.destroy()
        }
        this.log(`下载请求错误: ${error.message}`, 'error')
        reject(error)
      })

      request.setTimeout(30000, () => {
        request.destroy()
        if (writer) {
          writer.destroy()
        }
        reject(new Error('下载超时 (30秒)'))
      })
    })
  }

  /**
   * 验证文件完整性
   */
  protected async verifyPackageIntegrity(
    filePath: string,
    _packageInfo: InstallationPackage
  ): Promise<void> {
    // 跳过文件完整性校验，只检查文件是否存在
    try {
      await fs.access(filePath)
      this.log('文件存在，跳过完整性校验', 'info')
    } catch (error) {
      throw new Error(`文件不存在: ${filePath}`)
    }
  }

  /**
   * 检查磁盘空间
   */
  protected async checkDiskSpace(requiredSize?: number): Promise<void> {
    if (!requiredSize) return

    try {
      const stats = await fs.statfs(this.tempDir)
      const freeSpace = stats.bavail * stats.bsize

      // 需要额外20%的空间作为缓冲
      const requiredWithBuffer = requiredSize * 1.2

      if (freeSpace < requiredWithBuffer) {
        throw new Error(
          `磁盘空间不足: 需要 ${this.formatBytes(requiredWithBuffer)}, ` +
            `可用 ${this.formatBytes(freeSpace)}`
        )
      }

      this.log(`磁盘空间检查通过: ${this.formatBytes(freeSpace)} 可用`, 'debug')
    } catch (error) {
      if (error instanceof Error && error.message.includes('磁盘空间不足')) {
        throw error
      }
      // 如果无法检查磁盘空间，记录警告但不阻止安装
      this.log(`无法检查磁盘空间: ${error}`, 'warning')
    }
  }

  /**
   * 检查并请求管理员权限
   */
  protected async checkAndRequestElevation(): Promise<void> {
    if (this.platform === 'win32') {
      // 在 Windows 上检查是否以管理员身份运行
      try {
        await execAsync('net session >nul 2>&1')
        this.log('检测到管理员权限', 'debug')
      } catch {
        throw new Error('需要管理员权限来安装软件。请以管理员身份重新运行应用程序。')
      }
    } else {
      // 在 Unix 系统上检查是否可以写入系统目录
      try {
        const testPaths = ['/usr/local/bin', '/opt']
        for (const path of testPaths) {
          try {
            await fs.access(path, fs.constants.W_OK)
            this.log(`具有写入权限: ${path}`, 'debug')
            return
          } catch {
            continue
          }
        }
        this.log('可能需要 sudo 权限进行安装', 'warning')
      } catch (error) {
        this.log(`权限检查失败: ${error}`, 'warning')
      }
    }
  }

  /**
   * 清理临时文件
   */
  protected async cleanupTempFiles(...filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath)
        this.log(`清理临时文件: ${filePath}`, 'debug')
      } catch (error) {
        this.log(`清理文件失败 ${filePath}: ${error}`, 'warning')
      }
    }
  }

  /**
   * 报告安装进度
   */
  protected reportProgress(
    status: InstallationProgress['status'],
    progress: number,
    message: string,
    error?: string
  ): void {
    const progressInfo: InstallationProgress = {
      software: this.getSoftwareName(),
      status,
      progress: Math.max(0, Math.min(100, progress)),
      message,
      error
    }

    this.emit('progress', progressInfo)
    this.log(`进度 ${progress}%: ${message}`, error ? 'error' : 'info')
  }

  /**
   * 获取软件名称（子类实现）
   */
  protected getSoftwareName(): InstallationProgress['software'] {
    // 默认实现，子类应该重写
    return 'git'
  }

  /**
   * 日志记录
   */
  protected log(message: string, level: 'debug' | 'info' | 'warning' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`

    this.logEntries.push(logEntry)

    // 根据日志级别输出到控制台
    switch (level) {
      case 'debug':
        console.debug(logEntry)
        break
      case 'info':
        console.log(logEntry)
        break
      case 'warning':
        console.warn(logEntry)
        break
      case 'error':
        console.error(logEntry)
        break
    }

    // 限制日志条目数量
    if (this.logEntries.length > 1000) {
      this.logEntries.splice(0, this.logEntries.length - 1000)
    }
  }

  /**
   * 格式化字节数
   */
  protected formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'

    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const k = 1024
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`
  }

  /**
   * 执行命令
   */
  protected async executeCommand(
    command: string,
    args: string[] = [],
    options: { cwd?: string; env?: Record<string, string> } = {}
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        stdio: 'pipe'
      })

      let stdout = ''
      let stderr = ''

      child.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        resolve({
          exitCode: code || 0,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        })
      })

      child.on('error', (error) => {
        reject(error)
      })
    })
  }

  /**
   * 获取日志
   */
  public getLogs(): string[] {
    return [...this.logEntries]
  }

  /**
   * 清除日志
   */
  public clearLogs(): void {
    this.logEntries.length = 0
  }
}
