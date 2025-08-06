import React from 'react'
import { Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import type { RepositoryCloneProgress } from '@/types/setupWizard'

interface ValidationResult {
  valid: boolean
  error?: string
  repoInfo?: any
  projectInfo?: any
  localPath?: string
}

interface ImportStatusCardProps {
  importing: boolean
  activeTab: 'clone' | 'local' | 'create'
  cloneProgress: RepositoryCloneProgress | null
  validationResult: ValidationResult | null
  folderSelectError: string | null
  clonePath?: string
}

export const ImportStatusCard: React.FC<ImportStatusCardProps> = ({
  importing,
  activeTab,
  cloneProgress,
  validationResult,
  folderSelectError,
  clonePath
}) => {
  // 导入状态显示
  if (importing) {
    return (
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">正在导入项目...</p>
              <p className="text-sm text-blue-600 dark:text-blue-300">
                {activeTab === 'clone' && (cloneProgress?.message || '正在克隆远程仓库...')}
                {activeTab === 'local' && '正在验证本地项目...'}
                {activeTab === 'create' && '正在创建新项目...'}
              </p>
            </div>
          </div>

          {/* 克隆进度条 */}
          {activeTab === 'clone' && cloneProgress && (
            <div className="space-y-2">
              <Progress value={cloneProgress.progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{cloneProgress.status}</span>
                <span>{cloneProgress.progress}%</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // 验证结果显示
  if (validationResult && !importing) {
    return (
      <Card
        className={`${
          validationResult.valid
            ? 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800'
            : 'border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800'
        }`}
      >
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start gap-3">
            {validationResult.valid ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p
                className={`font-medium ${
                  validationResult.valid
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}
              >
                {validationResult.valid ? '项目导入成功' : '导入失败'}
              </p>
              {validationResult.error && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {validationResult.error}
                </p>
              )}
              {validationResult.valid && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  项目已成功导入，可以继续下一步
                </p>
              )}
            </div>
          </div>

          {/* 项目信息展示 */}
          {validationResult.valid &&
            (validationResult.repoInfo || validationResult.projectInfo) && (
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  项目信息
                </h4>
                <div className="space-y-2 text-sm">
                  {validationResult.repoInfo && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">仓库:</span>
                        <div className="flex items-center gap-2">
                          <span>{validationResult.repoInfo.repoName}</span>
                          <Badge variant="outline" className="text-xs">
                            {validationResult.repoInfo.platform}
                          </Badge>
                          {validationResult.repoInfo.isPrivate && (
                            <Badge variant="secondary" className="text-xs">
                              私有
                            </Badge>
                          )}
                        </div>
                      </div>
                      {validationResult.repoInfo.owner && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">所有者:</span>
                          <span>{validationResult.repoInfo.owner}</span>
                        </div>
                      )}
                    </>
                  )}
                  {/* 显示克隆路径 */}
                  {(validationResult.localPath || clonePath) && (
                    <div className="flex items-start justify-between">
                      <span className="text-muted-foreground">克隆路径:</span>
                      <span className="text-right ml-2 break-all font-mono text-xs">
                        {validationResult.localPath || clonePath}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
        </CardContent>
      </Card>
    )
  }

  // 文件选择错误显示
  if (folderSelectError) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-red-800 dark:text-red-200">文件选择失败</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{folderSelectError}</p>
              <p className="text-xs text-red-500 dark:text-red-500 mt-2">
                您可以尝试手动输入路径，或联系技术支持。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
