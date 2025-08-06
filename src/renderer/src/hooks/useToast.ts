import { useState, useCallback } from 'react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastState {
  visible: boolean
  message: string
  type: ToastType
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'info'
  })

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({
      visible: true,
      message,
      type
    })
  }, [])

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }))
  }, [])

  return {
    toast,
    showToast,
    hideToast
  }
}