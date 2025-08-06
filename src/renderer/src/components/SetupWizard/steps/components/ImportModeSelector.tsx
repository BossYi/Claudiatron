import React from 'react'
import { Users, GitBranch } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ImportMode } from '@/types/setupWizard'

interface ImportModeSelectorProps {
  importMode: ImportMode
  onModeChange: (mode: ImportMode) => void
}

export const ImportModeSelector: React.FC<ImportModeSelectorProps> = ({
  importMode,
  onModeChange
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">选择导入方式</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label>导入模式</Label>
          <RadioGroup
            value={importMode}
            onValueChange={(value) => onModeChange(value as ImportMode)}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="preset" id="preset" />
              <Label htmlFor="preset" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  预置项目库 (推荐)
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  自定义仓库地址
                </div>
              </Label>
            </div>
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            预置模式：从团队配置的项目库中选择；自定义模式：手动输入仓库地址
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
