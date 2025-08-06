import React from 'react'
import { ArrowLeft, Search, X, Package, GitBranch, Lock, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import type { BusinessTeam, PresetRepository } from '@/types/setupWizard'

interface ProjectSelectionPanelProps {
  selectedTeam: BusinessTeam
  filteredProjects: PresetRepository[]
  selectedProject: PresetRepository | null
  searchQuery: string
  onBackToTeams: () => void
  onSelectProject: (project: PresetRepository) => void
  onSearchChange: (query: string) => void
}

export const ProjectSelectionPanel: React.FC<ProjectSelectionPanelProps> = ({
  selectedTeam,
  filteredProjects,
  selectedProject,
  searchQuery,
  onBackToTeams,
  onSelectProject,
  onSearchChange
}) => {
  return (
    <div className="h-full flex flex-col space-y-4 min-w-0">
      {/* 头部导航 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToTeams}
            className="flex items-center gap-1 text-muted-foreground hover:text-primary h-7 px-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="text-xs">返回</span>
          </Button>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium">{selectedTeam.teamName} - 选择项目</h3>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          {filteredProjects.length} 个项目
        </Badge>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="搜索项目..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-8 h-9 text-sm"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSearchChange('')}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-5 w-5 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* 项目列表容器 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1">
        {/* 使用 auto-fill 确保一行最多3个，最少1个 */}
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            maxWidth: '1050px',
            margin: '0 auto'
          }}
        >
          {filteredProjects.map((project) => (
            <Card
              key={project.repoId}
              className={`cursor-pointer transition-all duration-200 hover:shadow-sm h-full ${
                selectedProject?.repoId === project.repoId
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'hover:border-primary/40'
              }`}
              onClick={() => onSelectProject(project)}
            >
              <CardContent className="p-3">
                <div className="flex flex-col h-full space-y-2">
                  {/* 项目标题区 - 固定高度 */}
                  <div className="flex items-start gap-2">
                    <div className="p-1 bg-primary/10 rounded flex-shrink-0">
                      <GitBranch className="w-3 h-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-medium text-sm truncate flex-1" title={project.name}>
                          {project.name}
                        </h4>
                        {selectedProject?.repoId === project.repoId && (
                          <CheckCircle className="w-3 h-3 text-primary flex-shrink-0" />
                        )}
                      </div>
                      {/* 元信息 - 简化显示 */}
                      <div className="flex items-center gap-1 mt-1">
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          {project.type}
                        </Badge>
                        {project.isPrivate && (
                          <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 描述 - 固定高度 */}
                  <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
                    {project.description || '暂无描述'}
                  </p>

                  {/* 底部信息 - 固定在底部 */}
                  <div className="flex items-center justify-end text-xs">
                    <span className="text-muted-foreground">{project.defaultBranch}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 空状态 */}
      {filteredProjects.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <Card className="border-dashed max-w-sm">
            <CardContent className="text-center py-8">
              <Package className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              {searchQuery ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-3">没有找到匹配的项目</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSearchChange('')}
                    className="h-8 text-xs"
                  >
                    清除搜索
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">该团队暂无可用项目</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
