import React from 'react'
import { CheckCircle, AlertCircle, Loader2, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GlobalAuthStatus } from '@/types/setupWizard'
import { cn } from '@/lib/utils'

interface PresetAuthStatusProps {
  globalAuthStatus: GlobalAuthStatus
  loadingAuthStatus: boolean
  onShowAuthSetup: () => void
}

export const PresetAuthStatus: React.FC<PresetAuthStatusProps> = ({
  globalAuthStatus,
  loadingAuthStatus,
  onShowAuthSetup
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2 rounded-md border',
        globalAuthStatus.isAuthenticated
          ? 'border-green-200 bg-green-50/50 dark:bg-green-950/30'
          : 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/30'
      )}
    >
      <div className="flex items-center gap-2">
        {loadingAuthStatus ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-xs text-muted-foreground">检查认证状态...</span>
          </>
        ) : globalAuthStatus.isAuthenticated ? (
          <>
            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
            <span className="text-xs font-medium text-green-700 dark:text-green-300">
              Aone凭证已配置
            </span>
            {globalAuthStatus.accountInfo?.domainAccount && (
              <span className="text-xs text-muted-foreground">
                ({globalAuthStatus.accountInfo.domainAccount})
              </span>
            )}
          </>
        ) : (
          <>
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
              需要配置Aone认证
            </span>
          </>
        )}
      </div>

      <Button
        variant={globalAuthStatus.isAuthenticated ? 'ghost' : 'default'}
        size="sm"
        onClick={onShowAuthSetup}
        className="h-7 text-xs"
      >
        <Key className="w-3 h-3 mr-1" />
        {globalAuthStatus.isAuthenticated ? '管理认证' : '配置认证'}
      </Button>
    </div>
  )
}
