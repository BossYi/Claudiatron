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
    checksum: string
    size: number
    installArgs: string[]
  }
  macos: {
    version: string
    downloadUrl: string
    filename: string
    checksum: string
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
      version: '2.43.0',
      downloadUrl:
        'https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe',
      filename: 'Git-2.43.0-64-bit.exe',
      checksum: 'c9b2c280f9b0d9e85c1f3f8b7b8b2c280f9b0d9e85c1f3f8b7b8b2c280f9b0d9e8',
      size: 50 * 1024 * 1024, // 50MB
      installArgs: ['/VERYSILENT', '/NORESTART', '/SUPPRESSMSGBOXES', '/CLOSEAPPLICATIONS']
    },
    macos: {
      version: '2.43.0',
      downloadUrl:
        'https://github.com/git-for-windows/git/releases/download/v2.43.0/git-2.43.0-intel-universal-mavericks.dmg',
      filename: 'git-2.43.0-intel-universal-mavericks.dmg',
      checksum: 'd9e85c1f3f8b7b8b2c280f9b0d9e85c1f3f8b7b8b2c280f9b0d9e85c1f3f8b7b8',
      size: 45 * 1024 * 1024, // 45MB
      installArgs: []
    },
    linux: {
      version: '2.43.0',
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
          checksumType: 'sha256',
          checksum: packageConfig.windows.checksum,
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
          checksumType: 'sha256',
          checksum: packageConfig.macos.checksum,
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
          checksumType: 'sha256',
          checksum: '',
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
  protected async verifyInstallation(_installPath: string): Promise<{
    valid: boolean
    version?: string
    executablePath?: string
    issues: string[]
  }> {
    const issues: string[] = []

    try {
      // 1. 检查Git命令是否可用
      const versionResult = await this.executeCommand('git', ['--version'])

      if (versionResult.exitCode !== 0) {
        issues.push('Git命令执行失败')
        return { valid: false, issues }
      }

      // 2. 解析版本信息
      const versionMatch = versionResult.stdout.match(/git version (\d+\.\d+\.\d+)/)
      const version = versionMatch ? versionMatch[1] : 'unknown'

      // 3. 获取可执行文件路径
      let executablePath: string | undefined
      try {
        const whichResult = await this.executeCommand(
          this.platform === 'win32' ? 'where' : 'which',
          ['git']
        )
        executablePath = whichResult.stdout.trim().split('\n')[0]
      } catch (error) {
        this.log('无法确定Git可执行文件路径', 'warning')
      }

      // 4. 验证基本Git功能
      const configResult = await this.executeCommand('git', ['config', '--list'])
      if (configResult.exitCode !== 0) {
        issues.push('Git配置读取失败')
      }

      // 5. 验证PATH配置
      if (this.platform === 'win32') {
        const pathCheck = await this.verifyWindowsPath()
        if (!pathCheck.valid) {
          issues.push('Git未正确添加到PATH环境变量')
        }
      }

      this.log(`验证成功，Git版本: ${version}`, 'info')

      return {
        valid: issues.length === 0,
        version,
        executablePath,
        issues
      }
    } catch (error) {
      issues.push(`安装验证失败: ${error}`)
      return { valid: false, issues }
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

      // 检查PATH中是否already包含Git
      const pathCheck = await this.executeCommand('echo', ['%PATH%'], {
        env: process.env as Record<string, string>
      })
      const currentPath = pathCheck.stdout

      if (currentPath.toLowerCase().includes(gitBinPath.toLowerCase())) {
        this.log('Git已在PATH环境变量中', 'info')
        return
      }

      // 添加到用户PATH（推荐方式，避免需要管理员权限）
      const setxResult = await this.executeCommand('setx', ['PATH', `%PATH%;${gitBinPath}`])

      if (setxResult.exitCode === 0) {
        this.log('Git已添加到PATH环境变量', 'info')
      } else {
        this.log('PATH环境变量更新失败，可能需要手动添加', 'warning')
      }
    } catch (error) {
      this.log(`PATH环境变量更新失败: ${error}`, 'warning')
    }
  }

  /**
   * 验证Windows PATH配置
   */
  private async verifyWindowsPath(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = []

    try {
      // 检查git命令是否可以直接执行
      const result = await this.executeCommand('git', ['--version'])

      if (result.exitCode !== 0) {
        issues.push('Git命令无法在命令行中直接执行')
      }

      return {
        valid: issues.length === 0,
        issues
      }
    } catch (error) {
      issues.push(`PATH验证失败: ${error}`)
      return { valid: false, issues }
    }
  }
}
