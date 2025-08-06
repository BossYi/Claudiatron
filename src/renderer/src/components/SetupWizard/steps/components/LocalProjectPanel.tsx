import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface LocalProjectPanelProps {
  localPath: string
  onPathChange: (path: string) => void
  onSelectFolder: () => void
}

export const LocalProjectPanel: React.FC<LocalProjectPanelProps> = ({
  localPath,
  onPathChange,
  onSelectFolder
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">导入本地项目</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="localPath">项目目录</Label>
          <div className="flex gap-2">
            <Input
              id="localPath"
              value={localPath}
              onChange={(e) => onPathChange(e.target.value)}
              placeholder="/Users/username/my-project"
              className="flex-1"
            />
            <Button variant="outline" onClick={onSelectFolder}>
              选择
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">请选择包含您项目文件的目录</p>
        </div>
      </CardContent>
    </Card>
  )
}
