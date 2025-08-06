import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface NewProjectPanelProps {
  projectName: string
  onNameChange: (name: string) => void
  projectPath: string
  onPathChange: (path: string) => void
  onSelectFolder: () => void
}

export const NewProjectPanel: React.FC<NewProjectPanelProps> = ({
  projectName,
  onNameChange,
  projectPath,
  onPathChange,
  onSelectFolder
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">创建新项目</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="projectName">项目名称</Label>
          <Input
            id="projectName"
            value={projectName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="my-awesome-project"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="projectPath">创建位置</Label>
          <div className="flex gap-2">
            <Input
              id="projectPath"
              value={projectPath}
              onChange={(e) => onPathChange(e.target.value)}
              placeholder="/Users/username/Projects"
              className="flex-1"
            />
            <Button variant="outline" onClick={onSelectFolder}>
              选择
            </Button>
          </div>
          {projectName && projectPath && (
            <p className="text-xs text-muted-foreground">
              项目将创建在: {projectPath}/{projectName}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
