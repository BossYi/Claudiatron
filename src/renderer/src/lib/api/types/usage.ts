// Usage Dashboard types
export interface UsageEntry {
  project: string
  timestamp: string
  model: string
  input_tokens: number
  output_tokens: number
  cache_write_tokens: number
  cache_read_tokens: number
  cost: number
}

export interface ModelUsage {
  model: string
  total_cost: number
  total_tokens: number
  input_tokens: number
  output_tokens: number
  cache_creation_tokens: number
  cache_read_tokens: number
  session_count: number
  request_count?: number // API 请求数
}

export interface DailyUsage {
  date: string
  total_cost: number
  total_tokens: number
  models_used: string[]
}

export interface ProjectUsage {
  project_path: string
  project_name: string
  total_cost: number
  total_tokens: number
  session_count: number
  request_count?: number // API 请求数
  last_used: string
}

export interface UsageStats {
  total_cost: number
  total_tokens: number
  total_input_tokens: number
  total_output_tokens: number
  total_cache_creation_tokens: number
  total_cache_read_tokens: number
  total_sessions: number
  total_requests: number // API 请求数（用于计算平均成本）
  by_model: ModelUsage[]
  by_date: DailyUsage[]
  by_project: ProjectUsage[]
}
