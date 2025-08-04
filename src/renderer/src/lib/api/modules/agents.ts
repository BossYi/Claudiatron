import { ApiClient } from '../utils/apiClient'
import type { Agent, AgentExport, AgentRun, AgentRunWithMetrics, GitHubAgentFile } from '../types'

export class AgentsApi extends ApiClient {
  /**
   * Lists all CC agents
   * @returns Promise resolving to an array of agents
   */
  static async listAgents(): Promise<Agent[]> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.listAgents()
    }, 'Failed to list agents')
  }

  /**
   * Creates a new agent
   * @param name - The agent name
   * @param icon - The icon identifier
   * @param system_prompt - The system prompt for the agent
   * @param default_task - Optional default task
   * @param model - Optional model (defaults to 'sonnet')
   * @param hooks - Optional hooks configuration as JSON string
   * @returns Promise resolving to the created agent
   */
  static async createAgent(
    name: string,
    icon: string,
    system_prompt: string,
    default_task?: string,
    model?: string,
    hooks?: string
  ): Promise<Agent> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.createAgent({
        name,
        icon,
        systemPrompt: system_prompt,
        defaultTask: default_task,
        model,
        hooks
      })
    }, 'Failed to create agent')
  }

  /**
   * Updates an existing agent
   * @param id - The agent ID
   * @param name - The updated name
   * @param icon - The updated icon
   * @param system_prompt - The updated system prompt
   * @param default_task - Optional default task
   * @param model - Optional model
   * @param hooks - Optional hooks configuration as JSON string
   * @returns Promise resolving to the updated agent
   */
  static async updateAgent(
    id: number,
    name: string,
    icon: string,
    system_prompt: string,
    default_task?: string,
    model?: string,
    hooks?: string
  ): Promise<Agent> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.updateAgent(id, {
        name,
        icon,
        systemPrompt: system_prompt,
        defaultTask: default_task,
        model,
        hooks
      })
    }, 'Failed to update agent')
  }

  /**
   * Deletes an agent
   * @param id - The agent ID to delete
   * @returns Promise resolving when the agent is deleted
   */
  static async deleteAgent(id: number): Promise<void> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.deleteAgent(id)
    }, 'Failed to delete agent')
  }

  /**
   * Gets a single agent by ID
   * @param id - The agent ID
   * @returns Promise resolving to the agent
   */
  static async getAgent(id: number): Promise<Agent> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.getAgent(id)
    }, 'Failed to get agent')
  }

  /**
   * Exports a single agent to JSON format
   * @param id - The agent ID to export
   * @returns Promise resolving to the JSON string
   */
  static async exportAgent(id: number): Promise<string> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.exportAgent(id)
    }, 'Failed to export agent')
  }

  /**
   * Imports an agent from JSON data
   * @param jsonData - The JSON string containing the agent export
   * @returns Promise resolving to the imported agent
   */
  static async importAgent(jsonData: string): Promise<Agent> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.importAgent(jsonData)
    }, 'Failed to import agent')
  }

  /**
   * Imports an agent from a file
   * @param filePath - The path to the JSON file
   * @returns Promise resolving to the imported agent
   */
  static async importAgentFromFile(filePath: string): Promise<Agent> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.importAgentFromFile(filePath)
    }, 'Failed to import agent from file')
  }

  /**
   * Executes an agent
   * @param agentId - The agent ID to execute
   * @param projectPath - The project path to run the agent in
   * @param task - The task description
   * @param model - Optional model override
   * @returns Promise resolving to the run ID when execution starts
   */
  static async executeAgent(
    agentId: number,
    projectPath: string,
    task: string,
    model?: string
  ): Promise<number> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      const result = await api.executeAgent({ agentId, projectPath, task, model })

      // 适配后端返回的对象格式到前端期望的 number 类型
      if (result && typeof result === 'object' && 'success' in result) {
        if (result.success && result.runId !== undefined) {
          return result.runId
        } else {
          throw new Error(result.message || 'Failed to execute agent')
        }
      }

      // 如果返回的是 number 类型（向后兼容）
      if (typeof result === 'number') {
        return result
      }

      throw new Error('Unexpected response format from executeAgent')
    }, 'Failed to execute agent')
  }

  /**
   * Lists agent runs with metrics
   * @param agentId - Optional agent ID to filter runs
   * @returns Promise resolving to an array of agent runs with metrics
   */
  static async listAgentRuns(agentId?: number): Promise<AgentRunWithMetrics[]> {
    try {
      const api = this.getApi()
      return await api.listAgentRuns(agentId)
    } catch (error) {
      console.error('Failed to list agent runs:', error)
      // Return empty array instead of throwing to prevent UI crashes
      return []
    }
  }

  /**
   * Gets a single agent run by ID with metrics
   * @param id - The run ID
   * @returns Promise resolving to the agent run with metrics
   */
  static async getAgentRun(id: number): Promise<AgentRunWithMetrics> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.getAgentRun(id)
    }, 'Failed to get agent run')
  }

  /**
   * Gets a single agent run by ID with real-time metrics from JSONL
   * @param id - The run ID
   * @returns Promise resolving to the agent run with metrics
   */
  static async getAgentRunWithRealTimeMetrics(id: number): Promise<AgentRunWithMetrics> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.getAgentRunWithMetrics(id)
    }, 'Failed to get agent run with real-time metrics')
  }

  /**
   * Lists all currently running agent sessions
   * @returns Promise resolving to list of running agent sessions
   */
  static async listRunningAgentSessions(): Promise<AgentRun[]> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.listRunningSessionsAgents()
    }, 'Failed to list running agent sessions')
  }

  /**
   * Kills a running agent session
   * @param runId - The run ID to kill
   * @returns Promise resolving to whether the session was successfully killed
   */
  static async killAgentSession(runId: number): Promise<boolean> {
    try {
      const api = this.getApi()
      const result = await api.killAgentSession(runId)

      // 适配后端返回的对象格式到前端期望的 boolean 类型
      if (result && typeof result === 'object' && 'success' in result) {
        return result.success
      }

      // 如果返回的是 boolean 类型（向后兼容）
      if (typeof result === 'boolean') {
        return result
      }

      // 默认返回 false
      return false
    } catch (error) {
      console.error('Failed to kill agent session:', error)
      return false
    }
  }

  /**
   * Gets the status of a specific agent session
   * @param runId - The run ID to check
   * @returns Promise resolving to the session status or null if not found
   */
  static async getSessionStatus(runId: number): Promise<string | null> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.getSessionStatus(runId)
    }, 'Failed to get session status')
  }

  /**
   * Cleanup finished processes and update their status
   * @returns Promise resolving to list of run IDs that were cleaned up
   */
  static async cleanupFinishedProcesses(): Promise<number[]> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.cleanupFinishedProcesses()
    }, 'Failed to cleanup finished processes')
  }

  /**
   * Get real-time output for a running session (with live output fallback)
   * @param runId - The run ID to get output for
   * @returns Promise resolving to the current session output (JSONL format)
   */
  static async getSessionOutput(runId: number): Promise<string> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.getSessionOutput(runId)
    }, 'Failed to get session output')
  }

  /**
   * Get live output directly from process stdout buffer
   * @param runId - The run ID to get live output for
   * @returns Promise resolving to the current live output
   */
  static async getLiveSessionOutput(runId: number): Promise<string> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.getLiveSessionOutput(runId)
    }, 'Failed to get live session output')
  }

  /**
   * Start streaming real-time output for a running session
   * @param runId - The run ID to stream output for
   * @returns Promise that resolves when streaming starts
   */
  static async streamSessionOutput(runId: number): Promise<void> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.streamSessionOutput(runId)
    }, 'Failed to start streaming session output')
  }

  /**
   * Loads the JSONL history for a specific agent session
   * Similar to loadSessionHistory but searches across all project directories
   * @param sessionId - The session ID (UUID)
   * @returns Promise resolving to array of session messages
   */
  static async loadAgentSessionHistory(sessionId: string): Promise<any[]> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.loadAgentSessionHistory(sessionId)
    }, 'Failed to load agent session history')
  }

  // GitHub integration methods (placeholder implementations)

  /**
   * Fetch list of agents from GitHub repository
   * @returns Promise resolving to list of available agents on GitHub
   */
  static async fetchGitHubAgents(): Promise<GitHubAgentFile[]> {
    // TODO: Add fetchGitHubAgents to preload API
    throw new Error('fetchGitHubAgents not implemented in Electron version yet')
  }

  /**
   * Fetch and preview a specific agent from GitHub
   * @param downloadUrl - The download URL for the agent file
   * @returns Promise resolving to the agent export data
   */
  static async fetchGitHubAgentContent(_downloadUrl: string): Promise<AgentExport> {
    // TODO: Add fetchGitHubAgentContent to preload API
    throw new Error('fetchGitHubAgentContent not implemented in Electron version yet')
  }

  /**
   * Import an agent directly from GitHub
   * @param downloadUrl - The download URL for the agent file
   * @returns Promise resolving to the imported agent
   */
  static async importAgentFromGitHub(_downloadUrl: string): Promise<Agent> {
    // TODO: Add importAgentFromGitHub to preload API
    throw new Error('importAgentFromGitHub not implemented in Electron version yet')
  }
}
