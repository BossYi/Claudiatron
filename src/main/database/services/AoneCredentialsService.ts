import { Repository } from 'typeorm'
import * as crypto from 'crypto'
import * as os from 'os'
import { AoneCredentials } from '../entities/AoneCredentials'
import { databaseManager } from '../connection'

export interface AoneAuthInfo {
  domainAccount: string
  privateToken: string
}

export class AoneCredentialsService {
  private repository: Repository<AoneCredentials> | null = null
  private algorithm = 'aes-256-gcm'
  private secretKey: Buffer

  constructor() {
    this.secretKey = this.deriveKey()
  }

  private async getRepository(): Promise<Repository<AoneCredentials>> {
    if (!this.repository) {
      const dataSource = await databaseManager.initialize()
      this.repository = dataSource.getRepository(AoneCredentials)
    }
    return this.repository
  }

  /**
   * 派生加密密钥
   */
  private deriveKey(): Buffer {
    // 使用机器信息和固定salt生成密钥
    const machineInfo = os.hostname() + os.platform() + os.arch()
    const salt = 'claudiatron-aone-credentials'
    return crypto.pbkdf2Sync(machineInfo, salt, 100000, 32, 'sha512')
  }

  /**
   * 加密文本
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv) as crypto.CipherGCM

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()

    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
  }

  /**
   * 解密文本
   */
  private decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':')
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format')
      }

      const iv = Buffer.from(parts[0], 'hex')
      const authTag = Buffer.from(parts[1], 'hex')
      const encrypted = parts[2]

      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.secretKey,
        iv
      ) as crypto.DecipherGCM
      decipher.setAuthTag(authTag)

      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error) {
      console.error('Failed to decrypt token:', error)
      throw new Error('Failed to decrypt stored credentials')
    }
  }

  /**
   * 保存全局 Aone 认证信息
   */
  async saveGlobalCredentials(authInfo: AoneAuthInfo): Promise<AoneCredentials> {
    try {
      const repository = await this.getRepository()

      // 先删除所有现有记录，确保只有一个全局认证
      await repository.clear()

      const encryptedToken = this.encrypt(authInfo.privateToken)

      // 创建新的全局认证记录
      const credentials = repository.create({
        domain_account: authInfo.domainAccount,
        private_token: encryptedToken
      })

      return await repository.save(credentials)
    } catch (error) {
      console.error('Failed to save global Aone credentials:', error)
      throw new Error('Failed to save global Aone credentials')
    }
  }

  /**
   * 获取全局 Aone 认证信息
   */
  async getGlobalCredentials(): Promise<AoneAuthInfo | null> {
    try {
      const repository = await this.getRepository()
      const credentials = await repository.find({
        order: { created_at: 'DESC' },
        take: 1
      })

      if (!credentials || credentials.length === 0) {
        return null
      }

      const decryptedToken = this.decrypt(credentials[0].private_token)

      return {
        domainAccount: credentials[0].domain_account,
        privateToken: decryptedToken
      }
    } catch (error) {
      console.error('Failed to get global Aone credentials:', error)
      return null
    }
  }

  /**
   * 检查是否已配置全局认证信息
   */
  async hasCredentials(): Promise<boolean> {
    try {
      const repository = await this.getRepository()
      const count = await repository.count()
      return count > 0
    } catch (error) {
      console.error('Failed to check credentials existence:', error)
      return false
    }
  }

  /**
   * 获取全局认证信息（不包含token明文）
   */
  async getCredentialsInfo(): Promise<Omit<AoneCredentials, 'private_token'> | null> {
    try {
      const repository = await this.getRepository()
      const credentials = await repository.find({
        select: ['id', 'domain_account', 'created_at', 'updated_at'],
        order: { created_at: 'DESC' },
        take: 1
      })

      if (!credentials || credentials.length === 0) {
        return null
      }

      return credentials[0]
    } catch (error) {
      console.error('Failed to get credentials info:', error)
      return null
    }
  }

  /**
   * 删除全局认证信息
   */
  async deleteGlobalCredentials(): Promise<boolean> {
    try {
      const repository = await this.getRepository()
      await repository.clear()
      return true
    } catch (error) {
      console.error('Failed to delete global credentials:', error)
      return false
    }
  }

  /**
   * 验证认证信息格式
   */
  validateAuthInfo(authInfo: AoneAuthInfo): boolean {
    return (
      typeof authInfo.domainAccount === 'string' &&
      authInfo.domainAccount.trim() !== '' &&
      typeof authInfo.privateToken === 'string' &&
      authInfo.privateToken.trim() !== ''
    )
  }
}

// 单例实例
let aoneCredentialsServiceInstance: AoneCredentialsService | null = null

export function getAoneCredentialsService(): AoneCredentialsService {
  if (!aoneCredentialsServiceInstance) {
    aoneCredentialsServiceInstance = new AoneCredentialsService()
  }
  return aoneCredentialsServiceInstance
}
