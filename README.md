<div align="center">
  <img src="./build/icon.png" alt="Catalyst Logo" width="120" height="120">

  <h1>Catalyst</h1>
  
  <p>
    <strong>A Powerful Claude Code GUI Desktop Application</strong>
  </p>
  <p>
    <strong>Built with Electron + React + TypeScript, providing complete Claude Code integration</strong>
  </p>
  
  <p>
    <a href="#features"><img src="https://img.shields.io/badge/Features-✨-blue?style=for-the-badge" alt="Features"></a>
    <a href="#installation"><img src="https://img.shields.io/badge/Install-🚀-green?style=for-the-badge" alt="Installation"></a>
    <a href="#usage"><img src="https://img.shields.io/badge/Usage-📖-purple?style=for-the-badge" alt="Usage"></a>
    <a href="#development"><img src="https://img.shields.io/badge/Develop-🛠️-orange?style=for-the-badge" alt="Development"></a>
  </p>
  
  <p>
    <a href="README.zh.md">中文</a> | <strong>English</strong>
  </p>
</div>

---

## 🌟 Overview

**Catalyst** is a modern desktop application built with Electron + React + TypeScript, serving as a visual GUI for Claude Code. It evolved from the original Tauri version, providing a more comprehensive and stable Claude Code integration experience.

Think of Catalyst as your command center for Claude Code - bridging the gap between the command-line tool and an intuitive visual interface that makes AI-assisted development more efficient and convenient.

## 📋 Table of Contents

- [🌟 Overview](#-overview)
- [✨ Features](#-features)
  - [🗂️ Project & Session Management](#️-project--session-management)
  - [🤖 AI Agents System](#-ai-agents-system)
  - [📊 Usage Analytics Dashboard](#-usage-analytics-dashboard)
  - [🔌 MCP Server Management](#-mcp-server-management)
  - [📝 CLAUDE.md Management](#-claudemd-management)
  - [🌐 Internationalization](#-internationalization)
  - [🎨 Modern Interface](#-modern-interface)
- [📖 Usage](#-usage)
- [🚀 Installation](#-installation)
- [🔨 Build from Source](#-build-from-source)
- [🛠️ Development](#️-development)
- [🔒 Security](#-security)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## ✨ Features

### 🗂️ **Project & Session Management**

- **Visual Project Browser**: Navigate through all your Claude Code projects in `~/.claude/projects/`
- **Session History**: View and resume past coding sessions with full context
- **Smart Search**: Find projects and sessions quickly with built-in search
- **Session Insights**: See first messages, timestamps, and session metadata at a glance

### 🤖 **AI Agents System**

- **Custom AI Agents**: Create specialized agents with custom system prompts and behaviors
- **Agent Library**: Build a collection of purpose-built agents for different tasks
- **Background Execution**: Run agents in separate processes for non-blocking operations
- **Execution History**: Track all agent runs with detailed logs and performance metrics
- **GitHub Agent Import**: Import predefined agent configurations from GitHub

### 📊 **Usage Analytics Dashboard**

- **Cost Tracking**: Monitor your Claude API usage and costs in real-time
- **Token Analytics**: Detailed breakdown by model, project, and time period
- **Visual Charts**: Beautiful charts showing usage trends and patterns
- **Export Data**: Export usage data for accounting and analysis

### 🔌 **MCP Server Management**

- **Server Registry**: Manage Model Context Protocol servers from a central UI
- **Easy Configuration**: Add servers via UI or import from existing configs
- **Connection Testing**: Verify server connectivity before use
- **Claude Desktop Import**: Import server configurations from Claude Desktop
- **Batch Import/Export**: Support for bulk configuration import and export

### 📝 **CLAUDE.md Management**

- **Built-in Editor**: Edit CLAUDE.md files directly within the app
- **Live Preview**: See your markdown rendered in real-time
- **Project Scanner**: Find all CLAUDE.md files in your projects
- **Syntax Highlighting**: Full markdown support with syntax highlighting

### 🌐 **Internationalization**

- **Multi-language Interface**: Support for Chinese and English interfaces
- **Smart Language Detection**: Automatically detect and apply system language
- **Dynamic Switching**: Seamlessly switch languages at runtime
- **Complete Localization**: All interface elements are localized

### 🎨 **Modern Interface**

- **Responsive Design**: Adapts to different screen sizes and resolutions
- **Dark/Light Theme**: Supports automatic system theme switching
- **Smooth Animations**: Fluid interface animations using Framer Motion
- **Material Design**: Modern component library based on shadcn/ui and Radix UI

## 📖 Usage

### Getting Started

1. **Launch Catalyst**: Open the application after installation
2. **Welcome Screen**: Choose between CC Agents or CC Projects
3. **First Time Setup**: Catalyst will automatically detect your `~/.claude` directory

### Managing Projects

```
CC Projects → Select Project → View Sessions → Resume or Start New
```

- Click on any project to view its sessions
- Each session shows the first message and timestamp
- Resume sessions directly or start new ones

### Creating Agents

```
CC Agents → Create Agent → Configure → Execute
```

1. **Design Your Agent**: Set name, icon, and system prompt
2. **Configure Model**: Choose between available Claude models
3. **Set Permissions**: Configure file read/write and network access
4. **Execute Tasks**: Run your agent on any project

### Tracking Usage

```
Menu → Usage Dashboard → View Analytics
```

- Monitor costs by model, project, and date
- Export data for reports
- Set up usage alerts (coming soon)

### Working with MCP Servers

```
Menu → MCP Manager → Add Server → Configure
```

- Add servers manually or via JSON
- Import from Claude Desktop configuration
- Test connections before using

## 🚀 Installation

### System Requirements

- **Operating System**: Windows 10/11, macOS 11+, or Linux (Ubuntu 20.04+)
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: At least 1GB free space

### Prerequisites

- **Claude Code CLI**: Install from [Claude's official site](https://claude.ai/code)

### Release Downloads

Release executables will be published soon.

## 🔨 Build from Source

### Development Environment

1. **Node.js** (18.0.0 or later)

   ```bash
   # Install via nvm (recommended)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   ```

2. **pnpm** (latest version)

   ```bash
   # Install pnpm
   npm install -g pnpm
   ```

3. **Git**

   ```bash
   # Usually pre-installed, but if not:
   # Ubuntu/Debian: sudo apt install git
   # macOS: brew install git
   # Windows: Download from https://git-scm.com
   ```

4. **Claude Code CLI**
   - Download and install from [Claude's official site](https://claude.ai/code)
   - Ensure `claude` is available in your PATH

### Build Steps

1. **Clone the Repository**

   ```bash
   git clone https://github.com/Haleclipse/Catalyst.git
   cd Catalyst
   ```

2. **Install Dependencies**

   ```bash
   pnpm install
   ```

3. **Build the Application**

   **For Development (with hot reload)**

   ```bash
   pnpm dev
   ```

   **For Production Build**

   ```bash
   # Build the application
   pnpm build

   # Platform-specific builds
   pnpm build:win     # Windows
   pnpm build:mac     # macOS
   pnpm build:linux   # Linux
   ```

### Development Commands

```bash
# Start development server
pnpm dev

# Code checking
pnpm lint
pnpm typecheck

# Code formatting
pnpm format

# Build for production
pnpm build
```

## 🛠️ Development

### Tech Stack

- **Frontend**: React 19 + TypeScript + Vite 6
- **Backend**: Electron + Node.js
- **UI Framework**: Tailwind CSS v4 + shadcn/ui
- **Database**: SQLite (via TypeORM + better-sqlite3)
- **Package Manager**: pnpm
- **Animations**: Framer Motion
- **Internationalization**: react-i18next

### Project Structure

```
Catalyst/
├── src/
│   ├── main/                  # Electron main process
│   │   ├── api/              # IPC API handlers
│   │   ├── database/         # Database layer
│   │   ├── detection/        # Claude detection
│   │   └── process/          # Process management
│   ├── preload/              # Preload scripts
│   └── renderer/             # React renderer process
│       ├── src/
│       │   ├── components/   # UI components
│       │   ├── lib/         # API client & utilities
│       │   ├── i18n/        # Internationalization
│       │   └── types/       # TypeScript types
│       └── assets/          # Static assets
├── build/                    # Build resources
└── dist/                     # Build output
```

### Core Architecture

- **Main Process**: Manages app lifecycle, file system access, child process management
- **Preload Scripts**: Provides secure communication bridge between main and renderer processes
- **Renderer Process**: React application interface, handles user interactions
- **Database**: SQLite stores application data, session history, usage statistics

### IPC Communication

The project uses type-safe IPC communication:

```typescript
// Renderer process calls
const projects = await api.getProjects()
const session = await api.createClaudeSession(projectPath)

// Main process handlers
ipcMain.handle('get-projects', async () => { ... })
ipcMain.handle('create-claude-session', async (_, projectPath) => { ... })
```

## 🔒 Security

Catalyst prioritizes your privacy and security:

1. **Process Isolation**: Agents run in separate processes
2. **Permission Control**: Configure file and network access per agent
3. **Local Storage**: All data stays on your machine
4. **No Telemetry**: No data collection or tracking
5. **Open Source**: Full transparency through open source code
6. **Sandboxed Environment**: Renderer process runs in a restricted environment

## 🤝 Contributing

We welcome contributions of all kinds!

### Areas for Contribution

- 🐛 Bug fixes and improvements
- ✨ New features and enhancements
- 📚 Documentation improvements
- 🎨 UI/UX enhancements
- 🧪 Test coverage
- 🌐 Internationalization

### Development Workflow

1. Fork the project
2. Create a feature branch
3. Commit your changes
4. Open a Pull Request

## 📄 License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0) - see the [LICENSE](LICENSE) file for details.

**Important**: This project is based on [Claudia](https://github.com/getAsterisk/claudia), which is licensed under AGPL-3.0. As required by the AGPL-3.0 license terms, all derivative works must maintain the same license.

---

<div align="center">
  <p>
    <strong>Built with Electron for modern desktop experiences</strong>
  </p>
  <p>
    <a href="https://github.com/Haleclipse/Catalyst/issues">Report Bug</a>
    ·
    <a href="https://github.com/Haleclipse/Catalyst/issues">Request Feature</a>
  </p>
</div>
