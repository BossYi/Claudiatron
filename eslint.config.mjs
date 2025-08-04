import tseslint from '@electron-toolkit/eslint-config-ts'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import eslintPluginReact from 'eslint-plugin-react'
import eslintPluginReactHooks from 'eslint-plugin-react-hooks'
import eslintPluginReactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  { ignores: ['**/node_modules', '**/dist', '**/out'] },
  tseslint.configs.recommended,
  eslintPluginReact.configs.flat.recommended,
  eslintPluginReact.configs.flat['jsx-runtime'],
  {
    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': eslintPluginReactHooks,
      'react-refresh': eslintPluginReactRefresh
    },
    rules: {
      ...eslintPluginReactHooks.configs.recommended.rules,
      ...eslintPluginReactRefresh.configs.vite.rules,
      // 暂时禁用问题较多的规则，便于开发
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'prefer-const': 'off',
      'no-async-promise-executor': 'off',
      'no-useless-escape': 'off',
      'no-control-regex': 'off', // 禁用控制字符检查
      'react/prop-types': 'off', // TypeScript 项目不需要 PropTypes
      'react/no-unescaped-entities': 'off', // 禁用未转义实体检查
      'react-hooks/exhaustive-deps': 'off', // 禁用依赖检查，避免过度限制
      'react-refresh/only-export-components': 'warn', // 降级为警告
      'no-case-declarations': 'off',
      'no-empty': 'off'
    }
  },
  eslintConfigPrettier
)
