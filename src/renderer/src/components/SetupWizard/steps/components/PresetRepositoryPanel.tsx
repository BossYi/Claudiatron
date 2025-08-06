import React from 'react'
import { CheckCircle, AlertCircle, Loader2, Key, RefreshCw, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { GlobalAuthStatus, PresetRepositoryConfig } from '@/types/setupWizard'

interface PresetRepositoryPanelProps {
  globalAuthStatus: GlobalAuthStatus
  presetConfig: PresetRepositoryConfig | null
  loadingAuthStatus: boolean
  onShowAuthSetup: () => void
}

export const PresetRepositoryPanel: React.FC<PresetRepositoryPanelProps> = ({
  globalAuthStatus,
  presetConfig,
  loadingAuthStatus,
  onShowAuthSetup
}) => {
  return (
    <>
      {/* 全局认证状态卡片 */}
      <Card
        className={`${
          globalAuthStatus.isAuthenticated
            ? 'border-green-200 bg-green-50 dark:bg-green-950'
            : 'border-amber-200 bg-amber-50 dark:bg-amber-950'
        }`}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            {loadingAuthStatus && <Loader2 className="w-4 h-4 animate-spin" />}
            {globalAuthStatus.isAuthenticated ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-green-800 dark:text-green-200">认证已配置</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-amber-800 dark:text-amber-200">需要配置认证信息</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {globalAuthStatus.isAuthenticated ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">当前账号:</span>
                <span className="text-sm font-mono">
                  {globalAuthStatus.accountInfo?.domainAccount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">认证类型:</span>
                <Badge variant="outline" className="text-xs">
                  {globalAuthStatus.authType?.toUpperCase()}
                </Badge>
              </div>
              <div className="flex justify-between items-center mt-3">
                <Button variant="ghost" size="sm" onClick={onShowAuthSetup} className="text-xs">
                  管理认证信息
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  刷新状态
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                访问预置项目库需要配置认证信息，这是一次性设置。
              </p>
              <Button onClick={onShowAuthSetup} className="w-full text-sm" variant="default">
                <Key className="w-4 h-4 mr-2" />
                配置认证信息
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 项目选择区域 - 只有认证成功后才显示 */}
      {globalAuthStatus.isAuthenticated && presetConfig ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">选择团队项目</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8">
              <Archive className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">团队项目选择功能开发中...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        !globalAuthStatus.isAuthenticated && (
          <Card className="border-dashed">
            <CardContent className="text-center py-8">
              <Key className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">请先配置认证信息后选择项目</p>
            </CardContent>
          </Card>
        )
      )}
    </>
  )
}
