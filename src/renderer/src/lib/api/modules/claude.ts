import { ApiClient } from '../utils/apiClient'
import type { ClaudeSettings, ClaudeVersionStatus } from '../types'

export class ClaudeApi extends ApiClient {
  /**
   * Reads the Claude settings file
   * @returns Promise resolving to the settings object
   */
  static async getClaudeSettings(): Promise<ClaudeSettings> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.getClaudeSettings()
    }, 'Failed to get Claude settings')
  }

  /**
   * Saves the Claude settings file
   * @param settings - The settings object to save
   * @returns Promise resolving when the settings are saved
   */
  static async saveClaudeSettings(settings: ClaudeSettings): Promise<string> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.saveClaudeSettings(settings)
    }, 'Failed to save Claude settings')
  }

  /**
   * Reads the CLAUDE.md system prompt file
   * @returns Promise resolving to the system prompt content
   */
  static async getSystemPrompt(): Promise<string> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.getSystemPrompt()
    }, 'Failed to get system prompt')
  }

  /**
   * Saves the CLAUDE.md system prompt file
   * @param content - The new content for the system prompt
   * @returns Promise resolving when the file is saved
   */
  static async saveSystemPrompt(content: string): Promise<string> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.saveSystemPrompt(content)
    }, 'Failed to save system prompt')
  }

  /**
   * Checks if Claude Code is installed and gets its version
   * @returns Promise resolving to the version status
   */
  static async checkClaudeVersion(): Promise<ClaudeVersionStatus> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.checkClaudeVersion()
    }, 'Failed to check Claude version')
  }

  /**
   * Executes a new interactive Claude Code session with streaming output
   */
  static async executeClaudeCode(
    projectPath: string,
    prompt: string,
    model: string
  ): Promise<{ success: boolean; runId?: number; message: string }> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.executeClaudeCode(projectPath, prompt, model)
    }, 'Failed to execute Claude Code')
  }

  /**
   * Continues an existing Claude Code conversation with streaming output
   */
  static async continueClaudeCode(
    projectPath: string,
    prompt: string,
    model: string
  ): Promise<void> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.continueClaudeCode(projectPath, prompt, model)
    }, 'Failed to continue Claude Code')
  }

  /**
   * Resumes an existing Claude Code session by ID with streaming output
   */
  static async resumeClaudeCode(
    projectPath: string,
    sessionId: string,
    prompt: string,
    model: string
  ): Promise<{ success: boolean; runId?: number; message: string }> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.resumeClaudeCode(projectPath, sessionId, prompt, model)
    }, 'Failed to resume Claude Code')
  }

  /**
   * Cancels the currently running Claude Code execution
   * @param sessionId - Optional session ID to cancel a specific session
   */
  static async cancelClaudeExecution(sessionId?: string): Promise<void> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.cancelClaudeExecution(sessionId)
    }, 'Failed to cancel Claude execution')
  }

  /**
   * Lists all currently running Claude sessions
   * @returns Promise resolving to list of running Claude sessions
   */
  static async listRunningClaudeSessions(): Promise<any[]> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.listRunningClaudeSessions()
    }, 'Failed to list running Claude sessions')
  }

  /**
   * Gets live output from a Claude session
   * @param sessionId - The session ID to get output for
   * @returns Promise resolving to the current live output
   */
  static async getClaudeSessionOutput(sessionId: string): Promise<string> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.getClaudeSessionOutput(sessionId)
    }, 'Failed to get Claude session output')
  }

  /**
   * Updates the session ID for a running process
   * @param runId - The run ID of the process
   * @param sessionId - The session ID to set
   */
  static async updateSessionId(runId: number, sessionId: string): Promise<{ success: boolean }> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.updateSessionId(runId, sessionId)
    }, 'Failed to update session ID')
  }

  /**
   * Loads the JSONL history for a specific session
   */
  static async loadSessionHistory(sessionId: string, projectId: string): Promise<any[]> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.loadSessionHistory(sessionId, projectId)
    }, 'Failed to load session history')
  }
}
