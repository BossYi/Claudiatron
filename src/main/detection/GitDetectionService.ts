/**
 * Git 检测服务 - 增强版
 *
 * 扩展现有的Git检测能力，支持安装决策和环境评估
 *
 * 功能特性：
 * - 智能检测已安装的Git版本和路径
 * - 版本兼容性分析和升级建议
 * - 安装需求评估（磁盘空间、权限等）
 * - 系统环境检查（PATH配置等）
 * - WSL环境的特殊处理
 * - 与现有gitBashUtils.ts集成
 */

import { EventEmitter } from 'events'
import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as os from 'os'
import { detectGitBash, getCommandPathInGitBash } from './utils/gitBashUtils'
import type { SoftwareStatus } from '../types/setupWizard'

const execAsync = promisify(exec)

/**
 * Git安装信息接口
 */
export interface GitInstallationInfo {
  /** 是否已安装 */
  installed: boolean
  /** Git版本 */
  version?: string
  /** Git可执行文件路径 */
  gitPath?: string
  /** Git Bash路径（仅Windows） */
  gitBashPath?: string
  /** 安装方式 */
  installationType?: 'system' | 'portable' | 'wsl' | 'unknown'
  /** 安装位置 */
  installLocation?: string
  /** 配置的用户信息 */
  userConfig?: {
    name?: string
    email?: string
  }
}

/**
 * Git兼容性分析结果
 */
export interface GitCompatibilityAnalysis {
  /** 是否兼容 */
  compatible: boolean
  /** 当前版本 */
  currentVersion?: string
  /** 推荐版本 */
  recommendedVersion: string
  /** 最小兼容版本 */
  minimumVersion: string
  /** 是否需要升级 */
  needsUpgrade: boolean
  /** 兼容性问题 */
  issues: string[]
  /** 升级建议 */
  upgradeRecommendations: string[]
}

/**
 * Git安装需求评估
 */
export interface GitInstallationRequirements {
  /** 磁盘空间需求（字节） */
  diskSpaceRequired: number
  /** 可用磁盘空间（字节） */
  diskSpaceAvailable: number
  /** 磁盘空间是否足够 */
  hasSufficientSpace: boolean
  /** 是否需要管理员权限 */
  requiresElevation: boolean
  /** 系统要求 */
  systemRequirements: {
    /** 操作系统版本要求 */
    osVersion: string
    /** 架构要求 */
    architecture: string[]
    /** 依赖项 */
    dependencies: string[]
  }
  /** 安装前置条件 */
  prerequisites: string[]
  /** 潜在冲突 */
  potentialConflicts: string[]
}

/**
 * Git环境检查结果
 */
export interface GitEnvironmentCheck {
  /** PATH配置状态 */
  pathConfiguration: {
    /** Git是否在PATH中 */
    gitInPath: boolean
    /** Git Bash是否在PATH中（Windows） */
    gitBashInPath: boolean
    /** PATH条目 */
    pathEntries: string[]
    /** 冲突的PATH条目 */
    conflictingPaths: string[]
  }
  /** 环境变量检查 */
  environmentVariables: {
    /** 关键环境变量 */
    gitConfig: Record<string, string>
    /** SSH配置 */
    sshConfig?: {
      hasKeys: boolean
      keyPaths: string[]
    }
  }
  /** WSL集成状态（Windows） */
  wslIntegration?: {
    /** WSL是否可用 */
    available: boolean
    /** WSL中的Git版本 */
    wslGitVersion?: string
    /** 集成问题 */
    issues: string[]
  }
}

/**
 * 完整的Git检测结果
 */
export interface ComprehensiveGitStatus {
  /** 基本安装信息 */
  installation: GitInstallationInfo
  /** 兼容性分析 */
  compatibility: GitCompatibilityAnalysis
  /** 安装需求 */
  requirements: GitInstallationRequirements
  /** 环境检查 */
  environment: GitEnvironmentCheck
  /** 检测时间戳 */
  detectionTimestamp: number
  /** 检测耗时（毫秒） */
  detectionDuration: number
}

/**
 * Git检测服务类
 */
export class GitDetectionService extends EventEmitter {
  private static instance: GitDetectionService
  private cache: Map<string, { data: ComprehensiveGitStatus; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存
  private readonly MIN_GIT_VERSION = '2.20.0'
  private readonly RECOMMENDED_GIT_VERSION = '2.40.0'

  private constructor() {
    super()
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): GitDetectionService {
    if (!GitDetectionService.instance) {
      GitDetectionService.instance = new GitDetectionService()
    }
    return GitDetectionService.instance
  }

  /**
   * 执行完整的Git检测和分析
   */
  public async performComprehensiveDetection(useCache = true): Promise<ComprehensiveGitStatus> {
    const startTime = Date.now()
    const cacheKey = `comprehensive-${process.platform}-${process.arch}`

    // 检查缓存
    if (useCache) {
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        this.emit('detection-completed', cached.data)
        return cached.data
      }
    }

    this.emit('detection-started')

    try {
      // 并行执行各项检测
      const [installation, compatibility, requirements, environment] = await Promise.all([
        this.detectGitInstallation(),
        this.analyzeGitCompatibility(),
        this.assessInstallationRequirements(),
        this.checkGitEnvironment()
      ])

      const result: ComprehensiveGitStatus = {
        installation,
        compatibility,
        requirements,
        environment,
        detectionTimestamp: Date.now(),
        detectionDuration: Date.now() - startTime
      }

      // 缓存结果
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      })

      this.emit('detection-completed', result)
      return result
    } catch (error) {
      this.emit('detection-failed', error)
      throw error
    }
  }

  /**
   * 检测Git安装情况
   */
  private async detectGitInstallation(): Promise<GitInstallationInfo> {
    const result: GitInstallationInfo = {
      installed: false
    }

    try {
      // 1. 尝试直接检测Git命令
      try {
        const { stdout } = await execAsync('git --version')
        const versionMatch = stdout.match(/git version (\d+\.\d+\.\d+)/)

        if (versionMatch) {
          result.installed = true
          result.version = versionMatch[1]
          result.gitPath = await this.findGitExecutablePath()
          result.installationType = await this.determineInstallationType(result.gitPath)
        }
      } catch (nativeError) {
        console.log('Native git detection failed:', nativeError)
      }

      // 2. Windows特殊处理 - 检测Git Bash
      if (process.platform === 'win32' && !result.installed) {
        const gitBashInfo = await detectGitBash()

        if (gitBashInfo.available && gitBashInfo.bashPath) {
          result.installed = true
          result.version = gitBashInfo.gitVersion
          result.gitBashPath = gitBashInfo.bashPath
          result.installationType = 'system'

          // 尝试获取Git可执行文件路径
          result.gitPath = (await getCommandPathInGitBash(gitBashInfo.bashPath, 'git')) || undefined
        }
      }

      // 3. 获取Git配置信息
      if (result.installed) {
        result.userConfig = await this.getGitUserConfig()
        result.installLocation = await this.getGitInstallLocation(result.gitPath)
      }

      return result
    } catch (error) {
      console.error('Git installation detection error:', error)
      return result
    }
  }

  /**
   * 分析Git版本兼容性
   */
  private async analyzeGitCompatibility(): Promise<GitCompatibilityAnalysis> {
    const result: GitCompatibilityAnalysis = {
      compatible: false,
      recommendedVersion: this.RECOMMENDED_GIT_VERSION,
      minimumVersion: this.MIN_GIT_VERSION,
      needsUpgrade: false,
      issues: [],
      upgradeRecommendations: []
    }

    try {
      // 获取当前版本
      const installation = await this.detectGitInstallation()

      if (!installation.installed || !installation.version) {
        result.issues.push('Git未安装或版本检测失败')
        result.upgradeRecommendations.push('请安装Git的最新稳定版本')
        return result
      }

      result.currentVersion = installation.version

      // 版本比较
      const currentVersionParts = installation.version.split('.').map(Number)
      const minimumVersionParts = this.MIN_GIT_VERSION.split('.').map(Number)
      const recommendedVersionParts = this.RECOMMENDED_GIT_VERSION.split('.').map(Number)

      const isAboveMinimum = this.compareVersions(currentVersionParts, minimumVersionParts) >= 0
      const isAboveRecommended =
        this.compareVersions(currentVersionParts, recommendedVersionParts) >= 0

      result.compatible = isAboveMinimum
      result.needsUpgrade = !isAboveRecommended

      if (!isAboveMinimum) {
        result.issues.push(
          `当前版本 ${installation.version} 低于最小兼容版本 ${this.MIN_GIT_VERSION}`
        )
        result.upgradeRecommendations.push('必须升级到更新版本才能正常工作')
      } else if (!isAboveRecommended) {
        result.issues.push(
          `当前版本 ${installation.version} 低于推荐版本 ${this.RECOMMENDED_GIT_VERSION}`
        )
        result.upgradeRecommendations.push('建议升级到推荐版本以获得最佳性能和兼容性')
      }

      return result
    } catch (error) {
      result.issues.push(`兼容性分析失败: ${error}`)
      return result
    }
  }

  /**
   * 评估安装需求
   */
  private async assessInstallationRequirements(): Promise<GitInstallationRequirements> {
    const result: GitInstallationRequirements = {
      diskSpaceRequired: 0,
      diskSpaceAvailable: 0,
      hasSufficientSpace: false,
      requiresElevation: false,
      systemRequirements: {
        osVersion: '',
        architecture: [],
        dependencies: []
      },
      prerequisites: [],
      potentialConflicts: []
    }

    try {
      // 1. 磁盘空间评估
      result.diskSpaceRequired = this.getGitDiskSpaceRequirement()
      result.diskSpaceAvailable = await this.getAvailableDiskSpace()
      result.hasSufficientSpace = result.diskSpaceAvailable >= result.diskSpaceRequired * 1.2 // 20%缓冲

      // 2. 权限需求
      result.requiresElevation = await this.checkIfElevationRequired()

      // 3. 系统要求
      result.systemRequirements = this.getSystemRequirements()

      // 4. 前置条件检查
      result.prerequisites = await this.checkPrerequisites()

      // 5. 潜在冲突检查
      result.potentialConflicts = await this.checkPotentialConflicts()

      return result
    } catch (error) {
      console.error('Installation requirements assessment error:', error)
      return result
    }
  }

  /**
   * 检查Git环境
   */
  private async checkGitEnvironment(): Promise<GitEnvironmentCheck> {
    const result: GitEnvironmentCheck = {
      pathConfiguration: {
        gitInPath: false,
        gitBashInPath: false,
        pathEntries: [],
        conflictingPaths: []
      },
      environmentVariables: {
        gitConfig: {}
      }
    }

    try {
      // 1. PATH配置检查
      result.pathConfiguration = await this.checkPathConfiguration()

      // 2. 环境变量检查
      result.environmentVariables = await this.checkEnvironmentVariables()

      // 3. Windows WSL集成检查
      if (process.platform === 'win32') {
        result.wslIntegration = await this.checkWSLIntegration()
      }

      return result
    } catch (error) {
      console.error('Git environment check error:', error)
      return result
    }
  }

  /**
   * 获取简化的环境状态（与现有API兼容）
   */
  public async getEnvironmentStatus(): Promise<SoftwareStatus> {
    try {
      const comprehensive = await this.performComprehensiveDetection()
      const { installation, compatibility } = comprehensive

      return {
        installed: installation.installed,
        version: installation.version,
        path: installation.gitPath,
        error: !installation.installed ? 'Git未安装' : undefined,
        needsUpdate: compatibility.needsUpgrade
      }
    } catch (error) {
      return {
        installed: false,
        error: `Git检测失败: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  /**
   * 清除检测缓存
   */
  public clearCache(): void {
    this.cache.clear()
    this.emit('cache-cleared')
  }

  // ========== 私有辅助方法 ==========

  /**
   * 查找Git可执行文件路径
   */
  private async findGitExecutablePath(): Promise<string | undefined> {
    try {
      const command = process.platform === 'win32' ? 'where git' : 'which git'
      const { stdout } = await execAsync(command)
      return stdout.trim().split('\n')[0]
    } catch {
      return undefined
    }
  }

  /**
   * 确定Git安装类型
   */
  private async determineInstallationType(
    gitPath?: string
  ): Promise<GitInstallationInfo['installationType']> {
    if (!gitPath) return 'unknown'

    try {
      if (process.platform === 'win32') {
        if (gitPath.includes('Program Files\\Git') || gitPath.includes('Git\\bin')) {
          return 'system'
        }
        if (gitPath.includes('PortableGit')) {
          return 'portable'
        }
        if (gitPath.includes('wsl') || gitPath.includes('ubuntu') || gitPath.includes('debian')) {
          return 'wsl'
        }
      } else {
        if (gitPath.startsWith('/usr/') || gitPath.startsWith('/bin/')) {
          return 'system'
        }
      }
      return 'unknown'
    } catch {
      return 'unknown'
    }
  }

  /**
   * 获取Git用户配置
   */
  private async getGitUserConfig(): Promise<{ name?: string; email?: string }> {
    const config: { name?: string; email?: string } = {}

    try {
      try {
        const { stdout: name } = await execAsync('git config --global user.name')
        config.name = name.trim()
      } catch {
        // Git用户名未配置
      }

      try {
        const { stdout: email } = await execAsync('git config --global user.email')
        config.email = email.trim()
      } catch {
        // Git邮箱未配置
      }
    } catch {}

    return config
  }

  /**
   * 获取Git安装位置
   */
  private async getGitInstallLocation(gitPath?: string): Promise<string | undefined> {
    if (!gitPath) return undefined

    try {
      // 通常Git安装位置是可执行文件的上级目录
      return dirname(dirname(gitPath))
    } catch {
      return undefined
    }
  }

  /**
   * 版本比较函数
   */
  private compareVersions(version1: number[], version2: number[]): number {
    for (let i = 0; i < Math.max(version1.length, version2.length); i++) {
      const v1 = version1[i] || 0
      const v2 = version2[i] || 0

      if (v1 > v2) return 1
      if (v1 < v2) return -1
    }
    return 0
  }

  /**
   * 获取Git磁盘空间需求
   */
  private getGitDiskSpaceRequirement(): number {
    // Git安装包大小估算（字节）
    switch (process.platform) {
      case 'win32':
        return 250 * 1024 * 1024 // 250MB
      case 'darwin':
        return 100 * 1024 * 1024 // 100MB
      case 'linux':
        return 50 * 1024 * 1024 // 50MB
      default:
        return 100 * 1024 * 1024 // 100MB默认值
    }
  }

  /**
   * 获取可用磁盘空间
   */
  private async getAvailableDiskSpace(): Promise<number> {
    try {
      const tempDir = os.tmpdir()
      const stats = await fs.statfs(tempDir)
      return stats.bavail * stats.bsize
    } catch {
      return Number.MAX_SAFE_INTEGER // 如果无法检测，假设空间充足
    }
  }

  /**
   * 检查是否需要提升权限
   */
  private async checkIfElevationRequired(): Promise<boolean> {
    if (process.platform === 'win32') {
      // Windows通常需要管理员权限来安装系统软件
      return true
    } else {
      // Unix系统检查是否可以写入系统目录
      const systemPaths = ['/usr/local/bin', '/opt', '/usr/bin']

      for (const path of systemPaths) {
        try {
          await fs.access(path, fs.constants.W_OK)
          return false // 如果可以写入，则不需要sudo
        } catch {
          continue
        }
      }
      return true // 需要sudo权限
    }
  }

  /**
   * 获取系统要求
   */
  private getSystemRequirements(): GitInstallationRequirements['systemRequirements'] {
    const requirements = {
      osVersion: '',
      architecture: [] as string[],
      dependencies: [] as string[]
    }

    switch (process.platform) {
      case 'win32':
        requirements.osVersion = 'Windows 7 或更高版本'
        requirements.architecture = ['x64', 'x86']
        requirements.dependencies = []
        break
      case 'darwin':
        requirements.osVersion = 'macOS 10.12 或更高版本'
        requirements.architecture = ['x64', 'arm64']
        requirements.dependencies = ['Xcode Command Line Tools']
        break
      case 'linux':
        requirements.osVersion = '现代Linux发行版'
        requirements.architecture = ['x64', 'arm64']
        requirements.dependencies = ['libc6', 'libssl']
        break
    }

    return requirements
  }

  /**
   * 检查前置条件
   */
  private async checkPrerequisites(): Promise<string[]> {
    const prerequisites: string[] = []

    if (process.platform === 'darwin') {
      // 检查Xcode Command Line Tools
      try {
        await execAsync('xcode-select -p')
      } catch {
        prerequisites.push('需要安装Xcode Command Line Tools')
      }
    } else if (process.platform === 'linux') {
      // 检查必要的系统库
      const requiredPackages = ['libc6', 'libssl1.1']
      for (const pkg of requiredPackages) {
        try {
          await execAsync(`ldconfig -p | grep ${pkg}`)
        } catch {
          prerequisites.push(`需要安装系统包: ${pkg}`)
        }
      }
    }

    return prerequisites
  }

  /**
   * 检查潜在冲突
   */
  private async checkPotentialConflicts(): Promise<string[]> {
    const conflicts: string[] = []

    try {
      if (process.platform === 'win32') {
        // 检查WSL中的Git是否与Windows Git冲突
        const wslGitPaths = ['/mnt/c/Program Files/Git/bin/git', '/usr/bin/git']

        for (const path of wslGitPaths) {
          try {
            const { stdout } = await execAsync(`wsl test -f ${path} && echo "exists"`)
            if (stdout.includes('exists')) {
              conflicts.push('检测到WSL中也安装了Git，可能造成路径冲突')
              break
            }
          } catch {}
        }
      }

      // 检查多个Git安装
      const gitPaths = process.env.PATH?.split(process.platform === 'win32' ? ';' : ':') || []
      const gitExecutables: string[] = []

      for (const path of gitPaths) {
        const gitExe = join(path, process.platform === 'win32' ? 'git.exe' : 'git')
        try {
          await fs.access(gitExe)
          gitExecutables.push(gitExe)
        } catch {}
      }

      if (gitExecutables.length > 1) {
        conflicts.push(`检测到多个Git安装: ${gitExecutables.join(', ')}`)
      }
    } catch (error) {
      console.warn('潜在冲突检查失败:', error)
    }

    return conflicts
  }

  /**
   * 检查PATH配置
   */
  private async checkPathConfiguration(): Promise<GitEnvironmentCheck['pathConfiguration']> {
    const result = {
      gitInPath: false,
      gitBashInPath: false,
      pathEntries: [] as string[],
      conflictingPaths: [] as string[]
    }

    try {
      const pathEntries = (process.env.PATH || '').split(process.platform === 'win32' ? ';' : ':')
      result.pathEntries = pathEntries.filter(Boolean)

      // 检查Git是否在PATH中
      try {
        await execAsync('git --version')
        result.gitInPath = true
      } catch {}

      // Windows特殊检查Git Bash
      if (process.platform === 'win32') {
        try {
          await execAsync('bash --version')
          result.gitBashInPath = true
        } catch {}

        // 检查冲突的PATH项
        const potentialConflicts = pathEntries.filter(
          (path) =>
            path.toLowerCase().includes('wsl') ||
            path.toLowerCase().includes('ubuntu') ||
            path.toLowerCase().includes('debian')
        )
        result.conflictingPaths = potentialConflicts
      }
    } catch (error) {
      console.warn('PATH配置检查失败:', error)
    }

    return result
  }

  /**
   * 检查环境变量
   */
  private async checkEnvironmentVariables(): Promise<GitEnvironmentCheck['environmentVariables']> {
    const result = {
      gitConfig: {} as Record<string, string>,
      sshConfig: undefined as { hasKeys: boolean; keyPaths: string[] } | undefined
    }

    try {
      // 获取Git配置
      const configs = [
        'user.name',
        'user.email',
        'core.autocrlf',
        'core.editor',
        'init.defaultBranch'
      ]

      for (const config of configs) {
        try {
          const { stdout } = await execAsync(`git config --global ${config}`)
          result.gitConfig[config] = stdout.trim()
        } catch {}
      }

      // 检查SSH配置
      const sshDir = join(os.homedir(), '.ssh')
      try {
        await fs.access(sshDir)
        const sshFiles = await fs.readdir(sshDir)
        const keyFiles = sshFiles.filter(
          (file) =>
            file.endsWith('_rsa') ||
            file.endsWith('_ed25519') ||
            file === 'id_rsa' ||
            file === 'id_ed25519'
        )

        result.sshConfig = {
          hasKeys: keyFiles.length > 0,
          keyPaths: keyFiles.map((file) => join(sshDir, file))
        }
      } catch {}
    } catch (error) {
      console.warn('环境变量检查失败:', error)
    }

    return result
  }

  /**
   * 检查WSL集成（仅Windows）
   */
  private async checkWSLIntegration(): Promise<GitEnvironmentCheck['wslIntegration']> {
    const result = {
      available: false,
      wslGitVersion: undefined as string | undefined,
      issues: [] as string[]
    }

    try {
      // 检查WSL是否可用
      const { stdout } = await execAsync('wsl --list --quiet')
      if (stdout.trim()) {
        result.available = true

        // 检查WSL中的Git版本
        try {
          const { stdout: gitVersion } = await execAsync('wsl git --version')
          const versionMatch = gitVersion.match(/git version (\d+\.\d+\.\d+)/)
          if (versionMatch) {
            result.wslGitVersion = versionMatch[1]
          }
        } catch {
          result.issues.push('WSL中未安装Git或无法访问')
        }
      }
    } catch (error) {
      result.issues.push('WSL不可用或检查失败')
    }

    return result
  }
}

// 导出单例实例
export const gitDetectionService = GitDetectionService.getInstance()
