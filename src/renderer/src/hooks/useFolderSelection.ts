import { useState, useRef, useEffect } from 'react'

export function useFolderSelection() {
  const [folderSelectError, setFolderSelectError] = useState<string | null>(null)

  // 获取用户主目录并构建默认路径
  const [homeDir, setHomeDir] = useState<string | null>(null)
  const defaultClonePath = homeDir ? `${homeDir}/.Catalyst/projects` : '~/.Catalyst/projects'

  // 跟踪路径是否被用户手动修改
  const isPathCustomized = useRef(false)

  // 状态管理
  const [clonePath, setClonePath] = useState(defaultClonePath)
  const [localPath, setLocalPath] = useState('')
  const [projectPath, setProjectPath] = useState('')

  // 当系统信息更新时同步更新默认路径
  useEffect(() => {
    if (homeDir && !isPathCustomized.current) {
      const newDefaultPath = `${homeDir}/.Catalyst/projects`
      setClonePath(newDefaultPath)
    }
  }, [homeDir])

  // 选择本地文件夹
  const selectFolder = async (type: 'clone' | 'local' | 'create') => {
    // 清除之前的错误
    setFolderSelectError(null)

    try {
      // 使用 Electron 的文件对话框
      const result = await window.electron.dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: `选择${type === 'clone' ? '克隆目标' : type === 'local' ? '项目' : '创建'}目录`
      })

      if (result && !result.canceled && result.filePaths.length > 0) {
        const selectedPath = result.filePaths[0]

        switch (type) {
          case 'clone':
            setClonePath(selectedPath)
            // 标记路径已被用户自定义
            isPathCustomized.current = true
            break
          case 'local':
            setLocalPath(selectedPath)
            break
          case 'create':
            setProjectPath(selectedPath)
            break
        }
      }
    } catch (error) {
      console.error('Failed to select folder:', error)
      const errorMessage = error instanceof Error ? error.message : '文件选择失败'
      setFolderSelectError(`无法打开文件选择对话框: ${errorMessage}`)
    }
  }

  // 手动更新路径的处理函数
  const updatePath = (type: 'clone' | 'local' | 'create', value: string) => {
    setFolderSelectError(null)

    switch (type) {
      case 'clone':
        setClonePath(value)
        // 标记路径已被用户自定义
        isPathCustomized.current = true
        break
      case 'local':
        setLocalPath(value)
        break
      case 'create':
        setProjectPath(value)
        break
    }
  }

  return {
    // 状态
    folderSelectError,
    clonePath,
    localPath,
    projectPath,
    defaultClonePath,
    homeDir,

    // 设置函数
    setFolderSelectError,
    setClonePath,
    setLocalPath,
    setProjectPath,
    setHomeDir,

    // 操作函数
    selectFolder,
    updatePath
  }
}
