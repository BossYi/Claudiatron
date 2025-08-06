import React, { useState, useEffect } from 'react'
import { Loader2, Info, Trash2, GitBranch, Lock, Globe, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AoneAuthInfo } from '@/types/setupWizard'
import { RepositoryType } from '@/types/setupWizard'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface CustomRepositoryFormProps {
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

export const CustomRepositoryForm: React.FC<CustomRepositoryFormProps> = ({
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
    } catch (error) {
      console.error('清除Aone认证信息失败:', error)
    } finally {
      setClearingCredentials(false)
    }
  }

  return (
    <Card className="h-full">
      <CardContent className="p-4 h-full flex flex-col space-y-4">
        {/* 仓库类型选择 - 紧凑设计 */}
        <div className="flex items-center gap-3">
          <Label className="text-sm">仓库类型:</Label>
          <Tabs
            value={repositoryType}
            onValueChange={(v) => setRepositoryType(v as RepositoryType)}
          >
            <TabsList className="h-8">
              <TabsTrigger value={RepositoryType.AONE} className="text-xs px-3 h-7">
                <Lock className="w-3 h-3 mr-1" />
                Aone
              </TabsTrigger>
              <TabsTrigger value={RepositoryType.OTHER} className="text-xs px-3 h-7">
                <Globe className="w-3 h-3 mr-1" />
                其他Git
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* 表单内容区域 */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {/* 仓库URL */}
          <div className="space-y-1.5">
            <Label htmlFor="cloneUrl" className="text-sm">
              <GitBranch className="w-3 h-3 inline mr-1" />
              仓库URL
            </Label>
            <div className="relative">
              <Input
                id="cloneUrl"
                type="url"
                value={cloneUrl}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder={
                  repositoryType === RepositoryType.AONE
                    ? 'https://code.alibaba-inc.com/owner/repository.git'
                    : 'https://github.com/username/repository.git'
                }
                className="font-mono text-xs pr-10"
              />
              {urlValidating && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-3 h-3 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Aone 认证信息 - 紧凑设计 */}
          {repositoryType === RepositoryType.AONE && (
            <div
              className={cn(
                'rounded-md border p-3 space-y-2',
                'border-blue-200 bg-blue-50/50 dark:bg-blue-950/30'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {loadingCredentials && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span className="text-xs font-medium">Aone认证</span>
                  {credentialsSource === 'saved' && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      已保存
                    </Badge>
                  )}
                </div>
                {credentialsSource === 'saved' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSavedCredentials}
                    disabled={clearingCredentials}
                    className="h-6 px-2 text-xs"
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
                )}
              </div>

              {!loadingCredentials && (
                <div className="space-y-2">
                  <Input
                    value={aoneAuth.domainAccount}
                    onChange={(e) => {
                      setAoneAuth((prev) => ({ ...prev, domainAccount: e.target.value }))
                      if (credentialsSource === 'saved') setCredentialsSource('manual')
                    }}
                    placeholder="域账号"
                    className="h-8 text-xs"
                  />
                  <Input
                    type="password"
                    value={aoneAuth.privateToken}
                    onChange={(e) => {
                      setAoneAuth((prev) => ({ ...prev, privateToken: e.target.value }))
                      if (credentialsSource === 'saved') setCredentialsSource('manual')
                    }}
                    placeholder="Private Token"
                    className="h-8 text-xs"
                  />
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Info className="w-3 h-3" />
                    <a
                      href="https://code.alibaba-inc.com/profile/account"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      获取Private Token
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 本地目录 */}
          <div className="space-y-1.5">
            <Label htmlFor="clonePath" className="text-sm">
              <FolderOpen className="w-3 h-3 inline mr-1" />
              本地目录
            </Label>
            <div className="flex gap-2">
              <Input
                id="clonePath"
                value={clonePath}
                onChange={(e) => onPathChange(e.target.value)}
                placeholder={defaultClonePath}
                className="flex-1 text-xs"
              />
              <Button variant="outline" size="sm" onClick={onSelectFolder} className="h-8">
                选择
              </Button>
            </div>
          </div>

          {/* 分支 */}
          <div className="space-y-1.5">
            <Label htmlFor="cloneBranch" className="text-sm">
              分支 (可选)
            </Label>
            <Input
              id="cloneBranch"
              value={cloneBranch}
              onChange={(e) => onBranchChange(e.target.value)}
              placeholder="master"
              className="text-xs"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
