import React from 'react'
import { Users, Building2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { BusinessTeam } from '@/types/setupWizard'

interface TeamSelectionPanelProps {
  teams: BusinessTeam[]
  onSelectTeam: (team: BusinessTeam) => void
}

export const TeamSelectionPanel: React.FC<TeamSelectionPanelProps> = ({ teams, onSelectTeam }) => {
  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium">选择业务团队</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {teams.length} 个团队
        </Badge>
      </div>

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
          {teams.map((team) => (
            <Card
              key={team.teamId}
              className="cursor-pointer transition-all duration-200 hover:shadow-sm hover:border-primary/40 h-fit"
              onClick={() => onSelectTeam(team)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-primary/10 rounded flex-shrink-0">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-base truncate" title={team.teamName}>
                        {team.teamName}
                      </h4>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5 mt-1.5">
                        {team.repositories.length} 个项目
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {team.teamDesc || '暂无描述'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {teams.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <Card className="border-dashed max-w-sm">
            <CardContent className="text-center py-8">
              <Building2 className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">暂无可用的业务团队</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
