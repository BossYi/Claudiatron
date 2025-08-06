import React from 'react'
import { Key, Info, Loader2, Check, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import type { AoneAuthInfo } from '@/types/setupWizard'

interface AuthValidationResult {
  valid: boolean
  error?: string
}

interface AuthenticationDialogProps {
  // 认证设置弹窗状态
  showAuthSetup: boolean
  onToggleAuthSetup: (show: boolean) => void
  authSetupType: 'aone' | 'github'
  onSetupTypeChange: (type: 'aone' | 'github') => void
  setupCredentials: AoneAuthInfo
  onCredentialsChange: (credentials: AoneAuthInfo) => void
  authValidating: boolean
  authValidationResult: AuthValidationResult | null
  onSaveCredentials: () => void

  // 认证过期弹窗状态
  showAuthExpiredDialog: boolean
  onToggleAuthExpiredDialog: (show: boolean) => void
}

export const AuthenticationDialog: React.FC<AuthenticationDialogProps> = ({
  showAuthSetup,
  onToggleAuthSetup,
  authSetupType,
  onSetupTypeChange,
  setupCredentials,
  onCredentialsChange,
  authValidating,
  authValidationResult,
  onSaveCredentials,
  showAuthExpiredDialog,
  onToggleAuthExpiredDialog
}) => {
  return (
    <>
      {/* 认证设置弹窗 */}
      {showAuthSetup && (
        <Dialog open={showAuthSetup} onOpenChange={onToggleAuthSetup}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                配置认证信息
              </DialogTitle>
              <DialogDescription>此信息将被安全存储，用于访问您的项目仓库</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* 认证类型选择 */}
              <div className="space-y-2">
                <Label>认证类型</Label>
                <RadioGroup value={authSetupType} onValueChange={onSetupTypeChange}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="aone" id="setup-aone" />
                    <Label htmlFor="setup-aone" className="cursor-pointer">
                      Aone (阿里内部代码平台)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Aone 认证表单 */}
              {authSetupType === 'aone' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="setup-domain">域账号</Label>
                    <Input
                      id="setup-domain"
                      value={setupCredentials.domainAccount}
                      onChange={(e) =>
                        onCredentialsChange({
                          ...setupCredentials,
                          domainAccount: e.target.value
                        })
                      }
                      placeholder="your.name"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="setup-token">Private Token</Label>
                    <Input
                      id="setup-token"
                      type="password"
                      value={setupCredentials.privateToken}
                      onChange={(e) =>
                        onCredentialsChange({
                          ...setupCredentials,
                          privateToken: e.target.value
                        })
                      }
                      placeholder="••••••••••••••••••••"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      <p className="font-medium mb-1">如何获取 Private Token:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>
                          访问{' '}
                          <a
                            href="https://code.alibaba-inc.com/profile/account"
                            target="_blank"
                            className="underline hover:no-underline"
                            rel="noreferrer"
                          >
                            Aone 个人设置页面
                          </a>
                        </li>
                        <li>找到 "Private-Tokens" 部分</li>
                        <li>创建新的 Token 或复制现有 Token</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}

              {/* 验证状态 */}
              {authValidating && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                  <span className="text-sm text-amber-700 dark:text-amber-300">
                    正在保存认证信息...
                  </span>
                </div>
              )}

              {authValidationResult && (
                <div
                  className={`flex items-start gap-2 p-3 rounded-lg ${
                    authValidationResult.valid
                      ? 'bg-green-50 dark:bg-green-950'
                      : 'bg-red-50 dark:bg-red-950'
                  }`}
                >
                  {authValidationResult.valid ? (
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="text-sm">
                    <p
                      className={
                        authValidationResult.valid
                          ? 'text-green-700 dark:text-green-300 font-medium'
                          : 'text-red-700 dark:text-red-300 font-medium'
                      }
                    >
                      {authValidationResult.valid ? '认证信息保存成功' : '保存失败'}
                    </p>
                    {authValidationResult.error && (
                      <p className="text-red-600 dark:text-red-400 mt-1">
                        {authValidationResult.error}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => onToggleAuthSetup(false)}>
                取消
              </Button>
              <Button
                onClick={onSaveCredentials}
                disabled={
                  authValidating ||
                  !setupCredentials.domainAccount.trim() ||
                  !setupCredentials.privateToken.trim()
                }
              >
                {authValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    保存
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 认证过期提示弹窗 */}
      {showAuthExpiredDialog && (
        <Dialog open={showAuthExpiredDialog} onOpenChange={onToggleAuthExpiredDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                认证信息需要重新配置
              </DialogTitle>
              <DialogDescription>请重新配置您的认证信息以继续访问项目。</DialogDescription>
            </DialogHeader>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => onToggleAuthExpiredDialog(false)}>
                稍后处理
              </Button>
              <Button
                onClick={() => {
                  onToggleAuthExpiredDialog(false)
                  onToggleAuthSetup(true)
                }}
              >
                重新认证
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
