import { ApiClient } from '../utils/apiClient'

export class StorageApi extends ApiClient {
  /**
   * Lists all tables in the SQLite database
   * @returns Promise resolving to an array of table information
   */
  static async storageListTables(): Promise<any[]> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.storageListTables()
    }, 'Failed to list tables')
  }

  /**
   * Reads table data with pagination
   * @param tableName - Name of the table to read
   * @param page - Page number (1-indexed)
   * @param pageSize - Number of rows per page
   * @param searchQuery - Optional search query
   * @returns Promise resolving to table data with pagination info
   */
  static async storageReadTable(
    tableName: string,
    page: number,
    pageSize: number,
    searchQuery?: string
  ): Promise<any> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.storageReadTable(tableName, page, pageSize, searchQuery)
    }, 'Failed to read table')
  }

  /**
   * Updates a row in a table
   * @param tableName - Name of the table
   * @param primaryKeyValues - Map of primary key column names to values
   * @param updates - Map of column names to new values
   * @returns Promise resolving when the row is updated
   */
  static async storageUpdateRow(
    tableName: string,
    primaryKeyValues: Record<string, any>,
    updates: Record<string, any>
  ): Promise<void> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.storageUpdateRow(tableName, primaryKeyValues, updates)
    }, 'Failed to update row')
  }

  /**
   * Deletes a row from a table
   * @param tableName - Name of the table
   * @param primaryKeyValues - Map of primary key column names to values
   * @returns Promise resolving when the row is deleted
   */
  static async storageDeleteRow(
    tableName: string,
    primaryKeyValues: Record<string, any>
  ): Promise<void> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.storageDeleteRow(tableName, primaryKeyValues)
    }, 'Failed to delete row')
  }

  /**
   * Inserts a new row into a table
   * @param tableName - Name of the table
   * @param values - Map of column names to values
   * @returns Promise resolving to the last insert row ID
   */
  static async storageInsertRow(tableName: string, values: Record<string, any>): Promise<number> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.storageInsertRow(tableName, values)
    }, 'Failed to insert row')
  }

  /**
   * Executes a raw SQL query
   * @param query - SQL query string
   * @returns Promise resolving to query result
   */
  static async storageExecuteSql(query: string): Promise<any> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.storageExecuteSql(query)
    }, 'Failed to execute SQL')
  }

  /**
   * Resets the entire database
   * @returns Promise resolving when the database is reset
   */
  static async storageResetDatabase(): Promise<void> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.storageResetDatabase()
    }, 'Failed to reset database')
  }
}
