// Helper function to safely access window.api
export const getWindowApi = () => {
  if (!window.api) {
    throw new Error('Window API not available')
  }
  return window.api as any
}

// Base API client with common error handling
export class ApiClient {
  protected static getApi() {
    return getWindowApi()
  }

  protected static async handleApiCall<T>(
    apiCall: () => Promise<T>,
    errorMessage: string
  ): Promise<T> {
    try {
      return await apiCall()
    } catch (error) {
      console.error(errorMessage, error)
      throw error
    }
  }
}
