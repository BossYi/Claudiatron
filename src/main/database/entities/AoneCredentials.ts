import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

/**
 * Aone 全局认证信息实体
 *
 * 简化设计：全局只保存一个 Aone 认证信息，用于所有 Aone 仓库
 */
@Entity('aone_credentials')
export class AoneCredentials {
  @PrimaryGeneratedColumn()
  id!: number

  @Column('text')
  domain_account!: string

  @Column('text')
  private_token!: string // 加密存储

  @CreateDateColumn()
  created_at!: Date

  @UpdateDateColumn()
  updated_at!: Date
}
