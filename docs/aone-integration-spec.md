# Aone 仓库集成技术规范

## 1. 概述

### 1.1 背景

- **目标用户**: 公司内部产品经理
- **核心需求**: 支持克隆 Aone（阿里巴巴内部代码托管平台）私有仓库
- **关键特性**:
  - Aone 作为默认仓库类型
  - 支持域账号和私有令牌认证
  - 安全存储认证信息以便后续更新

### 1.2 技术目标

- 提供友好的 Aone 仓库克隆界面
- 安全存储和管理认证信息
- 支持后续的仓库更新操作
- 保持与现有 Git 仓库支持的兼容性

## 2. 技术架构

### 2.1 系统架构图

```
┌─────────────────────────────────────┐
│       前端 (Renderer Process)        │
│  ┌─────────────────────────────┐    │
│  │  RepositoryImportStep.tsx   │    │
│  │  - 仓库类型选择器           │    │
│  │  - Aone 认证表单           │    │
│  └──────────┬──────────────────┘    │
│             │ IPC                    │
└─────────────┼───────────────────────┘
              │
┌─────────────┼───────────────────────┐
│       主进程 (Main Process)          │
│  ┌──────────▼──────────────────┐    │
│  │   setupWizard API Handler   │    │
│  └──────────┬──────────────────┘    │
│             │                        │
│  ┌──────────▼──────────────────┐    │
│  │ RepositoryImportService.ts  │    │
│  │  - Aone 克隆逻辑           │    │
│  │  - Token URL 注入          │    │
│  └──────────┬──────────────────┘    │
│             │                        │
│  ┌──────────▼──────────────────┐    │
│  │ AoneCredentialsService.ts   │    │
│  │  - 认证信息 CRUD           │    │
│  │  - 加密/解密               │    │
│  └──────────┬──────────────────┘    │
│             │                        │
│  ┌──────────▼──────────────────┐    │
│  │    SQLite Database          │    │
│  │  - aone_credentials 表     │    │
│  └─────────────────────────────┘    │
└──────────────────────────────────────┘
```

### 2.2 数据流

1. 用户选择 Aone 仓库类型并输入认证信息
2. 前端通过 IPC 发送克隆请求
3. 主进程验证并存储认证信息（如用户选择）
4. 使用认证信息构建克隆 URL
5. 执行 Git 克隆操作
6. 返回克隆结果和进度

## 3. 详细设计

### 3.1 数据库设计

#### 3.1.1 AoneCredentials 表结构

```typescript
@Entity('aone_credentials')
export class AoneCredentials {
  @PrimaryGeneratedColumn()
  id: number

  @Column('text')
  domain_account: string // 域账号

  @Column('text')
  private_token: string // 私有令牌（加密存储）

  @Column('text')
  repository_url: string // 关联的仓库 URL

  @Column('text', { nullable: true })
  project_path?: string // 关联的本地项目路径

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
```

### 3.2 类型定义

#### 3.2.1 扩展 RepositoryCloneRequest

```typescript
// 仓库类型枚举
export enum RepositoryType {
  AONE = 'aone',
  GITHUB = 'github',
  GITLAB = 'gitlab',
  BITBUCKET = 'bitbucket',
  OTHER = 'other'
}

// Aone 认证信息
export interface AoneAuthInfo {
  domainAccount: string
  privateToken: string
  saveCredentials?: boolean // 是否保存认证信息
}

// 扩展的仓库克隆请求
export interface RepositoryCloneRequest {
  url: string
  localPath: string
  repositoryType?: RepositoryType // 新增
  aoneAuth?: AoneAuthInfo // 新增
  options?: {
    depth?: number
    branch?: string
    recursive?: boolean
  }
}
```

### 3.3 前端组件设计

#### 3.3.1 UI 布局

```
┌─────────────────────────────────────┐
│ 仓库类型：                          │
│ ┌─────────┐ ┌─────────┐           │
│ │  Aone   │ │  Other  │           │
│ └─────────┘ └─────────┘           │
│                                     │
│ 仓库 URL：                         │
│ ┌─────────────────────────────────┐│
│ │ code.alibaba-inc.com/...        ││
│ └─────────────────────────────────┘│
│                                     │
│ ┌─── Aone 认证信息 ───────────────┐│
│ │ 域账号：                        ││
│ │ ┌─────────────────────────────┐││
│ │ │ your.name                   │││
│ │ └─────────────────────────────┘││
│ │                                 ││
│ │ Private Token：                 ││
│ │ ┌─────────────────────────────┐││
│ │ │ ••••••••••••••••••••       │││
│ │ └─────────────────────────────┘││
│ │                                 ││
│ │ ℹ️ Token 将被加密存储在本地     ││
│ └─────────────────────────────────┘│
│                                     │
│ 本地路径：                         │
│ ┌───────────────────┐ ┌─────────┐ │
│ │ ~/Projects/...    │ │  选择   │ │
│ └───────────────────┘ └─────────┘ │
└─────────────────────────────────────┘
```

### 3.4 API 设计

#### 3.4.1 新增 API 接口

```typescript
// 保存 Aone 认证信息
ipcMain.handle(
  'save-aone-credentials',
  async (_, credentials: AoneAuthInfo & { repositoryUrl: string }) => {
    return aoneCredentialsService.saveCredentials(credentials)
  }
)

// 获取 Aone 认证信息
ipcMain.handle('get-aone-credentials', async (_, repositoryUrl: string) => {
  return aoneCredentialsService.getCredentials(repositoryUrl)
})

// 删除 Aone 认证信息
ipcMain.handle('delete-aone-credentials', async (_, id: number) => {
  return aoneCredentialsService.deleteCredentials(id)
})

// 列出所有 Aone 认证信息
ipcMain.handle('list-aone-credentials', async () => {
  return aoneCredentialsService.listCredentials()
})
```

### 3.5 安全设计

#### 3.5.1 Token 加密存储

```typescript
import * as crypto from 'crypto'

class AoneCredentialsService {
  private algorithm = 'aes-256-gcm'
  private secretKey: Buffer

  constructor() {
    // 从环境变量或安全存储获取密钥
    this.secretKey = this.deriveKey()
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv)

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()

    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
  }

  private decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':')
    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]

    const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }
}
```

#### 3.5.2 日志清理

```typescript
// 清理日志中的敏感信息
function sanitizeLogMessage(message: string, token?: string, account?: string): string {
  let sanitized = message

  if (token) {
    // 替换 token
    sanitized = sanitized.replace(token, '***PRIVATE_TOKEN***')
  }

  if (account && token) {
    // 替换完整的认证字符串
    const authString = `${account}:${token}`
    sanitized = sanitized.replace(authString, '***AUTH_REMOVED***')
  }

  return sanitized
}
```

### 3.6 Aone 克隆逻辑

#### 3.6.1 URL 构建

```typescript
private buildAoneCloneUrl(
  repoUrl: string,
  domainAccount: string,
  privateToken: string
): string {
  const parsed = new URL(repoUrl)
  const auth = `${domainAccount}:${privateToken}`

  // 构建格式: https://{域账号}:{private-token}@code.alibaba-inc.com/foo/bar.git
  return `${parsed.protocol}//${auth}@${parsed.host}${parsed.pathname}`
}
```

#### 3.6.2 克隆执行

```typescript
private async performAoneClone(
  repoUrl: string,
  localPath: string,
  auth: AoneAuthInfo,
  options: CloneOptions
): Promise<CloneResult> {
  // 构建认证 URL
  const cloneUrl = this.buildAoneCloneUrl(repoUrl, auth.domainAccount, auth.privateToken)

  // 执行克隆（使用现有的 performGitClone 方法）
  const result = await this.performGitClone(cloneUrl, localPath, options)

  // 保存认证信息（如果用户选择）
  if (auth.saveCredentials && result.success) {
    await this.aoneCredentialsService.saveCredentials({
      domainAccount: auth.domainAccount,
      privateToken: auth.privateToken,
      repositoryUrl: repoUrl,
      projectPath: localPath
    })
  }

  return result
}
```

## 4. 实施计划

### 4.1 开发阶段

1. **第一阶段**: 数据库和服务层（2天）
   - 创建 AoneCredentials 实体
   - 实现 AoneCredentialsService
   - 添加数据库迁移

2. **第二阶段**: 前端 UI（2天）
   - 更新 RepositoryImportStep 组件
   - 添加仓库类型选择器
   - 实现 Aone 认证表单

3. **第三阶段**: 后端集成（2天）
   - 扩展 RepositoryImportService
   - 集成 Aone 克隆逻辑
   - 实现 API 接口

4. **第四阶段**: 测试和优化（1天）
   - 单元测试
   - 集成测试
   - 安全审查

### 4.2 测试计划

1. **功能测试**
   - Aone 仓库克隆成功场景
   - 认证失败场景
   - 认证信息存储和读取

2. **安全测试**
   - Token 加密存储验证
   - 日志清理验证
   - 错误信息脱敏验证

3. **性能测试**
   - 大型仓库克隆
   - 并发克隆操作

## 5. 注意事项

### 5.1 安全考虑

- Private Token 必须加密存储
- 所有日志输出必须清理敏感信息
- 错误信息不能暴露认证详情
- 定期清理过期的认证信息

### 5.2 兼容性

- 保持与现有 Git 仓库类型的兼容
- 支持未来扩展其他企业级 Git 平台
- 提供认证信息的导出/导入功能

### 5.3 用户体验

- 提供清晰的错误提示和解决建议
- 支持认证信息的快速填充
- 显示克隆进度和预计时间
- 提供取消克隆的选项

## 6. 未来扩展

### 6.1 功能扩展

- 支持批量仓库克隆
- 集成 Aone API 获取仓库列表
- 支持仓库搜索和筛选
- 添加仓库更新定时任务

### 6.2 安全增强

- 支持硬件密钥存储
- 实现 Token 自动轮换
- 添加访问审计日志
- 支持多因素认证

## 7. 参考资料

- Aone Git 使用指南（内部文档）
- Git 认证最佳实践
- Electron 安全指南
- TypeORM 加密字段文档
