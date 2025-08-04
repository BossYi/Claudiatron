/**
 * 仓库导入服务
 *
 * 提供智能的Git仓库导入功能，包括：
 * - URL验证和仓库分析
 * - 安全的Git克隆策略
 * - 自动项目检测和配置
 * - 项目列表自动更新
 * - 私有仓库和SSH密钥支持
 */

import { promises as fs } from 'fs'
import { join, basename, dirname } from 'path'
import { EventEmitter } from 'events'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import * as os from 'os'
import { URL } from 'url'
import { gitDetectionService } from '../detection/GitDetectionService'
import type { RepositoryCloneRequest, RepositoryCloneProgress } from '../types/setupWizard'

const execAsync = promisify(exec)

/**
 * 仓库验证结果
 */
export interface RepositoryValidationResult {
  valid: boolean
  normalizedUrl: string
  repoName: string
  owner?: string
  platform: 'github' | 'gitlab' | 'bitbucket' | 'other'
  isPrivate?: boolean
  error?: string
  suggestions?: string[]
}

/**
 * 仓库分析结果
 */
export interface RepositoryAnalysis {
  accessible: boolean
  size?: number
  defaultBranch: string
  branches: string[]
  hasReadme: boolean
  languages: string[]
  framework?: string
  buildSystem?: string
  packageManager?: string
  error?: string
}

/**
 * 项目类型
 */
export type ProjectType =
  | 'javascript'
  | 'typescript'
  | 'react'
  | 'vue'
  | 'angular'
  | 'python'
  | 'django'
  | 'flask'
  | 'fastapi'
  | 'rust'
  | 'go'
  | 'java'
  | 'kotlin'
  | 'cpp'
  | 'csharp'
  | 'php'
  | 'other'

/**
 * 项目信息
 */
export interface ProjectInfo {
  name: string
  path: string
  type: ProjectType
  description?: string
  repositoryUrl?: string
  createdAt: string
}

/**
 * 克隆结果
 */
export interface RepositoryCloneResult {
  success: boolean
  localPath?: string
  projectInfo?: ProjectInfo
  error?: string
  progress?: number
}

/**
 * 项目导入结果
 */
export interface ProjectImportResult {
  success: boolean
  project?: ProjectInfo
  error?: string
}

/**
 * 克隆选项
 */
export interface CloneOptions {
  depth?: number
  branch?: string
  recursive?: boolean
  credentials?: {
    username?: string
    password?: string
    sshKey?: string
  }
}

/**
 * 仓库导入服务
 */
export class RepositoryImportService extends EventEmitter {
  private readonly claudeProjectsDir: string
  constructor() {
    super()
    this.claudeProjectsDir = join(os.homedir(), '.claude', 'projects')
    this.ensureDirectoryExists()
  }

  /**
   * 确保目录存在
   */
  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.mkdir(this.claudeProjectsDir, { recursive: true })
    } catch (error) {
      console.error('创建Claude项目目录失败:', error)
    }
  }

  /**
   * 验证仓库URL
   */
  public async validateRepositoryUrl(url: string): Promise<RepositoryValidationResult> {
    try {
      // 1. 基本URL格式验证
      const normalizedUrl = this.normalizeRepositoryUrl(url)
      if (!normalizedUrl) {
        return {
          valid: false,
          normalizedUrl: url,
          repoName: '',
          platform: 'other',
          error: '无效的仓库URL格式'
        }
      }

      // 2. 解析仓库信息
      const repoInfo = this.parseRepositoryUrl(normalizedUrl)

      // 3. 检查Git是否可用
      const gitStatus = await gitDetectionService.getEnvironmentStatus()
      if (!gitStatus.installed) {
        return {
          valid: false,
          normalizedUrl,
          repoName: repoInfo.name,
          platform: repoInfo.platform,
          error: 'Git未安装，无法克隆仓库'
        }
      }

      // 4. 测试仓库可访问性
      const accessibility = await this.testRepositoryAccessibility(normalizedUrl)

      return {
        valid: true,
        normalizedUrl,
        repoName: repoInfo.name,
        owner: repoInfo.owner,
        platform: repoInfo.platform,
        isPrivate: !accessibility.public,
        suggestions: this.generateValidationSuggestions(repoInfo, accessibility)
      }
    } catch (error) {
      return {
        valid: false,
        normalizedUrl: url,
        repoName: basename(url),
        platform: 'other',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 标准化仓库URL
   */
  private normalizeRepositoryUrl(url: string): string | null {
    try {
      // 处理常见的URL格式
      let normalizedUrl = url.trim()

      // GitHub简写形式: owner/repo
      if (/^[\w-]+\/[\w-]+$/.test(normalizedUrl)) {
        normalizedUrl = `https://github.com/${normalizedUrl}.git`
      }

      // 添加.git后缀（如果需要）
      if (normalizedUrl.includes('github.com') && !normalizedUrl.endsWith('.git')) {
        normalizedUrl += '.git'
      }

      // 验证URL格式
      const parsedUrl = new URL(normalizedUrl)
      if (!['http:', 'https:', 'git:', 'ssh:'].includes(parsedUrl.protocol)) {
        return null
      }

      return normalizedUrl
    } catch {
      return null
    }
  }

  /**
   * 解析仓库URL信息
   */
  private parseRepositoryUrl(url: string): {
    name: string
    owner?: string
    platform: 'github' | 'gitlab' | 'bitbucket' | 'other'
  } {
    try {
      const parsedUrl = new URL(url)
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean)

      let platform: 'github' | 'gitlab' | 'bitbucket' | 'other' = 'other'
      if (parsedUrl.hostname.includes('github.com')) platform = 'github'
      else if (parsedUrl.hostname.includes('gitlab.com')) platform = 'gitlab'
      else if (parsedUrl.hostname.includes('bitbucket.org')) platform = 'bitbucket'

      const name = pathParts[pathParts.length - 1]?.replace('.git', '') || 'unknown'
      const owner = pathParts[pathParts.length - 2]

      return { name, owner, platform }
    } catch {
      return { name: basename(url), platform: 'other' }
    }
  }

  /**
   * 测试仓库可访问性
   */
  private async testRepositoryAccessibility(url: string): Promise<{
    accessible: boolean
    public: boolean
    error?: string
  }> {
    try {
      // 使用git ls-remote测试可访问性
      const { stderr } = await execAsync(`git ls-remote ${url}`, { timeout: 10000 })

      // 如果没有错误，说明是公开的或者已认证的私有仓库
      return {
        accessible: true,
        public: !stderr.includes('authentication') && !stderr.includes('permission')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      // 分析错误类型
      if (errorMessage.includes('authentication') || errorMessage.includes('permission')) {
        return {
          accessible: true,
          public: false,
          error: '仓库是私有的，需要认证'
        }
      } else if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
        return {
          accessible: false,
          public: false,
          error: '仓库不存在或URL无效'
        }
      } else {
        return {
          accessible: false,
          public: false,
          error: '网络连接问题或其他错误'
        }
      }
    }
  }

  /**
   * 生成验证建议
   */
  private generateValidationSuggestions(
    repoInfo: { name: string; owner?: string; platform: string },
    accessibility: { accessible: boolean; public: boolean; error?: string }
  ): string[] {
    const suggestions: string[] = []

    if (!accessibility.accessible) {
      suggestions.push('检查网络连接')
      suggestions.push('确认仓库URL正确')
    } else if (!accessibility.public) {
      suggestions.push('配置SSH密钥或访问令牌')
      suggestions.push('确认具有仓库访问权限')
    }

    if (repoInfo.platform === 'github' && repoInfo.owner) {
      suggestions.push(`可以使用简写形式: ${repoInfo.owner}/${repoInfo.name}`)
    }

    return suggestions
  }

  /**
   * 分析仓库
   */
  public async analyzeRepository(url: string): Promise<RepositoryAnalysis> {
    try {
      // 获取仓库基本信息
      const remoteInfo = await this.getRemoteRepositoryInfo(url)

      // 检测编程语言（通过API或克隆后分析）
      const languages = await this.detectRepositoryLanguages(url)

      return {
        accessible: true,
        defaultBranch: remoteInfo.defaultBranch || 'main',
        branches: remoteInfo.branches || [],
        hasReadme: remoteInfo.hasReadme || false,
        languages,
        framework: this.detectFramework(languages),
        buildSystem: this.detectBuildSystem(languages),
        packageManager: this.detectPackageManager(languages)
      }
    } catch (error) {
      return {
        accessible: false,
        defaultBranch: 'main',
        branches: [],
        hasReadme: false,
        languages: [],
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 获取远程仓库信息
   */
  private async getRemoteRepositoryInfo(url: string): Promise<{
    defaultBranch?: string
    branches?: string[]
    hasReadme?: boolean
  }> {
    try {
      // 获取远程分支信息
      const { stdout } = await execAsync(`git ls-remote --heads ${url}`)
      const branches = stdout
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => line.split('\t')[1].replace('refs/heads/', ''))

      // 推测默认分支
      const defaultBranch = branches.includes('main')
        ? 'main'
        : branches.includes('master')
          ? 'master'
          : branches[0] || 'main'

      return {
        defaultBranch,
        branches,
        hasReadme: false // 需要克隆后才能准确检测
      }
    } catch {
      return {}
    }
  }

  /**
   * 检测仓库编程语言
   */
  private async detectRepositoryLanguages(_url: string): Promise<string[]> {
    // 这里可以通过GitHub API等方式获取语言信息
    // 暂时返回空数组，实际克隆后会进行详细检测
    return []
  }

  /**
   * 检测框架
   */
  private detectFramework(languages: string[]): string | undefined {
    // 基于语言推测可能的框架
    if (languages.includes('javascript') || languages.includes('typescript')) {
      return 'web' // 需要进一步检测具体框架
    }
    if (languages.includes('python')) {
      return 'python'
    }
    return undefined
  }

  /**
   * 检测构建系统
   */
  private detectBuildSystem(languages: string[]): string | undefined {
    if (languages.includes('javascript') || languages.includes('typescript')) {
      return 'npm' // 需要进一步检测
    }
    if (languages.includes('python')) {
      return 'pip'
    }
    if (languages.includes('rust')) {
      return 'cargo'
    }
    if (languages.includes('go')) {
      return 'go'
    }
    return undefined
  }

  /**
   * 检测包管理器
   */
  private detectPackageManager(languages: string[]): string | undefined {
    return this.detectBuildSystem(languages) // 暂时复用构建系统检测
  }

  /**
   * 克隆仓库
   */
  public async cloneRepository(request: RepositoryCloneRequest): Promise<RepositoryCloneResult> {
    try {
      console.log('开始克隆仓库:', request.url)

      // 1. 验证输入
      const validation = await this.validateRepositoryUrl(request.url)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || '仓库URL无效'
        }
      }

      // 2. 准备本地路径
      const localPath = request.localPath || join(this.claudeProjectsDir, validation.repoName)
      await this.prepareLocalPath(localPath)

      // 3. 执行克隆
      const cloneResult = await this.performGitClone(
        validation.normalizedUrl,
        localPath,
        request.options || {}
      )

      if (!cloneResult.success) {
        return {
          success: false,
          error: cloneResult.error
        }
      }

      // 4. 分析项目
      const projectInfo = await this.analyzeClonedProject(localPath, validation)

      console.log('仓库克隆完成:', localPath)

      return {
        success: true,
        localPath,
        projectInfo,
        progress: 100
      }
    } catch (error) {
      console.error('克隆仓库失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 准备本地路径
   */
  private async prepareLocalPath(localPath: string): Promise<void> {
    try {
      // 检查目录是否已存在
      try {
        const stats = await fs.stat(localPath)
        if (stats.isDirectory()) {
          // 检查是否为空目录
          const files = await fs.readdir(localPath)
          if (files.length > 0) {
            throw new Error(`目标目录不为空: ${localPath}`)
          }
        }
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          // 目录不存在，创建父目录
          await fs.mkdir(dirname(localPath), { recursive: true })
        } else {
          throw error
        }
      }
    } catch (error) {
      throw new Error(`准备本地路径失败: ${error}`)
    }
  }

  /**
   * 执行Git克隆
   */
  private async performGitClone(
    url: string,
    localPath: string,
    options: CloneOptions
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const args = ['clone']

      // 添加选项
      if (options.depth) {
        args.push('--depth', options.depth.toString())
      }
      if (options.branch) {
        args.push('--branch', options.branch)
      }
      if (options.recursive) {
        args.push('--recursive')
      }

      args.push(url, localPath)

      console.log('执行Git克隆命令:', 'git', args.join(' '))

      const child = spawn('git', args, {
        stdio: 'pipe',
        env: process.env
      })

      let stderr = ''
      let lastProgress = 0

      child.stdout?.on('data', (data) => {
        const output = data.toString()
        console.log('Git stdout:', output)

        // 解析克隆进度
        if (output.includes('Receiving objects')) {
          const match = output.match(/(\d+)%/)
          if (match) {
            const progress = parseInt(match[1])
            if (progress > lastProgress) {
              lastProgress = progress
              this.reportCloneProgress('cloning', progress, `克隆中... ${progress}%`)
            }
          }
        }
      })

      child.stderr?.on('data', (data) => {
        const output = data.toString()
        stderr += output
        console.log('Git stderr:', output)

        // Git的进度信息通常在stderr中
        if (output.includes('Cloning into')) {
          this.reportCloneProgress('cloning', 10, '开始克隆...')
        }
      })

      child.on('close', (code) => {
        if (code === 0) {
          this.reportCloneProgress('completed', 100, '克隆完成')
          resolve({ success: true })
        } else {
          const error = stderr || `Git克隆失败，退出代码: ${code}`
          this.reportCloneProgress('failed', 0, '克隆失败', error)
          resolve({ success: false, error })
        }
      })

      child.on('error', (error) => {
        const errorMessage = `Git进程错误: ${error.message}`
        this.reportCloneProgress('failed', 0, '克隆失败', errorMessage)
        resolve({ success: false, error: errorMessage })
      })
    })
  }

  /**
   * 报告克隆进度
   */
  private reportCloneProgress(
    status: RepositoryCloneProgress['status'],
    progress: number,
    message: string,
    error?: string
  ): void {
    const progressInfo: RepositoryCloneProgress = {
      status,
      progress: Math.max(0, Math.min(100, progress)),
      message,
      error
    }

    this.emit('progress', progressInfo)
    console.log(`克隆进度 ${progress}%: ${message}`)
  }

  /**
   * 分析已克隆的项目
   */
  private async analyzeClonedProject(
    localPath: string,
    repoInfo: RepositoryValidationResult
  ): Promise<ProjectInfo> {
    try {
      const projectType = await this.detectProjectType(localPath)
      const description = await this.getProjectDescription(localPath)

      return {
        name: repoInfo.repoName,
        path: localPath,
        type: projectType,
        description,
        repositoryUrl: repoInfo.normalizedUrl,
        createdAt: new Date().toISOString()
      }
    } catch (error) {
      console.warn('项目分析失败:', error)
      return {
        name: repoInfo.repoName,
        path: localPath,
        type: 'other',
        repositoryUrl: repoInfo.normalizedUrl,
        createdAt: new Date().toISOString()
      }
    }
  }

  /**
   * 检测项目类型
   */
  private async detectProjectType(projectPath: string): Promise<ProjectType> {
    try {
      const files = await fs.readdir(projectPath)

      // 检测配置文件
      const configFiles = files.map((f) => f.toLowerCase())

      // JavaScript/TypeScript项目
      if (configFiles.includes('package.json')) {
        const packageJson = await this.readPackageJson(projectPath)

        if (packageJson?.dependencies?.react || packageJson?.devDependencies?.react) {
          return 'react'
        }
        if (packageJson?.dependencies?.vue || packageJson?.devDependencies?.vue) {
          return 'vue'
        }
        if (packageJson?.dependencies?.['@angular/core']) {
          return 'angular'
        }

        // 检查是否有TypeScript
        if (
          configFiles.includes('tsconfig.json') ||
          packageJson?.devDependencies?.typescript ||
          packageJson?.dependencies?.typescript
        ) {
          return 'typescript'
        }

        return 'javascript'
      }

      // Python项目
      if (
        configFiles.includes('requirements.txt') ||
        configFiles.includes('pyproject.toml') ||
        configFiles.includes('setup.py') ||
        configFiles.includes('pipfile')
      ) {
        const pythonFiles = files.filter((f) => f.endsWith('.py'))
        if (pythonFiles.some((f) => f.includes('manage') || f.includes('wsgi'))) {
          return 'django'
        }
        if (pythonFiles.some((f) => this.containsFlaskImport(join(projectPath, f)))) {
          return 'flask'
        }
        if (pythonFiles.some((f) => this.containsFastAPIImport(join(projectPath, f)))) {
          return 'fastapi'
        }

        return 'python'
      }

      // Rust项目
      if (configFiles.includes('cargo.toml')) {
        return 'rust'
      }

      // Go项目
      if (configFiles.includes('go.mod') || configFiles.includes('go.sum')) {
        return 'go'
      }

      // Java项目
      if (configFiles.includes('pom.xml') || configFiles.includes('build.gradle')) {
        return 'java'
      }

      // C++项目
      if (configFiles.includes('cmakelist.txt') || configFiles.includes('makefile')) {
        return 'cpp'
      }

      // C#项目
      if (files.some((f) => f.endsWith('.csproj') || f.endsWith('.sln'))) {
        return 'csharp'
      }

      // PHP项目
      if (configFiles.includes('composer.json') || files.some((f) => f.endsWith('.php'))) {
        return 'php'
      }

      return 'other'
    } catch (error) {
      console.warn('项目类型检测失败:', error)
      return 'other'
    }
  }

  /**
   * 读取package.json
   */
  private async readPackageJson(projectPath: string): Promise<any> {
    try {
      const packageJsonPath = join(projectPath, 'package.json')
      const content = await fs.readFile(packageJsonPath, 'utf8')
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  /**
   * 检查文件是否包含Flask导入
   */
  private async containsFlaskImport(filePath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(filePath, 'utf8')
      return content.includes('from flask') || content.includes('import flask')
    } catch {
      return false
    }
  }

  /**
   * 检查文件是否包含FastAPI导入
   */
  private async containsFastAPIImport(filePath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(filePath, 'utf8')
      return content.includes('from fastapi') || content.includes('import fastapi')
    } catch {
      return false
    }
  }

  /**
   * 获取项目描述
   */
  private async getProjectDescription(projectPath: string): Promise<string | undefined> {
    try {
      // 尝试从README文件获取描述
      const readmeFiles = ['README.md', 'README.txt', 'README.rst', 'readme.md']

      for (const readmeFile of readmeFiles) {
        try {
          const readmePath = join(projectPath, readmeFile)
          const content = await fs.readFile(readmePath, 'utf8')

          // 提取第一段作为描述
          const lines = content.split('\n').filter((line) => line.trim())
          const firstNonHeaderLine = lines.find((line) => !line.startsWith('#'))

          if (firstNonHeaderLine && firstNonHeaderLine.length > 10) {
            return (
              firstNonHeaderLine.substring(0, 200) + (firstNonHeaderLine.length > 200 ? '...' : '')
            )
          }
        } catch {
          continue
        }
      }

      // 尝试从package.json获取描述
      const packageJson = await this.readPackageJson(projectPath)
      if (packageJson?.description) {
        return packageJson.description
      }
    } catch (error) {
      console.warn('获取项目描述失败:', error)
    }

    return undefined
  }

  /**
   * 导入现有项目
   */
  public async importProject(localPath: string): Promise<ProjectImportResult> {
    try {
      // 验证路径存在
      const stats = await fs.stat(localPath)
      if (!stats.isDirectory()) {
        return {
          success: false,
          error: '指定路径不是有效目录'
        }
      }

      // 分析项目
      const projectType = await this.detectProjectType(localPath)
      const description = await this.getProjectDescription(localPath)

      const projectInfo: ProjectInfo = {
        name: basename(localPath),
        path: localPath,
        type: projectType,
        description,
        createdAt: new Date().toISOString()
      }

      // 更新项目列表
      await this.updateProjectList(projectInfo)

      console.log('项目导入完成:', localPath)

      return {
        success: true,
        project: projectInfo
      }
    } catch (error) {
      console.error('项目导入失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 更新项目列表
   */
  private async updateProjectList(projectInfo: ProjectInfo): Promise<void> {
    try {
      const projectsListPath = join(this.claudeProjectsDir, 'projects.json')
      let projects: ProjectInfo[] = []

      // 读取现有项目列表
      try {
        const content = await fs.readFile(projectsListPath, 'utf8')
        projects = JSON.parse(content)
      } catch {
        // 文件不存在或解析失败，使用空数组
      }

      // 添加或更新项目
      const existingIndex = projects.findIndex((p) => p.path === projectInfo.path)
      if (existingIndex >= 0) {
        projects[existingIndex] = projectInfo
      } else {
        projects.push(projectInfo)
      }

      // 保存更新后的列表
      await fs.writeFile(projectsListPath, JSON.stringify(projects, null, 2))
      console.log('项目列表已更新')
    } catch (error) {
      console.warn('更新项目列表失败:', error)
    }
  }

  /**
   * 获取Claude项目目录
   */
  public getClaudeProjectsDirectory(): string {
    return this.claudeProjectsDir
  }

  /**
   * 清理克隆失败的目录
   */
  public async cleanupFailedClone(localPath: string): Promise<void> {
    try {
      await fs.rm(localPath, { recursive: true, force: true })
      console.log('已清理失败的克隆目录:', localPath)
    } catch (error) {
      console.warn('清理失败目录时出错:', error)
    }
  }
}
