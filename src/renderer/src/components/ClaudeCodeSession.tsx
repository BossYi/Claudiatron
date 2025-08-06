import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Terminal,
  FolderOpen,
  Copy,
  ChevronDown,
  GitBranch,
  Settings,
  ChevronUp,
  X,
  Hash,
  Command
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { api, type Session } from '@/lib/api'
import { cn } from '@/lib/utils'
import { open } from '@/lib/api'
import { listen, type UnlistenFn } from '@/lib/api'
import { getDefaultProjectsPath } from '@/lib/utils/projectPaths'
import { StreamMessage } from './StreamMessage'
import { FloatingPromptInput, type FloatingPromptInputRef } from './FloatingPromptInput'
import { ErrorBoundary } from './ErrorBoundary'
import { TimelineNavigator } from './TimelineNavigator'
import { CheckpointSettings } from './CheckpointSettings'
import { SlashCommandsManager } from './SlashCommandsManager'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { SplitPane } from '@/components/ui/split-pane'
import { WebviewPreview } from './WebviewPreview'
import type { ClaudeStreamMessage } from './AgentExecution'
import { useVirtualizer } from '@tanstack/react-virtual'

interface ClaudeCodeSessionProps {
  /**
   * Optional session to resume (when clicking from SessionList)
   */
  session?: Session
  /**
   * Initial project path (for new sessions)
   */
  initialProjectPath?: string
  /**
   * Callback to go back
   */
  onBack: () => void
  /**
   * Callback to open hooks configuration
   */
  onProjectSettings?: (projectPath: string) => void
  /**
   * Optional className for styling
   */
  className?: string
  /**
   * Callback when streaming state changes
   */
  onStreamingChange?: (isStreaming: boolean, sessionId: string | null) => void
}

/**
 * ClaudeCodeSession component for interactive Claude Code sessions
 *
 * @example
 * <ClaudeCodeSession onBack={() => setView('projects')} />
 */
export const ClaudeCodeSession: React.FC<ClaudeCodeSessionProps> = ({
  session,
  initialProjectPath = '',
  onBack,
  onProjectSettings,
  className,
  onStreamingChange
}) => {
  const { t } = useTranslation('session')
  const [defaultProjectsPath, setDefaultProjectsPath] = useState<string>('')
  const [projectPath, setProjectPath] = useState(initialProjectPath || session?.project_path || '')
  const [messages, setMessages] = useState<ClaudeStreamMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rawJsonlOutput, setRawJsonlOutput] = useState<string[]>([])
  const [copyPopoverOpen, setCopyPopoverOpen] = useState(false)
  const [isFirstPrompt, setIsFirstPrompt] = useState(!session)
  const [totalTokens, setTotalTokens] = useState(0)
  const [extractedSessionInfo, setExtractedSessionInfo] = useState<{
    sessionId: string
    projectId: string
  } | null>(null)
  const [claudeSessionId, setClaudeSessionId] = useState<string | null>(null)
  const [currentRunId, setCurrentRunId] = useState<number | null>(null)
  const [showTimeline, setShowTimeline] = useState(false)
  const [timelineVersion, setTimelineVersion] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [showForkDialog, setShowForkDialog] = useState(false)
  const [showSlashCommandsSettings, setShowSlashCommandsSettings] = useState(false)
  const [forkCheckpointId, setForkCheckpointId] = useState<string | null>(null)
  const [forkSessionName, setForkSessionName] = useState('')

  // Queued prompts state
  const [queuedPrompts, setQueuedPrompts] = useState<
    Array<{ id: string; prompt: string; model: 'sonnet' | 'opus' }>
  >([])

  // New state for preview feature
  const [showPreview, setShowPreview] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [showPreviewPrompt, setShowPreviewPrompt] = useState(false)
  const [splitPosition, setSplitPosition] = useState(50)
  const [isPreviewMaximized, setIsPreviewMaximized] = useState(false)

  // Add collapsed state for queued prompts
  const [queuedPromptsCollapsed, setQueuedPromptsCollapsed] = useState(false)

  const parentRef = useRef<HTMLDivElement>(null)
  const unlistenRefs = useRef<UnlistenFn[]>([])
  const hasActiveSessionRef = useRef(false)
  const floatingPromptRef = useRef<FloatingPromptInputRef>(null)
  const queuedPromptsRef = useRef<Array<{ id: string; prompt: string; model: 'sonnet' | 'opus' }>>(
    []
  )
  const isMountedRef = useRef(true)
  const isListeningRef = useRef(false)
  const effectiveSessionRef = useRef<Session | null>(null)

  // Simple listener management using currentRunId
  const currentListenersRef = useRef<{
    output: UnlistenFn | null
    error: UnlistenFn | null
    complete: UnlistenFn | null
  }>({
    output: null,
    error: null,
    complete: null
  })

  // Keep ref in sync with state
  useEffect(() => {
    queuedPromptsRef.current = queuedPrompts
  }, [queuedPrompts])

  // 获取默认项目路径
  useEffect(() => {
    const loadDefaultPath = async () => {
      const defaultPath = await getDefaultProjectsPath()
      setDefaultProjectsPath(defaultPath)
      // 如果当前没有设置项目路径，使用默认路径
      if (!projectPath && !initialProjectPath && !session?.project_path) {
        setProjectPath(defaultPath)
      }
    }
    loadDefaultPath()
  }, [])

  // Get effective session info - prefer detected sessionId over prop
  const effectiveSession = useMemo(() => {
    // If we have detected a sessionId from the message stream, use it
    if (claudeSessionId) {
      const projectId =
        extractedSessionInfo?.projectId ||
        session?.project_id ||
        projectPath.replace(/[^a-zA-Z0-9]/g, '-')
      return {
        id: claudeSessionId, // Always use the detected sessionId
        project_id: projectId,
        project_path: projectPath,
        todo_data: session?.todo_data || null,
        created_at: session?.created_at || Date.now()
      } as Session
    }
    // Otherwise fall back to the session prop
    if (session) return session
    return null
  }, [session, claudeSessionId, extractedSessionInfo, projectPath])

  // Keep effectiveSessionRef in sync
  useEffect(() => {
    effectiveSessionRef.current = effectiveSession
  }, [effectiveSession])

  // Filter out messages that shouldn't be displayed
  const displayableMessages = useMemo(() => {
    return messages.filter((message, index) => {
      // Skip meta messages that don't have meaningful content
      if (message.isMeta && !message.leafUuid && !message.summary) {
        return false
      }

      // Skip user messages that only contain tool results that are already displayed
      if (message.type === 'user' && message.message) {
        if (message.isMeta) return false

        const msg = message.message
        if (!msg.content || (Array.isArray(msg.content) && msg.content.length === 0)) {
          return false
        }

        if (Array.isArray(msg.content)) {
          let hasVisibleContent = false
          for (const content of msg.content) {
            if (content.type === 'text') {
              hasVisibleContent = true
              break
            }
            if (content.type === 'tool_result') {
              let willBeSkipped = false
              if (content.tool_use_id) {
                // Look for the matching tool_use in previous assistant messages
                for (let i = index - 1; i >= 0; i--) {
                  const prevMsg = messages[i]
                  if (
                    prevMsg.type === 'assistant' &&
                    prevMsg.message?.content &&
                    Array.isArray(prevMsg.message.content)
                  ) {
                    const toolUse = prevMsg.message.content.find(
                      (c: any) => c.type === 'tool_use' && c.id === content.tool_use_id
                    )
                    if (toolUse) {
                      const toolName = toolUse.name?.toLowerCase()
                      const toolsWithWidgets = [
                        'task',
                        'edit',
                        'multiedit',
                        'todowrite',
                        'ls',
                        'read',
                        'glob',
                        'bash',
                        'write',
                        'grep'
                      ]
                      if (
                        toolsWithWidgets.includes(toolName) ||
                        toolUse.name?.startsWith('mcp__')
                      ) {
                        willBeSkipped = true
                      }
                      break
                    }
                  }
                }
              }
              if (!willBeSkipped) {
                hasVisibleContent = true
                break
              }
            }
          }
          if (!hasVisibleContent) {
            return false
          }
        }
      }
      return true
    })
  }, [messages])

  const rowVirtualizer = useVirtualizer({
    count: displayableMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      // Better size estimation based on message type
      const message = displayableMessages[index]
      if (!message) return 150

      // Different estimates for different message types
      if (message.type === 'system' && message.subtype === 'init') {
        return 100 // System init messages are usually shorter
      } else if (message.type === 'user') {
        return 120 // User messages are typically shorter
      } else if (message.type === 'assistant') {
        // Assistant messages can vary greatly
        const hasToolUse = message.message?.content?.some((c: any) => c.type === 'tool_use')
        return hasToolUse ? 300 : 200
      } else if (message.type === 'result') {
        return 150 // Result messages are medium sized
      }

      return 150 // Default fallback
    },
    overscan: 5
  })

  // Debug logging
  useEffect(() => {
    console.log('[ClaudeCodeSession] State update:', {
      projectPath,
      session,
      extractedSessionInfo,
      effectiveSession,
      messagesCount: messages.length,
      isLoading
    })
  }, [projectPath, session, extractedSessionInfo, effectiveSession, messages.length, isLoading])

  // Load session history if resuming
  useEffect(() => {
    if (session) {
      // Don't set the sessionId here - wait for it from the message stream
      // This is important because Claude Code may create a new sessionId on resume
      console.log(
        '[ClaudeCodeSession] Loading session history but not setting sessionId yet - will detect from stream'
      )

      // Load session history first, then check for active session
      const initializeSession = async () => {
        await loadSessionHistory()
        // After loading history, check if the session is still active
        if (isMountedRef.current) {
          await checkForActiveSession()
        }
      }

      initializeSession()
    }
  }, [session]) // Remove hasLoadedSession dependency to ensure it runs on mount

  // Report streaming state changes
  useEffect(() => {
    onStreamingChange?.(isLoading, claudeSessionId)
  }, [isLoading, claudeSessionId, onStreamingChange])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (displayableMessages.length > 0) {
      const targetIndex = Math.min(displayableMessages.length - 1, rowVirtualizer.options.count - 1)
      if (targetIndex >= 0 && targetIndex < displayableMessages.length) {
        try {
          // Use auto behavior instead of smooth for better compatibility with virtualizer
          rowVirtualizer.scrollToIndex(targetIndex, {
            align: 'end',
            behavior: 'auto'
          })
        } catch (error) {
          console.warn('Failed to scroll to index:', targetIndex, error)
          // Fallback to native scroll if virtualizer fails
          const scrollElement = parentRef.current
          if (scrollElement) {
            setTimeout(() => {
              scrollElement.scrollTo({
                top: scrollElement.scrollHeight,
                behavior: 'auto'
              })
            }, 100)
          }
        }
      }
    }
  }, [displayableMessages.length, rowVirtualizer])

  // Calculate total tokens from messages
  useEffect(() => {
    const tokens = messages.reduce((total, msg) => {
      if (msg.message?.usage) {
        return total + msg.message.usage.input_tokens + msg.message.usage.output_tokens
      }
      if (msg.usage) {
        return total + msg.usage.input_tokens + msg.usage.output_tokens
      }
      return total
    }, 0)
    setTotalTokens(tokens)
  }, [messages])

  const loadSessionHistory = async () => {
    if (!session) return

    try {
      setIsLoading(true)
      setError(null)

      const history = await api.loadSessionHistory(session.id, session.project_id)

      // Convert history to messages format
      const loadedMessages: ClaudeStreamMessage[] = history.map((entry) => ({
        ...entry,
        type: entry.type || 'assistant'
      }))

      setMessages(loadedMessages)
      setRawJsonlOutput(history.map((h) => JSON.stringify(h)))

      // After loading history, we're continuing a conversation
      setIsFirstPrompt(false)
    } catch (err) {
      console.error('Failed to load session history:', err)
      setError('Failed to load session history')
    } finally {
      setIsLoading(false)
    }
  }

  const checkForActiveSession = async () => {
    // If we have a session prop, check if it's still active
    if (session) {
      try {
        const activeSessions = await api.listRunningClaudeSessions()
        const activeSession = activeSessions.find((s: any) => {
          if ('process_type' in s && s.process_type && 'ClaudeSession' in s.process_type) {
            return (s.process_type as any).ClaudeSession.session_id === session.id
          }
          return false
        })

        if (activeSession) {
          // Session is still active, reconnect to its stream
          console.log('[ClaudeCodeSession] Found active session, reconnecting:', session.id)

          // Don't set sessionId here - wait for it from the message stream
          // Claude Code may create a new sessionId on resume
          console.log(
            '[ClaudeCodeSession] Not setting sessionId before reconnect - will detect from stream'
          )

          // Don't add buffered messages here - they've already been loaded by loadSessionHistory
          // Just set up listeners for new messages

          // Set up listeners for the active session
          reconnectToSession(session.id)
        }
      } catch (err) {
        console.error('Failed to check for active sessions:', err)
      }
    }
  }

  // Simple message handler for runId-based events
  const handleStreamMessage = useCallback(
    (payload: string) => {
      try {
        if (!isMountedRef.current) return

        // Store raw JSONL
        setRawJsonlOutput((prev) => [...prev, payload])

        // Parse message
        const message = JSON.parse(payload) as ClaudeStreamMessage

        console.log('[ClaudeCodeSession] Received message:', {
          type: message.type,
          subtype: message.subtype,
          session_id: message.session_id,
          runId: currentRunId
        })

        setMessages((prev) => [...prev, message])

        // Update sessionId for display purposes (no longer used for routing)
        if (message.type === 'system' && message.subtype === 'init' && message.session_id) {
          if (!claudeSessionId || claudeSessionId !== message.session_id) {
            console.log(`[ClaudeCodeSession] Updated sessionId: ${message.session_id}`)
            setClaudeSessionId(message.session_id)

            // Update backend with sessionId if we have runId
            if (currentRunId) {
              api.updateSessionId(currentRunId, message.session_id).catch((err) => {
                console.error('Failed to update session ID:', err)
              })
            }

            // Update extracted session info
            if (!extractedSessionInfo) {
              const projectId = projectPath.replace(/[^a-zA-Z0-9]/g, '-')
              setExtractedSessionInfo({ sessionId: message.session_id, projectId })
            }
          }
        }
      } catch (err) {
        console.error(`[ClaudeCodeSession] Error processing message:`, err, payload)
      }
    },
    [claudeSessionId, currentRunId, projectPath, extractedSessionInfo]
  )

  // Forward reference for processComplete function
  const processCompleteRef = useRef<(success: boolean) => Promise<void>>(null as any)

  // Simple cleanup function
  const cleanupListeners = useCallback(() => {
    console.log('[ClaudeCodeSession] Cleaning up listeners')

    const { output, error, complete } = currentListenersRef.current
    if (output) {
      output()
      currentListenersRef.current.output = null
    }
    if (error) {
      error()
      currentListenersRef.current.error = null
    }
    if (complete) {
      complete()
      currentListenersRef.current.complete = null
    }

    // Clean up old unlistenRefs if any
    unlistenRefs.current.forEach((unlisten) => unlisten())
    unlistenRefs.current = []

    isListeningRef.current = false
  }, [])

  // Simple function to set up runId-based listeners
  const setupRunIdListeners = useCallback(
    async (runId: number) => {
      console.log('[ClaudeCodeSession] Setting up runId-based listeners for:', runId)

      // Clean up any existing listeners first
      cleanupListeners()

      try {
        const outputUnlisten = await listen<string>(`claude-output:${runId}`, (event) => {
          handleStreamMessage(event.payload)
        })

        const errorUnlisten = await listen<string>(`claude-error:${runId}`, (event) => {
          console.error('Claude error:', event.payload)
          setError(event.payload)
        })

        const completeUnlisten = await listen<boolean>(`claude-complete:${runId}`, (event) => {
          console.log(`[ClaudeCodeSession] RunId ${runId} completed:`, event.payload)
          processCompleteRef.current?.(event.payload)
        })

        // Store the listeners
        currentListenersRef.current = {
          output: outputUnlisten,
          error: errorUnlisten,
          complete: completeUnlisten
        }

        isListeningRef.current = true
        console.log('[ClaudeCodeSession] RunId-based listeners set up successfully')
      } catch (error) {
        console.error('[ClaudeCodeSession] Failed to setup runId-based listeners:', error)
      }
    },
    [handleStreamMessage, cleanupListeners]
  )

  const reconnectToSession = async (sessionId: string) => {
    console.log('[ClaudeCodeSession] Reconnecting to session:', sessionId)

    // For reconnecting, we'll need the runId from an active process
    // Since we don't have a runId yet, we'll wait for the first prompt to establish listeners
    console.log('[ClaudeCodeSession] Will set up listeners when first prompt is sent')

    // Set sessionId for UI display
    setClaudeSessionId(sessionId)

    // Mark as loading to show the session is active
    if (isMountedRef.current) {
      setIsLoading(true)
      hasActiveSessionRef.current = true
    }
  }

  const handleSelectPath = async () => {
    try {
      const selected = await open({
        properties: ['openDirectory'],
        title: 'Select Project Directory',
        defaultPath: defaultProjectsPath || undefined
      })

      if (selected) {
        setProjectPath(selected as string)
        setError(null)
      }
    } catch (err) {
      console.error('Failed to select directory:', err)
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(`Failed to select directory: ${errorMessage}`)
    }
  }

  const handleSendPrompt = async (prompt: string, model: 'sonnet' | 'opus') => {
    console.log('[ClaudeCodeSession] handleSendPrompt called with:', {
      prompt,
      model,
      projectPath,
      claudeSessionId,
      effectiveSession
    })

    if (!projectPath) {
      setError('Please select a project directory first')
      return
    }

    // If already loading, queue the prompt
    if (isLoading) {
      const newPrompt = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        prompt,
        model
      }
      setQueuedPrompts((prev) => [...prev, newPrompt])
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      hasActiveSessionRef.current = true

      // Reset session state for new conversations
      if (!effectiveSession) {
        setClaudeSessionId(null)
        setExtractedSessionInfo(null)
        setIsFirstPrompt(true)
      }

      // Add the user message immediately to the UI
      const userMessage: ClaudeStreamMessage = {
        type: 'user',
        message: {
          content: [
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      }
      setMessages((prev) => [...prev, userMessage])

      // Execute the appropriate command and set up listeners immediately
      if (effectiveSession && !isFirstPrompt) {
        console.log('[ClaudeCodeSession] Resuming session:', effectiveSession.id)
        const result = await api.resumeClaudeCode(projectPath, effectiveSession.id, prompt, model)
        if (result.success && result.runId) {
          setCurrentRunId(result.runId)
          console.log('[ClaudeCodeSession] Resume session started with runId:', result.runId)
          // Set up listeners immediately for this runId
          await setupRunIdListeners(result.runId)
        }
      } else {
        console.log('[ClaudeCodeSession] Starting new session')
        setIsFirstPrompt(false)
        const result = await api.executeClaudeCode(projectPath, prompt, model)
        if (result.success && result.runId) {
          setCurrentRunId(result.runId)
          console.log('[ClaudeCodeSession] New session started with runId:', result.runId)
          // Set up listeners immediately for this runId
          await setupRunIdListeners(result.runId)
        }
      }
    } catch (err) {
      console.error('Failed to send prompt:', err)
      setError('Failed to send prompt')
      setIsLoading(false)
      hasActiveSessionRef.current = false
    }
  }

  const handleCopyAsJsonl = async () => {
    const jsonl = rawJsonlOutput.join('\n')
    await navigator.clipboard.writeText(jsonl)
    setCopyPopoverOpen(false)
  }

  const handleCopyAsMarkdown = async () => {
    let markdown = `# Claude Code Session\n\n`
    markdown += `**Project:** ${projectPath}\n`
    markdown += `**Date:** ${new Date().toISOString()}\n\n`
    markdown += `---\n\n`

    for (const msg of messages) {
      if (msg.type === 'system' && msg.subtype === 'init') {
        markdown += `## System Initialization\n\n`
        markdown += `- Session ID: \`${msg.session_id || 'N/A'}\`\n`
        markdown += `- Model: \`${msg.model || 'default'}\`\n`
        if (msg.cwd) markdown += `- Working Directory: \`${msg.cwd}\`\n`
        if (msg.tools?.length) markdown += `- Tools: ${msg.tools.join(', ')}\n`
        markdown += `\n`
      } else if (msg.type === 'assistant' && msg.message) {
        markdown += `## Assistant\n\n`
        for (const content of msg.message.content || []) {
          if (content.type === 'text') {
            const textContent =
              typeof content.text === 'string'
                ? content.text
                : content.text?.text || JSON.stringify(content.text || content)
            markdown += `${textContent}\n\n`
          } else if (content.type === 'tool_use') {
            markdown += `### Tool: ${content.name}\n\n`
            markdown += `\`\`\`json\n${JSON.stringify(content.input, null, 2)}\n\`\`\`\n\n`
          }
        }
        if (msg.message.usage) {
          markdown += `*${t('tokensUsage', { input: msg.message.usage.input_tokens, output: msg.message.usage.output_tokens })}*\n\n`
        }
      } else if (msg.type === 'user' && msg.message) {
        markdown += `## User\n\n`
        for (const content of msg.message.content || []) {
          if (content.type === 'text') {
            const textContent =
              typeof content.text === 'string'
                ? content.text
                : content.text?.text || JSON.stringify(content.text)
            markdown += `${textContent}\n\n`
          } else if (content.type === 'tool_result') {
            markdown += `### Tool Result\n\n`
            let contentText = ''
            if (typeof content.content === 'string') {
              contentText = content.content
            } else if (content.content && typeof content.content === 'object') {
              if (content.content.text) {
                contentText = content.content.text
              } else if (Array.isArray(content.content)) {
                contentText = content.content
                  .map((c: any) => (typeof c === 'string' ? c : c.text || JSON.stringify(c)))
                  .join('\n')
              } else {
                contentText = JSON.stringify(content.content, null, 2)
              }
            }
            markdown += `\`\`\`\n${contentText}\n\`\`\`\n\n`
          }
        }
      } else if (msg.type === 'result') {
        markdown += `## Execution Result\n\n`
        if (msg.result) {
          markdown += `${msg.result}\n\n`
        }
        if (msg.error) {
          markdown += `**Error:** ${msg.error}\n\n`
        }
      }
    }

    await navigator.clipboard.writeText(markdown)
    setCopyPopoverOpen(false)
  }

  const handleCheckpointSelect = async () => {
    // Reload messages from the checkpoint
    await loadSessionHistory()
    // Ensure timeline reloads to highlight current checkpoint
    setTimelineVersion((v) => v + 1)
  }

  const handleCancelExecution = async () => {
    if (!currentRunId || !isLoading) return

    try {
      // Cancel using runId instead of sessionId
      await api.cancelClaudeExecution(currentRunId.toString())

      // Clean up listeners
      cleanupListeners()

      // Reset states
      setIsLoading(false)
      hasActiveSessionRef.current = false
      setError(null)

      // Clear queued prompts
      setQueuedPrompts([])

      // Add a message indicating the session was cancelled
      const cancelMessage: ClaudeStreamMessage = {
        type: 'system',
        subtype: 'info',
        result: 'Session cancelled by user',
        timestamp: new Date().toISOString()
      }
      setMessages((prev) => [...prev, cancelMessage])
    } catch (err) {
      console.error('Failed to cancel execution:', err)

      // Even if backend fails, we should update UI to reflect stopped state
      // Add error message but still stop the UI loading state
      const errorMessage: ClaudeStreamMessage = {
        type: 'system',
        subtype: 'error',
        result: `Failed to cancel execution: ${err instanceof Error ? err.message : 'Unknown error'}. The process may still be running in the background.`,
        timestamp: new Date().toISOString()
      }
      setMessages((prev) => [...prev, errorMessage])

      // Clean up listeners anyway
      cleanupListeners()

      // Reset states to allow user to continue
      setIsLoading(false)
      hasActiveSessionRef.current = false
      setError(null)
    }
  }

  const handleFork = (checkpointId: string) => {
    setForkCheckpointId(checkpointId)
    setForkSessionName(`Fork-${new Date().toISOString().slice(0, 10)}`)
    setShowForkDialog(true)
  }

  const handleConfirmFork = async () => {
    if (!forkCheckpointId || !forkSessionName.trim() || !effectiveSession) return

    try {
      setIsLoading(true)
      setError(null)

      const newSessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      await api.forkFromCheckpoint(
        forkCheckpointId,
        effectiveSession.id,
        effectiveSession.project_id,
        projectPath,
        newSessionId,
        forkSessionName
      )

      // Open the new forked session
      // You would need to implement navigation to the new session
      console.log('Forked to new session:', newSessionId)

      setShowForkDialog(false)
      setForkCheckpointId(null)
      setForkSessionName('')
    } catch (err) {
      console.error('Failed to fork checkpoint:', err)
      setError('Failed to fork checkpoint')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle URL detection from terminal output
  const handleLinkDetected = (url: string) => {
    if (!showPreview && !showPreviewPrompt) {
      setPreviewUrl(url)
      setShowPreviewPrompt(true)
    }
  }

  const handleClosePreview = () => {
    setShowPreview(false)
    setIsPreviewMaximized(false)
    // Keep the previewUrl so it can be restored when reopening
  }

  const handlePreviewUrlChange = (url: string) => {
    console.log('[ClaudeCodeSession] Preview URL changed to:', url)
    setPreviewUrl(url)
  }

  const handleTogglePreviewMaximize = () => {
    setIsPreviewMaximized(!isPreviewMaximized)
    // Reset split position when toggling maximize
    if (isPreviewMaximized) {
      setSplitPosition(50)
    }
  }

  // Simple helper to handle completion events
  const processComplete = useCallback(
    async (success: boolean) => {
      console.log('[ClaudeCodeSession] processComplete called:', { success, currentRunId })
      setIsLoading(false)
      hasActiveSessionRef.current = false

      // Clean up current listeners when session completes
      cleanupListeners()

      if (effectiveSession && success) {
        try {
          const settings = await api.getCheckpointSettings(
            effectiveSession.id,
            effectiveSession.project_id,
            projectPath
          )

          if (settings.auto_checkpoint_enabled) {
            await api.checkAutoCheckpoint(
              effectiveSession.id,
              effectiveSession.project_id,
              projectPath,
              '' // prompt will be captured from context
            )
            setTimelineVersion((v) => v + 1)
          }
        } catch (err) {
          console.error('Failed to check auto checkpoint:', err)
        }
      }

      // Process queued prompts
      if (queuedPromptsRef.current.length > 0) {
        const [nextPrompt, ...remainingPrompts] = queuedPromptsRef.current
        setQueuedPrompts(remainingPrompts)

        setTimeout(() => {
          handleSendPrompt(nextPrompt.prompt, nextPrompt.model)
        }, 100)
      }
    },
    [effectiveSession, projectPath, currentRunId, cleanupListeners]
  )

  // Update the ref when processComplete changes
  useEffect(() => {
    processCompleteRef.current = processComplete
  }, [processComplete])

  // Simple cleanup on mount/unmount
  useEffect(() => {
    isMountedRef.current = true

    return () => {
      console.log('[ClaudeCodeSession] Component unmounting, cleaning up')
      isMountedRef.current = false

      // Use the unified cleanup function
      cleanupListeners()

      // Clear checkpoint manager when session ends
      if (effectiveSessionRef.current) {
        api.clearCheckpointManager(effectiveSessionRef.current.id).catch((err) => {
          console.error('Failed to clear checkpoint manager:', err)
        })
      }
    }
  }, [cleanupListeners]) // Include cleanupListeners in dependencies

  const messagesList = (
    <div
      ref={parentRef}
      className="flex-1 overflow-y-auto relative pb-40"
      style={{
        contain: 'strict'
      }}
    >
      <div
        className="relative w-full max-w-5xl mx-auto px-4 pt-16 pb-4"
        style={{
          height: `${Math.max(rowVirtualizer.getTotalSize(), 100)}px`,
          minHeight: '100px'
        }}
      >
        <AnimatePresence>
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const message = displayableMessages[virtualItem.index]
            return (
              <motion.div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={(el) => {
                  if (el) rowVirtualizer.measureElement(el)
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-x-4 pb-4"
                style={{
                  top: virtualItem.start
                }}
              >
                <StreamMessage
                  message={message}
                  streamMessages={messages}
                  onLinkDetected={handleLinkDetected}
                />
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Loading indicator under the latest message */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center py-4 mb-40"
        >
          <div className="rotating-symbol text-primary" />
        </motion.div>
      )}

      {/* Error indicator */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive mb-40 w-full max-w-5xl mx-auto"
        >
          {error}
        </motion.div>
      )}
    </div>
  )

  const projectPathInput = !session && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="p-4 border-b border-border flex-shrink-0"
    >
      <Label htmlFor="project-path" className="text-sm font-medium">
        {t('labels.projectDirectory')}
      </Label>
      <div className="flex items-center gap-2 mt-1">
        <Input
          id="project-path"
          value={projectPath}
          onChange={(e) => setProjectPath(e.target.value)}
          placeholder={t('placeholders.projectPath')}
          className="flex-1"
          disabled={isLoading}
        />
        <Button onClick={handleSelectPath} size="icon" variant="outline" disabled={isLoading}>
          <FolderOpen className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  )

  // If preview is maximized, render only the WebviewPreview in full screen
  if (showPreview && isPreviewMaximized) {
    return (
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-50 bg-background"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <WebviewPreview
            initialUrl={previewUrl}
            onClose={handleClosePreview}
            isMaximized={isPreviewMaximized}
            onToggleMaximize={handleTogglePreviewMaximize}
            onUrlChange={handlePreviewUrlChange}
            className="h-full"
          />
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between p-2 border-b border-border"
        >
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {projectPath ? `${projectPath}` : t('status.noProject')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {projectPath && onProjectSettings && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onProjectSettings(projectPath)}
                disabled={isLoading}
              >
                <Settings className="h-4 w-4 mr-2" />
                {t('navigation.hooks')}
              </Button>
            )}
            {projectPath && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSlashCommandsSettings(true)}
                disabled={isLoading}
              >
                <Command className="h-4 w-4 mr-2" />
                {t('navigation.commands')}
              </Button>
            )}
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowSettings(!showSettings)}
                      className="h-8 w-8"
                    >
                      <Settings className={cn('h-4 w-4', showSettings && 'text-primary')} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('tooltips.checkpointSettings')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {effectiveSession && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowTimeline(!showTimeline)}
                        className="h-8 w-8"
                      >
                        <GitBranch className={cn('h-4 w-4', showTimeline && 'text-primary')} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('tooltips.timelineNavigator')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Popover open={copyPopoverOpen} onOpenChange={setCopyPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2"
                    disabled={messages.length === 0}
                  >
                    <Copy className="h-4 w-4" />
                    {t('actions.copyOutput')}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyAsMarkdown}
                    className="w-full justify-start"
                    disabled={messages.length === 0}
                  >
                    {t('actions.copyAsMarkdown')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyAsJsonl}
                    className="w-full justify-start"
                    disabled={messages.length === 0}
                  >
                    {t('actions.copyAsJsonl')}
                  </Button>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </motion.div>

        {/* Main Content Area */}
        <div
          className={cn(
            'flex-1 overflow-hidden transition-all duration-300',
            showTimeline && 'sm:mr-96'
          )}
        >
          {showPreview ? (
            // Split pane layout when preview is active
            <SplitPane
              left={
                <div className="h-full flex flex-col">
                  {projectPathInput}
                  {messagesList}
                </div>
              }
              right={
                <WebviewPreview
                  initialUrl={previewUrl}
                  onClose={handleClosePreview}
                  isMaximized={isPreviewMaximized}
                  onToggleMaximize={handleTogglePreviewMaximize}
                  onUrlChange={handlePreviewUrlChange}
                />
              }
              initialSplit={splitPosition}
              onSplitChange={setSplitPosition}
              minLeftWidth={400}
              minRightWidth={400}
              className="h-full"
            />
          ) : (
            // Original layout when no preview
            <div className="h-full flex flex-col max-w-5xl mx-auto">
              {projectPathInput}
              {messagesList}

              {isLoading && messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <div className="flex items-center gap-3">
                    <div className="rotating-symbol text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {session ? t('status.loadingHistory') : t('status.initializing')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Floating Prompt Input - Always visible */}
        <ErrorBoundary>
          {/* Queued Prompts Display */}
          <AnimatePresence>
            {queuedPrompts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-16 left-1/2 -translate-x-1/2 z-30 w-full max-w-3xl px-4"
              >
                <div className="bg-background/95 backdrop-blur-md border rounded-lg shadow-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {t('ui.queuedPrompts')} ({queuedPrompts.length})
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setQueuedPromptsCollapsed((prev) => !prev)}
                    >
                      {queuedPromptsCollapsed ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  {!queuedPromptsCollapsed &&
                    queuedPrompts.map((queuedPrompt, index) => (
                      <motion.div
                        key={queuedPrompt.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-start gap-2 bg-muted/50 rounded-md p-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-muted-foreground">
                              #{index + 1}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                              {queuedPrompt.model === 'opus' ? 'Opus' : 'Sonnet'}
                            </span>
                          </div>
                          <p className="text-sm line-clamp-2 break-words">{queuedPrompt.prompt}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={() =>
                            setQueuedPrompts((prev) => prev.filter((p) => p.id !== queuedPrompt.id))
                          }
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </motion.div>
                    ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Arrows - positioned above prompt bar with spacing */}
          {displayableMessages.length > 5 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: 0.5 }}
              className={cn(
                'fixed bottom-16 right-6 transition-all duration-300',
                showTimeline ? 'z-10 right-[25rem]' : 'z-50 right-6'
              )}
            >
              <div className="flex items-center bg-background/95 backdrop-blur-md border rounded-full shadow-lg overflow-hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Use virtualizer to scroll to the first item
                    if (displayableMessages.length > 0) {
                      try {
                        rowVirtualizer.scrollToIndex(0, {
                          align: 'start',
                          behavior: 'auto'
                        })
                      } catch (error) {
                        console.warn('Failed to scroll to top with virtualizer:', error)
                        // Fallback to native scroll
                        parentRef.current?.scrollTo({
                          top: 0,
                          behavior: 'auto'
                        })
                      }
                    }
                  }}
                  className="px-3 py-2 hover:bg-accent rounded-none"
                  title="Scroll to top"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <div className="w-px h-4 bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Use virtualizer to scroll to the last item
                    if (displayableMessages.length > 0) {
                      try {
                        const lastIndex = displayableMessages.length - 1
                        rowVirtualizer.scrollToIndex(lastIndex, {
                          align: 'end',
                          behavior: 'auto'
                        })
                      } catch (error) {
                        console.warn('Failed to scroll to bottom with virtualizer:', error)
                        // Fallback to native scroll
                        const scrollElement = parentRef.current
                        if (scrollElement) {
                          scrollElement.scrollTo({
                            top: scrollElement.scrollHeight,
                            behavior: 'auto'
                          })
                        }
                      }
                    }
                  }}
                  className="px-3 py-2 hover:bg-accent rounded-none"
                  title="Scroll to bottom"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          <div
            className={cn(
              'fixed bottom-0 left-0 right-0 transition-all duration-300 z-50',
              showTimeline && 'sm:right-96'
            )}
          >
            <FloatingPromptInput
              ref={floatingPromptRef}
              onSend={handleSendPrompt}
              onCancel={handleCancelExecution}
              isLoading={isLoading}
              disabled={!projectPath}
              projectPath={projectPath}
            />
          </div>

          {/* Token Counter - positioned under the Send button */}
          {totalTokens > 0 && (
            <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
              <div className="max-w-5xl mx-auto">
                <div className="flex justify-end px-4 pb-2">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="bg-background/95 backdrop-blur-md border rounded-full px-3 py-1 shadow-lg pointer-events-auto"
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono">{totalTokens.toLocaleString()}</span>
                      <span className="text-muted-foreground">{t('tokens')}</span>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          )}
        </ErrorBoundary>

        {/* Timeline */}
        <AnimatePresence>
          {showTimeline && effectiveSession && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full sm:w-96 bg-background border-l border-border shadow-xl z-50 overflow-hidden app-region-no-drag"
            >
              <div className="h-full flex flex-col">
                {/* Timeline Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <h3 className="text-lg font-semibold">{t('timeline.title')}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowTimeline(false)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Timeline Content */}
                <div className="flex-1 overflow-y-auto p-4">
                  <TimelineNavigator
                    sessionId={effectiveSession.id}
                    projectId={effectiveSession.project_id}
                    projectPath={projectPath}
                    currentMessageIndex={messages.length - 1}
                    onCheckpointSelect={handleCheckpointSelect}
                    onFork={handleFork}
                    refreshVersion={timelineVersion}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fork Dialog */}
      <Dialog open={showForkDialog} onOpenChange={setShowForkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialogs.forkSession.title')}</DialogTitle>
            <DialogDescription>{t('dialogs.forkSession.description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fork-name">{t('dialogs.forkSession.sessionName')}</Label>
              <Input
                id="fork-name"
                placeholder={t('placeholders.forkName')}
                value={forkSessionName}
                onChange={(e) => setForkSessionName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isLoading) {
                    handleConfirmFork()
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForkDialog(false)} disabled={isLoading}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={handleConfirmFork} disabled={isLoading || !forkSessionName.trim()}>
              {t('actions.createFork')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      {showSettings && effectiveSession && (
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="max-w-2xl" showCloseButton={false}>
            <CheckpointSettings
              sessionId={effectiveSession.id}
              projectId={effectiveSession.project_id}
              projectPath={projectPath}
              onClose={() => setShowSettings(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Slash Commands Settings Dialog */}
      {showSlashCommandsSettings && (
        <Dialog open={showSlashCommandsSettings} onOpenChange={setShowSlashCommandsSettings}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>{t('dialogs.slashCommands.title')}</DialogTitle>
              <DialogDescription>
                {t('dialogs.slashCommands.description', { projectPath })}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <SlashCommandsManager projectPath={projectPath} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
