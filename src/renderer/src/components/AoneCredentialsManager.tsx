import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trash2, Edit, Save, AlertCircle, Loader2, CheckCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api, type AoneAuthInfo } from '@/lib/api'

interface AoneCredentialsInfo {
  id: number
  domain_account: string
  created_at: string
  updated_at: string
}

export const AoneCredentialsManager: React.FC = () => {
  const [credentialsInfo, setCredentialsInfo] = useState<AoneCredentialsInfo | null>(null)
  const [hasCredentials, setHasCredentials] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // 表单状态
  const [formData, setFormData] = useState<AoneAuthInfo>({
    domainAccount: '',
    privateToken: ''
  })

  // 加载认证信息
  const loadCredentials = async () => {
    try {
      setLoading(true)
      setError(null)

      // 检查是否已配置认证
      const hasAuth = await api.hasAoneCredentials()
      setHasCredentials(hasAuth)

      if (hasAuth) {
        // 获取认证信息（不包含私钥）
        const info = await api.getAoneCredentialsInfo()
        setCredentialsInfo(info)
      } else {
        setCredentialsInfo(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载认证信息失败')
    } finally {
      setLoading(false)
    }
  }

  // 保存认证信息
  const saveCredentials = async () => {
    if (!formData.domainAccount.trim() || !formData.privateToken.trim()) {
      setError('请填写完整的认证信息')
      return
    }

    try {
      setSaving(true)
      setError(null)

      await api.saveAoneCredentials({
        domainAccount: formData.domainAccount,
        privateToken: formData.privateToken
      })

      await loadCredentials()
      setShowForm(false)
      setIsEditing(false)
      setFormData({ domainAccount: '', privateToken: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存认证信息失败')
    } finally {
      setSaving(false)
    }
  }

  // 删除认证信息
  const deleteCredentials = async () => {
    try {
      await api.deleteAoneCredentials()
      await loadCredentials()
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除认证信息失败')
    }
  }

  // 开始编辑
  const startEdit = () => {
    if (credentialsInfo) {
      setIsEditing(true)
      setFormData({
        domainAccount: credentialsInfo.domain_account,
        privateToken: '' // 不显示现有 token
      })
      setShowForm(true)
    }
  }

  // 开始添加
  const startAdd = () => {
    setIsEditing(false)
    setFormData({ domainAccount: '', privateToken: '' })
    setShowForm(true)
  }

  // 取消编辑
  const cancelEdit = () => {
    setShowForm(false)
    setIsEditing(false)
    setFormData({ domainAccount: '', privateToken: '' })
  }

  useEffect(() => {
    loadCredentials()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Aone 认证管理</h3>
          <p className="text-sm text-muted-foreground">管理用于访问 Aone 私有仓库的全局认证信息</p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-800 dark:text-red-200">错误</p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">加载中...</span>
        </div>
      ) : (
        <>
          {/* 认证信息显示或表单 */}
          {showForm ? (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-blue-800 dark:text-blue-200">
                    {isEditing ? '编辑认证信息' : '添加认证信息'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="domainAccount">域账号</Label>
                      <Input
                        id="domainAccount"
                        value={formData.domainAccount}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, domainAccount: e.target.value }))
                        }
                        placeholder="your.name"
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="privateToken">Private Token</Label>
                      <Input
                        id="privateToken"
                        type="password"
                        value={formData.privateToken}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, privateToken: e.target.value }))
                        }
                        placeholder={isEditing ? '留空则保持不变' : '输入 Private Token'}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={cancelEdit}>
                      取消
                    </Button>
                    <Button
                      onClick={saveCredentials}
                      disabled={saving}
                      className="flex items-center gap-2"
                    >
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      <Save className="w-4 h-4" />
                      保存
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : hasCredentials && credentialsInfo ? (
            /* 已配置认证信息 */
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <h4 className="font-medium text-green-800 dark:text-green-200">认证已配置</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono">
                          {credentialsInfo.domain_account}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        配置于 {new Date(credentialsInfo.created_at).toLocaleString()}
                        {credentialsInfo.updated_at !== credentialsInfo.created_at && (
                          <span>
                            {' '}
                            • 更新于 {new Date(credentialsInfo.updated_at).toLocaleString()}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ⚠️ Private Token 已加密存储，安全保护中
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={startEdit}>
                      <Edit className="w-4 h-4 mr-1" />
                      编辑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={deleteCredentials}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      删除
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* 未配置认证信息 */
            <Card className="p-8">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Plus className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">未配置 Aone 认证</h3>
                <p className="text-muted-foreground mb-4">
                  配置 Aone 认证信息以便访问私有仓库。配置后将自动应用于所有 Aone 仓库。
                </p>
                <Button onClick={startAdd}>
                  <Plus className="w-4 h-4 mr-1" />
                  配置认证
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
