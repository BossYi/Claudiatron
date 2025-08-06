import React from 'react'
import { Users, GitBranch } from 'lucide-react'
import { ImportMode } from '@/types/setupWizard'
import { cn } from '@/lib/utils'

interface ImportModeTabsProps {
  importMode: ImportMode
  onModeChange: (mode: ImportMode) => void
}

export const ImportModeTabs: React.FC<ImportModeTabsProps> = ({ importMode, onModeChange }) => {
  const modes = [
    {
      value: ImportMode.PRESET,
      label: '常用代码库导入',
      shortLabel: '常用',
      icon: Users,
      description: '从团队配置的项目库中选择'
    },
    {
      value: ImportMode.CUSTOM,
      label: '自定义代码库导入',
      shortLabel: '自定义',
      icon: GitBranch,
      description: '手动输入仓库地址'
    }
  ]

  return (
    <div className="inline-flex bg-muted/30 rounded-lg p-0.5">
      {modes.map((mode) => {
        const Icon = mode.icon
        const isActive = importMode === mode.value

        return (
          <button
            key={mode.value}
            onClick={() => onModeChange(mode.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md',
              'transition-all duration-200 text-sm font-medium',
              'hover:bg-background/60',
              isActive ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'
            )}
            title={mode.description}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{mode.label}</span>
            <span className="sm:hidden">{mode.shortLabel}</span>
          </button>
        )
      })}
    </div>
  )
}
