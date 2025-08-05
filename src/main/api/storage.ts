import { ipcMain } from 'electron'
import { appSettingsService } from '../database/services'
import { databaseManager } from '../database/connection'

/**
 * Storage and Settings Management IPC handlers
 */
export function setupStorageHandlers() {
  // Get app setting by key
  ipcMain.handle('get-app-setting', async (_, key: string) => {
    console.log('Main: get-app-setting called with', key)
    try {
      return await appSettingsService.getSetting(key)
    } catch (error) {
      console.error('Error getting app setting:', error)
      return null
    }
  })

  // Set app setting
  ipcMain.handle('set-app-setting', async (_, key: string, value: string) => {
    console.log('Main: set-app-setting called with', key, value)
    try {
      await appSettingsService.setSetting(key, value)
      return 'Setting saved successfully'
    } catch (error) {
      console.error('Error setting app setting:', error)
      throw new Error('Failed to save setting')
    }
  })

  // Get all app settings
  ipcMain.handle('get-all-app-settings', async () => {
    console.log('Main: get-all-app-settings called')
    try {
      return await appSettingsService.getAllSettings()
    } catch (error) {
      console.error('Error getting all app settings:', error)
      return {}
    }
  })

  // Delete app setting
  ipcMain.handle('delete-app-setting', async (_, key: string) => {
    console.log('Main: delete-app-setting called with', key)
    try {
      await appSettingsService.deleteSetting(key)
      return 'Setting deleted successfully'
    } catch (error) {
      console.error('Error deleting app setting:', error)
      throw new Error('Failed to delete setting')
    }
  })

  // Clear all app settings
  ipcMain.handle('clear-all-app-settings', async () => {
    console.log('Main: clear-all-app-settings called')
    try {
      await appSettingsService.clearAllSettings()
      return 'All settings cleared successfully'
    } catch (error) {
      console.error('Error clearing all app settings:', error)
      throw new Error('Failed to clear all settings')
    }
  })

  // Database utility operations
  ipcMain.handle('get-database-info', async () => {
    console.log('Main: get-database-info called')
    try {
      const info = await getDatabaseInfo()
      return info
    } catch (error) {
      console.error('Error getting database info:', error)
      return {
        agents_count: 0,
        agent_runs_count: 0,
        settings_count: 0,
        database_size: 0
      }
    }
  })

  // Export database data
  ipcMain.handle('export-database', async () => {
    console.log('Main: export-database called')
    try {
      const data = await exportDatabaseData()
      return JSON.stringify(data, null, 2)
    } catch (error) {
      console.error('Error exporting database:', error)
      throw new Error('Failed to export database')
    }
  })

  // Import database data
  ipcMain.handle('import-database', async (_, jsonData: string) => {
    console.log('Main: import-database called')
    try {
      const data = JSON.parse(jsonData)
      await importDatabaseData(data)
      return 'Database imported successfully'
    } catch (error) {
      console.error('Error importing database:', error)
      throw new Error('Failed to import database')
    }
  })

  // Backup database
  ipcMain.handle('backup-database', async (_, backupPath: string) => {
    console.log('Main: backup-database called with', backupPath)
    try {
      await backupDatabase(backupPath)
      return 'Database backup created successfully'
    } catch (error) {
      console.error('Error backing up database:', error)
      throw new Error('Failed to create database backup')
    }
  })

  // Restore database from backup
  ipcMain.handle('restore-database', async (_, backupPath: string) => {
    console.log('Main: restore-database called with', backupPath)
    try {
      await restoreDatabase(backupPath)
      return 'Database restored successfully'
    } catch (error) {
      console.error('Error restoring database:', error)
      throw new Error('Failed to restore database')
    }
  })

  // Vacuum database (optimize/compact)
  ipcMain.handle('vacuum-database', async () => {
    console.log('Main: vacuum-database called')
    try {
      await vacuumDatabase()
      return 'Database optimized successfully'
    } catch (error) {
      console.error('Error vacuuming database:', error)
      throw new Error('Failed to optimize database')
    }
  })

  // List all database tables
  ipcMain.handle('storage-list-tables', async () => {
    console.log('Main: storage-list-tables called')
    try {
      const tables = await listDatabaseTables()
      return tables
    } catch (error) {
      console.error('Error listing database tables:', error)
      throw error
    }
  })

  // Read table data with pagination
  ipcMain.handle('storage-read-table', async (_, { tableName, page, pageSize, searchQuery }) => {
    console.log('Main: storage-read-table called with', { tableName, page, pageSize, searchQuery })
    try {
      const data = await readTableData(tableName, page || 1, pageSize || 20, searchQuery)
      return data
    } catch (error) {
      console.error('Error reading table data:', error)
      throw error
    }
  })

  // Update table row
  ipcMain.handle('storage-update-row', async (_, { tableName, primaryKeyValues, updates }) => {
    console.log('Main: storage-update-row called')
    try {
      await updateTableRow(tableName, primaryKeyValues, updates)
      return { success: true }
    } catch (error) {
      console.error('Error updating table row:', error)
      throw error
    }
  })

  // Delete table row
  ipcMain.handle('storage-delete-row', async (_, { tableName, primaryKeyValues }) => {
    console.log('Main: storage-delete-row called')
    try {
      await deleteTableRow(tableName, primaryKeyValues)
      return { success: true }
    } catch (error) {
      console.error('Error deleting table row:', error)
      throw error
    }
  })

  // Insert table row
  ipcMain.handle('storage-insert-row', async (_, { tableName, values }) => {
    console.log('Main: storage-insert-row called')
    try {
      await insertTableRow(tableName, values)
      return { success: true }
    } catch (error) {
      console.error('Error inserting table row:', error)
      throw error
    }
  })

  // Execute SQL query
  ipcMain.handle('storage-execute-sql', async (_, { query }) => {
    console.log('Main: storage-execute-sql called')
    try {
      const result = await executeSqlQuery(query)
      return result
    } catch (error) {
      console.error('Error executing SQL query:', error)
      throw error
    }
  })

  // Reset database
  ipcMain.handle('storage-reset-database', async () => {
    console.log('Main: storage-reset-database called')
    try {
      await resetDatabase()
      return { success: true }
    } catch (error) {
      console.error('Error resetting database:', error)
      throw error
    }
  })
}

/**
 * Get database information and statistics
 */
async function getDatabaseInfo() {
  try {
    const dataSource = await databaseManager.getDataSource()

    // Count records in each table using TypeORM
    const agentsCount = await dataSource.getRepository('Agent').count()
    const agentRunsCount = await dataSource.getRepository('AgentRun').count()
    const settingsCount = await dataSource.getRepository('AppSettings').count()

    // Get database file size
    const fs = await import('fs/promises')
    const path = await import('path')
    const { app } = await import('electron')

    const dbPath = path.join(app.getPath('userData'), 'catalyst.db')
    let databaseSize = 0

    try {
      const stats = await fs.stat(dbPath)
      databaseSize = stats.size
    } catch (error) {
      console.warn('Could not get database file size:', error)
    }

    return {
      agents_count: agentsCount,
      agent_runs_count: agentRunsCount,
      settings_count: settingsCount,
      database_size: databaseSize
    }
  } catch (error) {
    console.warn('Database not available:', error)
    return {
      agents_count: 0,
      agent_runs_count: 0,
      settings_count: 0,
      database_size: 0
    }
  }
}

/**
 * Export all database data to JSON
 */
async function exportDatabaseData() {
  try {
    const dataSource = await databaseManager.getDataSource()

    const agents = await dataSource.getRepository('Agent').find()
    const agentRuns = await dataSource.getRepository('AgentRun').find()
    const settings = await appSettingsService.getAllSettings()

    return {
      version: 1,
      exported_at: new Date().toISOString(),
      data: {
        agents,
        agent_runs: agentRuns,
        settings
      }
    }
  } catch (error) {
    console.warn('Database not available for export:', error)
    return {
      version: 1,
      exported_at: new Date().toISOString(),
      data: {
        agents: [],
        agent_runs: [],
        settings: {}
      }
    }
  }
}

/**
 * Import database data from JSON
 */
async function importDatabaseData(data: any) {
  if (data.version !== 1) {
    throw new Error(`Unsupported import version: ${data.version}`)
  }

  try {
    const dataSource = await databaseManager.getDataSource()

    // Import agents
    if (data.data.agents) {
      const agentRepo = dataSource.getRepository('Agent')
      for (const agent of data.data.agents) {
        // Remove ID to avoid conflicts
        const { id, created_at, updated_at, ...agentData } = agent
        await agentRepo.save(agentData)
      }
    }

    // Import agent runs
    if (data.data.agent_runs) {
      const agentRunRepo = dataSource.getRepository('AgentRun')
      for (const run of data.data.agent_runs) {
        // Remove ID to avoid conflicts
        const { id, created_at, updated_at, ...runData } = run
        await agentRunRepo.save(runData)
      }
    }

    // Import settings
    if (data.data.settings) {
      for (const [key, value] of Object.entries(data.data.settings)) {
        await appSettingsService.setSetting(key, value as string)
      }
    }
  } catch (error) {
    console.error('Failed to import database data:', error)
    throw error
  }
}

/**
 * Create a backup copy of the database
 */
async function backupDatabase(backupPath: string) {
  const fs = await import('fs/promises')
  const path = await import('path')
  const { app } = await import('electron')

  const dbPath = path.join(app.getPath('userData'), 'catalyst.db')

  // Copy the database file to the backup location
  await fs.copyFile(dbPath, backupPath)
}

/**
 * Restore database from a backup file
 */
async function restoreDatabase(backupPath: string) {
  const fs = await import('fs/promises')
  const path = await import('path')
  const { app } = await import('electron')

  const dbPath = path.join(app.getPath('userData'), 'catalyst.db')

  // Close the current database connection
  await databaseManager.close()

  // Copy the backup file to the database location
  await fs.copyFile(backupPath, dbPath)

  // Reinitialize the database connection
  await databaseManager.initialize()
}

/**
 * Vacuum (optimize/compact) the database
 */
async function vacuumDatabase() {
  try {
    const dataSource = await databaseManager.getDataSource()

    // Execute VACUUM command through TypeORM
    await dataSource.query('VACUUM')
  } catch (error) {
    console.error('Failed to vacuum database:', error)
    throw error
  }
}

/**
 * List all tables in the database
 */
async function listDatabaseTables() {
  try {
    const dataSource = await databaseManager.getDataSource()

    // Query table information from SQLite metadata
    const tables = await dataSource.query(
      "SELECT name, type, sql FROM sqlite_master WHERE type='table' ORDER BY name"
    )

    return tables.map((row: any) => ({
      name: row.name,
      type: row.type,
      sql: row.sql || ''
    }))
  } catch (error) {
    console.error('Failed to list database tables:', error)
    return []
  }
}

/**
 * Read table data with pagination and search
 */
async function readTableData(
  tableName: string,
  page: number,
  pageSize: number,
  searchQuery?: string
) {
  try {
    const dataSource = await databaseManager.getDataSource()

    // Validate table name to prevent SQL injection
    const validTables = await dataSource.query("SELECT name FROM sqlite_master WHERE type='table'")
    const validTableNames = validTables.map((t: any) => t.name)
    if (!validTableNames.includes(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`)
    }

    // Get table schema information
    const schemaQuery = `PRAGMA table_info("${tableName}")`
    const columns = await dataSource.query(schemaQuery)

    const offset = (page - 1) * pageSize
    let query = `SELECT * FROM "${tableName}"`
    let countQuery = `SELECT COUNT(*) as total FROM "${tableName}"`

    // Add search filter if provided
    if (searchQuery && searchQuery.trim()) {
      if (columns.length > 0) {
        const searchConditions = columns.map((col: any) => `"${col.name}" LIKE ?`).join(' OR ')
        const searchPattern = `%${searchQuery.trim()}%`

        query += ` WHERE ${searchConditions}`
        countQuery += ` WHERE ${searchConditions}`

        const searchParams = new Array(columns.length).fill(searchPattern)
        const [rows, countResult] = await Promise.all([
          dataSource.query(`${query} LIMIT ? OFFSET ?`, [...searchParams, pageSize, offset]),
          dataSource.query(countQuery, searchParams)
        ])

        const totalRows = countResult[0]?.total || 0
        const totalPages = Math.ceil(totalRows / pageSize)

        return {
          columns: columns.map((col: any) => ({
            name: col.name,
            type_name: col.type,
            pk: col.pk === 1,
            notnull: col.notnull === 1,
            dflt_value: col.dflt_value
          })),
          rows: rows,
          total_rows: totalRows,
          total_pages: totalPages,
          current_page: page,
          page_size: pageSize
        }
      }
    }

    // Without search
    const [rows, countResult] = await Promise.all([
      dataSource.query(`${query} LIMIT ? OFFSET ?`, [pageSize, offset]),
      dataSource.query(countQuery)
    ])

    const totalRows = countResult[0]?.total || 0
    const totalPages = Math.ceil(totalRows / pageSize)

    return {
      columns: columns.map((col: any) => ({
        name: col.name,
        type_name: col.type,
        pk: col.pk === 1,
        notnull: col.notnull === 1,
        dflt_value: col.dflt_value
      })),
      rows: rows,
      total_rows: totalRows,
      total_pages: totalPages,
      current_page: page,
      page_size: pageSize
    }
  } catch (error) {
    console.error('Failed to read table data:', error)
    throw error
  }
}

/**
 * Update a table row
 */
async function updateTableRow(
  tableName: string,
  primaryKeyValues: Record<string, any>,
  updates: Record<string, any>
) {
  try {
    const dataSource = await databaseManager.getDataSource()

    // Validate table name
    const validTables = await dataSource.query("SELECT name FROM sqlite_master WHERE type='table'")
    const validTableNames = validTables.map((t: any) => t.name)
    if (!validTableNames.includes(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`)
    }

    const setClauses = Object.keys(updates)
      .map((key) => `"${key}" = ?`)
      .join(', ')
    const whereClause = Object.keys(primaryKeyValues)
      .map((key) => `"${key}" = ?`)
      .join(' AND ')

    const query = `UPDATE "${tableName}" SET ${setClauses} WHERE ${whereClause}`
    const params = [...Object.values(updates), ...Object.values(primaryKeyValues)]

    await dataSource.query(query, params)
  } catch (error) {
    console.error('Failed to update table row:', error)
    throw error
  }
}

/**
 * Delete a table row
 */
async function deleteTableRow(tableName: string, primaryKeyValues: Record<string, any>) {
  try {
    const dataSource = await databaseManager.getDataSource()

    // Validate table name
    const validTables = await dataSource.query("SELECT name FROM sqlite_master WHERE type='table'")
    const validTableNames = validTables.map((t: any) => t.name)
    if (!validTableNames.includes(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`)
    }

    const whereClause = Object.keys(primaryKeyValues)
      .map((key) => `"${key}" = ?`)
      .join(' AND ')
    const query = `DELETE FROM "${tableName}" WHERE ${whereClause}`
    const params = Object.values(primaryKeyValues)

    await dataSource.query(query, params)
  } catch (error) {
    console.error('Failed to delete table row:', error)
    throw error
  }
}

/**
 * Insert a new table row
 */
async function insertTableRow(tableName: string, values: Record<string, any>) {
  try {
    const dataSource = await databaseManager.getDataSource()

    // Validate table name
    const validTables = await dataSource.query("SELECT name FROM sqlite_master WHERE type='table'")
    const validTableNames = validTables.map((t: any) => t.name)
    if (!validTableNames.includes(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`)
    }

    const columns = Object.keys(values)
      .map((key) => `"${key}"`)
      .join(', ')
    const placeholders = Object.keys(values)
      .map(() => '?')
      .join(', ')
    const query = `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders})`
    const params = Object.values(values)

    await dataSource.query(query, params)
  } catch (error) {
    console.error('Failed to insert table row:', error)
    throw error
  }
}

/**
 * Execute a custom SQL query
 */
async function executeSqlQuery(query: string) {
  try {
    const dataSource = await databaseManager.getDataSource()

    // Basic validation to prevent dangerous operations
    const normalizedQuery = query.trim().toLowerCase()
    if (normalizedQuery.startsWith('drop') || normalizedQuery.startsWith('alter')) {
      throw new Error('DROP and ALTER statements are not allowed')
    }

    const result = await dataSource.query(query)
    return result
  } catch (error) {
    console.error('Failed to execute SQL query:', error)
    throw error
  }
}

/**
 * Reset/recreate the database
 */
async function resetDatabase() {
  try {
    // Close current connection
    await databaseManager.close()

    // Remove database file
    const fs = await import('fs/promises')
    const path = await import('path')
    const { app } = await import('electron')
    const dbPath = path.join(app.getPath('userData'), 'catalyst.db')

    try {
      await fs.unlink(dbPath)
    } catch (error) {
      // File might not exist, that's ok
    }

    // Reinitialize database
    await databaseManager.initialize()
  } catch (error) {
    console.error('Failed to reset database:', error)
    throw error
  }
}
