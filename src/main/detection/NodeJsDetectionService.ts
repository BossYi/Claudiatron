/**
 * Node.js检测服务 - 增强版
 *
 * 扩展Node.js检测能力，支持安装决策和环境评估
 *
 * 功能特性：
 * - 智能检测已安装的Node.js和npm版本
 * - 版本兼容性分析和升级建议
 * - 安装需求评估（磁盘空间、权限等）
 * - 系统环境检查（PATH配置、全局包等）
 * - npm配置和镜像源检查
 * - 全局包依赖分析
 * - 缓存机制和单例模式
 */

import { EventEmitter } from 'events'
import { promises as fs } from 'fs'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as os from 'os'
import type { SoftwareStatus } from '../types/setupWizard'

const execAsync = promisify(exec)

/**
 * Node.js安装信息接口
 */
export interface NodeJsInstallationInfo {
  installed: boolean
  version?: string
  installationType?: 'system' | 'homebrew' | 'nvm' | 'binary' | 'unknown'
  nodePath?: string
  npmPath?: string
  npmVersion?: string
  globalPackagesPath?: string
  installLocation?: string
}

/**
 * Node.js版本兼容性分析结果
 */
export interface NodeJsVersionCompatibility {
  compatible: boolean
  currentVersion?: string
  minimumVersion: string
  recommendedVersion: string
  needsUpgrade: boolean
  issues: string[]
  upgradeRecommendations: string[]
}

/**
 * Node.js安装需求评估结果
 */
export interface NodeJsInstallationRequirements {
  canInstall: boolean
  diskSpaceRequired: number
  diskSpaceAvailable: number
  requiresElevation: boolean
  prerequisites: string[]
  potentialConflicts: string[]
}

/**
 * Node.js环境检查结果
 */
export interface NodeJsEnvironmentCheck {
  pathConfiguration: {
    nodeInPath: boolean
    npmInPath: boolean
    conflictingPaths: string[]
  }
  npmConfiguration: {
    registry: string
    globalPrefix: string
    cacheDir: string
    issues: string[]
  }
  globalPackages: {
    important: string[]
    outdated: string[]
    conflicting: string[]
  }
}

/**
 * Node.js详细状态（整合所有检测结果）
 */
export interface NodeJsDetailedStatus {
  installation: NodeJsInstallationInfo
  compatibility: NodeJsVersionCompatibility
  requirements: NodeJsInstallationRequirements
  environment: NodeJsEnvironmentCheck
}

/**
 * Node.js检测服务
 */
export class NodeJsDetectionService extends EventEmitter {
  private static instance: NodeJsDetectionService
  private readonly cache = new Map<string, { data: any; timestamp: number }>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

  // Node.js版本要求
  private readonly MIN_NODEJS_VERSION = '16.0.0'
  private readonly RECOMMENDED_NODEJS_VERSION = '20.11.0'
  private readonly MIN_NPM_VERSION = '8.0.0'

  // 重要的全局包列表
  private readonly IMPORTANT_GLOBAL_PACKAGES = [
    '@anthropic-ai/claude-code',
    'npm',
    'yarn',
    'typescript',
    'eslint',
    'prettier'
  ]

  private constructor() {
    super()
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): NodeJsDetectionService {
    if (!NodeJsDetectionService.instance) {
      NodeJsDetectionService.instance = new NodeJsDetectionService()
    }
    return NodeJsDetectionService.instance
  }

  /**
   * 获取完整的Node.js环境状态
   */
  public async getDetailedStatus(forceRefresh = false): Promise<NodeJsDetailedStatus> {
    const cacheKey = 'detailed-status'

    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data
      }
    }

    this.emit('detection-started')

    try {
      const [installation, compatibility, requirements, environment] = await Promise.all([
        this.detectNodeJsInstallation(),
        this.analyzeVersionCompatibility(),
        this.assessInstallationRequirements(),
        this.checkNodeJsEnvironment()
      ])

      const result: NodeJsDetailedStatus = {
        installation,
        compatibility,
        requirements,
        environment
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
   * 检测Node.js安装情况
   */
  public async detectNodeJsInstallation(): Promise<NodeJsInstallationInfo> {
    const result: NodeJsInstallationInfo = {
      installed: false
    }

    try {
      // 1. 尝试检测Node.js命令
      try {
        const { stdout } = await execAsync('node --version')
        const version = stdout.trim().replace('v', '')

        if (version) {
          result.installed = true
          result.version = version
          result.nodePath = await this.findExecutablePath('node')
          result.installationType = await this.determineInstallationType(result.nodePath)
        }
      } catch (nodeError) {
        console.log('Node.js detection failed:', nodeError)
      }

      // 2. 检测npm
      if (result.installed) {
        try {
          const { stdout: npmVersion } = await execAsync('npm --version')
          result.npmVersion = npmVersion.trim()
          console.log(`npm version detected: ${result.npmVersion}`)
        } catch (npmError) {
          console.log('npm not detected or not available')
        }

        // 3. 获取安装位置
        result.installLocation = await this.getNodeJsInstallLocation(result.nodePath)
      }

      return result
    } catch (error) {
      console.error('Node.js installation detection error:', error)
      return result
    }
  }

  /**
   * 分析Node.js版本兼容性
   */
  private async analyzeVersionCompatibility(): Promise<NodeJsVersionCompatibility> {
    const result: NodeJsVersionCompatibility = {
      compatible: false,
      minimumVersion: this.MIN_NODEJS_VERSION,
      recommendedVersion: this.RECOMMENDED_NODEJS_VERSION,
      needsUpgrade: false,
      issues: [],
      upgradeRecommendations: []
    }

    try {
      // 获取当前版本
      const installation = await this.detectNodeJsInstallation()

      if (!installation.installed || !installation.version) {
        result.issues.push('Node.js未安装或版本检测失败')
        result.upgradeRecommendations.push('请安装Node.js LTS版本')
        return result
      }

      result.currentVersion = installation.version

      // 版本比较
      const currentVersionParts = installation.version.split('.').map(Number)
      const minimumVersionParts = this.MIN_NODEJS_VERSION.split('.').map(Number)
      const recommendedVersionParts = this.RECOMMENDED_NODEJS_VERSION.split('.').map(Number)

      const isAboveMinimum = this.compareVersions(currentVersionParts, minimumVersionParts) >= 0
      const isAboveRecommended =
        this.compareVersions(currentVersionParts, recommendedVersionParts) >= 0

      result.compatible = isAboveMinimum
      result.needsUpgrade = !isAboveRecommended

      if (!isAboveMinimum) {
        result.issues.push(
          `当前版本 ${installation.version} 低于最小兼容版本 ${this.MIN_NODEJS_VERSION}`
        )
        result.upgradeRecommendations.push('必须升级到更新版本才能正常工作')
      } else if (!isAboveRecommended) {
        result.issues.push(
          `当前版本 ${installation.version} 低于推荐版本 ${this.RECOMMENDED_NODEJS_VERSION}`
        )
        result.upgradeRecommendations.push('建议升级到LTS版本以获得最佳性能和安全性')
      }

      // npm版本检查
      if (installation.npmVersion) {
        const npmVersionParts = installation.npmVersion.split('.').map(Number)
        const minNpmVersionParts = this.MIN_NPM_VERSION.split('.').map(Number)

        if (this.compareVersions(npmVersionParts, minNpmVersionParts) < 0) {
          result.issues.push(
            `npm版本 ${installation.npmVersion} 过低，建议 ${this.MIN_NPM_VERSION} 或更高`
          )
          result.upgradeRecommendations.push('运行 "npm install -g npm@latest" 升级npm')
        }
      } else {
        result.issues.push('npm未正确安装或不可用')
        result.upgradeRecommendations.push('重新安装Node.js以包含npm')
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
  private async assessInstallationRequirements(): Promise<NodeJsInstallationRequirements> {
    const result: NodeJsInstallationRequirements = {
      canInstall: true,
      diskSpaceRequired: this.getNodeJsDiskSpaceRequirement(),
      diskSpaceAvailable: 0,
      requiresElevation: false,
      prerequisites: [],
      potentialConflicts: []
    }

    try {
      // 1. 磁盘空间检查
      result.diskSpaceAvailable = await this.getAvailableDiskSpace()

      if (result.diskSpaceAvailable < result.diskSpaceRequired) {
        result.canInstall = false
      }

      // 2. 权限检查
      result.requiresElevation = await this.checkIfElevationRequired()

      // 3. 前置条件检查
      result.prerequisites = await this.checkPrerequisites()

      // 4. 潜在冲突检查
      result.potentialConflicts = await this.checkPotentialConflicts()

      return result
    } catch (error) {
      console.error('Node.js installation requirements assessment error:', error)
      return result
    }
  }

  /**
   * 检查Node.js环境
   */
  private async checkNodeJsEnvironment(): Promise<NodeJsEnvironmentCheck> {
    const result: NodeJsEnvironmentCheck = {
      pathConfiguration: {
        nodeInPath: false,
        npmInPath: false,
        conflictingPaths: []
      },
      npmConfiguration: {
        registry: '',
        globalPrefix: '',
        cacheDir: '',
        issues: []
      },
      globalPackages: {
        important: [],
        outdated: [],
        conflicting: []
      }
    }

    try {
      // 1. PATH配置检查
      result.pathConfiguration = await this.checkPathConfiguration()

      // 2. npm配置检查
      result.npmConfiguration = await this.checkNpmConfiguration()

      // 3. 全局包检查
      result.globalPackages = await this.checkGlobalPackages()

      return result
    } catch (error) {
      console.error('Node.js environment check error:', error)
      return result
    }
  }

  /**
   * 获取简化的环境状态（与现有API兼容）
   */
  public async getEnvironmentStatus(): Promise<{
    nodejs: SoftwareStatus
    npm: SoftwareStatus
  }> {
    try {
      const installation = await this.detectNodeJsInstallation()
      const compatibility = await this.analyzeVersionCompatibility()

      const nodejs: SoftwareStatus = {
        installed: installation.installed,
        version: installation.version,
        path: installation.nodePath,
        needsUpdate: compatibility.needsUpgrade
      }

      const npm: SoftwareStatus = {
        installed: !!installation.npmVersion,
        version: installation.npmVersion,
        path: installation.npmPath
      }

      if (!compatibility.compatible) {
        nodejs.error = compatibility.issues.join('; ')
      }

      return { nodejs, npm }
    } catch (error) {
      return {
        nodejs: {
          installed: false,
          error: `检测失败: ${error}`
        },
        npm: {
          installed: false,
          error: '需要先安装Node.js'
        }
      }
    }
  }

  /**
   * 查找可执行文件路径
   */
  private async findExecutablePath(command: string): Promise<string | undefined> {
    try {
      const cmd = process.platform === 'win32' ? 'where' : 'which'
      const { stdout } = await execAsync(`${cmd} ${command}`)
      return stdout.trim().split('\n')[0]
    } catch {
      return undefined
    }
  }

  /**
   * 确定Node.js安装类型
   */
  private async determineInstallationType(
    nodePath?: string
  ): Promise<NodeJsInstallationInfo['installationType']> {
    if (!nodePath) return 'unknown'

    try {
      if (process.platform === 'win32') {
        if (nodePath.includes('Program Files\\nodejs')) {
          return 'system'
        }
        if (nodePath.includes('AppData\\Roaming\\npm')) {
          return 'system'
        }
      } else if (process.platform === 'darwin') {
        if (nodePath.includes('/usr/local/bin') || nodePath.includes('/opt/homebrew')) {
          return 'homebrew'
        }
        if (nodePath.includes('.nvm/')) {
          return 'nvm'
        }
        if (nodePath.includes('/usr/local/node')) {
          return 'binary'
        }
      } else if (process.platform === 'linux') {
        if (nodePath.includes('/usr/bin') || nodePath.includes('/usr/local/bin')) {
          return 'system'
        }
        if (nodePath.includes('.nvm/')) {
          return 'nvm'
        }
        if (nodePath.includes('/opt/node')) {
          return 'binary'
        }
      }

      return 'unknown'
    } catch {
      return 'unknown'
    }
  }

  /**
   * 获取Node.js安装位置
   */
  private async getNodeJsInstallLocation(nodePath?: string): Promise<string | undefined> {
    if (!nodePath) return undefined

    try {
      // 尝试从可执行文件路径推断安装目录
      if (process.platform === 'win32') {
        if (nodePath.includes('Program Files\\nodejs')) {
          return 'C:\\Program Files\\nodejs'
        }
      } else {
        if (nodePath.includes('/usr/local/bin')) {
          return '/usr/local'
        }
        if (nodePath.includes('/usr/bin')) {
          return '/usr'
        }
        if (nodePath.includes('.nvm/')) {
          const nvmMatch = nodePath.match(/(.*\.nvm\/versions\/node\/[^/]+)/)
          return nvmMatch ? nvmMatch[1] : undefined
        }
      }

      return undefined
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
   * 获取Node.js磁盘空间需求
   */
  private getNodeJsDiskSpaceRequirement(): number {
    // Node.js安装包大小估算（字节）
    switch (process.platform) {
      case 'win32':
        return 50 * 1024 * 1024 // 50MB
      case 'darwin':
        return 45 * 1024 * 1024 // 45MB
      case 'linux':
        return 40 * 1024 * 1024 // 40MB
      default:
        return 50 * 1024 * 1024 // 50MB默认值
    }
  }

  /**
   * 获取可用磁盘空间
   */
  private async getAvailableDiskSpace(): Promise<number> {
    try {
      const stats = await fs.statfs(os.tmpdir())
      return stats.bavail * stats.bsize
    } catch {
      return 0
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

      return true
    }
  }

  /**
   * 检查前置条件
   */
  private async checkPrerequisites(): Promise<string[]> {
    const prerequisites: string[] = []

    try {
      if (process.platform === 'linux') {
        // 检查必要的系统库
        const requiredLibs = ['libc', 'libstdc++']

        for (const lib of requiredLibs) {
          try {
            await execAsync(`ldconfig -p | grep ${lib}`)
          } catch {
            prerequisites.push(`缺少系统库: ${lib}`)
          }
        }

        // 检查curl/wget
        try {
          await execAsync('which curl')
        } catch {
          try {
            await execAsync('which wget')
          } catch {
            prerequisites.push('需要curl或wget用于下载')
          }
        }
      }

      if (process.platform === 'darwin') {
        // 检查Xcode Command Line Tools
        try {
          await execAsync('xcode-select -p')
        } catch {
          prerequisites.push('需要安装Xcode Command Line Tools')
        }
      }
    } catch (error) {
      console.warn('前置条件检查失败:', error)
    }

    return prerequisites
  }

  /**
   * 检查潜在冲突
   */
  private async checkPotentialConflicts(): Promise<string[]> {
    const conflicts: string[] = []

    try {
      // 检查多个Node.js安装
      const nodeExecutables: string[] = []
      const searchPaths = process.env.PATH?.split(process.platform === 'win32' ? ';' : ':') || []

      for (const path of searchPaths) {
        try {
          const nodeExe = process.platform === 'win32' ? join(path, 'node.exe') : join(path, 'node')

          await fs.access(nodeExe)
          nodeExecutables.push(nodeExe)
        } catch {}
      }

      if (nodeExecutables.length > 1) {
        conflicts.push(`检测到多个Node.js安装: ${nodeExecutables.join(', ')}`)
      }

      // 检查nvm和系统安装的冲突
      if (process.platform !== 'win32') {
        const nvmDir = join(os.homedir(), '.nvm')
        const systemNode = '/usr/bin/node'

        try {
          await fs.access(nvmDir)
          await fs.access(systemNode)
          conflicts.push('检测到nvm和系统Node.js同时存在，可能造成版本冲突')
        } catch {}
      }

      // 检查PATH中的重复项
      const pathEntries = process.env.PATH?.split(process.platform === 'win32' ? ';' : ':') || []
      const nodePaths = pathEntries.filter(
        (path) => path.toLowerCase().includes('node') || path.toLowerCase().includes('npm')
      )

      if (nodePaths.length > 2) {
        conflicts.push(`PATH中有多个Node.js相关路径: ${nodePaths.join(', ')}`)
      }
    } catch (error) {
      console.warn('潜在冲突检查失败:', error)
    }

    return conflicts
  }

  /**
   * 检查PATH配置
   */
  private async checkPathConfiguration(): Promise<NodeJsEnvironmentCheck['pathConfiguration']> {
    const result: NodeJsEnvironmentCheck['pathConfiguration'] = {
      nodeInPath: false,
      npmInPath: false,
      conflictingPaths: []
    }

    try {
      // 检查node命令
      try {
        await execAsync('node --version')
        result.nodeInPath = true
      } catch {}

      // 检查npm命令
      try {
        await execAsync('npm --version')
        result.npmInPath = true
      } catch {}

      // 检查冲突的PATH项
      const pathEntries = process.env.PATH?.split(process.platform === 'win32' ? ';' : ':') || []
      const potentialConflicts = pathEntries.filter((path) => {
        const lowerPath = path.toLowerCase()
        return (
          lowerPath.includes('node') &&
          (lowerPath.includes('old') ||
            lowerPath.includes('backup') ||
            lowerPath.includes('deprecated'))
        )
      })
      result.conflictingPaths = potentialConflicts
    } catch (error) {
      console.warn('PATH配置检查失败:', error)
    }

    return result
  }

  /**
   * 检查npm配置
   */
  private async checkNpmConfiguration(): Promise<NodeJsEnvironmentCheck['npmConfiguration']> {
    const result: NodeJsEnvironmentCheck['npmConfiguration'] = {
      registry: '',
      globalPrefix: '',
      cacheDir: '',
      issues: []
    }

    try {
      // 检查注册表
      try {
        const { stdout: registry } = await execAsync('npm config get registry')
        result.registry = registry.trim()
      } catch {
        result.issues.push('无法获取npm注册表配置')
      }

      // 检查全局前缀
      try {
        const { stdout: prefix } = await execAsync('npm config get prefix')
        result.globalPrefix = prefix.trim()
      } catch {
        result.issues.push('无法获取npm全局前缀')
      }

      // 检查缓存目录
      try {
        const { stdout: cache } = await execAsync('npm config get cache')
        result.cacheDir = cache.trim()
      } catch {
        result.issues.push('无法获取npm缓存目录')
      }

      // 检查权限问题
      if (result.globalPrefix && !result.globalPrefix.includes(os.homedir())) {
        if (process.platform !== 'win32') {
          result.issues.push('npm全局包可能需要sudo权限，建议配置用户级全局目录')
        }
      }
    } catch (error) {
      result.issues.push(`npm配置检查失败: ${error}`)
    }

    return result
  }

  /**
   * 检查全局包
   */
  private async checkGlobalPackages(): Promise<NodeJsEnvironmentCheck['globalPackages']> {
    const result: NodeJsEnvironmentCheck['globalPackages'] = {
      important: [],
      outdated: [],
      conflicting: []
    }

    try {
      // 获取已安装的全局包
      const { stdout: listOutput } = await execAsync('npm list -g --depth=0 --json')
      const globalPackages = JSON.parse(listOutput)

      if (globalPackages.dependencies) {
        const installedPackages = Object.keys(globalPackages.dependencies)

        // 检查重要包
        result.important = installedPackages.filter((pkg) =>
          this.IMPORTANT_GLOBAL_PACKAGES.includes(pkg)
        )

        // 检查过时的包
        try {
          const { stdout: outdatedOutput } = await execAsync('npm outdated -g --json')
          if (outdatedOutput.trim()) {
            const outdatedPackages = JSON.parse(outdatedOutput)
            result.outdated = Object.keys(outdatedPackages)
          }
        } catch {
          // 忽略outdated检查失败
        }

        // 检查冲突包（版本冲突或重复安装）
        const duplicatePackages = installedPackages.filter(
          (pkg, index) => installedPackages.indexOf(pkg) !== index
        )
        result.conflicting = duplicatePackages
      }
    } catch (error) {
      console.warn('全局包检查失败:', error)
    }

    return result
  }
}

// 导出单例实例
export const nodeJsDetectionService = NodeJsDetectionService.getInstance()
