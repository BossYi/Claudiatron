import { appSettingsService } from './AppSettingsService'
import { WizardStep, StepStatus } from '../../types/setupWizard'
import type {
  SetupWizardState,
  SetupWizardPersistData,
  DetailedEnvironmentStatus,
  ApiConfiguration,
  RepositoryConfiguration
} from '../../types/setupWizard'

// Import shutdown flag
import { isShuttingDown } from '../../index'

// Utility function to check if app is shutting down
function checkShutdownState(operationName: string): void {
  if (isShuttingDown) {
    console.log(`[SetupWizardService] Rejecting ${operationName} - application is shutting down`)
    throw new Error(`Operation rejected: Application is shutting down`)
  }
}

/**
 * Service for managing Setup Wizard state persistence
 */
export class SetupWizardService {
  private readonly STATE_KEY = 'setup_wizard_state'
  private readonly CONFIG_KEY = 'setup_wizard_config'
  private readonly FIRST_RUN_KEY = 'setup_wizard_first_run'

  /**
   * Get the current wizard state
   */
  async getState(): Promise<SetupWizardState | null> {
    try {
      const stateJson = await appSettingsService.getSetting(this.STATE_KEY)
      if (!stateJson) {
        return null
      }

      const persistData: SetupWizardPersistData = JSON.parse(stateJson)
      return persistData.state
    } catch (error) {
      console.error('Error getting setup wizard state:', error)
      return null
    }
  }

  /**
   * Save the wizard state
   */
  async saveState(state: SetupWizardState): Promise<void> {
    checkShutdownState('saveState')
    
    try {
      const persistData: SetupWizardPersistData = {
        state,
        version: '1.0.0',
        lastUpdated: new Date().toISOString()
      }

      await appSettingsService.setSetting(this.STATE_KEY, JSON.stringify(persistData))
    } catch (error) {
      console.error('Error saving setup wizard state:', error)
      throw new Error('Failed to save wizard state')
    }
  }

  /**
   * Update a specific step status
   */
  async updateStepStatus(step: WizardStep, status: StepStatus): Promise<void> {
    const state = await this.getState()
    if (!state) {
      throw new Error('No wizard state found')
    }

    state.stepStatus[step] = status
    await this.saveState(state)
  }

  /**
   * Update the current step
   */
  async updateCurrentStep(step: WizardStep): Promise<void> {
    const state = await this.getState()
    if (!state) {
      throw new Error('No wizard state found')
    }

    state.currentStep = step
    await this.saveState(state)
  }

  /**
   * Check if this is the first run
   */
  async isFirstRun(): Promise<boolean> {
    const firstRun = await appSettingsService.getSetting(this.FIRST_RUN_KEY)
    return firstRun !== 'false'
  }

  /**
   * Mark as not first run
   */
  async markAsNotFirstRun(): Promise<void> {
    await appSettingsService.setSetting(this.FIRST_RUN_KEY, 'false')
  }

  /**
   * Create initial wizard state
   */
  async createInitialState(): Promise<SetupWizardState> {
    const isFirstRun = await this.isFirstRun()

    const initialState: SetupWizardState = {
      currentStep: WizardStep.WELCOME,
      stepStatus: {
        [WizardStep.WELCOME]: StepStatus.PENDING,
        [WizardStep.ENVIRONMENT_DETECTION]: StepStatus.PENDING,
        [WizardStep.CLAUDE_CONFIGURATION]: StepStatus.PENDING,
        [WizardStep.REPOSITORY_IMPORT]: StepStatus.PENDING,
        [WizardStep.COMPLETION]: StepStatus.PENDING
      },
      userData: {},
      errors: {
        [WizardStep.WELCOME]: [],
        [WizardStep.ENVIRONMENT_DETECTION]: [],
        [WizardStep.CLAUDE_CONFIGURATION]: [],
        [WizardStep.REPOSITORY_IMPORT]: [],
        [WizardStep.COMPLETION]: []
      },
      canProceed: true,
      isFirstRun,
      startedAt: new Date().toISOString()
    }

    await this.saveState(initialState)
    return initialState
  }

  /**
   * Reset wizard state
   */
  async resetState(): Promise<void> {
    await appSettingsService.deleteSetting(this.STATE_KEY)
    await appSettingsService.deleteSetting(this.CONFIG_KEY)
    // Don't reset first run flag
  }

  /**
   * Save environment status
   */
  async saveEnvironmentStatus(status: DetailedEnvironmentStatus): Promise<void> {
    const state = await this.getState()
    if (!state) {
      throw new Error('No wizard state found')
    }

    state.userData.environmentStatus = {
      git: status.git.installed,
      nodejs: status.nodejs.installed,
      claudeCli: status.claudeCli.installed,
      systemInfo: status.systemInfo
    }

    await this.saveState(state)
  }

  /**
   * Save API configuration
   */
  async saveApiConfiguration(config: ApiConfiguration): Promise<void> {
    const state = await this.getState()
    if (!state) {
      throw new Error('No wizard state found')
    }

    state.userData.apiConfiguration = config
    await this.saveState(state)
  }

  /**
   * Save repository configuration
   */
  async saveRepositoryConfiguration(config: RepositoryConfiguration): Promise<void> {
    const state = await this.getState()
    if (!state) {
      throw new Error('No wizard state found')
    }

    state.userData.repository = config
    await this.saveState(state)
  }

  /**
   * Add error for a step
   */
  async addStepError(step: WizardStep, error: string): Promise<void> {
    const state = await this.getState()
    if (!state) {
      throw new Error('No wizard state found')
    }

    if (!state.errors[step].includes(error)) {
      state.errors[step].push(error)
    }

    state.stepStatus[step] = StepStatus.ERROR
    await this.saveState(state)
  }

  /**
   * Clear errors for a step
   */
  async clearStepErrors(step: WizardStep): Promise<void> {
    const state = await this.getState()
    if (!state) {
      throw new Error('No wizard state found')
    }

    state.errors[step] = []
    if (state.stepStatus[step] === StepStatus.ERROR) {
      state.stepStatus[step] = StepStatus.PENDING
    }

    await this.saveState(state)
  }

  /**
   * Mark wizard as completed
   */
  async markAsCompleted(): Promise<void> {
    const state = await this.getState()
    if (!state) {
      throw new Error('No wizard state found')
    }

    state.completedAt = new Date().toISOString()
    state.stepStatus[WizardStep.COMPLETION] = StepStatus.COMPLETED

    await this.saveState(state)
    await this.markAsNotFirstRun()
  }

  /**
   * Get wizard configuration
   */
  async getConfig(): Promise<any> {
    const configJson = await appSettingsService.getSetting(this.CONFIG_KEY)
    return configJson ? JSON.parse(configJson) : {}
  }

  /**
   * Save wizard configuration
   */
  async saveConfig(config: any): Promise<void> {
    await appSettingsService.setSetting(this.CONFIG_KEY, JSON.stringify(config))
  }

  /**
   * Check if wizard should be shown
   */
  async shouldShowWizard(): Promise<boolean> {
    // Check if it's first run
    const isFirstRun = await this.isFirstRun()
    if (isFirstRun) {
      return true
    }

    // Check if there's an incomplete wizard state
    const state = await this.getState()
    if (state && !state.completedAt) {
      return true
    }

    return false
  }

  /**
   * Get progress percentage
   */
  async getProgress(): Promise<number> {
    const state = await this.getState()
    if (!state) {
      return 0
    }

    const completedSteps = Object.values(state.stepStatus).filter(
      (status) => status === StepStatus.COMPLETED
    ).length

    const totalSteps = Object.keys(state.stepStatus).length
    return Math.round((completedSteps / totalSteps) * 100)
  }
}

// Export singleton instance
export const setupWizardService = new SetupWizardService()
