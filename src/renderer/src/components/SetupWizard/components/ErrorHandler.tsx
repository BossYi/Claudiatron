import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, RefreshCw, X, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { SetupWizardError } from '@/types/setupWizard'
import { ERROR_CODES } from '@/types/setupWizard'

interface ErrorHandlerProps {
  /**
   * 错误对象
   */
  error: SetupWizardError
  /**
   * 重试回调
   */
  onRetry?: () => void
  /**
   * 关闭错误提示回调
   */
  onDismiss?: () => void
  /**
   * 显示详细错误信息
   */
  showDetails?: boolean
  /**
   * 可选的CSS类名
   */
  className?: string
}

/**
 * 错误处理组件
 *
 * 显示设置向导中的错误信息，提供重试和关闭功能
 */
export const ErrorHandler: React.FC<ErrorHandlerProps> = ({
  error,
  onRetry,
  onDismiss,
  showDetails = false,
  className
}) => {
  // 获取错误类型的样式
  const getErrorTypeStyles = () => {
    switch (error.code) {
      case ERROR_CODES.NETWORK_ERROR:
        return {
          bgColor: 'bg-orange-50 dark:bg-orange-950',
          borderColor: 'border-orange-200 dark:border-orange-800',
          textColor: 'text-orange-800 dark:text-orange-200',
          iconColor: 'text-orange-600'
        }
      case ERROR_CODES.PERMISSION_DENIED:
        return {
          bgColor: 'bg-red-50 dark:bg-red-950',
          borderColor: 'border-red-200 dark:border-red-800',
          textColor: 'text-red-800 dark:text-red-200',
          iconColor: 'text-red-600'
        }
      case ERROR_CODES.VALIDATION_FAILED:
        return {
          bgColor: 'bg-yellow-50 dark:bg-yellow-950',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          textColor: 'text-yellow-800 dark:text-yellow-200',
          iconColor: 'text-yellow-600'
        }
      default:
        return {
          bgColor: 'bg-red-50 dark:bg-red-950',
          borderColor: 'border-red-200 dark:border-red-800',
          textColor: 'text-red-800 dark:text-red-200',
          iconColor: 'text-red-600'
        }
    }
  }

  // 获取错误解决建议
  const getErrorSuggestions = () => {
    switch (error.code) {
      case ERROR_CODES.NETWORK_ERROR:
        return ['检查您的网络连接', '确认防火墙设置允许应用访问网络', '尝试使用不同的网络环境']
      case ERROR_CODES.PERMISSION_DENIED:
        return ['检查文件和文件夹的访问权限', '以管理员身份运行应用程序', '确认您有足够的系统权限']
      case ERROR_CODES.INVALID_API_KEY:
        return [
          '检查API密钥是否正确输入',
          '确认API密钥是否有效且未过期',
          '联系服务提供商确认账户状态'
        ]
      case ERROR_CODES.INSTALLATION_FAILED:
        return ['检查系统是否满足最低要求', '确保有足够的磁盘空间', '尝试手动安装必要的软件']
      default:
        return ['请重试操作', '如果问题持续存在，请联系支持团队', '查看详细日志了解更多信息']
    }
  }

  const styles = getErrorTypeStyles()
  const suggestions = getErrorSuggestions()

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className={cn('w-full', className)}
      >
        <Card className={cn('border-l-4', styles.bgColor, styles.borderColor)}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* 错误图标 */}
              <AlertCircle className={cn('w-5 h-5 flex-shrink-0 mt-0.5', styles.iconColor)} />

              {/* 错误信息 */}
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className={cn('font-medium', styles.textColor)}>操作失败</h3>
                    <p className={cn('text-sm mt-1', styles.textColor)}>{error.message}</p>
                  </div>

                  {/* 关闭按钮 */}
                  {onDismiss && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onDismiss}
                      className="h-6 w-6 p-0 hover:bg-transparent"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* 详细信息 */}
                {showDetails && error.details && (
                  <details className="mt-2">
                    <summary className={cn('text-xs cursor-pointer', styles.textColor)}>
                      查看详细信息
                    </summary>
                    <pre
                      className={cn(
                        'text-xs mt-2 p-2 bg-black/5 dark:bg-white/5 rounded overflow-auto',
                        styles.textColor
                      )}
                    >
                      {JSON.stringify(error.details, null, 2)}
                    </pre>
                  </details>
                )}

                {/* 解决建议 */}
                {suggestions.length > 0 && (
                  <div className="mt-3">
                    <h4 className={cn('text-xs font-medium mb-1', styles.textColor)}>解决建议：</h4>
                    <ul className={cn('text-xs space-y-1', styles.textColor)}>
                      {suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="inline-block w-1 h-1 bg-current rounded-full mt-1.5 flex-shrink-0" />
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex items-center gap-2 mt-3">
                  {error.recoverable && onRetry && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRetry}
                      className="flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      重试
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => {
                      // 打开帮助文档或支持页面
                      window.open('https://docs.example.com/troubleshooting', '_blank')
                    }}
                  >
                    获取帮助
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

export default ErrorHandler
