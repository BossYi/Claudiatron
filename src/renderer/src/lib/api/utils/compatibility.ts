import { getWindowApi } from './apiClient'
import type { FileEntry } from '../types'

// Export additional functions from window.api
export const open = async (options?: any) => {
  const windowApi = getWindowApi()
  return windowApi.showOpenDialog(options)
}

export const save = async (options?: any) => {
  const windowApi = getWindowApi()
  return windowApi.showSaveDialog(options)
}

export const invoke = async (command: string, args?: any) => {
  console.log(`Invoke: ${command}`, args)
  // This is a placeholder for Tauri-style invoke calls
  // In Electron, we use specific IPC handlers instead
  return {}
}

export const listen = <T>(
  event: string,
  callback: (event: { payload: T }) => void
): (() => void) => {
  const windowApi = getWindowApi()

  // 解析事件名和runId
  const [_eventType, runId] = event.split(':')

  // 包装回调函数，将数据格式从 Electron 格式转换为原版 Tauri 格式
  const wrappedCallback = (_electronEvent: any, data: T) => {
    // 包装数据为原版 event.payload 格式
    callback({ payload: data })
  }

  if (runId) {
    // 监听特定runId的事件
    const handler = (_electronEvent: any, data: T) => {
      callback({ payload: data })
    }

    // 使用动态事件监听器来监听特定的事件名称
    if (windowApi && windowApi.addEventListener) {
      console.log('[API] Setting up dynamic listener for event:', event)
      return windowApi.addEventListener(event, handler)
    }
  }

  // 回退到通用事件监听（原有逻辑）
  if (event.startsWith('stream-output') && windowApi.onStreamOutput) {
    windowApi.onStreamOutput(wrappedCallback)
    return () => windowApi.removeAllListeners('stream-output')
  }
  if (event.startsWith('agent-output') && windowApi.onAgentOutput) {
    windowApi.onAgentOutput(wrappedCallback)
    return () => windowApi.removeAllListeners('agent-output')
  }
  if (event.startsWith('agent-error') && windowApi.onAgentError) {
    windowApi.onAgentError(wrappedCallback)
    return () => windowApi.removeAllListeners('agent-error')
  }
  if (event.startsWith('agent-complete') && windowApi.onAgentComplete) {
    windowApi.onAgentComplete(wrappedCallback)
    return () => windowApi.removeAllListeners('agent-complete')
  }
  if (event.startsWith('agent-cancelled') && windowApi.onAgentCancelled) {
    windowApi.onAgentCancelled(wrappedCallback)
    return () => windowApi.removeAllListeners('agent-cancelled')
  }

  // Claude 事件处理
  if (event.startsWith('claude-output') && windowApi.onClaudeOutput) {
    console.log('[API] Setting up claude-output listener')
    windowApi.onClaudeOutput(wrappedCallback)
    return () => windowApi.removeAllListeners('claude-output')
  }
  if (event.startsWith('claude-error') && windowApi.onClaudeError) {
    console.log('[API] Setting up claude-error listener')
    windowApi.onClaudeError(wrappedCallback)
    return () => windowApi.removeAllListeners('claude-error')
  }
  if (event.startsWith('claude-complete') && windowApi.onClaudeComplete) {
    console.log('[API] Setting up claude-complete listener')
    windowApi.onClaudeComplete(wrappedCallback)
    return () => windowApi.removeAllListeners('claude-complete')
  }

  console.log(`Listen for event: ${event} - event system not fully implemented`)
  return () => {} // Return a no-op unlisten function
}

export type UnlistenFn = () => void

export const openUrl = async (url: string) => {
  window.open(url, '_blank')
}

export const convertFileSrc = (filePath: string) => {
  return `file://${filePath}`
}

export const getCurrentWebviewWindow = () => {
  return {
    setResizable: () => {},
    setAlwaysOnTop: () => {},
    show: () => {},
    hide: () => {}
  }
}

// File system utilities
export const listDirectoryContents = async (directoryPath: string): Promise<FileEntry[]> => {
  const api = getWindowApi()
  return api.listDirectoryContents(directoryPath)
}

export const searchFiles = async (basePath: string, query: string): Promise<FileEntry[]> => {
  const api = getWindowApi()
  return api.searchFiles(basePath, query)
}

// New session placeholder
export const openNewSession = async (_path?: string): Promise<string> => {
  // TODO: Add openNewSession to preload API
  throw new Error('openNewSession not implemented in Electron version yet')
}
