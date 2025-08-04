import 'reflect-metadata'
import { app, shell, BrowserWindow, ipcMain } from 'electron'
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
import { setupSetupWizardHandlers } from './api/setupWizard'
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

  // Register frameless window IPC for window controls
  optimizer.registerFramelessWindowIpc()

  const mainWindow = createWindow()

  // Set the browser window for process manager
  processManager.setBrowserWindow(mainWindow)

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

// Clean up on app quit
app.on('before-quit', async () => {
  console.log('Application is quitting, cleaning up...')

  try {
    // Cleanup running processes
    const runningProcesses = processManager.getRunningProcesses()
    console.log(`Cleaning up ${runningProcesses.length} running processes`)

    for (const process of runningProcesses) {
      await processManager.killProcess(process.runId)
    }

    // Close database connection
    await databaseManager.close()
    console.log('Cleanup completed')
  } catch (error) {
    console.error('Error during cleanup:', error)
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
