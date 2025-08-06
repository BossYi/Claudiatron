import React, { useState, useEffect } from 'react'
import { Loader2, Info, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { AoneAuthInfo } from '@/types/setupWizard'
import { RepositoryType } from '@/types/setupWizard'
import { api } from '@/lib/api'

interface CustomRepositoryPanelProps {
  cloneUrl: string
  onUrlChange: (url: string) => void
  clonePath: string
  onPathChange: (path: string) => void
  cloneBranch: string
  onBranchChange: (branch: string) => void
  defaultClonePath: string
  urlValidating: boolean
  onSelectFolder: () => void
}

export const CustomRepositoryPanel: React.FC<CustomRepositoryPanelProps> = ({
  cloneUrl,
  onUrlChange,
  clonePath,
  onPathChange,
  cloneBranch,
  onBranchChange,
  defaultClonePath,
  urlValidating,
  onSelectFolder
}) => {
  // Aone 相关状态
  const [repositoryType, setRepositoryType] = useState<RepositoryType>(RepositoryType.AONE)
  const [aoneAuth, setAoneAuth] = useState<AoneAuthInfo>({
    domainAccount: '',
    privateToken: ''
  })
  const [loadingCredentials, setLoadingCredentials] = useState(false)
  const [credentialsSource, setCredentialsSource] = useState<'saved' | 'manual' | null>(null)
  const [clearingCredentials, setClearingCredentials] = useState(false)

  // 加载已保存的Aone认证信息
  useEffect(() => {
    const loadSavedCredentials = async () => {
      if (repositoryType === RepositoryType.AONE) {
        setLoadingCredentials(true)
        try {
          const savedCredentials = await api.getAoneCredentials()
          if (savedCredentials) {
            setAoneAuth(savedCredentials)
            setCredentialsSource('saved')
            console.log('已加载保存的Aone认证信息:', savedCredentials.domainAccount)
          } else {
            setCredentialsSource('manual')
          }
        } catch (error) {
          console.warn('加载已保存的Aone认证信息失败:', error)
          setCredentialsSource('manual')
        } finally {
          setLoadingCredentials(false)
        }
      } else {
        // 如果不是Aone仓库，清空认证信息
        setAoneAuth({ domainAccount: '', privateToken: '' })
        setCredentialsSource(null)
      }
    }

    loadSavedCredentials()
  }, [repositoryType])

  // 清除已保存的认证信息
  const clearSavedCredentials = async () => {
    setClearingCredentials(true)
    try {
      await api.deleteAoneCredentials()
      setAoneAuth({ domainAccount: '', privateToken: '' })
      setCredentialsSource('manual')
      console.log('已清除保存的Aone认证信息')
    } catch (error) {
      console.error('清除Aone认证信息失败:', error)
    } finally {
      setClearingCredentials(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">克隆Git仓库</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 仓库类型选择 */}
        <div className="space-y-3">
          <Label>仓库类型</Label>
          <RadioGroup
            value={repositoryType}
            onValueChange={(value) => setRepositoryType(value as RepositoryType)}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value={RepositoryType.AONE} id="aone" />
              <Label htmlFor="aone" className="cursor-pointer">
                Aone (推荐)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value={RepositoryType.OTHER} id="other" />
              <Label htmlFor="other" className="cursor-pointer">
                其他 Git 仓库
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cloneUrl">仓库URL</Label>
          <div className="relative">
            <Input
              id="cloneUrl"
              type="url"
              value={cloneUrl}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder={
                repositoryType === RepositoryType.AONE
                  ? 'https://code.alibaba-inc.com/owner/repository.git'
                  : 'https://github.com/username/repository.git 或 username/repository'
              }
              className="font-mono text-sm pr-10"
            />
            {urlValidating && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {repositoryType === RepositoryType.AONE
              ? '请输入完整的 Aone 仓库 URL'
              : '支持完整URL或GitHub简写形式 (如: microsoft/vscode)'}
          </p>
        </div>

        {/* Aone 认证表单 */}
        {repositoryType === RepositoryType.AONE && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
                {loadingCredentials && <Loader2 className="w-4 h-4 animate-spin" />}
                Aone 认证信息
                {credentialsSource === 'saved' && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  >
                    已保存
                  </Badge>
                )}
              </CardTitle>
              {credentialsSource === 'saved' && (
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    正在使用已保存的认证信息：{aoneAuth.domainAccount}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSavedCredentials}
                    disabled={clearingCredentials}
                    className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
                  >
                    {clearingCredentials ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-3 h-3 mr-1" />
                        清除
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingCredentials ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
                    加载已保存的认证信息...
                  </span>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="domainAccount">域账号</Label>
                    <Input
                      id="domainAccount"
                      value={aoneAuth.domainAccount}
                      onChange={(e) => {
                        setAoneAuth((prev) => ({
                          ...prev,
                          domainAccount: e.target.value
                        }))
                        if (credentialsSource === 'saved') {
                          setCredentialsSource('manual')
                        }
                      }}
                      placeholder="your.name"
                      className="font-mono text-sm"
                      disabled={loadingCredentials}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="privateToken">Private Token</Label>
                    <Input
                      id="privateToken"
                      type="password"
                      value={aoneAuth.privateToken}
                      onChange={(e) => {
                        setAoneAuth((prev) => ({ ...prev, privateToken: e.target.value }))
                        if (credentialsSource === 'saved') {
                          setCredentialsSource('manual')
                        }
                      }}
                      placeholder="••••••••••••••••••••"
                      className="font-mono text-sm"
                      disabled={loadingCredentials}
                    />
                  </div>
                </>
              )}
              {!loadingCredentials && (
                <>
                  <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      <a
                        href="https://code.alibaba-inc.com/profile/account"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        通过此链接获取个人Private-Token
                      </a>
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          <Label htmlFor="clonePath">本地目录</Label>
          <div className="flex gap-2">
            <Input
              id="clonePath"
              value={clonePath}
              onChange={(e) => onPathChange(e.target.value)}
              placeholder={defaultClonePath}
              className="flex-1"
            />
            <Button variant="outline" onClick={onSelectFolder}>
              选择
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>项目将被克隆到此目录下。默认使用 {defaultClonePath} 目录。</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cloneBranch">分支 (可选)</Label>
          <Input
            id="cloneBranch"
            value={cloneBranch}
            onChange={(e) => onBranchChange(e.target.value)}
            placeholder="master"
          />
        </div>
      </CardContent>
    </Card>
  )
}
