/**
 * 集成测试脚本
 * 用于验证 Claude Code 安装管理器和仓库导入服务的基本功能
 */

import { ClaudeCodeInstallationManager } from './installation/ClaudeCodeInstallationManager'
import { RepositoryImportService } from './services/RepositoryImportService'

async function testClaudeCodeManager() {
  console.log('=== 测试 Claude Code Installation Manager ===')

  const manager = new ClaudeCodeInstallationManager()

  try {
    // 测试系统兼容性检查
    console.log('检查系统兼容性...')
    const compatibility = await manager['validateSystemCompatibility']()
    console.log('兼容性结果:', {
      compatible: compatibility.compatible,
      issues: compatibility.issues
    })

    // 测试检查更新
    console.log('检查更新...')
    const updateInfo = await manager.checkForUpdates()
    console.log('更新信息:', updateInfo)

    console.log('Claude Code Manager 测试完成 ✓')
  } catch (error) {
    console.error('Claude Code Manager 测试失败:', error)
  }
}

async function testRepositoryService() {
  console.log('\n=== 测试 Repository Import Service ===')

  const service = new RepositoryImportService()

  try {
    // 测试URL验证
    console.log('验证GitHub仓库URL...')
    const validation = await service.validateRepositoryUrl(
      'https://github.com/microsoft/vscode.git'
    )
    console.log('验证结果:', {
      valid: validation.valid,
      repoName: validation.repoName,
      platform: validation.platform
    })

    // 测试简写形式
    console.log('验证简写形式URL...')
    const shortValidation = await service.validateRepositoryUrl('microsoft/vscode')
    console.log('简写验证结果:', {
      valid: shortValidation.valid,
      normalizedUrl: shortValidation.normalizedUrl
    })

    // 测试无效URL
    console.log('验证无效URL...')
    const invalidValidation = await service.validateRepositoryUrl('invalid-url')
    console.log('无效URL结果:', {
      valid: invalidValidation.valid,
      error: invalidValidation.error
    })

    console.log('Repository Service 测试完成 ✓')
  } catch (error) {
    console.error('Repository Service 测试失败:', error)
  }
}

async function runTests() {
  console.log('开始集成测试...\n')

  await testClaudeCodeManager()
  await testRepositoryService()

  console.log('\n所有测试完成!')
}

// 如果直接运行此文件
if (require.main === module) {
  runTests().catch(console.error)
}

export { runTests }
