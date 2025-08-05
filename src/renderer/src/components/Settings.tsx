import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Trash2, Save, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { api, type ClaudeSettings, type ClaudeInstallation } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Toast, ToastContainer } from '@/components/ui/toast'
import { ClaudeVersionSelector } from './ClaudeVersionSelector'
import { StorageTab } from './StorageTab'
import { HooksEditor } from './HooksEditor'
import { SlashCommandsManager } from './SlashCommandsManager'
import { LanguageSelector } from './LanguageSelector'
import { EnvVarInput } from './EnvVarInput'
import { AoneCredentialsManager } from './AoneCredentialsManager'
import { useTranslation } from 'react-i18next'

interface SettingsProps {
  /**
   * Callback to go back to the main view
   */
  onBack: () => void
  /**
   * Optional className for styling
   */
  className?: string
}

interface PermissionRule {
  id: string
  value: string
}

interface EnvironmentVariable {
  id: string
  key: string
  value: string
}

/**
 * Comprehensive Settings UI for managing Claude Code settings
 * Provides a no-code interface for editing the settings.json file
 */
export const Settings: React.FC<SettingsProps> = ({ onBack, className }) => {
  const { t } = useTranslation('settings')
  const [settings, setSettings] = useState<ClaudeSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('general')
  const [currentBinaryPath, setCurrentBinaryPath] = useState<string | null>(null)
  const [selectedInstallation, setSelectedInstallation] = useState<ClaudeInstallation | null>(null)
  const [binaryPathChanged, setBinaryPathChanged] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Environment variable suggestions
  const envVarSuggestions = [
    // Authentication & API
    { key: 'ANTHROPIC_API_KEY', description: t('environment.commonVariables.apiKey') },
    { key: 'ANTHROPIC_AUTH_TOKEN', description: t('environment.commonVariables.authToken') },
    {
      key: 'ANTHROPIC_CUSTOM_HEADERS',
      description: t('environment.commonVariables.customHeaders')
    },

    // Model Configuration
    { key: 'ANTHROPIC_MODEL', description: t('environment.commonVariables.model') },
    {
      key: 'ANTHROPIC_SMALL_FAST_MODEL',
      description: t('environment.commonVariables.smallFastModel')
    },
    {
      key: 'ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION',
      description: t('environment.commonVariables.smallFastModelAwsRegion')
    },

    // Claude Code Settings
    {
      key: 'CLAUDE_CODE_API_KEY_HELPER_TTL_MS',
      description: t('environment.commonVariables.apiKeyHelperTtl')
    },
    {
      key: 'CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL',
      description: t('environment.commonVariables.ideSkipAutoInstall')
    },
    {
      key: 'CLAUDE_CODE_MAX_OUTPUT_TOKENS',
      description: t('environment.commonVariables.maxOutputTokens')
    },

    // Platform Integration
    { key: 'CLAUDE_CODE_USE_BEDROCK', description: t('environment.commonVariables.useBedrock') },
    { key: 'CLAUDE_CODE_USE_VERTEX', description: t('environment.commonVariables.useVertex') },
    {
      key: 'CLAUDE_CODE_SKIP_BEDROCK_AUTH',
      description: t('environment.commonVariables.skipBedrockAuth')
    },
    {
      key: 'CLAUDE_CODE_SKIP_VERTEX_AUTH',
      description: t('environment.commonVariables.skipVertexAuth')
    },

    // Execution Control
    { key: 'BASH_DEFAULT_TIMEOUT_MS', description: t('environment.commonVariables.bashTimeout') },
    { key: 'BASH_MAX_TIMEOUT_MS', description: t('environment.commonVariables.bashMaxTimeout') },
    {
      key: 'BASH_MAX_OUTPUT_LENGTH',
      description: t('environment.commonVariables.bashMaxOutputLength')
    },
    {
      key: 'CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR',
      description: t('environment.commonVariables.maintainProjectWorkingDir')
    },
    { key: 'MAX_THINKING_TOKENS', description: t('environment.commonVariables.maxThinkingTokens') },
    { key: 'MCP_TIMEOUT', description: t('environment.commonVariables.mcpTimeout') },
    { key: 'MCP_TOOL_TIMEOUT', description: t('environment.commonVariables.mcpToolTimeout') },
    { key: 'MAX_MCP_OUTPUT_TOKENS', description: t('environment.commonVariables.maxMcpTokens') },

    // Network & Proxy
    { key: 'HTTP_PROXY', description: t('environment.commonVariables.httpProxy') },
    { key: 'HTTPS_PROXY', description: t('environment.commonVariables.httpsProxy') },

    // Feature Control
    { key: 'DISABLE_TELEMETRY', description: t('environment.commonVariables.disableTelemetry') },
    {
      key: 'DISABLE_ERROR_REPORTING',
      description: t('environment.commonVariables.disableErrorReporting')
    },
    { key: 'DISABLE_COST_WARNINGS', description: t('environment.commonVariables.costWarnings') },
    {
      key: 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC',
      description: t('environment.commonVariables.disableNonessentialTraffic')
    },
    {
      key: 'DISABLE_AUTOUPDATER',
      description: t('environment.commonVariables.disableAutoupdater')
    },
    { key: 'DISABLE_BUG_COMMAND', description: t('environment.commonVariables.disableBugCommand') },
    {
      key: 'DISABLE_NON_ESSENTIAL_MODEL_CALLS',
      description: t('environment.commonVariables.disableNonEssentialModelCalls')
    }
  ]

  // Permission rules state
  const [allowRules, setAllowRules] = useState<PermissionRule[]>([])
  const [denyRules, setDenyRules] = useState<PermissionRule[]>([])

  // Environment variables state
  const [envVars, setEnvVars] = useState<EnvironmentVariable[]>([])

  // Hooks state
  const [userHooksChanged, setUserHooksChanged] = useState(false)
  const getUserHooks = React.useRef<(() => any) | null>(null)

  // Load settings on mount
  useEffect(() => {
    loadSettings()
    loadClaudeBinaryPath()
  }, [])

  /**
   * Loads the current Claude binary path
   */
  const loadClaudeBinaryPath = async () => {
    try {
      const path = await api.getClaudeBinaryPath()
      setCurrentBinaryPath(path)
    } catch (err) {
      console.error('Failed to load Claude binary path:', err)
    }
  }

  /**
   * Loads the current Claude settings
   */
  const loadSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      const loadedSettings = await api.getClaudeSettings()

      // Ensure loadedSettings is an object
      if (!loadedSettings || typeof loadedSettings !== 'object') {
        console.warn('Loaded settings is not an object:', loadedSettings)
        setSettings({})
        return
      }

      setSettings(loadedSettings)

      // Parse permissions
      if (loadedSettings.permissions && typeof loadedSettings.permissions === 'object') {
        if (Array.isArray(loadedSettings.permissions.allow)) {
          setAllowRules(
            loadedSettings.permissions.allow.map((rule: string, index: number) => ({
              id: `allow-${index}`,
              value: rule
            }))
          )
        }
        if (Array.isArray(loadedSettings.permissions.deny)) {
          setDenyRules(
            loadedSettings.permissions.deny.map((rule: string, index: number) => ({
              id: `deny-${index}`,
              value: rule
            }))
          )
        }
      }

      // Parse environment variables
      if (
        loadedSettings.env &&
        typeof loadedSettings.env === 'object' &&
        !Array.isArray(loadedSettings.env)
      ) {
        setEnvVars(
          Object.entries(loadedSettings.env).map(([key, value], index) => ({
            id: `env-${index}`,
            key,
            value: value as string
          }))
        )
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
      setError(t('errors.loadFailed'))
      setSettings({})
    } finally {
      setLoading(false)
    }
  }

  /**
   * Saves the current settings
   */
  const saveSettings = async () => {
    try {
      setSaving(true)
      setError(null)
      setToast(null)

      // Build the settings object
      const updatedSettings: ClaudeSettings = {
        ...settings,
        permissions: {
          allow: allowRules.map((rule) => rule.value).filter((v) => v.trim()),
          deny: denyRules.map((rule) => rule.value).filter((v) => v.trim())
        },
        env: envVars.reduce(
          (acc, { key, value }) => {
            if (key.trim() && value.trim()) {
              acc[key] = value
            }
            return acc
          },
          {} as Record<string, string>
        )
      }

      await api.saveClaudeSettings(updatedSettings)
      setSettings(updatedSettings)

      // Save Claude binary path if changed (only for Custom installations)
      if (
        binaryPathChanged &&
        selectedInstallation &&
        selectedInstallation.installation_type === 'Custom'
      ) {
        await api.setClaudeBinaryPath(selectedInstallation.path)
        setCurrentBinaryPath(selectedInstallation.path)
        setBinaryPathChanged(false)
      }

      // Save user hooks if changed
      if (userHooksChanged && getUserHooks.current) {
        const hooks = getUserHooks.current()
        await api.updateHooksConfig('user', hooks)
        setUserHooksChanged(false)
      }

      setToast({ message: t('toast.saveSuccess'), type: 'success' })
    } catch (err) {
      console.error('Failed to save settings:', err)
      setError(t('errors.saveFailed'))
      setToast({ message: t('toast.saveFailed'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  /**
   * Updates a simple setting value
   */
  const updateSetting = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  /**
   * Adds a new permission rule
   */
  const addPermissionRule = (type: 'allow' | 'deny') => {
    const newRule: PermissionRule = {
      id: `${type}-${Date.now()}`,
      value: ''
    }

    if (type === 'allow') {
      setAllowRules((prev) => [...prev, newRule])
    } else {
      setDenyRules((prev) => [...prev, newRule])
    }
  }

  /**
   * Updates a permission rule
   */
  const updatePermissionRule = (type: 'allow' | 'deny', id: string, value: string) => {
    if (type === 'allow') {
      setAllowRules((prev) => prev.map((rule) => (rule.id === id ? { ...rule, value } : rule)))
    } else {
      setDenyRules((prev) => prev.map((rule) => (rule.id === id ? { ...rule, value } : rule)))
    }
  }

  /**
   * Removes a permission rule
   */
  const removePermissionRule = (type: 'allow' | 'deny', id: string) => {
    if (type === 'allow') {
      setAllowRules((prev) => prev.filter((rule) => rule.id !== id))
    } else {
      setDenyRules((prev) => prev.filter((rule) => rule.id !== id))
    }
  }

  /**
   * Adds a new environment variable
   */
  const addEnvVar = () => {
    const newVar: EnvironmentVariable = {
      id: `env-${Date.now()}`,
      key: '',
      value: ''
    }
    setEnvVars((prev) => [...prev, newVar])
  }

  /**
   * Updates an environment variable
   */
  const updateEnvVar = (id: string, field: 'key' | 'value', value: string) => {
    setEnvVars((prev) =>
      prev.map((envVar) => (envVar.id === id ? { ...envVar, [field]: value } : envVar))
    )
  }

  /**
   * Removes an environment variable
   */
  const removeEnvVar = (id: string) => {
    setEnvVars((prev) => prev.filter((envVar) => envVar.id !== id))
  }

  /**
   * Handle Claude installation selection
   */
  const handleClaudeInstallationSelect = (installation: ClaudeInstallation) => {
    setSelectedInstallation(installation)
    // 只有选择了 Custom 类型的安装才需要保存提示
    // fnm 等系统检测的安装不需要保存到数据库
    const needsSaving =
      installation.installation_type === 'Custom' && installation.path !== currentBinaryPath
    setBinaryPathChanged(needsSaving)
  }

  return (
    <div className={cn('flex flex-col h-full bg-background text-foreground', className)}>
      <div className="max-w-4xl mx-auto w-full flex flex-col h-full max-h-[90vh]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between p-4 border-b border-border flex-shrink-0"
        >
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold">{t('title')}</h2>
              <p className="text-xs text-muted-foreground">{t('description')}</p>
            </div>
          </div>

          <Button
            onClick={saveSettings}
            disabled={saving || loading}
            size="sm"
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('actions.saving')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {t('actions.save')}
              </>
            )}
          </Button>
        </motion.div>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-4 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/50 flex items-center gap-2 text-sm text-destructive flex-shrink-0"
            >
              <AlertCircle className="h-4 w-4" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full h-full flex flex-col"
            >
              <TabsList className="grid grid-cols-8 w-full gap-1">
                <TabsTrigger value="general">{t('tabs.general')}</TabsTrigger>
                <TabsTrigger value="permissions">{t('tabs.permissions')}</TabsTrigger>
                <TabsTrigger value="environment">{t('tabs.environment')}</TabsTrigger>
                <TabsTrigger value="advanced">{t('tabs.advanced')}</TabsTrigger>
                <TabsTrigger value="hooks">{t('tabs.hooks')}</TabsTrigger>
                <TabsTrigger value="commands">{t('tabs.commands')}</TabsTrigger>
                <TabsTrigger value="aone">Aone 认证</TabsTrigger>
                <TabsTrigger value="storage">{t('tabs.storage')}</TabsTrigger>
              </TabsList>

              {/* General Settings */}
              <TabsContent
                value="general"
                className="space-y-6 flex-1 overflow-y-auto custom-scrollbar"
              >
                {/* Basic Settings */}
                <Card className="p-6">
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold mb-4">{t('general.title')}</h3>

                    {/* Language Selection */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 flex-1">
                        <Label htmlFor="language">{t('general.language.label')}</Label>
                        <p className="text-xs text-muted-foreground">
                          {t('general.language.description')}
                        </p>
                      </div>
                      <LanguageSelector />
                    </div>

                    {/* Include Co-authored By */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 flex-1">
                        <Label htmlFor="coauthored">{t('general.coAuthoredBy.label')}</Label>
                        <p className="text-xs text-muted-foreground">
                          {t('general.coAuthoredBy.description')}
                        </p>
                      </div>
                      <Switch
                        id="coauthored"
                        checked={settings?.includeCoAuthoredBy !== false}
                        onCheckedChange={(checked) => updateSetting('includeCoAuthoredBy', checked)}
                        disabled={!settings}
                      />
                    </div>

                    {/* Verbose Output */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 flex-1">
                        <Label htmlFor="verbose">{t('general.verboseOutput.label')}</Label>
                        <p className="text-xs text-muted-foreground">
                          {t('general.verboseOutput.description')}
                        </p>
                      </div>
                      <Switch
                        id="verbose"
                        checked={settings?.verbose === true}
                        onCheckedChange={(checked) => updateSetting('verbose', checked)}
                        disabled={!settings}
                      />
                    </div>

                    {/* Cleanup Period */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 flex-1">
                        <Label htmlFor="cleanup">
                          {t('general.chatTranscriptRetention.label')}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t('general.chatTranscriptRetention.description')}
                        </p>
                      </div>
                      <Input
                        id="cleanup"
                        type="number"
                        min="1"
                        placeholder="30"
                        value={settings?.cleanupPeriodDays || ''}
                        onChange={(e) => {
                          const value = e.target.value ? parseInt(e.target.value) : undefined
                          updateSetting('cleanupPeriodDays', value)
                        }}
                        className="w-20 ml-4"
                      />
                    </div>
                  </div>
                </Card>

                {/* Claude Installation Section */}
                <Card className="p-6">
                  <ClaudeVersionSelector
                    headless={true}
                    title={t('general.claudeInstallation.title')}
                    description={t('general.claudeInstallation.description')}
                    selectedPath={currentBinaryPath}
                    onSelect={handleClaudeInstallationSelect}
                  />
                  {binaryPathChanged && (
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {t('general.claudeInstallation.binaryPathChanged')}
                      </p>
                    </div>
                  )}
                </Card>
              </TabsContent>

              {/* Permissions Settings */}
              <TabsContent
                value="permissions"
                className="space-y-6 flex-1 overflow-y-auto custom-scrollbar"
              >
                <Card className="p-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-semibold mb-2">{t('permissions.title')}</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('permissions.description')}
                      </p>
                    </div>

                    {/* Allow Rules */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-green-500">
                          {t('permissions.allowRules.label')}
                        </Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addPermissionRule('allow')}
                          className="gap-2 hover:border-green-500/50 hover:text-green-500"
                        >
                          <Plus className="h-3 w-3" />
                          {t('permissions.allowRules.addRule')}
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {allowRules.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">
                            {t('permissions.allowRules.noRules')}
                          </p>
                        ) : (
                          allowRules.map((rule) => (
                            <motion.div
                              key={rule.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center gap-2"
                            >
                              <Input
                                placeholder={t('permissions.allowRules.placeholder')}
                                value={rule.value}
                                onChange={(e) =>
                                  updatePermissionRule('allow', rule.id, e.target.value)
                                }
                                className="flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removePermissionRule('allow', rule.id)}
                                className="h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Deny Rules */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-red-500">
                          {t('permissions.denyRules.label')}
                        </Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addPermissionRule('deny')}
                          className="gap-2 hover:border-red-500/50 hover:text-red-500"
                        >
                          <Plus className="h-3 w-3" />
                          {t('permissions.denyRules.addRule')}
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {denyRules.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">
                            {t('permissions.denyRules.noRules')}
                          </p>
                        ) : (
                          denyRules.map((rule) => (
                            <motion.div
                              key={rule.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center gap-2"
                            >
                              <Input
                                placeholder={t('permissions.denyRules.placeholder')}
                                value={rule.value}
                                onChange={(e) =>
                                  updatePermissionRule('deny', rule.id, e.target.value)
                                }
                                className="flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removePermissionRule('deny', rule.id)}
                                className="h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="pt-2 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        <strong>{t('permissions.examples.title')}</strong>
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                        <li>
                          •{' '}
                          <code className="px-1 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">
                            Bash
                          </code>{' '}
                          - {t('permissions.examples.bashAll')}
                        </li>
                        <li>
                          •{' '}
                          <code className="px-1 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">
                            Bash(npm run build)
                          </code>{' '}
                          - {t('permissions.examples.bashExact')}
                        </li>
                        <li>
                          •{' '}
                          <code className="px-1 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">
                            Bash(npm run test:*)
                          </code>{' '}
                          - {t('permissions.examples.bashPrefix')}
                        </li>
                        <li>
                          •{' '}
                          <code className="px-1 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">
                            Read(~/.zshrc)
                          </code>{' '}
                          - {t('permissions.examples.readFile')}
                        </li>
                        <li>
                          •{' '}
                          <code className="px-1 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">
                            Edit(docs/**)
                          </code>{' '}
                          - {t('permissions.examples.editDocs')}
                        </li>
                      </ul>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* Environment Variables */}
              <TabsContent
                value="environment"
                className="space-y-6 flex-1 overflow-y-auto custom-scrollbar"
              >
                <Card className="p-6">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-semibold">{t('environment.title')}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('environment.description')}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={addEnvVar} className="gap-2">
                        <Plus className="h-3 w-3" />
                        {t('environment.addVariable')}
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {envVars.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">
                          {t('environment.noVariables')}
                        </p>
                      ) : (
                        envVars.map((envVar) => (
                          <motion.div
                            key={envVar.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2"
                          >
                            <EnvVarInput
                              value={envVar.key}
                              onChange={(newValue) => updateEnvVar(envVar.id, 'key', newValue)}
                              suggestions={envVarSuggestions}
                              existingKeys={envVars
                                .filter((v) => v.id !== envVar.id)
                                .map((v) => v.key)}
                              placeholder={t('environment.keyPlaceholder')}
                            />
                            <span className="text-muted-foreground">=</span>
                            <Input
                              placeholder={t('environment.valuePlaceholder')}
                              value={envVar.value}
                              onChange={(e) => updateEnvVar(envVar.id, 'value', e.target.value)}
                              className="flex-1 font-mono text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeEnvVar(envVar.id)}
                              className="h-8 w-8 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        ))
                      )}
                    </div>

                    <div className="pt-2 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        <strong>{t('environment.commonVariables.title')}</strong>
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                        {envVarSuggestions.map((suggestion) => (
                          <li key={suggestion.key}>
                            •{' '}
                            <code className="px-1 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              {suggestion.key}
                            </code>{' '}
                            - {suggestion.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              </TabsContent>
              {/* Advanced Settings */}
              <TabsContent
                value="advanced"
                className="space-y-6 flex-1 overflow-y-auto custom-scrollbar"
              >
                <Card className="p-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-semibold mb-4">{t('advanced.title')}</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        {t('advanced.description')}
                      </p>
                    </div>

                    {/* API Key Helper */}
                    <div className="space-y-2">
                      <Label htmlFor="apiKeyHelper">{t('advanced.apiKeyHelper.label')}</Label>
                      <Input
                        id="apiKeyHelper"
                        placeholder={t('advanced.apiKeyHelper.placeholder')}
                        value={settings?.apiKeyHelper || ''}
                        onChange={(e) => updateSetting('apiKeyHelper', e.target.value || undefined)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('advanced.apiKeyHelper.description')}
                      </p>
                    </div>

                    {/* Raw JSON Editor */}
                    <div className="space-y-2">
                      <Label>{t('advanced.rawSettings.label')}</Label>
                      <div className="p-3 rounded-md bg-muted font-mono text-xs overflow-auto whitespace-pre-wrap max-h-64 border">
                        <pre>{JSON.stringify(settings, null, 2)}</pre>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('advanced.rawSettings.description')}
                      </p>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* Hooks Settings */}
              <TabsContent
                value="hooks"
                className="space-y-6 flex-1 overflow-y-auto custom-scrollbar"
              >
                <Card className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-semibold mb-2">{t('hooks.title')}</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('hooks.description')}{' '}
                        <code className="mx-1 px-2 py-1 bg-muted rounded text-xs">
                          {t('hooks.configFile')}
                        </code>
                      </p>
                    </div>

                    <HooksEditor
                      key={activeTab}
                      scope="user"
                      className="border-0"
                      hideActions={true}
                      onChange={(hasChanges, getHooks) => {
                        setUserHooksChanged(hasChanges)
                        getUserHooks.current = getHooks
                      }}
                    />
                  </div>
                </Card>
              </TabsContent>

              {/* Commands Tab */}
              <TabsContent value="commands" className="flex-1 overflow-y-auto custom-scrollbar">
                <Card className="p-6">
                  <SlashCommandsManager className="p-0" />
                </Card>
              </TabsContent>

              {/* Aone Credentials Tab */}
              <TabsContent value="aone" className="flex-1 overflow-y-auto custom-scrollbar">
                <Card className="p-6">
                  <AoneCredentialsManager />
                </Card>
              </TabsContent>

              {/* Storage Tab */}
              <TabsContent value="storage" className="flex-1 overflow-y-auto custom-scrollbar">
                <StorageTab />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      <ToastContainer>
        {toast && (
          <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
        )}
      </ToastContainer>
    </div>
  )
}
