import 'reflect-metadata'
import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { setupClaudeHandlers } from './api/claude'
import { setupAgentsHandlers } from './api/agents'
import { setupMCPHandlers } from './api/mcp'
import { setupStorageHandlers } from './api/storage'
import { setupUsageHandlers } from './api/usage'
import { setupHooksHandlers } from './api/hooks'
import { setupSlashCommandsHandlers } from './api/slashCommands'
import { setupSetupWizardHandlers, setMainWindow } from './api/setupWizard'
import { databaseManager } from './database/connection'
import { processManager } from './process/ProcessManager'
import { loadShellEnvironment } from './utils/shellEnv'

function createWindow(): BrowserWindow {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 850,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false, // 无边框窗口
    titleBarStyle: 'hidden', // 隐藏标题栏
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Load shell environment for macOS/Linux
  await loadShellEnvironment()

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Initialize database
  try {
    await databaseManager.initialize()
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Setup all API handlers
  setupClaudeHandlers()
  setupAgentsHandlers()
  setupMCPHandlers()
  setupStorageHandlers()
  setupUsageHandlers()
  setupHooksHandlers()
  setupSlashCommandsHandlers()
  setupSetupWizardHandlers()

  // Setup dialog handlers
  ipcMain.handle('dialog:showOpenDialog', async (_, options) => {
    const result = await dialog.showOpenDialog(options)
    return result
  })

  // Register frameless window IPC for window controls
  optimizer.registerFramelessWindowIpc()

  const mainWindow = createWindow()

  // Set the browser window for process manager
  processManager.setBrowserWindow(mainWindow)

  // Set the main window for setup wizard
  setMainWindow(mainWindow)

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      const window = createWindow()
      processManager.setBrowserWindow(window)
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Global cleanup flag to prevent multiple cleanup attempts
let isCleaningUp = false

// Global shutdown flag to prevent new IPC handlers from executing
let isShuttingDown = false

// Clean up on app quit
app.on('before-quit', async (event) => {
  // Prevent default quit behavior to handle cleanup properly
  if (!isCleaningUp) {
    event.preventDefault()
    isCleaningUp = true
    isShuttingDown = true // Set shutdown flag immediately

    console.log('=== APPLICATION SHUTDOWN INITIATED ===')
    const cleanupStartTime = Date.now()
    console.log(`Timestamp: ${new Date().toISOString()}`)
    console.log(`Platform: ${process.platform}`)
    console.log(`Node version: ${process.version}`)

    // Log current application state
    const processCount = processManager.getProcessCount()
    console.log(
      `Process count - Total: ${processCount.total}, Agents: ${processCount.agents}, Claude: ${processCount.claude}`
    )

    // Set a hard timeout for cleanup (10 seconds max)
    const cleanupTimeout = setTimeout(() => {
      console.error('=== CLEANUP TIMEOUT REACHED ===')
      console.error('Force quitting due to cleanup timeout')
      process.exit(1)
    }, 10000)

    try {
      // Cleanup running processes with individual timeouts
      const runningProcesses = processManager.getRunningProcesses()
      console.log(`Found ${runningProcesses.length} running processes to cleanup:`)
      runningProcesses.forEach((proc, index) => {
        console.log(
          `  ${index + 1}. RunId: ${proc.runId}, Type: ${proc.processType}, PID: ${proc.pid}, Task: ${proc.task.substring(0, 50)}...`
        )
      })

      const cleanupPromises = runningProcesses.map(async (processInfo) => {
        try {
          console.log(`Killing process ${processInfo.runId} (${processInfo.task})`)
          const success = await processManager.killProcess(processInfo.runId)
          console.log(`Process ${processInfo.runId} cleanup: ${success ? 'success' : 'failed'}`)
          return success
        } catch (error) {
          console.error(`Error killing process ${processInfo.runId}:`, error)
          return false
        }
      })

      // Wait for all process cleanup with timeout
      console.log('Waiting for individual process cleanup to complete...')
      const cleanupResults = await Promise.allSettled(cleanupPromises)
      const successCount = cleanupResults.filter(
        (result) => result.status === 'fulfilled' && result.value === true
      ).length
      const failCount = cleanupResults.length - successCount
      console.log(`Process cleanup results: ${successCount} successful, ${failCount} failed`)

      // Force cleanup any remaining processes
      console.log('Starting force cleanup of remaining processes...')
      await processManager.forceCleanupAll()

      // Verify all processes are gone
      const remainingProcesses = processManager.getRunningProcesses()
      console.log(`Processes remaining after cleanup: ${remainingProcesses.length}`)
      if (remainingProcesses.length > 0) {
        console.warn('Warning: Some processes may still be running after cleanup')
        remainingProcesses.forEach((proc) => {
          console.warn(`  Remaining: RunId ${proc.runId}, PID ${proc.pid}`)
        })
      }

      // Close database connection
      console.log('Closing database connection...')
      await databaseManager.close()
      console.log('Database connection closed successfully')

      // Clear all IPC handlers to prevent memory leaks
      console.log('Clearing IPC handlers...')

      // Get all registered IPC events before clearing
      const registeredEvents = new Set<string>()
      const eventNames = ipcMain.eventNames()
      eventNames.forEach((event) => {
        const eventStr = String(event)
        registeredEvents.add(eventStr)
        const listenerCount = ipcMain.listenerCount(eventStr)
        console.log(`  IPC Event: ${eventStr} (${listenerCount} listeners)`)
      })

      ipcMain.removeAllListeners()
      console.log(`Cleared ${registeredEvents.size} IPC event types with total listeners`)

      console.log('=== CLEANUP COMPLETED SUCCESSFULLY ===')
      console.log(`Total cleanup time: ${Date.now() - cleanupStartTime} ms`)
    } catch (error) {
      console.error('=== ERROR DURING CLEANUP ===')
      console.error('Cleanup error:', error)
      console.error(
        'Stack trace:',
        error instanceof Error ? error.stack : 'No stack trace available'
      )
    } finally {
      clearTimeout(cleanupTimeout)
      const finalCleanupTime = Date.now() - cleanupStartTime
      console.log('=== FINAL CLEANUP STAGE ===')
      console.log(`Final cleanup time: ${finalCleanupTime} ms`)
      console.log('Forcing application exit...')
      // Force quit after cleanup
      app.exit(0)
    }
  }
})

// Export the shutdown flag for use in other modules
export { isShuttingDown }

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
