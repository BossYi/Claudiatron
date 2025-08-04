import { ApiClient } from '../utils/apiClient'
import type { SlashCommand } from '../types'

export class SlashCommandsApi extends ApiClient {
  /**
   * Lists all available slash commands
   * @param projectPath - Optional project path to include project-specific commands
   * @returns Promise resolving to array of slash commands
   */
  static async slashCommandsList(projectPath?: string): Promise<SlashCommand[]> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.slashCommandsList(projectPath)
    }, 'Failed to list slash commands')
  }

  /**
   * Gets a single slash command by ID
   * @param commandId - Unique identifier of the command
   * @returns Promise resolving to the slash command
   */
  static async slashCommandGet(commandId: string): Promise<SlashCommand> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.slashCommandGet(commandId)
    }, 'Failed to get slash command')
  }

  /**
   * Creates or updates a slash command
   * @param scope - Command scope: "project" or "user"
   * @param name - Command name (without prefix)
   * @param namespace - Optional namespace for organization
   * @param content - Markdown content of the command
   * @param description - Optional description
   * @param allowedTools - List of allowed tools for this command
   * @param projectPath - Required for project scope commands
   * @returns Promise resolving to the saved command
   */
  static async slashCommandSave(
    scope: string,
    name: string,
    namespace: string | undefined,
    content: string,
    description: string | undefined,
    allowedTools: string[],
    projectPath?: string
  ): Promise<SlashCommand> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.slashCommandSave(
        scope,
        name,
        namespace,
        content,
        description,
        allowedTools,
        projectPath
      )
    }, 'Failed to save slash command')
  }

  /**
   * Deletes a slash command
   * @param commandId - Unique identifier of the command to delete
   * @param projectPath - Optional project path for deleting project commands
   * @returns Promise resolving to deletion message
   */
  static async slashCommandDelete(commandId: string, projectPath?: string): Promise<string> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.slashCommandDelete(commandId, projectPath)
    }, 'Failed to delete slash command')
  }
}
