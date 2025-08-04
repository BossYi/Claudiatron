import { ApiClient } from '../utils/apiClient'
import type {
  MCPServer,
  ServerStatus,
  MCPProjectConfig,
  AddServerResult,
  ImportResult
} from '../types'

export class MCPApi extends ApiClient {
  /**
   * Adds a new MCP server
   */
  static async mcpAdd(
    name: string,
    transport: string,
    command?: string,
    args: string[] = [],
    env: Record<string, string> = {},
    url?: string,
    scope: string = 'local'
  ): Promise<AddServerResult> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.mcpAdd(name, transport, command, args, env, url, scope)
    }, 'Failed to add MCP server')
  }

  /**
   * Lists all configured MCP servers
   */
  static async mcpList(): Promise<MCPServer[]> {
    try {
      console.log('API: Calling mcp_list...')
      const api = this.getApi()
      const result = await api.mcpList()
      console.log('API: mcp_list returned:', result)

      // Handle both direct array and wrapped response formats
      if (Array.isArray(result)) {
        return result
      } else if (
        result &&
        typeof result === 'object' &&
        'data' in result &&
        Array.isArray(result.data)
      ) {
        return result.data
      } else {
        console.warn('API: Unexpected mcp_list response format:', result)
        return []
      }
    } catch (error) {
      console.error('API: Failed to list MCP servers:', error)
      throw error
    }
  }

  /**
   * Gets details for a specific MCP server
   */
  static async mcpGet(name: string): Promise<MCPServer> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.mcpGet(name)
    }, 'Failed to get MCP server')
  }

  /**
   * Removes an MCP server
   */
  static async mcpRemove(name: string): Promise<string> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.mcpRemove(name)
    }, 'Failed to remove MCP server')
  }

  /**
   * Adds an MCP server from JSON configuration
   */
  static async mcpAddJson(
    name: string,
    jsonConfig: string,
    scope: string = 'local'
  ): Promise<AddServerResult> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.mcpAddJson(name, jsonConfig, scope)
    }, 'Failed to add MCP server from JSON')
  }

  /**
   * Imports MCP servers from Claude Desktop
   */
  static async mcpImportFromClaudeDesktop(
    scope: string = 'local',
    selectedServers?: string[]
  ): Promise<ImportResult> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.mcpImportFromClaudeDesktop(scope, selectedServers)
    }, 'Failed to import from Claude Desktop')
  }

  /**
   * Starts Claude Code as an MCP server
   */
  static async mcpServe(): Promise<string> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.mcpServe()
    }, 'Failed to start MCP server')
  }

  /**
   * Tests connection to an MCP server
   */
  static async mcpTestConnection(name: string): Promise<string> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.mcpTestConnection(name)
    }, 'Failed to test MCP connection')
  }

  /**
   * Resets project-scoped server approval choices
   */
  static async mcpResetProjectChoices(): Promise<string> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.mcpResetProjectChoices()
    }, 'Failed to reset project choices')
  }

  /**
   * Gets the status of MCP servers
   */
  static async mcpGetServerStatus(): Promise<Record<string, ServerStatus>> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.mcpGetServerStatus()
    }, 'Failed to get server status')
  }

  /**
   * Reads .mcp.json from the current project
   */
  static async mcpReadProjectConfig(projectPath: string): Promise<MCPProjectConfig> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.mcpReadProjectConfig(projectPath)
    }, 'Failed to read project MCP config')
  }

  /**
   * Saves .mcp.json to the current project
   */
  static async mcpSaveProjectConfig(
    projectPath: string,
    config: MCPProjectConfig
  ): Promise<string> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.mcpSaveProjectConfig(projectPath, config)
    }, 'Failed to save project MCP config')
  }
}
