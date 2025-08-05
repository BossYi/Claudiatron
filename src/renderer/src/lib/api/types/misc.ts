import type { HooksConfiguration } from '@/types/hooks'

/**
 * Represents a custom slash command
 */
export interface SlashCommand {
  /** Unique identifier for the command */
  id: string
  /** Command name (without prefix) */
  name: string
  /** Full command with prefix (e.g., "/project:optimize") */
  full_command: string
  /** Command scope: "project" or "user" */
  scope: string
  /** Optional namespace (e.g., "frontend" in "/project:frontend:component") */
  namespace?: string
  /** Path to the markdown file */
  file_path: string
  /** Command content (markdown body) */
  content: string
  /** Optional description from frontmatter */
  description?: string
  /** Allowed tools from frontmatter */
  allowed_tools?: string[]
  /** Whether the command has bash commands (!) */
  has_bash_commands?: boolean
  /** Whether the command has file references (@) */
  has_file_references?: boolean
  /** Whether the command uses $ARGUMENTS placeholder */
  accepts_arguments?: boolean
}

/**
 * Aone 认证信息
 */
export interface AoneAuthInfo {
  domainAccount: string
  privateToken: string
}

// Re-export HooksConfiguration for convenience
export type { HooksConfiguration }
