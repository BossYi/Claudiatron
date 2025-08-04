/**
 * Re-export Setup Wizard types for main process
 * This avoids TypeScript configuration issues between main and renderer processes
 */

// Re-export all types from renderer
export * from '../../renderer/src/types/setupWizard'
