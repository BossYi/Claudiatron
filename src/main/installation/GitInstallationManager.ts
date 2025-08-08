/**
 * Git安装管理器
 *
 * 基于BaseInstallationManager实现跨平台的Git自动安装功能
 *
 * 功能特性：
 * - Windows: Git for Windows安装包，支持静默安装
 * - macOS: Homebrew优先，备选官方DMG包
 * - Linux: 系统包管理器(apt/yum/pacman等)安装
 * - 与现有gitBashUtils.ts完全集成
 * - PATH环境变量自动配置
 * - 版本选择和兼容性检查
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
import { gitDetectionService } from '../detection/GitDetectionService'
import type { InstallationProgress } from '../types/setupWizard'

/**
 * Git安装包配置接口
 */
interface GitPackageConfig {
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
    // Linux使用包管理器，不需要下载URL
    packageName: string
    installCommand: string[]
  }
}

/**
 * Git安装管理器
 */
export class GitInstallationManager extends BaseInstallationManager {
  private static readonly GIT_PACKAGES: GitPackageConfig = {
    windows: {
      version: '2.50.1',
      downloadUrl:
        'https://github.com/git-for-windows/git/releases/download/v2.50.1.windows.1/Git-2.50.1-64-bit.exe',
      filename: 'Git-2.50.1-64-bit.exe',
      size: 50 * 1024 * 1024, // 50MB
      installArgs: ['/VERYSILENT', '/NORESTART', '/SUPPRESSMSGBOXES', '/CLOSEAPPLICATIONS']
    },
    macos: {
      version: '2.33.0',
      downloadUrl:
        'https://onboardcloud.dl.sourceforge.net/project/git-osx-installer/git-2.33.0-intel-universal-mavericks.dmg?viasf=1',
      filename: 'git-2.33.0-intel-universal-mavericks.dmg',
      size: 45 * 1024 * 1024, // 45MB
      installArgs: []
    },
    linux: {
      version: '2.33.0',
      packageName: 'git',
      installCommand: ['git']
    }
  }

  constructor() {
    super()
  }

  /**
   * 获取软件名称
   */
  protected getSoftwareName(): InstallationProgress['software'] {
    return 'git'
  }

  /**
   * 获取安装包信息
   */
  protected async getPackageInfo(version?: string): Promise<InstallationPackage> {
    const packageConfig = GitInstallationManager.GIT_PACKAGES
    const useVersion =
      version || packageConfig[this.platform as keyof typeof packageConfig]?.version

    switch (this.platform) {
      case 'win32':
        return {
          name: 'Git for Windows',
          version: useVersion,
          downloadUrl: packageConfig.windows.downloadUrl,
          filename: packageConfig.windows.filename,
          size: packageConfig.windows.size,
          platform: this.platform,
          arch: this.arch
        }

      case 'darwin':
        return {
          name: 'Git for macOS',
          version: useVersion,
          downloadUrl: packageConfig.macos.downloadUrl,
          filename: packageConfig.macos.filename,
          size: packageConfig.macos.size,
          platform: this.platform,
          arch: this.arch
        }

      case 'linux':
        // Linux通过包管理器安装，创建虚拟包信息
        return {
          name: 'Git',
          version: useVersion,
          downloadUrl: '', // 不需要下载
          filename: '',
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
        requirements.push('64位系统架构')

        if (this.arch !== 'x64') {
          issues.push(`当前架构 ${this.arch} 不支持，需要 x64`)
        }

        // 检查Windows版本
        const release = os.release()
        const version = release.split('.').map(Number)
        if (version[0] < 10) {
          issues.push('需要Windows 10或更高版本')
        }
      } else if (this.platform === 'darwin') {
        requirements.push('macOS 10.13 (High Sierra) 或更高版本')

        // macOS版本检查可以通过sw_vers命令
        try {
          const { stdout } = await this.executeCommand('sw_vers', ['-productVersion'])
          const version = stdout.trim().split('.').map(Number)
          if (version[0] < 10 || (version[0] === 10 && version[1] < 13)) {
            issues.push('需要macOS 10.13或更高版本')
          }
        } catch (error) {
          this.log('无法检测macOS版本', 'warning')
        }
      } else if (this.platform === 'linux') {
        requirements.push('支持的Linux发行版 (Ubuntu/Debian/CentOS/Fedora等)')

        // 检测Linux发行版
        const distro = await this.detectLinuxDistribution()
        if (!distro.supported) {
          issues.push(`不支持的Linux发行版: ${distro.name}`)
        } else {
          requirements.push(`包管理器: ${distro.packageManager}`)
        }
      }

      // 2. 检查当前Git安装情况
      try {
        const gitStatus = await gitDetectionService.getEnvironmentStatus()
        if (gitStatus.installed) {
          this.log(`检测到已安装的Git版本: ${gitStatus.version}`, 'info')

          // 检查是否需要升级
          if (gitStatus.needsUpdate) {
            this.log('当前Git版本建议升级', 'warning')
          }
        }
      } catch (error) {
        this.log(`Git状态检查失败: ${error}`, 'warning')
      }

      // 3. 磁盘空间检查
      const packageInfo = await this.getPackageInfo()
      if (packageInfo.size) {
        requirements.push(`可用磁盘空间: ${this.formatBytes(packageInfo.size * 2)}`)
      }

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
    this.log(`开始执行Git安装: ${this.platform}`, 'info')

    try {
      switch (this.platform) {
        case 'win32':
          return await this.installOnWindows(packagePath, options)
        case 'darwin':
          return await this.installOnMacOS(packagePath, options)
        case 'linux':
          return await this.installOnLinux(options)
        default:
          throw new Error(`不支持的平台: ${this.platform}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.log(`Git安装失败: ${errorMessage}`, 'error')

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
    const packageConfig = GitInstallationManager.GIT_PACKAGES.windows
    const installDir = options.installDir || 'C:\\Program Files\\Git'

    // 构建安装参数
    const installArgs = [
      ...packageConfig.installArgs,
      `/DIR="${installDir}"`,
      '/COMPONENTS="icons,ext\\reg\\shellhere,assoc,assoc_sh"'
    ]

    if (options.customArgs) {
      installArgs.push(...options.customArgs)
    }

    this.log(`执行Windows安装命令: ${packagePath} ${installArgs.join(' ')}`, 'debug')

    // 执行安装
    const result = await this.executeCommand(packagePath, installArgs, {
      cwd: this.tempDir
    })

    if (result.exitCode !== 0) {
      throw new Error(`安装失败，退出代码: ${result.exitCode}\n${result.stderr}`)
    }

    this.log('Windows Git安装完成', 'info')

    // 更新PATH环境变量
    await this.updateWindowsPath(installDir)

    return {
      success: true,
      installPath: installDir,
      executablePath: join(installDir, 'bin', 'git.exe')
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
      this.log('使用Homebrew安装Git', 'info')
      return await this.installWithHomebrew()
    }

    // 备选方案：DMG安装
    this.log('使用DMG包安装Git', 'info')
    return await this.installDMGOnMacOS(packagePath, options)
  }

  /**
   * 使用Homebrew安装
   */
  private async installWithHomebrew(): Promise<InstallationResult> {
    const result = await this.executeCommand('brew', ['install', 'git'])

    if (result.exitCode !== 0) {
      throw new Error(`Homebrew安装失败: ${result.stderr}`)
    }

    // 获取安装路径
    const whichResult = await this.executeCommand('which', ['git'])
    const gitPath = whichResult.stdout.trim()

    return {
      success: true,
      installPath: '/usr/local/bin',
      executablePath: gitPath
    }
  }

  /**
   * DMG包安装
   */
  private async installDMGOnMacOS(
    packagePath: string,
    _options: InstallationOptions
  ): Promise<InstallationResult> {
    // 挂载DMG
    const mountResult = await this.executeCommand('hdiutil', [
      'attach',
      packagePath,
      '-nobrowse',
      '-quiet'
    ])

    if (mountResult.exitCode !== 0) {
      throw new Error(`DMG挂载失败: ${mountResult.stderr}`)
    }

    try {
      // 查找挂载点中的.pkg文件
      const mountLines = mountResult.stdout.split('\n')
      const mountPoint = mountLines[mountLines.length - 1].split('\t').pop()?.trim()

      if (!mountPoint) {
        throw new Error('无法确定DMG挂载点')
      }

      // 查找.pkg文件
      const files = await fs.readdir(mountPoint)
      const pkgFile = files.find((file) => file.endsWith('.pkg'))

      if (!pkgFile) {
        throw new Error('DMG中未找到.pkg安装文件')
      }

      const pkgPath = join(mountPoint, pkgFile)

      // 执行安装
      const installResult = await this.executeCommand('sudo', [
        'installer',
        '-pkg',
        pkgPath,
        '-target',
        '/'
      ])

      if (installResult.exitCode !== 0) {
        throw new Error(`PKG安装失败: ${installResult.stderr}`)
      }

      return {
        success: true,
        installPath: '/usr/local/git',
        executablePath: '/usr/local/git/bin/git'
      }
    } finally {
      // 卸载DMG
      try {
        await this.executeCommand('hdiutil', ['detach', packagePath, '-quiet'])
      } catch (error) {
        this.log(`DMG卸载失败: ${error}`, 'warning')
      }
    }
  }

  /**
   * Linux平台安装
   */
  private async installOnLinux(options: InstallationOptions): Promise<InstallationResult> {
    const distro = await this.detectLinuxDistribution()

    if (!distro.supported) {
      throw new Error(`不支持的Linux发行版: ${distro.name}`)
    }

    this.log(`在${distro.name}上使用${distro.packageManager}安装Git`, 'info')

    let installCommand: string[]
    let executablePath = '/usr/bin/git'

    switch (distro.packageManager) {
      case 'apt':
        // 更新包列表
        await this.executeCommand('sudo', ['apt', 'update'])
        installCommand = ['sudo', 'apt', 'install', '-y', 'git']
        break

      case 'yum':
        installCommand = ['sudo', 'yum', 'install', '-y', 'git']
        break

      case 'dnf':
        installCommand = ['sudo', 'dnf', 'install', '-y', 'git']
        break

      case 'pacman':
        installCommand = ['sudo', 'pacman', '-S', '--noconfirm', 'git']
        break

      case 'zypper':
        installCommand = ['sudo', 'zypper', 'install', '-y', 'git']
        break

      default:
        throw new Error(`不支持的包管理器: ${distro.packageManager}`)
    }

    if (options.customArgs) {
      installCommand.push(...options.customArgs)
    }

    this.log(`执行Linux安装命令: ${installCommand.join(' ')}`, 'debug')

    const result = await this.executeCommand(installCommand[0], installCommand.slice(1))

    if (result.exitCode !== 0) {
      throw new Error(`包管理器安装失败: ${result.stderr}`)
    }

    // 验证安装路径
    try {
      const whichResult = await this.executeCommand('which', ['git'])
      executablePath = whichResult.stdout.trim()
    } catch (error) {
      this.log('无法确定Git可执行文件路径，使用默认路径', 'warning')
    }

    return {
      success: true,
      installPath: '/usr',
      executablePath
    }
  }

  /**
   * 验证安装是否成功
   */
  protected async verifyInstallation(installPath: string): Promise<{
    valid: boolean
    version?: string
    executablePath?: string
    issues: string[]
  }> {
    const issues: string[] = []

    this.log('开始验证Git安装...', 'info')

    try {
      // 智能验证策略：优先绝对路径，备选PATH搜索，最后重试机制
      const verificationResult = await this.performSmartVerification(installPath)

      if (verificationResult.success) {
        // 验证基本Git功能
        await this.verifyGitFunctionality(verificationResult.executablePath!, issues)

        this.log(`验证成功，Git版本: ${verificationResult.version}`, 'info')

        return {
          valid: issues.length === 0,
          version: verificationResult.version,
          executablePath: verificationResult.executablePath,
          issues
        }
      } else {
        issues.push(...verificationResult.issues)
        return { valid: false, issues }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      issues.push(`安装验证异常: ${errorMsg}`)
      this.log(`验证异常: ${errorMsg}`, 'error')
      return { valid: false, issues }
    }
  }

  /**
   * 智能验证策略
   */
  private async performSmartVerification(installPath: string): Promise<{
    success: boolean
    version?: string
    executablePath?: string
    issues: string[]
  }> {
    const issues: string[] = []

    // 策略1: 绝对路径验证（最可靠）
    this.log('尝试绝对路径验证...', 'debug')
    const absoluteResult = await this.verifyWithAbsolutePath(installPath)
    if (absoluteResult.success) {
      this.log('绝对路径验证成功', 'info')
      return absoluteResult
    }
    issues.push(...absoluteResult.issues)

    // 策略2: PATH环境变量验证
    this.log('尝试PATH环境变量验证...', 'debug')
    const pathResult = await this.verifyWithPath()
    if (pathResult.success) {
      this.log('PATH环境变量验证成功', 'info')
      return pathResult
    }
    issues.push(...pathResult.issues)

    // 策略3: 智能重试（刷新环境变量后重试）
    if (this.platform === 'win32') {
      this.log('尝试环境变量刷新后重试...', 'debug')
      const retryResult = await this.retryWithEnvRefresh(installPath)
      if (retryResult.success) {
        this.log('重试验证成功', 'info')
        return retryResult
      }
      issues.push(...retryResult.issues)
    }

    return { success: false, issues }
  }

  /**
   * 绝对路径验证
   */
  private async verifyWithAbsolutePath(installPath: string): Promise<{
    success: boolean
    version?: string
    executablePath?: string
    issues: string[]
  }> {
    const issues: string[] = []

    try {
      // 构造Git可执行文件的绝对路径
      let gitExecutable: string
      if (this.platform === 'win32') {
        gitExecutable = join(installPath, 'bin', 'git.exe')
      } else {
        gitExecutable = join(installPath, 'bin', 'git')
      }

      this.log(`检查绝对路径: ${gitExecutable}`, 'debug')

      // 检查文件是否存在
      try {
        await fs.access(gitExecutable)
      } catch {
        issues.push(`Git可执行文件不存在: ${gitExecutable}`)
        return { success: false, issues }
      }

      // 使用绝对路径执行版本检查
      const versionResult = await this.executeCommand(gitExecutable, ['--version'])

      if (versionResult.exitCode !== 0) {
        issues.push(`绝对路径Git命令执行失败: ${versionResult.stderr}`)
        return { success: false, issues }
      }

      // 解析版本信息
      const versionMatch = versionResult.stdout.match(/git version (\d+\.\d+\.\d+)/)
      const version = versionMatch ? versionMatch[1] : 'unknown'

      return {
        success: true,
        version,
        executablePath: gitExecutable,
        issues: []
      }
    } catch (error) {
      issues.push(`绝对路径验证异常: ${error}`)
      return { success: false, issues }
    }
  }

  /**
   * PATH环境变量验证
   */
  private async verifyWithPath(): Promise<{
    success: boolean
    version?: string
    executablePath?: string
    issues: string[]
  }> {
    const issues: string[] = []

    try {
      // 使用PATH中的git命令
      const versionResult = await this.executeCommand('git', ['--version'])

      if (versionResult.exitCode !== 0) {
        issues.push(`PATH中的Git命令执行失败: ${versionResult.stderr}`)
        return { success: false, issues }
      }

      // 解析版本信息
      const versionMatch = versionResult.stdout.match(/git version (\d+\.\d+\.\d+)/)
      const version = versionMatch ? versionMatch[1] : 'unknown'

      // 获取可执行文件路径
      let executablePath: string | undefined
      try {
        const whichResult = await this.executeCommand(
          this.platform === 'win32' ? 'where' : 'which',
          ['git']
        )
        executablePath = whichResult.stdout.trim().split('\n')[0]
      } catch {
        // 无法获取路径但命令可以执行，仍算成功
        executablePath = 'git' // 使用命令名作为后备
      }

      return {
        success: true,
        version,
        executablePath,
        issues: []
      }
    } catch (error) {
      issues.push(`PATH验证异常: ${error}`)
      return { success: false, issues }
    }
  }

  /**
   * 环境变量刷新后重试（仅Windows）
   */
  private async retryWithEnvRefresh(installPath: string): Promise<{
    success: boolean
    version?: string
    executablePath?: string
    issues: string[]
  }> {
    const issues: string[] = []

    try {
      // 短暂等待让环境变量生效
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // 重新读取系统PATH
      try {
        const regResult = await this.executeCommand('reg', [
          'query',
          'HKEY_CURRENT_USER\\Environment',
          '/v',
          'PATH'
        ])

        if (regResult.exitCode === 0) {
          // 解析注册表PATH值
          const pathMatch = regResult.stdout.match(/PATH\s+REG_[A-Z_]+\s+(.+)$/)
          if (pathMatch) {
            const registryPath = pathMatch[1].trim()
            // 展开环境变量
            const expandedPath = registryPath.replace(/%([^%]+)%/g, (match, varName) => {
              return process.env[varName] || match
            })

            // 更新当前进程的PATH
            process.env.PATH = expandedPath
            this.log('已刷新环境变量PATH', 'debug')
          }
        }
      } catch (error) {
        this.log(`读取注册表PATH失败: ${error}`, 'warning')
      }

      // 重试验证：先绝对路径，再PATH
      const absoluteResult = await this.verifyWithAbsolutePath(installPath)
      if (absoluteResult.success) {
        return absoluteResult
      }

      // 如果绝对路径仍失败，尝试PATH验证
      return await this.verifyWithPath()
    } catch (error) {
      issues.push(`重试验证异常: ${error}`)
      return { success: false, issues }
    }
  }

  /**
   * 验证Git基本功能
   */
  private async verifyGitFunctionality(executablePath: string, issues: string[]): Promise<void> {
    try {
      // 1. 验证配置命令
      const configResult = await this.executeCommand(executablePath, ['config', '--list'])
      if (configResult.exitCode !== 0) {
        issues.push('Git配置读取失败')
        this.log(`Git配置读取失败: ${configResult.stderr}`, 'warning')
      }

      // 2. 验证帮助命令
      const helpResult = await this.executeCommand(executablePath, ['help'])
      if (helpResult.exitCode !== 0) {
        issues.push('Git帮助命令失败')
        this.log(`Git帮助命令失败: ${helpResult.stderr}`, 'warning')
      }

      // 3. Windows特殊验证：检查PATH配置
      if (this.platform === 'win32') {
        const pathCheck = await this.verifyWindowsPath()
        if (!pathCheck.valid) {
          issues.push(`PATH配置问题: ${pathCheck.issues.join(', ')}`)
        }
      }
    } catch (error) {
      issues.push(`Git功能验证失败: ${error}`)
      this.log(`Git功能验证失败: ${error}`, 'warning')
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
   * 更新Windows PATH环境变量
   */
  private async updateWindowsPath(installDir: string): Promise<void> {
    try {
      const gitBinPath = join(installDir, 'bin')

      // 检查当前进程PATH中是否已包含Git
      const currentPath = process.env.PATH || ''
      const pathEntries = currentPath.split(';').map((p) => p.trim())

      // 检查是否已存在
      const gitBinPathNormalized = gitBinPath.toLowerCase()
      const alreadyInPath = pathEntries.some(
        (entry) =>
          entry.toLowerCase() === gitBinPathNormalized || entry.toLowerCase().includes('git\\bin')
      )

      if (alreadyInPath) {
        this.log('Git已在PATH环境变量中', 'info')
        return
      }

      this.log(`准备添加到PATH: ${gitBinPath}`, 'debug')

      // 1. 更新注册表中的用户PATH（持久化）
      const setxResult = await this.executeCommand('setx', ['PATH', `%PATH%;${gitBinPath}`])

      if (setxResult.exitCode !== 0) {
        this.log(`setx命令失败: ${setxResult.stderr}`, 'warning')
      } else {
        this.log('注册表PATH已更新', 'debug')
      }

      // 2. 同步更新当前进程的PATH环境变量（立即生效）
      const newPath = `${currentPath};${gitBinPath}`
      process.env.PATH = newPath
      this.log('当前进程PATH已同步更新', 'info')

      // 3. 验证PATH更新是否成功
      const verifyResult = await this.verifyPathUpdate(gitBinPath)
      if (verifyResult.success) {
        this.log(`PATH更新成功: ${verifyResult.detectedPath}`, 'info')
      } else {
        this.log(`PATH更新验证失败: ${verifyResult.error}`, 'warning')
      }
    } catch (error) {
      this.log(`PATH环境变量更新失败: ${error}`, 'error')
    }
  }

  /**
   * 验证PATH更新是否成功
   */
  private async verifyPathUpdate(expectedPath: string): Promise<{
    success: boolean
    detectedPath?: string
    error?: string
  }> {
    try {
      // 使用where命令查找git.exe
      const whereResult = await this.executeCommand('where', ['git'])

      if (whereResult.exitCode === 0) {
        const detectedPath = whereResult.stdout.trim().split('\n')[0]
        const expectedGitExe = join(expectedPath, 'git.exe')

        // 检查检测到的路径是否匹配预期
        if (detectedPath.toLowerCase() === expectedGitExe.toLowerCase()) {
          return { success: true, detectedPath }
        } else {
          return {
            success: true, // 找到了git但路径不同
            detectedPath,
            error: `检测到不同的Git安装: ${detectedPath}`
          }
        }
      } else {
        return {
          success: false,
          error: `where命令失败: ${whereResult.stderr}`
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `PATH验证异常: ${error}`
      }
    }
  }

  /**
   * 验证Windows PATH配置（增强版）
   */
  private async verifyWindowsPath(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = []
    const diagnostics: string[] = []

    try {
      // 1. 分析当前进程PATH
      const processPathResult = await this.analyzeProcessPath()
      diagnostics.push(`当前进程PATH状态: ${processPathResult.summary}`)
      if (processPathResult.issues.length > 0) {
        issues.push(...processPathResult.issues.map((issue) => `进程PATH: ${issue}`))
      }

      // 2. 分析注册表PATH
      const registryPathResult = await this.analyzeRegistryPath()
      diagnostics.push(`注册表PATH状态: ${registryPathResult.summary}`)
      if (registryPathResult.issues.length > 0) {
        issues.push(...registryPathResult.issues.map((issue) => `注册表PATH: ${issue}`))
      }

      // 3. 检查Git命令可用性
      const gitCommandResult = await this.checkGitCommandAvailability()
      diagnostics.push(`Git命令可用性: ${gitCommandResult.summary}`)
      if (gitCommandResult.issues.length > 0) {
        issues.push(...gitCommandResult.issues)
      }

      // 4. 检查PATH一致性
      if (processPathResult.gitPaths.length !== registryPathResult.gitPaths.length) {
        issues.push('进程PATH与注册表PATH不一致，可能需要重启应用程序')
      }

      // 5. 记录诊断信息
      for (const diagnostic of diagnostics) {
        this.log(diagnostic, 'debug')
      }

      // 6. 提供修复建议
      if (issues.length > 0) {
        const suggestions = this.generatePathFixSuggestions(processPathResult, registryPathResult)
        issues.push('修复建议:', ...suggestions)
      }

      return {
        valid: issues.length === 0,
        issues
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      issues.push(`PATH验证异常: ${errorMsg}`)
      this.log(`PATH验证异常: ${errorMsg}`, 'error')
      return { valid: false, issues }
    }
  }

  /**
   * 分析当前进程PATH
   */
  private async analyzeProcessPath(): Promise<{
    gitPaths: string[]
    allPaths: string[]
    issues: string[]
    summary: string
  }> {
    const issues: string[] = []
    const currentPath = process.env.PATH || ''
    const allPaths = currentPath
      .split(';')
      .filter(Boolean)
      .map((p) => p.trim())

    // 查找Git相关路径
    const gitPaths = allPaths.filter(
      (path) => path.toLowerCase().includes('git') && path.toLowerCase().includes('bin')
    )

    let summary = `共${allPaths.length}个路径条目`
    if (gitPaths.length > 0) {
      summary += `, ${gitPaths.length}个Git相关路径`
    } else {
      summary += ', 无Git路径'
      issues.push('PATH中未找到Git相关路径')
    }

    // 检查重复路径
    const pathCounts = new Map<string, number>()
    for (const path of allPaths) {
      const normalizedPath = path.toLowerCase()
      pathCounts.set(normalizedPath, (pathCounts.get(normalizedPath) || 0) + 1)
    }

    const duplicates = Array.from(pathCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([path]) => path)

    if (duplicates.length > 0) {
      issues.push(`发现重复PATH条目: ${duplicates.join(', ')}`)
    }

    return { gitPaths, allPaths, issues, summary }
  }

  /**
   * 分析注册表PATH
   */
  private async analyzeRegistryPath(): Promise<{
    gitPaths: string[]
    allPaths: string[]
    issues: string[]
    summary: string
  }> {
    const issues: string[] = []
    let allPaths: string[] = []
    let gitPaths: string[] = []

    try {
      // 读取用户PATH
      const userResult = await this.executeCommand('reg', [
        'query',
        'HKEY_CURRENT_USER\\Environment',
        '/v',
        'PATH'
      ])

      if (userResult.exitCode === 0) {
        const pathMatch = userResult.stdout.match(/PATH\s+REG_[A-Z_]+\s+(.+)$/m)
        if (pathMatch) {
          const rawPath = pathMatch[1].trim()
          // 简单的环境变量展开
          const expandedPath = rawPath.replace(/%([^%]+)%/g, (match, varName) => {
            return process.env[varName] || match
          })

          allPaths = expandedPath
            .split(';')
            .filter(Boolean)
            .map((p) => p.trim())
          gitPaths = allPaths.filter(
            (path) => path.toLowerCase().includes('git') && path.toLowerCase().includes('bin')
          )
        }
      } else {
        issues.push('无法读取用户注册表PATH')
      }
    } catch (error) {
      issues.push(`读取注册表失败: ${error}`)
    }

    let summary = `用户注册表PATH: ${allPaths.length}个条目`
    if (gitPaths.length > 0) {
      summary += `, ${gitPaths.length}个Git路径`
    } else {
      summary += ', 无Git路径'
      if (allPaths.length > 0) {
        issues.push('注册表PATH中未包含Git路径')
      }
    }

    return { gitPaths, allPaths, issues, summary }
  }

  /**
   * 检查Git命令可用性
   */
  private async checkGitCommandAvailability(): Promise<{
    available: boolean
    issues: string[]
    summary: string
  }> {
    const issues: string[] = []

    try {
      // 测试git --version命令
      const versionResult = await this.executeCommand('git', ['--version'])

      if (versionResult.exitCode === 0) {
        // 测试where git命令
        const whereResult = await this.executeCommand('where', ['git'])

        if (whereResult.exitCode === 0) {
          const gitPath = whereResult.stdout.trim().split('\n')[0]
          return {
            available: true,
            issues: [],
            summary: `可用，路径: ${gitPath}`
          }
        } else {
          issues.push('git命令可执行但where命令失败')
          return {
            available: true,
            issues,
            summary: 'git命令可用但路径查找失败'
          }
        }
      } else {
        issues.push('git命令执行失败')
        return {
          available: false,
          issues,
          summary: `不可用: ${versionResult.stderr || '命令执行失败'}`
        }
      }
    } catch (error) {
      issues.push(`Git命令测试异常: ${error}`)
      return {
        available: false,
        issues,
        summary: `检查异常: ${error}`
      }
    }
  }

  /**
   * 生成PATH修复建议
   */
  private generatePathFixSuggestions(
    processPath: { gitPaths: string[]; allPaths: string[] },
    registryPath: { gitPaths: string[]; allPaths: string[] }
  ): string[] {
    const suggestions: string[] = []

    // 1. 如果两者都没有Git路径
    if (processPath.gitPaths.length === 0 && registryPath.gitPaths.length === 0) {
      suggestions.push('手动添加Git到PATH: 控制面板 → 系统 → 高级系统设置 → 环境变量')
      suggestions.push('或重新安装Git for Windows并选择"添加到PATH"选项')
    }

    // 2. 如果注册表有Git路径但进程PATH没有
    else if (registryPath.gitPaths.length > 0 && processPath.gitPaths.length === 0) {
      suggestions.push('PATH已在注册表中设置，请重启应用程序使其生效')
      suggestions.push('或在当前会话中手动刷新环境变量')
    }

    // 3. 如果进程PATH有Git路径但注册表没有
    else if (processPath.gitPaths.length > 0 && registryPath.gitPaths.length === 0) {
      suggestions.push('Git路径仅在当前会话中有效，重启后将丢失')
      suggestions.push('请将Git路径永久添加到用户或系统PATH环境变量')
    }

    // 4. 检查路径冲突
    if (processPath.gitPaths.length > 1) {
      suggestions.push(`检测到多个Git路径: ${processPath.gitPaths.join(', ')}`)
      suggestions.push('请移除重复的Git路径以避免冲突')
    }

    return suggestions
  }
}
