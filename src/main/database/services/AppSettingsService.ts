import { Repository } from 'typeorm'
import { AppSettings } from '../entities/AppSettings'
import { getAppSettingsRepository } from '../connection'

// Import shutdown flag
import { isShuttingDown } from '../../index'

// Utility function to check if app is shutting down
function checkShutdownState(operationName: string): void {
  if (isShuttingDown) {
    console.log(`[AppSettingsService] Rejecting ${operationName} - application is shutting down`)
    throw new Error(`Operation rejected: Application is shutting down`)
  }
}

export class AppSettingsService {
  private async getRepository(): Promise<Repository<AppSettings>> {
    return await getAppSettingsRepository()
  }

  /**
   * Get a setting value by key
   */
  async getSetting(key: string): Promise<string | null> {
    const repository = await this.getRepository()

    const setting = await repository.findOne({ where: { key } })
    return setting ? setting.value : null
  }

  /**
   * Set a setting value
   */
  async setSetting(key: string, value: string): Promise<AppSettings> {
    checkShutdownState('setSetting')

    const repository = await this.getRepository()

    let setting = await repository.findOne({ where: { key } })

    if (setting) {
      setting.value = value
    } else {
      setting = repository.create({ key, value })
    }

    return await repository.save(setting)
  }

  /**
   * Get multiple settings by keys
   */
  async getSettings(keys: string[]): Promise<Record<string, string>> {
    const repository = await this.getRepository()

    const settings = await repository
      .createQueryBuilder('setting')
      .where('setting.key IN (:...keys)', { keys })
      .getMany()

    return settings.reduce(
      (acc, setting) => {
        acc[setting.key] = setting.value
        return acc
      },
      {} as Record<string, string>
    )
  }

  /**
   * Set multiple settings
   */
  async setSettings(settings: Record<string, string>): Promise<AppSettings[]> {
    const results: AppSettings[] = []

    for (const [key, value] of Object.entries(settings)) {
      const result = await this.setSetting(key, value)
      results.push(result)
    }

    return results
  }

  /**
   * Delete a setting
   */
  async deleteSetting(key: string): Promise<boolean> {
    const repository = await this.getRepository()

    const result = await repository.delete({ key })
    return result.affected ? result.affected > 0 : false
  }

  /**
   * Get all settings
   */
  async getAllSettings(): Promise<Record<string, string>> {
    const repository = await this.getRepository()

    const settings = await repository.find()

    return settings.reduce(
      (acc, setting) => {
        acc[setting.key] = setting.value
        return acc
      },
      {} as Record<string, string>
    )
  }

  /**
   * Clear all settings
   */
  async clearAllSettings(): Promise<void> {
    const repository = await this.getRepository()
    await repository.clear()
  }

  /**
   * Get settings with prefix
   */
  async getSettingsWithPrefix(prefix: string): Promise<Record<string, string>> {
    const repository = await this.getRepository()

    const settings = await repository
      .createQueryBuilder('setting')
      .where('setting.key LIKE :prefix', { prefix: `${prefix}%` })
      .getMany()

    return settings.reduce(
      (acc, setting) => {
        acc[setting.key] = setting.value
        return acc
      },
      {} as Record<string, string>
    )
  }

  /**
   * Claude-specific settings helpers
   */
  async getClaudeBinaryPath(): Promise<string | null> {
    return await this.getSetting('claude_binary_path')
  }

  async setClaudeBinaryPath(path: string): Promise<void> {
    await this.setSetting('claude_binary_path', path)
  }

  async getClaudeInstallationPreference(): Promise<string> {
    return (await this.getSetting('claude_installation_preference')) || 'bundled'
  }

  async setClaudeInstallationPreference(preference: string): Promise<void> {
    await this.setSetting('claude_installation_preference', preference)
  }

  async getClaudeSettings(): Promise<Record<string, any>> {
    const settings = await this.getSettingsWithPrefix('claude_')

    // Parse JSON values if they exist
    const parsedSettings: Record<string, any> = {}
    for (const [key, value] of Object.entries(settings)) {
      try {
        parsedSettings[key] = JSON.parse(value)
      } catch {
        parsedSettings[key] = value
      }
    }

    return parsedSettings
  }

  async setClaudeSettings(settings: Record<string, any>): Promise<void> {
    const stringifiedSettings: Record<string, string> = {}

    for (const [key, value] of Object.entries(settings)) {
      const settingKey = key.startsWith('claude_') ? key : `claude_${key}`
      stringifiedSettings[settingKey] = typeof value === 'string' ? value : JSON.stringify(value)
    }

    await this.setSettings(stringifiedSettings)
  }

  /**
   * UI preferences helpers
   */
  async getUIPreferences(): Promise<Record<string, any>> {
    const settings = await this.getSettingsWithPrefix('ui_')

    const preferences: Record<string, any> = {}
    for (const [key, value] of Object.entries(settings)) {
      try {
        preferences[key.replace('ui_', '')] = JSON.parse(value)
      } catch {
        preferences[key.replace('ui_', '')] = value
      }
    }

    return preferences
  }

  async setUIPreference(key: string, value: any): Promise<void> {
    const settingKey = `ui_${key}`
    const settingValue = typeof value === 'string' ? value : JSON.stringify(value)
    await this.setSetting(settingKey, settingValue)
  }

  /**
   * Export settings to JSON
   */
  async exportSettings(): Promise<string> {
    const settings = await this.getAllSettings()
    return JSON.stringify(settings, null, 2)
  }

  /**
   * Import settings from JSON
   */
  async importSettings(jsonData: string, overwrite: boolean = false): Promise<void> {
    const settings = JSON.parse(jsonData)

    if (!overwrite) {
      // Only import settings that don't exist
      const existingSettings = await this.getAllSettings()
      const newSettings: Record<string, string> = {}

      for (const [key, value] of Object.entries(settings)) {
        if (!(key in existingSettings)) {
          newSettings[key] = value as string
        }
      }

      await this.setSettings(newSettings)
    } else {
      await this.setSettings(settings)
    }
  }
}

// Global instance
export const appSettingsService = new AppSettingsService()
