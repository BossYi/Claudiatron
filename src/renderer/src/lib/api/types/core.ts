/** Process type for tracking in ProcessRegistry */
export type ProcessType =
  | { AgentRun: { agent_id: number; agent_name: string } }
  | { ClaudeSession: { session_id: string } }

/** Information about a running process */
export interface ProcessInfo {
  run_id: number
  process_type: ProcessType
  pid: number
  started_at: string
  project_path: string
  task: string
  model: string
}

/**
 * Represents a project in the ~/.claude/projects directory
 */
export interface Project {
  /** The project ID (derived from the directory name) */
  id: string
  /** The original project path (decoded from the directory name) */
  path: string
  /** List of session IDs (JSONL file names without extension) */
  sessions: string[]
  /** Unix timestamp when the project directory was created */
  created_at: number
}

/**
 * Represents a session with its metadata
 */
export interface Session {
  /** The session ID (UUID) */
  id: string
  /** The project ID this session belongs to */
  project_id: string
  /** The project path */
  project_path: string
  /** Optional todo data associated with this session */
  todo_data?: any
  /** Unix timestamp when the session file was created */
  created_at: number
  /** First user message content (if available) */
  first_message?: string
  /** Timestamp of the first user message (if available) */
  message_timestamp?: string
}

/**
 * Represents the settings from ~/.claude/settings.json
 */
export interface ClaudeSettings {
  [key: string]: any
}

/**
 * Represents the Claude Code version status
 */
export interface ClaudeVersionStatus {
  /** Whether Claude Code is installed and working */
  is_installed: boolean
  /** The version string if available */
  version?: string
  /** The full output from the command */
  output: string
}

/**
 * Represents a CLAUDE.md file found in the project
 */
export interface ClaudeMdFile {
  /** Relative path from the project root */
  relative_path: string
  /** Absolute path to the file */
  absolute_path: string
  /** File size in bytes */
  size: number
  /** Last modified timestamp */
  modified: number
}

/**
 * Represents a file or directory entry
 */
export interface FileEntry {
  name: string
  path: string
  is_directory: boolean
  size: number
  extension?: string
}

/**
 * Represents a Claude installation found on the system
 */
export interface ClaudeInstallation {
  /** Full path to the Claude binary (or "claude-code" for sidecar) */
  path: string
  /** Version string if available */
  version?: string
  /** Source of discovery (e.g., "nvm", "system", "homebrew", "which", "bundled", "fnm") */
  source: string
  /** Type of installation */
  installation_type: 'Bundled' | 'System' | 'Custom'
  /** Resolved path if the path is a symlink */
  resolvedPath?: string
  /** Node.js version if installed via a Node version manager */
  nodeVersion?: string
}
