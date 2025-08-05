# Claude Code 安装指南

## 概述

本指南帮助用户手动安装和配置 Claude Code CLI 工具。用户需要使用 npm 命令自行安装 Claude Code，并完成基本配置。

## 平台支持

支持以下操作系统：
- **Windows**：Windows 10/11（x64 和 arm64）
- **macOS**：macOS 10.15+ （Intel 和 Apple Silicon）
- **Linux**：主流发行版（Ubuntu、CentOS、Fedora 等）

## 安装步骤

### 前置要求

确保系统已安装 Node.js（版本 16 或更高版本）：
```bash
node --version
npm --version
```

### 安装 Claude Code

使用 npm 全局安装 Claude Code：
```bash
npm install -g @anthropic-ai/claude-code
```

### 验证安装

安装完成后验证是否成功：
```bash
claude --version
```

如果显示版本号，说明安装成功。

## 配置 Claude Code

### 设置 API 密钥

安装完成后，需要配置 API 密钥：
```bash
claude configure
```

按提示输入你的 Anthropic API 密钥。

### 配置文件位置

配置文件会自动创建在以下位置：
- **Windows**：`%USERPROFILE%\.claude\settings.json`
- **macOS/Linux**：`~/.claude/settings.json`

### 验证配置

测试配置是否正确：
```bash
claude test-connection
```

如果连接成功，说明配置正确。

## 基本使用

### 创建项目

创建新的 Claude Code 项目：
```bash
claude init my-project
cd my-project
```

### 开始对话

启动 Claude Code 会话：
```bash
claude chat
```

## 常见问题

### 安装问题

**Q: 执行 `npm install` 时出现权限错误？**
A: 使用管理员权限运行命令，或配置 npm 权限。

**Q: 找不到 `claude` 命令？**
A: 确保全局安装成功，检查系统 PATH 环境变量。

### 配置问题

**Q: API 密钥在哪里获取？**
A: 访问 [Anthropic Console](https://console.anthropic.com) 创建 API 密钥。

**Q: 如何重新配置 API 密钥？**
A: 再次运行 `claude configure` 命令即可。

### 连接问题

**Q: 提示网络连接失败？**
A: 检查网络连接，确认防火墙或代理设置。

**Q: API 密钥验证失败？**
A: 确认密钥正确，检查账户余额和权限。

## 更新和维护

### 更新 Claude Code

检查并更新到最新版本：
```bash
npm update -g @anthropic-ai/claude-code
```

### 查看版本

检查当前版本：
```bash
claude --version
```

## 获取帮助

- 查看命令帮助：`claude --help`
- 访问官方文档：[Claude Code 文档](https://docs.anthropic.com/claude/code)
- 社区支持：[GitHub Issues](https://github.com/anthropics/claude-code/issues)