import { api } from '@/lib/api'

/**
 * 获取默认的项目目录路径
 * 优先从缓存获取，如果没有则通过 API 获取系统信息
 * @returns 默认项目路径 ~/.Catalyst/projects
 */
export async function getDefaultProjectsPath(): Promise<string> {
  try {
    // 首先尝试从 localStorage 获取缓存的 homeDir
    const cachedHomeDir = localStorage.getItem('userHomeDir')
    if (cachedHomeDir) {
      return `${cachedHomeDir}/.Catalyst/projects`
    }

    // 尝试从 Electron 环境获取
    if (window.electron?.process?.env?.HOME) {
      const homeDir = window.electron.process.env.HOME
      localStorage.setItem('userHomeDir', homeDir)
      return `${homeDir}/.Catalyst/projects`
    }

    // 如果没有缓存，调用 API 获取环境信息
    const result = await api.setupWizardDetectEnvironment()
    if (result.success && result.data?.systemInfo?.homeDir) {
      const homeDir = result.data.systemInfo.homeDir
      // 缓存 homeDir 以避免重复调用
      localStorage.setItem('userHomeDir', homeDir)
      return `${homeDir}/.Catalyst/projects`
    }

    // 如果都失败了，返回一个展示用的路径
    // 根据平台返回合理的展示路径
    const platform = window.electron?.process?.platform
    if (platform === 'win32') {
      return 'C:\\Users\\[用户名]\\.Catalyst\\projects'
    }
    return '~/.Catalyst/projects'
  } catch (error) {
    // 出错时返回展示用的路径
    return '~/.Catalyst/projects'
  }
}

/**
 * 清除缓存的主目录信息
 */
export function clearHomeDirCache(): void {
  localStorage.removeItem('userHomeDir')
}
