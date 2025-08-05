import { execa, type ResultPromise, type Result } from 'execa'
import treeKill from 'tree-kill'
import { EventEmitter } from 'events'
import { BrowserWindow } from 'electron'
import { resolve as resolvePath } from 'path'

/**
 * Type of process being tracked
 */
export enum ProcessType {
  AgentRun = 'AgentRun',
  ClaudeSession = 'ClaudeSession'
}

/**
 * Information about a running process
 */
export interface ProcessInfo {
  runId: number
  processType: ProcessType
  pid: number
  startedAt: Date
  projectPath: string
  task: string
  model: string
  // Agent-specific info
  agentId?: number
  agentName?: string
  // Claude session-specific info
  sessionId?: string
}

/**
 * Handle for a running process
 */
interface ProcessHandle {
  info: ProcessInfo
  process: ResultPromise<any> | null
  liveOutput: string[]
  isFinished: boolean
}

/**
 * Registry for tracking active processes (Claude sessions and agent runs)
 */
export class ProcessManager extends EventEmitter {
  private processes: Map<number, ProcessHandle> = new Map()
  private nextId: number = 1000000 // Start at high number to avoid conflicts
  private browserWindow: BrowserWindow | null = null
  private processIntervals: Map<number, NodeJS.Timeout> = new Map() // Track intervals for cleanup

  constructor() {
    super()
  }

  /**
   * Set the browser window for sending IPC events
   */
  setBrowserWindow(window: BrowserWindow): void {
    this.browserWindow = window
  }

  /**
   * Generate a unique ID for processes
   */
  private generateId(): number {
    return this.nextId++
  }

  /**
   * Register a new running agent process
   */
  async registerAgentProcess(
    agentId: number,
    agentName: string,
    projectPath: string,
    task: string,
    model: string,
    command: string,
    args: string[] = [],
    options: Record<string, any> = {}
  ): Promise<number> {
    const runId = this.generateId()

    console.log('[ProcessManager] Starting agent process:', {
      runId,
      agentId,
      agentName,
      projectPath,
      command,
      args: args.join(' '),
      argsLength: args.length,
      task: task.substring(0, 100) + (task.length > 100 ? '...' : ''),
      model
    })

    // Create process info
    const processInfo: ProcessInfo = {
      runId,
      processType: ProcessType.AgentRun,
      pid: 0, // Will be set when process starts
      startedAt: new Date(),
      projectPath,
      task,
      model,
      agentId,
      agentName
    }

    // Start the process with proper options
    // First spread options, then override with required values to avoid conflicts
    const processOptions = {
      ...options,
      cwd: projectPath,
      stdout: 'pipe' as const,
      stderr: 'pipe' as const
    }

    // Validate and normalize cwd path
    if (typeof processOptions.cwd !== 'string') {
      throw new Error(`Invalid cwd option: expected string, got ${typeof processOptions.cwd}`)
    }

    // Ensure the cwd path is properly normalized and doesn't have trailing issues
    processOptions.cwd = processOptions.cwd.trim()

    // Check if path is empty after trimming
    if (!processOptions.cwd) {
      throw new Error('Invalid cwd option: path cannot be empty')
    }

    // Resolve the path to ensure it's absolute and normalized
    try {
      processOptions.cwd = resolvePath(processOptions.cwd)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Invalid cwd path: ${processOptions.cwd} - ${errorMessage}`)
    }

    console.log('[ProcessManager] Final execution details:', {
      command,
      args: args,
      argsJoined: args.join(' '),
      cwd: processOptions.cwd,
      runId
    })

    // Test command validity and output full command for manual testing
    if (args.length > 0) {
      console.log('[ProcessManager] Command will be executed as:', command, args)
      console.log('[ProcessManager] First few args:', args.slice(0, 3))

      // Build the complete command string for manual testing
      const quotedArgs = args.map((arg) => {
        // Quote arguments that contain spaces or special characters
        if (arg.includes(' ') || arg.includes('\n') || arg.includes('"') || arg.includes("'")) {
          return `"${arg.replace(/"/g, '\\"')}"`
        }
        return arg
      })
      const fullCommand = `${command} ${quotedArgs.join(' ')}`

      console.log('\n=== MANUAL TEST COMMAND ===')
      console.log('Copy and run this command in your terminal to test manually:')
      console.log(`cd "${processOptions.cwd}"`)
      console.log(fullCommand)
      console.log('=== END MANUAL TEST COMMAND ===\n')
    }

    console.log('[ProcessManager] Spawning process with execa...')

    // Add a timeout to the process to prevent it from hanging indefinitely
    const processOptionsWithTimeout = {
      ...processOptions,
      timeout: 300000, // 5 minutes timeout
      env: {
        ...process.env, // Inherit all environment variables
        // Ensure key environment variables are set
        NODE_ENV: process.env.NODE_ENV || 'development',
        TERM: process.env.TERM || 'xterm-256color'
      }
    }

    console.log(
      '[ProcessManager] Using direct execution with env PATH:',
      process.env.PATH?.substring(0, 200)
    )

    const childProcess = execa(command, args, processOptionsWithTimeout)

    // Close stdin to prevent Claude from waiting for input
    if (childProcess.stdin) {
      childProcess.stdin.end()
      console.log('[ProcessManager] Closed stdin for runId:', runId)
    }

    // Update PID once available
    if (childProcess.pid) {
      processInfo.pid = childProcess.pid
      console.log(
        '[ProcessManager] Process spawned successfully with PID:',
        childProcess.pid,
        'for runId:',
        runId
      )
    } else {
      console.log(
        '[ProcessManager] Warning: Process spawned but no PID available for runId:',
        runId
      )
    }

    // Create process handle
    const handle: ProcessHandle = {
      info: processInfo,
      process: childProcess as unknown as ResultPromise<any>,
      liveOutput: [],
      isFinished: false
    }

    this.processes.set(runId, handle)

    // Set up output streaming
    this.setupOutputStreaming(runId, childProcess as unknown as ResultPromise<any>)

    // Handle process completion
    childProcess.then(
      (result) => {
        this.handleProcessCompletion(runId, result)
      },
      (error) => {
        this.handleProcessError(runId, error)
      }
    )

    this.emit('processRegistered', processInfo)
    this.notifyUI('process-registered', processInfo)

    return runId
  }

  /**
   * Register a Claude session (for tracking, no direct process management)
   */
  registerClaudeSession(
    sessionId: string,
    pid: number,
    projectPath: string,
    task: string,
    model: string
  ): number {
    const runId = this.generateId()

    const processInfo: ProcessInfo = {
      runId,
      processType: ProcessType.ClaudeSession,
      pid,
      startedAt: new Date(),
      projectPath,
      task,
      model,
      sessionId
    }

    const handle: ProcessHandle = {
      info: processInfo,
      process: null, // Claude sessions managed separately
      liveOutput: [],
      isFinished: false
    }

    this.processes.set(runId, handle)

    this.emit('processRegistered', processInfo)
    this.notifyUI('process-registered', processInfo)

    return runId
  }

  /**
   * Set up output streaming for a process
   */
  private setupOutputStreaming(runId: number, childProcess: ResultPromise<any>): void {
    console.log('[ProcessManager] Setting up output streaming for runId:', runId)
    const handle = this.processes.get(runId)
    if (!handle) {
      console.error('[ProcessManager] No handle found for runId:', runId)
      return
    }

    // Handle stdout
    if (childProcess.stdout) {
      console.log('[ProcessManager] Setting up stdout listener for runId:', runId)
      childProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString()
        console.log(
          '[ProcessManager] Received stdout data for runId:',
          runId,
          'length:',
          output.length
        )

        // Enhanced debug logging for Claude Code sessions
        const handle = this.processes.get(runId)
        if (handle?.info.agentId === 0 && handle?.info.agentName?.includes('Claude Code')) {
          // Log first 200 chars of output for debugging
          console.log(
            '[ProcessManager] Claude Code raw output preview:',
            output.substring(0, 200).replace(/\n/g, '\\n')
          )

          // Try to parse and check for sessionId in the output
          const lines = output.split('\n').filter((line) => line.trim())
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line)
              console.log('[ProcessManager] Parsed JSON line:', {
                type: parsed.type,
                subtype: parsed.subtype,
                hasSessionId: !!parsed.session_id,
                sessionId: parsed.session_id
              })

              if (parsed.type === 'system' && parsed.subtype === 'init' && parsed.session_id) {
                console.log(`[ProcessManager] Found sessionId in output: ${parsed.session_id}`)
                // Auto-update sessionId
                this.updateSessionId(runId, parsed.session_id)
              }
            } catch {
              // Not JSON or parsing error, skip
            }
          }
        }

        this.appendLiveOutput(runId, output)

        this.sendAgentEvent(runId, 'agent-output', output)
      })

      childProcess.stdout.on('end', () => {
        console.log('[ProcessManager] stdout stream ended for runId:', runId)
      })

      childProcess.stdout.on('error', (error) => {
        console.error('[ProcessManager] stdout error for runId:', runId, error)
      })
    } else {
      console.log('[ProcessManager] No stdout available for runId:', runId)
    }

    // Handle stderr
    if (childProcess.stderr) {
      console.log('[ProcessManager] Setting up stderr listener for runId:', runId)
      childProcess.stderr.on('data', (data: Buffer) => {
        const output = data.toString()
        console.log(
          '[ProcessManager] Received stderr data for runId:',
          runId,
          'length:',
          output.length
        )
        console.log('[ProcessManager] Stderr content:', JSON.stringify(output))
        this.appendLiveOutput(runId, output)
        this.sendAgentEvent(runId, 'agent-error', output)
      })

      childProcess.stderr.on('end', () => {
        console.log('[ProcessManager] stderr stream ended for runId:', runId)
      })

      childProcess.stderr.on('error', (error) => {
        console.error('[ProcessManager] stderr error for runId:', runId, error)
      })
    } else {
      console.log('[ProcessManager] No stderr available for runId:', runId)
    }

    // Add process event listeners for debugging
    childProcess.on('spawn', () => {
      console.log('[ProcessManager] Process spawned event for runId:', runId)

      // Set up a periodic status check and track it for cleanup
      const statusCheckInterval = setInterval(() => {
        if (childProcess.killed) {
          console.log('[ProcessManager] Process is killed for runId:', runId)
          this.clearProcessIntervals(runId)
        } else {
          console.log(
            '[ProcessManager] Process still running for runId:',
            runId,
            'PID:',
            childProcess.pid
          )
        }
      }, 10000) // Check every 10 seconds

      // Track the interval for cleanup
      this.processIntervals.set(runId, statusCheckInterval)

      // Clear interval when process ends
      childProcess.on('close', () => {
        this.clearProcessIntervals(runId)
      })
    })

    childProcess.on('close', (code, signal) => {
      console.log(
        '[ProcessManager] Process closed for runId:',
        runId,
        'code:',
        code,
        'signal:',
        signal
      )
    })

    childProcess.on('exit', (code, signal) => {
      console.log(
        '[ProcessManager] Process exited for runId:',
        runId,
        'code:',
        code,
        'signal:',
        signal
      )
    })

    childProcess.on('error', (error) => {
      console.error('[ProcessManager] Process error for runId:', runId, error)
    })
  }

  /**
   * Handle process completion
   */
  private handleProcessCompletion(runId: number, result: Result): void {
    const handle = this.processes.get(runId)
    if (!handle) return

    handle.isFinished = true
    this.emit('processCompleted', { runId, result })
    this.sendAgentEvent(runId, 'agent-complete', result.exitCode === 0)
  }

  /**
   * Handle process error
   */
  private handleProcessError(runId: number, error: Error): void {
    const handle = this.processes.get(runId)
    if (!handle) return

    handle.isFinished = true

    // 增强错误信息，特别是对 ENOENT 错误
    let enhancedError = error

    if (error.message.includes('ENOENT') || (error as any).code === 'ENOENT') {
      const originalError = error as any
      const command = originalError.path || 'unknown command'

      console.error('[ProcessManager] Process error for runId:', runId, error)
      console.error('[ProcessManager] Command not found:', command)
      console.error('[ProcessManager] Current PATH:', process.env.PATH)
      console.error('[ProcessManager] Current working directory:', process.cwd())

      // 创建增强的错误消息
      const errorDetails = [
        `Command not found: ${command}`,
        `Error code: ${originalError.code}`,
        `Working directory: ${handle.info.projectPath}`,
        '',
        'Debugging information:',
        `- Full PATH: ${process.env.PATH}`,
        `- Command arguments: ${originalError.spawnargs?.join(' ') || 'N/A'}`,
        '',
        'Possible solutions:',
        '1. Ensure Claude Code is installed: npm install -g @anthropic-ai/claude-code',
        '2. Check if Claude is in PATH: which claude',
        '3. Try restarting the application to refresh environment variables',
        '4. Check Claude binary detection in application settings'
      ].join('\n')

      enhancedError = new Error(errorDetails)
      enhancedError.name = 'CommandNotFoundError'
      ;(enhancedError as any).originalError = error
      ;(enhancedError as any).code = originalError.code
      ;(enhancedError as any).command = command
    } else if (
      error.message.includes('unknown option') ||
      error.message.includes('invalid argument') ||
      (error as any).stderr?.includes('unknown option')
    ) {
      // 处理命令行参数错误
      const originalError = error as any
      const stderr = originalError.stderr || ''
      const stdout = originalError.stdout || ''

      console.error('[ProcessManager] Command line argument error for runId:', runId, error)
      console.error('[ProcessManager] Command:', originalError.command)
      console.error('[ProcessManager] stderr:', stderr)
      console.error('[ProcessManager] stdout:', stdout)

      const errorDetails = [
        'Command line argument error:',
        stderr || error.message,
        '',
        'Command executed:',
        originalError.command || 'N/A',
        '',
        'This usually indicates an issue with the command arguments.',
        'The application may need to be updated to match the current Claude Code version.',
        '',
        'Debugging information:',
        `- Working directory: ${handle.info.projectPath}`,
        `- Exit code: ${originalError.exitCode || 'N/A'}`,
        `- Full error: ${error.message}`
      ].join('\n')

      enhancedError = new Error(errorDetails)
      enhancedError.name = 'CommandArgumentError'
      ;(enhancedError as any).originalError = error
      ;(enhancedError as any).stderr = stderr
      ;(enhancedError as any).stdout = stdout
    } else {
      console.error('[ProcessManager] Process error for runId:', runId, error)
    }

    this.emit('processError', { runId, error: enhancedError })
    this.sendAgentEvent(runId, 'agent-complete', false)
  }

  /**
   * Kill a running process
   */
  async killProcess(runId: number): Promise<boolean> {
    const handle = this.processes.get(runId)
    if (!handle) {
      return false
    }

    const { info, process } = handle

    try {
      if (process && !handle.isFinished) {
        // Clear any existing intervals for this process
        this.clearProcessIntervals(runId)

        // Try graceful termination first, but with shorter timeout
        if (process.pid) {
          console.log(`[ProcessManager] Sending SIGTERM to process ${runId} (PID: ${process.pid})`)
          await new Promise<void>((resolve, reject) => {
            treeKill(process.pid!, 'SIGTERM', (error) => {
              if (error) {
                console.warn(`Failed to send SIGTERM to process ${runId}:`, error)
                // Try SIGKILL as fallback immediately
                console.log(
                  `[ProcessManager] Sending SIGKILL to process ${runId} (PID: ${process.pid})`
                )
                treeKill(process.pid!, 'SIGKILL', (killError) => {
                  if (killError) {
                    console.error(`Failed to send SIGKILL to process ${runId}:`, killError)
                    reject(killError)
                  } else {
                    resolve()
                  }
                })
              } else {
                resolve()
              }
            })
          })
        }

        // Wait for process to exit with much shorter timeout
        try {
          await Promise.race([
            process,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000)) // Reduced from 5000 to 2000
          ])
        } catch (timeoutError) {
          console.warn(`Process ${runId} didn't exit within 2s timeout, force killing`)
          if (process.pid) {
            console.log(`[ProcessManager] Force killing process tree for PID: ${process.pid}`)
            try {
              treeKill(process.pid, 'SIGKILL')
            } catch (killError) {
              console.error(`Failed to force kill process ${runId}:`, killError)
            }
          }
        }
      }

      // Remove event listeners to prevent memory leaks
      this.removeProcessListeners(runId)

      // Mark as finished and remove from registry
      handle.isFinished = true
      this.processes.delete(runId)

      this.emit('processKilled', info)
      this.sendAgentEvent(runId, 'agent-complete', false)

      return true
    } catch (error) {
      console.error(`Error killing process ${runId}:`, error)
      // Even if there's an error, mark as finished and remove from registry
      handle.isFinished = true
      this.processes.delete(runId)
      return false
    }
  }

  /**
   * Get all running Claude sessions
   */
  getRunningClaudeSessions(): ProcessInfo[] {
    return Array.from(this.processes.values())
      .filter(
        (handle) => handle.info.processType === ProcessType.ClaudeSession && !handle.isFinished
      )
      .map((handle) => handle.info)
  }

  /**
   * Get a Claude session by session ID
   */
  getClaudeSessionById(sessionId: string): ProcessInfo | null {
    for (const handle of this.processes.values()) {
      if (
        handle.info.processType === ProcessType.ClaudeSession &&
        handle.info.sessionId === sessionId &&
        !handle.isFinished
      ) {
        return handle.info
      }
    }
    return null
  }

  /**
   * Get all running agent processes
   */
  getRunningAgentProcesses(): ProcessInfo[] {
    return Array.from(this.processes.values())
      .filter((handle) => handle.info.processType === ProcessType.AgentRun && !handle.isFinished)
      .map((handle) => handle.info)
  }

  /**
   * Get all running processes
   */
  getRunningProcesses(): ProcessInfo[] {
    return Array.from(this.processes.values())
      .filter((handle) => !handle.isFinished)
      .map((handle) => handle.info)
  }

  /**
   * Get a specific process
   */
  getProcess(runId: number): ProcessInfo | null {
    const handle = this.processes.get(runId)
    return handle ? handle.info : null
  }

  /**
   * Check if a process is still running
   */
  isProcessRunning(runId: number): boolean {
    const handle = this.processes.get(runId)
    if (!handle) return false

    // If process is marked as finished, it's not running
    if (handle.isFinished) return false

    // For processes with child process, check if it's still alive
    if (handle.process) {
      return !handle.process.killed && handle.process.exitCode === null
    }

    // For Claude sessions (no child process), assume running unless marked finished
    return true
  }

  /**
   * Append to live output for a process
   */
  appendLiveOutput(runId: number, output: string): void {
    const handle = this.processes.get(runId)
    if (handle) {
      handle.liveOutput.push(output)

      // Keep only last 1000 output chunks to prevent memory issues
      if (handle.liveOutput.length > 1000) {
        handle.liveOutput = handle.liveOutput.slice(-1000)
      }
    }
  }

  /**
   * Get live output for a process
   */
  getLiveOutput(runId: number): string {
    const handle = this.processes.get(runId)
    return handle ? handle.liveOutput.join('') : ''
  }

  /**
   * Cleanup finished processes
   */
  async cleanupFinishedProcesses(): Promise<number[]> {
    const finishedRunIds: number[] = []

    for (const [runId, handle] of this.processes.entries()) {
      if (handle.isFinished || (handle.process && handle.process.killed)) {
        finishedRunIds.push(runId)
        this.processes.delete(runId)
      }
    }

    return finishedRunIds
  }

  /**
   * Send notification to UI
   */
  private notifyUI(event: string, data: any): void {
    if (this.browserWindow && !this.browserWindow.isDestroyed()) {
      this.browserWindow.webContents.send(event, data)
    }
  }

  /**
   * Send agent event with runId isolation
   */

  private sendAgentEvent(runId: number, eventType: string, data: any): void {
    const handle = this.processes.get(runId)

    // 调试信息
    console.log(`[ProcessManager] sendAgentEvent debug:`, {
      runId,
      eventType,
      agentId: handle?.info.agentId,
      agentName: handle?.info.agentName,
      sessionId: handle?.info.sessionId,
      isClaudeCode: handle?.info.agentId === 0 && handle?.info.agentName?.includes('Claude Code')
    })

    // 统一使用 runId 作为事件通道标识，简化消息路由
    if (handle?.info.agentId === 0 && handle?.info.agentName?.includes('Claude Code')) {
      // Claude Code 会话：使用 claude-* 前缀 + runId
      const claudeEventType = eventType.replace('agent-', 'claude-')
      const runSpecificEvent = `${claudeEventType}:${runId}`

      console.log(
        `[ProcessManager] Sending runId-specific Claude event: ${runSpecificEvent}`,
        data?.length ? `data length: ${data.length}` : data
      )

      if (this.browserWindow && !this.browserWindow.isDestroyed()) {
        this.browserWindow.webContents.send(runSpecificEvent, data)
      }
    } else {
      // 普通代理事件：使用 agent-* 前缀 + runId
      const runSpecificEvent = `${eventType}:${runId}`
      console.log(
        `[ProcessManager] Sending runId-specific agent event: ${runSpecificEvent}`,
        data?.length ? `data length: ${data.length}` : data
      )

      if (this.browserWindow && !this.browserWindow.isDestroyed()) {
        this.browserWindow.webContents.send(runSpecificEvent, data)
      }
    }

    if (!this.browserWindow || this.browserWindow.isDestroyed()) {
      console.log(`[ProcessManager] Browser window not available for event`)
    }
  }

  /**
   * Update the sessionId for a running process
   */
  updateSessionId(runId: number, sessionId: string): void {
    const handle = this.processes.get(runId)
    if (handle) {
      const previousSessionId = handle.info.sessionId
      handle.info.sessionId = sessionId
      console.log(`[ProcessManager] Updated sessionId for runId ${runId}:`, {
        previousSessionId,
        newSessionId: sessionId,
        agentName: handle.info.agentName
      })

      // Ensure we don't emit unnecessary events that might cause frontend re-renders
      // Only emit if there was a real change
      if (previousSessionId !== sessionId) {
        console.log(
          `[ProcessManager] SessionId actually changed from ${previousSessionId} to ${sessionId}`
        )
      }
    } else {
      console.warn(`[ProcessManager] Cannot update sessionId: runId ${runId} not found`)
    }
  }

  /**
   * Unregister a process
   */
  unregisterProcess(runId: number): void {
    const handle = this.processes.get(runId)
    if (handle) {
      handle.isFinished = true
      this.processes.delete(runId)
    }
  }

  /**
   * Get process count for monitoring
   */
  getProcessCount(): { total: number; agents: number; claude: number } {
    let total = 0
    let agents = 0
    let claude = 0

    for (const handle of this.processes.values()) {
      if (!handle.isFinished) {
        total++
        if (handle.info.processType === ProcessType.AgentRun) {
          agents++
        } else if (handle.info.processType === ProcessType.ClaudeSession) {
          claude++
        }
      }
    }

    return { total, agents, claude }
  }

  /**
   * Clear process intervals for a specific runId
   */
  private clearProcessIntervals(runId: number): void {
    const interval = this.processIntervals.get(runId)
    if (interval) {
      clearInterval(interval)
      this.processIntervals.delete(runId)
      console.log(`[ProcessManager] Cleared interval for runId: ${runId}`)
    }
  }

  /**
   * Remove all event listeners for a process to prevent memory leaks
   */
  private removeProcessListeners(runId: number): void {
    const handle = this.processes.get(runId)
    if (handle && handle.process) {
      try {
        // Remove all listeners from the process
        handle.process.removeAllListeners()
        if (handle.process.stdout) {
          handle.process.stdout.removeAllListeners()
        }
        if (handle.process.stderr) {
          handle.process.stderr.removeAllListeners()
        }
        console.log(`[ProcessManager] Removed all listeners for runId: ${runId}`)
      } catch (error) {
        console.error(`[ProcessManager] Error removing listeners for runId ${runId}:`, error)
      }
    }
  }

  /**
   * Force cleanup all processes and resources - used during app shutdown
   */
  async forceCleanupAll(): Promise<void> {
    console.log('[ProcessManager] Starting force cleanup of all processes and resources')

    // Clear all intervals first
    for (const [runId, interval] of this.processIntervals.entries()) {
      clearInterval(interval)
      console.log(`[ProcessManager] Force cleared interval for runId: ${runId}`)
    }
    this.processIntervals.clear()

    // Get all process PIDs for force killing
    const activePids: number[] = []
    for (const handle of this.processes.values()) {
      if (handle.process && handle.process.pid && !handle.isFinished) {
        activePids.push(handle.process.pid)
      }
    }

    // Remove all event listeners to prevent memory leaks
    for (const [runId] of this.processes.entries()) {
      this.removeProcessListeners(runId)
    }

    // Force kill all active processes
    const killPromises = activePids.map(async (pid) => {
      try {
        console.log(`[ProcessManager] Force killing PID: ${pid}`)
        await new Promise<void>((resolve) => {
          treeKill(pid, 'SIGKILL', (error) => {
            if (error) {
              console.error(`[ProcessManager] Error force killing PID ${pid}:`, error)
            } else {
              console.log(`[ProcessManager] Successfully force killed PID: ${pid}`)
            }
            resolve() // Always resolve to not block cleanup
          })
        })
      } catch (error) {
        console.error(`[ProcessManager] Exception force killing PID ${pid}:`, error)
      }
    })

    // Wait for all kills with timeout
    try {
      await Promise.race([
        Promise.allSettled(killPromises),
        new Promise((resolve) => setTimeout(resolve, 3000)) // 3 second timeout
      ])
    } catch (error) {
      console.error('[ProcessManager] Error during force cleanup:', error)
    }

    // Clear the processes map
    this.processes.clear()

    // Remove all event emitter listeners
    this.removeAllListeners()

    console.log('[ProcessManager] Force cleanup completed')
  }
}

// Global instance
export const processManager = new ProcessManager()
