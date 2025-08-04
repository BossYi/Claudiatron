import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI & {
      windowControl: (action: 'min' | 'max' | 'close' | 'show' | 'showInactive') => void
      dialog: {
        showOpenDialog: (options?: any) => Promise<any>
      }
    }
    api: {
      // Setup Wizard APIs
      setupWizardGetState: () => Promise<{ success: boolean; data?: any; error?: string }>
      setupWizardSaveState: (state: any) => Promise<{ success: boolean; error?: string }>
      setupWizardReset: () => Promise<{ success: boolean; error?: string }>
      setupWizardDetectEnvironment: (
        request?: any
      ) => Promise<{ success: boolean; data?: any; error?: string }>
      setupWizardValidateClaudeConfig: (
        request: any
      ) => Promise<{ success: boolean; data?: any; error?: string }>
      setupWizardCloneRepository: (
        request: any
      ) => Promise<{ success: boolean; data?: any; error?: string }>
      setupWizardCompleteSetup: () => Promise<{ success: boolean; error?: string }>
      setupWizardInstallDependencies: (
        software: string
      ) => Promise<{ success: boolean; data?: any; error?: string }>
      setupWizardShouldShow: () => Promise<{ success: boolean; data?: boolean; error?: string }>
      setupWizardGetProgress: () => Promise<{ success: boolean; data?: any; error?: string }>
      setupWizardClearCache: () => Promise<{ success: boolean; message?: string; error?: string }>
      setupWizardBatchInstall: (
        softwareList: string[],
        options?: any
      ) => Promise<{ success: boolean; data?: any; error?: string }>
      setupWizardValidateRepository: (
        url: string
      ) => Promise<{ success: boolean; data?: any; error?: string }>
      setupWizardImportProject: (
        localPath: string
      ) => Promise<{ success: boolean; data?: any; error?: string }>

      // Other APIs (placeholder to avoid type errors)
      [key: string]: any
    }
  }
}
