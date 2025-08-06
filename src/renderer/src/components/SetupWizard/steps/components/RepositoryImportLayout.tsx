import React from 'react'
import { motion } from 'framer-motion'
import { FolderOpen } from 'lucide-react'

interface RepositoryImportLayoutProps {
  modeSelector: React.ReactNode
  mainContent: React.ReactNode
  actionArea: React.ReactNode
}

export const RepositoryImportLayout: React.FC<RepositoryImportLayoutProps> = ({
  modeSelector,
  mainContent,
  actionArea
}) => {
  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col space-y-4"
      >
        {/* 标题行 - 包含步骤说明和模式选择器 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <h2 className="text-base font-semibold">项目导入</h2>
              <p className="text-xs text-muted-foreground">克隆Aone或其他类型的远程仓库代码</p>
            </div>
          </div>

          {/* 导入方式选择器 - 移到右侧 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex-shrink-0"
          >
            {modeSelector}
          </motion.div>
        </div>

        {/* 主内容区域 - 占据大部分空间 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="flex-1 min-h-0 overflow-hidden"
        >
          {mainContent}
        </motion.div>

        {/* 操作按钮区域 - 固定在底部 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {actionArea}
        </motion.div>
      </motion.div>
    </div>
  )
}
