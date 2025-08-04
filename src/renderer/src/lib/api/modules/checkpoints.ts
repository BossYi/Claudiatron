import { ApiClient } from '../utils/apiClient'
import type {
  Checkpoint,
  CheckpointResult,
  CheckpointDiff,
  SessionTimeline,
  CheckpointStrategy
} from '../types'

export class CheckpointsApi extends ApiClient {
  /**
   * Creates a checkpoint for the current session state
   */
  static async createCheckpoint(
    sessionId: string,
    projectId: string,
    projectPath: string,
    messageIndex?: number,
    description?: string
  ): Promise<CheckpointResult> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.createCheckpoint(
        sessionId,
        projectId,
        projectPath,
        messageIndex,
        description
      )
    }, 'Failed to create checkpoint')
  }

  /**
   * Restores a session to a specific checkpoint
   */
  static async restoreCheckpoint(
    checkpointId: string,
    sessionId: string,
    projectId: string,
    projectPath: string
  ): Promise<CheckpointResult> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.restoreCheckpoint(checkpointId, sessionId, projectId, projectPath)
    }, 'Failed to restore checkpoint')
  }

  /**
   * Lists all checkpoints for a session
   */
  static async listCheckpoints(
    sessionId: string,
    projectId: string,
    projectPath: string
  ): Promise<Checkpoint[]> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.listCheckpoints(sessionId, projectId, projectPath)
    }, 'Failed to list checkpoints')
  }

  /**
   * Forks a new timeline branch from a checkpoint
   */
  static async forkFromCheckpoint(
    checkpointId: string,
    sessionId: string,
    projectId: string,
    projectPath: string,
    newSessionId: string,
    description?: string
  ): Promise<CheckpointResult> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.forkFromCheckpoint(
        checkpointId,
        sessionId,
        projectId,
        projectPath,
        newSessionId,
        description
      )
    }, 'Failed to fork from checkpoint')
  }

  /**
   * Gets the timeline for a session
   */
  static async getSessionTimeline(
    sessionId: string,
    projectId: string,
    projectPath: string
  ): Promise<SessionTimeline> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.getSessionTimeline(sessionId, projectId, projectPath)
    }, 'Failed to get session timeline')
  }

  /**
   * Updates checkpoint settings for a session
   */
  static async updateCheckpointSettings(
    sessionId: string,
    projectId: string,
    projectPath: string,
    autoCheckpointEnabled: boolean,
    checkpointStrategy: CheckpointStrategy
  ): Promise<void> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.updateCheckpointSettings(
        sessionId,
        projectId,
        projectPath,
        autoCheckpointEnabled,
        checkpointStrategy
      )
    }, 'Failed to update checkpoint settings')
  }

  /**
   * Gets diff between two checkpoints
   */
  static async getCheckpointDiff(
    fromCheckpointId: string,
    toCheckpointId: string,
    sessionId: string,
    projectId: string
  ): Promise<CheckpointDiff> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.getCheckpointDiff(fromCheckpointId, toCheckpointId, sessionId, projectId)
    }, 'Failed to get checkpoint diff')
  }

  /**
   * Tracks a message for checkpointing
   */
  static async trackCheckpointMessage(
    sessionId: string,
    projectId: string,
    projectPath: string,
    message: string
  ): Promise<void> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      await api.trackCheckpointMessage(sessionId, projectId, projectPath, message)
    }, 'Failed to track checkpoint message')
  }

  /**
   * Checks if auto-checkpoint should be triggered
   */
  static async checkAutoCheckpoint(
    sessionId: string,
    projectId: string,
    projectPath: string,
    message: string
  ): Promise<boolean> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.checkAutoCheckpoint(sessionId, projectId, projectPath, message)
    }, 'Failed to check auto checkpoint')
  }

  /**
   * Triggers cleanup of old checkpoints
   */
  static async cleanupOldCheckpoints(
    sessionId: string,
    projectId: string,
    projectPath: string,
    keepCount: number
  ): Promise<number> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.cleanupOldCheckpoints(sessionId, projectId, projectPath, keepCount)
    }, 'Failed to cleanup old checkpoints')
  }

  /**
   * Gets checkpoint settings for a session
   */
  static async getCheckpointSettings(
    sessionId: string,
    projectId: string,
    projectPath: string
  ): Promise<{
    auto_checkpoint_enabled: boolean
    checkpoint_strategy: CheckpointStrategy
    total_checkpoints: number
    current_checkpoint_id?: string
  }> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.getCheckpointSettings(sessionId, projectId, projectPath)
    }, 'Failed to get checkpoint settings')
  }

  /**
   * Clears checkpoint manager for a session (cleanup on session end)
   */
  static async clearCheckpointManager(sessionId: string): Promise<void> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      await api.clearCheckpointManager(sessionId)
    }, 'Failed to clear checkpoint manager')
  }

  /**
   * Tracks a batch of messages for a session for checkpointing
   */
  static async trackSessionMessages(
    sessionId: string,
    projectId: string,
    projectPath: string,
    messages: string[]
  ): Promise<void> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.trackSessionMessages(sessionId, projectId, projectPath, messages)
    }, 'Failed to track session messages')
  }
}
