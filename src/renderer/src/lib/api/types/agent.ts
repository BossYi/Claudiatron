// Agent API types
export interface Agent {
  id?: number
  name: string
  icon: string
  system_prompt: string
  default_task?: string
  model: string
  hooks?: string // JSON string of HooksConfiguration
  created_at: string
  updated_at: string
}

export interface AgentExport {
  version: number
  exported_at: string
  agent: {
    name: string
    icon: string
    system_prompt: string
    default_task?: string
    model: string
    hooks?: string
  }
}

export interface GitHubAgentFile {
  name: string
  path: string
  download_url: string
  size: number
  sha: string
}

export interface AgentRun {
  id?: number
  agent_id: number
  agent_name: string
  agent_icon: string
  task: string
  model: string
  project_path: string
  session_id: string
  status: string // 'pending', 'running', 'completed', 'failed', 'cancelled'
  pid?: number
  process_started_at?: string
  created_at: string
  completed_at?: string
}

export interface AgentRunMetrics {
  duration_ms?: number
  total_tokens?: number
  cost_usd?: number
  message_count?: number
}

export interface AgentRunWithMetrics {
  id?: number
  agent_id: number
  agent_name: string
  agent_icon: string
  task: string
  model: string
  project_path: string
  session_id: string
  status: string // 'pending', 'running', 'completed', 'failed', 'cancelled'
  pid?: number
  process_started_at?: string
  created_at: string
  completed_at?: string
  metrics?: AgentRunMetrics
  output?: string // Real-time JSONL content
}
