/**
 * Node.js安装管理器
 *
 * 基于BaseInstallationManager实现跨平台的Node.js自动安装功能
 *
 * 功能特性：
 * - 自动检测并安装最新Node.js LTS版本
 * - Windows: MSI安装包，支持静默安装
 * - macOS: PKG安装包或Homebrew安装
 * - Linux: NodeSource或官方包管理器
 * - npm配置和镜像源设置（支持国内镜像）
 * - 环境变量配置和验证
 * - 版本管理和兼容性检查
 */

import { join } from 'path'
import { promises as fs } from 'fs'
import * as os from 'os'
import {
  BaseInstallationManager,
  type InstallationPackage,
  type InstallationOptions,
  type InstallationResult
} from './BaseInstallationManager'
import type { InstallationProgress } from '../types/setupWizard'

/**
 * Node.js安装包配置接口
 */
interface NodeJsPackageConfig {
  windows: {
    version: string
    downloadUrl: string
    filename: string
    size: number
    installArgs: string[]
  }
  macos: {
    version: string
    downloadUrl: string
    filename: string
    size: number
    installArgs: string[]
  }
  linux: {
    version: string
    downloadUrl: string
    filename: string
    size: number
    setupScript: string
  }
}

/**
 * npm配置选项
 */
interface NpmConfig {
  registry?: string
  timeout?: number
  retries?: number
  progress?: boolean
  china?: boolean // 是否使用国内镜像
}

/**
 * Node.js安装管理器
 */
export class NodeJsInstallationManager extends BaseInstallationManager {
  private static readonly DEFAULT_LTS_VERSION = '20.11.0' // 最新LTS版本

  // 国内镜像配置
  private static readonly CHINA_MIRRORS = {
    nodejs: 'https://npmmirror.com/mirrors/node/',
    npm: 'https://registry.npmmirror.com'
  }

  private static readonly NODEJS_PACKAGES: NodeJsPackageConfig = {
    windows: {
      version: '20.11.0',
      downloadUrl: 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi',
      filename: 'node-v20.11.0-x64.msi',
      size: 30 * 1024 * 1024, // 30MB
      installArgs: ['/quiet', '/norestart']
    },
    macos: {
      version: '20.11.0',
      downloadUrl: 'https://nodejs.org/dist/v20.11.0/node-v20.11.0.pkg',
      filename: 'node-v20.11.0.pkg',
      size: 28 * 1024 * 1024, // 28MB
      installArgs: []
    },
    linux: {
      version: '20.11.0',
      downloadUrl: 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-linux-x64.tar.xz',
      filename: 'node-v20.11.0-linux-x64.tar.xz',
      size: 25 * 1024 * 1024, // 25MB
      setupScript: 'https://deb.nodesource.com/setup_lts.x'
    }
  }

  private readonly npmConfig: NpmConfig = {
    timeout: 60000,
    retries: 3,
    progress: true,
    china: false // 可通过选项启用
  }

  constructor(options?: { useChineseMirrors?: boolean }) {
    super()

    if (options?.useChineseMirrors) {
      this.npmConfig.china = true
      this.npmConfig.registry = NodeJsInstallationManager.CHINA_MIRRORS.npm
    }
  }

  /**
   * 获取软件名称
   */
  protected getSoftwareName(): InstallationProgress['software'] {
    return 'nodejs'
  }

  /**
   * 获取安装包信息
   */
  protected async getPackageInfo(version?: string): Promise<InstallationPackage> {
    // 如果没有指定版本，获取最新LTS版本
    const targetVersion = version || (await this.getLatestLTSVersion())
    const packageConfig = NodeJsInstallationManager.NODEJS_PACKAGES

    // 根据平台和版本构建下载URL
    const baseUrl = this.npmConfig.china
      ? NodeJsInstallationManager.CHINA_MIRRORS.nodejs
      : 'https://nodejs.org/dist/'

    switch (this.platform) {
      case 'win32':
        const winArch = this.arch === 'x64' ? 'x64' : 'x86'
        const winFilename = `node-v${targetVersion}-${winArch}.msi`

        return {
          name: 'Node.js for Windows',
          version: targetVersion,
          downloadUrl: `${baseUrl}v${targetVersion}/${winFilename}`,
          filename: winFilename,
          size: packageConfig.windows.size,
          platform: this.platform,
          arch: this.arch
        }

      case 'darwin':
        const macFilename = `node-v${targetVersion}.pkg`

        return {
          name: 'Node.js for macOS',
          version: targetVersion,
          downloadUrl: `${baseUrl}v${targetVersion}/${macFilename}`,
          filename: macFilename,
          size: packageConfig.macos.size,
          platform: this.platform,
          arch: this.arch
        }

      case 'linux':
        const linuxArch = this.arch === 'x64' ? 'x64' : this.arch
        const linuxFilename = `node-v${targetVersion}-linux-${linuxArch}.tar.xz`

        return {
          name: 'Node.js for Linux',
          version: targetVersion,
          downloadUrl: `${baseUrl}v${targetVersion}/${linuxFilename}`,
          filename: linuxFilename,
          size: packageConfig.linux.size,
          platform: this.platform,
          arch: this.arch
        }

      default:
        throw new Error(`不支持的平台: ${this.platform}`)
    }
  }

  /**
   * 验证系统兼容性
   */
  protected async validateSystemCompatibility(): Promise<{
    compatible: boolean
    requirements: string[]
    issues: string[]
  }> {
    const requirements: string[] = []
    const issues: string[] = []

    try {
      // 1. 基础系统要求
      if (this.platform === 'win32') {
        requirements.push('Windows 10 或更高版本')
        requirements.push('64位系统架构（推荐）')

        // Windows版本检查
        const release = os.release()
        const version = release.split('.').map(Number)
        if (version[0] < 10) {
          issues.push('建议使用Windows 10或更高版本以获得最佳兼容性')
        }
      } else if (this.platform === 'darwin') {
        requirements.push('macOS 10.15 (Catalina) 或更高版本')

        // macOS版本检查
        try {
          const { stdout } = await this.executeCommand('sw_vers', ['-productVersion'])
          const version = stdout.trim().split('.').map(Number)
          if (version[0] < 10 || (version[0] === 10 && version[1] < 15)) {
            issues.push('建议使用macOS 10.15或更高版本')
          }
        } catch (error) {
          this.log('无法检测macOS版本', 'warning')
        }
      } else if (this.platform === 'linux') {
        requirements.push('支持的Linux发行版 (Ubuntu 18.04+, Debian 10+, CentOS 8+)')
        requirements.push('glibc 2.17 或更高版本')

        // 检查glibc版本
        try {
          const { stdout } = await this.executeCommand('ldd', ['--version'])
          const glibcMatch = stdout.match(/ldd \(.*\) (\d+\.\d+)/)
          if (glibcMatch) {
            const glibcVersion = parseFloat(glibcMatch[1])
            if (glibcVersion < 2.17) {
              issues.push(`glibc版本过低: ${glibcVersion}，需要2.17或更高版本`)
            }
          }
        } catch (error) {
          this.log('无法检测glibc版本', 'warning')
        }
      }

      // 2. 内存要求
      const totalMemory = os.totalmem()
      const requiredMemory = 2 * 1024 * 1024 * 1024 // 2GB
      requirements.push('系统内存: 2GB以上（推荐4GB+）')

      if (totalMemory < requiredMemory) {
        issues.push(`系统内存不足: ${this.formatBytes(totalMemory)}，推荐至少2GB`)
      }

      // 3. 磁盘空间检查
      const packageInfo = await this.getPackageInfo()
      if (packageInfo.size) {
        const requiredSpace = packageInfo.size * 3 // 下载+安装+缓存
        requirements.push(`可用磁盘空间: ${this.formatBytes(requiredSpace)}`)
      }

      // 4. 检查现有Node.js安装
      try {
        const { stdout } = await this.executeCommand('node', ['--version'])
        const currentVersion = stdout.trim().replace('v', '')
        this.log(`检测到已安装的Node.js版本: ${currentVersion}`, 'info')

        // 版本兼容性检查
        const majorVersion = parseInt(currentVersion.split('.')[0])
        if (majorVersion < 16) {
          issues.push(`当前Node.js版本${currentVersion}过低，建议升级到LTS版本`)
        }
      } catch (error) {
        this.log('未检测到现有Node.js安装', 'info')
      }

      // 5. 网络连接检查
      requirements.push('网络连接: 需要访问Node.js官方源或镜像站点')

      return {
        compatible: issues.length === 0,
        requirements,
        issues
      }
    } catch (error) {
      issues.push(`兼容性检查失败: ${error}`)
      return {
        compatible: false,
        requirements,
        issues
      }
    }
  }

  /**
   * 执行平台特定的安装逻辑
   */
  protected async performInstallation(
    packagePath: string,
    options: InstallationOptions
  ): Promise<InstallationResult> {
    this.log(`开始执行Node.js安装: ${this.platform}`, 'info')

    try {
      let result: InstallationResult

      switch (this.platform) {
        case 'win32':
          result = await this.installOnWindows(packagePath, options)
          break
        case 'darwin':
          result = await this.installOnMacOS(packagePath, options)
          break
        case 'linux':
          result = await this.installOnLinux(packagePath, options)
          break
        default:
          throw new Error(`不支持的平台: ${this.platform}`)
      }

      // 安装后配置
      if (result.success) {
        await this.postInstallConfiguration()
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.log(`Node.js安装失败: ${errorMessage}`, 'error')

      return {
        success: false,
        error: errorMessage,
        details: error
      }
    }
  }

  /**
   * Windows平台安装
   */
  private async installOnWindows(
    packagePath: string,
    options: InstallationOptions
  ): Promise<InstallationResult> {
    const packageConfig = NodeJsInstallationManager.NODEJS_PACKAGES.windows
    const installDir = options.installDir || 'C:\\Program Files\\nodejs'

    // 构建安装参数
    const installArgs = [...packageConfig.installArgs, `INSTALLDIR="${installDir}"`]

    if (options.customArgs) {
      installArgs.push(...options.customArgs)
    }

    this.log(`执行Windows安装命令: msiexec /i "${packagePath}" ${installArgs.join(' ')}`, 'debug')

    // 执行安装
    const result = await this.executeCommand('msiexec', ['/i', packagePath, ...installArgs], {
      cwd: this.tempDir
    })

    if (result.exitCode !== 0) {
      throw new Error(`MSI安装失败，退出代码: ${result.exitCode}\n${result.stderr}`)
    }

    this.log('Windows Node.js安装完成', 'info')

    return {
      success: true,
      installPath: installDir,
      executablePath: join(installDir, 'node.exe')
    }
  }

  /**
   * macOS平台安装
   */
  private async installOnMacOS(
    packagePath: string,
    options: InstallationOptions
  ): Promise<InstallationResult> {
    // 优先尝试Homebrew安装
    const hasHomebrew = await this.checkHomebrew()

    if (hasHomebrew && !options.customArgs?.includes('--no-homebrew')) {
      this.log('使用Homebrew安装Node.js', 'info')
      return await this.installWithHomebrew()
    }

    // 备选方案：PKG安装
    this.log('使用PKG包安装Node.js', 'info')
    return await this.installPKGOnMacOS(packagePath, options)
  }

  /**
   * 使用Homebrew安装Node.js
   */
  private async installWithHomebrew(): Promise<InstallationResult> {
    // 安装Node.js（包含npm）
    const result = await this.executeCommand('brew', ['install', 'node'])

    if (result.exitCode !== 0) {
      throw new Error(`Homebrew安装失败: ${result.stderr}`)
    }

    // 获取安装路径
    const whichResult = await this.executeCommand('which', ['node'])
    const nodePath = whichResult.stdout.trim()

    return {
      success: true,
      installPath: '/usr/local/bin',
      executablePath: nodePath
    }
  }

  /**
   * PKG包安装
   */
  private async installPKGOnMacOS(
    packagePath: string,
    _options: InstallationOptions
  ): Promise<InstallationResult> {
    // 执行PKG安装
    const installResult = await this.executeCommand('sudo', [
      'installer',
      '-pkg',
      packagePath,
      '-target',
      '/'
    ])

    if (installResult.exitCode !== 0) {
      throw new Error(`PKG安装失败: ${installResult.stderr}`)
    }

    this.log('macOS Node.js PKG安装完成', 'info')

    return {
      success: true,
      installPath: '/usr/local',
      executablePath: '/usr/local/bin/node'
    }
  }

  /**
   * Linux平台安装
   */
  private async installOnLinux(
    packagePath: string,
    options: InstallationOptions
  ): Promise<InstallationResult> {
    const distro = await this.detectLinuxDistribution()

    if (!distro.supported) {
      // 备选方案：二进制包安装
      return await this.installBinaryOnLinux(packagePath, options)
    }

    this.log(`在${distro.name}上使用包管理器安装Node.js`, 'info')

    // 首先设置NodeSource仓库（推荐方式）
    if (distro.packageManager === 'apt' || distro.packageManager === 'yum') {
      await this.setupNodeSource(distro.packageManager)
    }

    let installCommand: string[]
    let executablePath = '/usr/bin/node'

    switch (distro.packageManager) {
      case 'apt':
        installCommand = ['sudo', 'apt', 'install', '-y', 'nodejs', 'npm']
        break

      case 'yum':
        installCommand = ['sudo', 'yum', 'install', '-y', 'nodejs', 'npm']
        break

      case 'dnf':
        installCommand = ['sudo', 'dnf', 'install', '-y', 'nodejs', 'npm']
        break

      case 'pacman':
        installCommand = ['sudo', 'pacman', '-S', '--noconfirm', 'nodejs', 'npm']
        break

      case 'zypper':
        installCommand = ['sudo', 'zypper', 'install', '-y', 'nodejs', 'npm']
        break

      default:
        // 备选方案：二进制包安装
        return await this.installBinaryOnLinux(packagePath, options)
    }

    if (options.customArgs) {
      installCommand.push(...options.customArgs)
    }

    this.log(`执行Linux安装命令: ${installCommand.join(' ')}`, 'debug')

    const result = await this.executeCommand(installCommand[0], installCommand.slice(1))

    if (result.exitCode !== 0) {
      this.log(`包管理器安装失败，尝试二进制包安装: ${result.stderr}`, 'warning')
      return await this.installBinaryOnLinux(packagePath, options)
    }

    // 验证安装路径
    try {
      const whichResult = await this.executeCommand('which', ['node'])
      executablePath = whichResult.stdout.trim()
    } catch (error) {
      this.log('无法确定Node.js可执行文件路径，使用默认路径', 'warning')
    }

    return {
      success: true,
      installPath: '/usr',
      executablePath
    }
  }

  /**
   * Linux二进制包安装（备选方案）
   */
  private async installBinaryOnLinux(
    packagePath: string,
    options: InstallationOptions
  ): Promise<InstallationResult> {
    const installDir = options.installDir || '/usr/local'
    const nodeDir = join(installDir, 'node')

    this.log('使用二进制包安装Node.js', 'info')

    // 解压tar.xz包
    const extractResult = await this.executeCommand('tar', [
      '-xJf',
      packagePath,
      '-C',
      this.tempDir
    ])

    if (extractResult.exitCode !== 0) {
      throw new Error(`解压失败: ${extractResult.stderr}`)
    }

    // 找到解压后的目录
    const files = await fs.readdir(this.tempDir)
    const extractedDir = files.find((file) => file.startsWith('node-v') && file.includes('linux'))

    if (!extractedDir) {
      throw new Error('找不到解压后的Node.js目录')
    }

    const sourcePath = join(this.tempDir, extractedDir)

    // 创建目标目录
    await this.executeCommand('sudo', ['mkdir', '-p', nodeDir])

    // 复制文件
    const copyResult = await this.executeCommand('sudo', [
      'cp',
      '-R',
      sourcePath + '/*',
      nodeDir + '/'
    ])

    if (copyResult.exitCode !== 0) {
      throw new Error(`文件复制失败: ${copyResult.stderr}`)
    }

    // 创建符号链接
    await this.executeCommand('sudo', [
      'ln',
      '-sf',
      join(nodeDir, 'bin', 'node'),
      '/usr/local/bin/node'
    ])
    await this.executeCommand('sudo', [
      'ln',
      '-sf',
      join(nodeDir, 'bin', 'npm'),
      '/usr/local/bin/npm'
    ])

    return {
      success: true,
      installPath: nodeDir,
      executablePath: join(nodeDir, 'bin', 'node')
    }
  }

  /**
   * 验证安装是否成功
   */
  protected async verifyInstallation(_installPath: string): Promise<{
    valid: boolean
    version?: string
    executablePath?: string
    issues: string[]
  }> {
    const issues: string[] = []

    try {
      // 1. 检查Node.js命令是否可用
      const nodeResult = await this.executeCommand('node', ['--version'])

      if (nodeResult.exitCode !== 0) {
        issues.push('Node.js命令执行失败')
        return { valid: false, issues }
      }

      const nodeVersion = nodeResult.stdout.trim().replace('v', '')

      // 2. 检查npm是否可用
      const npmResult = await this.executeCommand('npm', ['--version'])

      if (npmResult.exitCode !== 0) {
        issues.push('npm命令执行失败')
      } else {
        const npmVersion = npmResult.stdout.trim()
        this.log(`验证成功，npm版本: ${npmVersion}`, 'info')
      }

      // 3. 获取可执行文件路径
      let executablePath: string | undefined
      try {
        const whichResult = await this.executeCommand(
          this.platform === 'win32' ? 'where' : 'which',
          ['node']
        )
        executablePath = whichResult.stdout.trim().split('\n')[0]
      } catch (error) {
        this.log('无法确定Node.js可执行文件路径', 'warning')
      }

      // 4. 验证Node.js基本功能
      const testResult = await this.executeCommand('node', ['-e', 'console.log("Hello World")'])
      if (testResult.exitCode !== 0 || !testResult.stdout.includes('Hello World')) {
        issues.push('Node.js基本功能测试失败')
      }

      // 5. 验证npm基本功能
      const npmConfigResult = await this.executeCommand('npm', ['config', 'get', 'registry'])
      if (npmConfigResult.exitCode !== 0) {
        issues.push('npm配置读取失败')
      }

      this.log(`验证成功，Node.js版本: ${nodeVersion}`, 'info')

      return {
        valid: issues.length === 0,
        version: nodeVersion,
        executablePath,
        issues
      }
    } catch (error) {
      issues.push(`安装验证失败: ${error}`)
      return { valid: false, issues }
    }
  }

  /**
   * 安装后配置
   */
  private async postInstallConfiguration(): Promise<void> {
    this.log('开始安装后配置', 'info')

    try {
      // 1. 配置npm镜像源
      if (this.npmConfig.registry) {
        await this.executeCommand('npm', ['config', 'set', 'registry', this.npmConfig.registry])
        this.log(`设置npm镜像源: ${this.npmConfig.registry}`, 'info')
      }

      // 2. 配置npm超时和重试
      if (this.npmConfig.timeout) {
        await this.executeCommand('npm', [
          'config',
          'set',
          'timeout',
          this.npmConfig.timeout.toString()
        ])
      }

      if (this.npmConfig.retries) {
        await this.executeCommand('npm', [
          'config',
          'set',
          'retries',
          this.npmConfig.retries.toString()
        ])
      }

      // 3. 配置进度显示
      if (typeof this.npmConfig.progress === 'boolean') {
        await this.executeCommand('npm', [
          'config',
          'set',
          'progress',
          this.npmConfig.progress.toString()
        ])
      }

      // 4. 升级npm到最新版本
      try {
        this.log('升级npm到最新版本', 'info')
        await this.executeCommand('npm', ['install', '-g', 'npm@latest'])
      } catch (error) {
        this.log(`npm升级失败: ${error}`, 'warning')
      }

      // 5. 创建全局模块目录（避免权限问题）
      if (this.platform !== 'win32') {
        const globalDir = join(os.homedir(), '.npm-global')
        try {
          await fs.mkdir(globalDir, { recursive: true })
          await this.executeCommand('npm', ['config', 'set', 'prefix', globalDir])
          this.log(`设置npm全局模块目录: ${globalDir}`, 'info')
        } catch (error) {
          this.log(`全局模块目录设置失败: ${error}`, 'warning')
        }
      }

      this.log('安装后配置完成', 'info')
    } catch (error) {
      this.log(`安装后配置失败: ${error}`, 'warning')
    }
  }

  /**
   * 获取最新LTS版本
   */
  private async getLatestLTSVersion(): Promise<string> {
    try {
      this.log('获取最新Node.js LTS版本', 'info')

      // 这里应该实现HTTP请求获取版本信息
      // 由于复杂性，暂时返回默认LTS版本
      return NodeJsInstallationManager.DEFAULT_LTS_VERSION
    } catch (error) {
      this.log(`获取LTS版本失败，使用默认版本: ${error}`, 'warning')
      return NodeJsInstallationManager.DEFAULT_LTS_VERSION
    }
  }

  /**
   * 检查Homebrew是否可用
   */
  private async checkHomebrew(): Promise<boolean> {
    try {
      const result = await this.executeCommand('brew', ['--version'])
      return result.exitCode === 0
    } catch {
      return false
    }
  }

  /**
   * 检测Linux发行版
   */
  private async detectLinuxDistribution(): Promise<{
    name: string
    packageManager: string
    supported: boolean
  }> {
    try {
      // 尝试读取/etc/os-release
      const osRelease = await fs.readFile('/etc/os-release', 'utf-8')
      const lines = osRelease.split('\n')
      const info: Record<string, string> = {}

      for (const line of lines) {
        const [key, value] = line.split('=')
        if (key && value) {
          info[key] = value.replace(/"/g, '')
        }
      }

      const distroId = info.ID?.toLowerCase() || ''
      const distroName = info.NAME || 'Unknown Linux'

      // 根据发行版确定包管理器
      let packageManager = ''
      let supported = true

      if (distroId.includes('ubuntu') || distroId.includes('debian')) {
        packageManager = 'apt'
      } else if (distroId.includes('centos') || distroId.includes('rhel')) {
        packageManager = 'yum'
      } else if (distroId.includes('fedora')) {
        packageManager = 'dnf'
      } else if (distroId.includes('arch')) {
        packageManager = 'pacman'
      } else if (distroId.includes('opensuse') || distroId.includes('suse')) {
        packageManager = 'zypper'
      } else {
        // 尝试检测可用的包管理器
        const managers = ['apt', 'yum', 'dnf', 'pacman', 'zypper']
        for (const manager of managers) {
          try {
            const result = await this.executeCommand('which', [manager])
            if (result.exitCode === 0) {
              packageManager = manager
              break
            }
          } catch {
            continue
          }
        }

        if (!packageManager) {
          supported = false
        }
      }

      return {
        name: distroName,
        packageManager,
        supported
      }
    } catch (error) {
      this.log(`Linux发行版检测失败: ${error}`, 'warning')
      return {
        name: 'Unknown Linux',
        packageManager: '',
        supported: false
      }
    }
  }

  /**
   * 设置NodeSource仓库
   */
  private async setupNodeSource(packageManager: string): Promise<void> {
    this.log('设置NodeSource仓库', 'info')

    try {
      if (packageManager === 'apt') {
        // Ubuntu/Debian
        const commands = [
          ['curl', '-fsSL', 'https://deb.nodesource.com/setup_lts.x'],
          ['sudo', 'bash']
        ]

        const curlResult = await this.executeCommand(commands[0][0], commands[0].slice(1))
        if (curlResult.exitCode === 0) {
          await this.executeCommand('sudo', ['bash'], { cwd: this.tempDir })
        }
      } else if (packageManager === 'yum') {
        // CentOS/RHEL
        await this.executeCommand('curl', [
          '-fsSL',
          'https://rpm.nodesource.com/setup_lts.x',
          '|',
          'sudo',
          'bash',
          '-'
        ])
      }

      this.log('NodeSource仓库设置完成', 'info')
    } catch (error) {
      this.log(`NodeSource仓库设置失败: ${error}`, 'warning')
    }
  }
}
