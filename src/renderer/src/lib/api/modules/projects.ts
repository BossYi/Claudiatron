import { ApiClient } from '../utils/apiClient'
import type { Project, Session, ClaudeMdFile } from '../types'

export class ProjectsApi extends ApiClient {
  /**
   * Lists all projects in the ~/.claude/projects directory
   * @returns Promise resolving to an array of projects
   */
  static async listProjects(): Promise<Project[]> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.listProjects()
    }, 'Failed to list projects')
  }

  /**
   * Retrieves sessions for a specific project
   * @param projectId - The ID of the project to retrieve sessions for
   * @returns Promise resolving to an array of sessions
   */
  static async getProjectSessions(projectId: string): Promise<Session[]> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.getProjectSessions(projectId)
    }, 'Failed to get project sessions')
  }

  /**
   * Finds all CLAUDE.md files in a project directory
   * @param projectPath - The absolute path to the project
   * @returns Promise resolving to an array of CLAUDE.md files
   */
  static async findClaudeMdFiles(projectPath: string): Promise<ClaudeMdFile[]> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.findClaudeMdFiles(projectPath)
    }, 'Failed to find CLAUDE.md files')
  }

  /**
   * Reads a specific CLAUDE.md file
   * @param filePath - The absolute path to the file
   * @returns Promise resolving to the file content
   */
  static async readClaudeMdFile(filePath: string): Promise<string> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.readClaudeMdFile(filePath)
    }, 'Failed to read CLAUDE.md file')
  }

  /**
   * Saves a specific CLAUDE.md file
   * @param filePath - The absolute path to the file
   * @param content - The new content for the file
   * @returns Promise resolving when the file is saved
   */
  static async saveClaudeMdFile(filePath: string, content: string): Promise<string> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.saveClaudeMdFile(filePath, content)
    }, 'Failed to save CLAUDE.md file')
  }
}
