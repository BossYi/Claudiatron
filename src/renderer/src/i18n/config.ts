import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation resources
import enCommon from './resources/en/common.json'
import enUI from './resources/en/ui.json'
import enSettings from './resources/en/settings.json'
import enErrors from './resources/en/errors.json'
import enNfo from './resources/en/nfo.json'
import enUsageDashboard from './resources/en/usageDashboard.json'
import enMcp from './resources/en/mcp.json'
import enTimeline from './resources/en/timeline.json'
import enSession from './resources/en/session.json'

import zhCommon from './resources/zh/common.json'
import zhUI from './resources/zh/ui.json'
import zhSettings from './resources/zh/settings.json'
import zhErrors from './resources/zh/errors.json'
import zhNfo from './resources/zh/nfo.json'
import zhUsageDashboard from './resources/zh/usageDashboard.json'
import zhMcp from './resources/zh/mcp.json'
import zhTimeline from './resources/zh/timeline.json'
import zhSession from './resources/zh/session.json'

// Translation resources
const resources = {
  en: {
    common: enCommon,
    ui: enUI,
    settings: enSettings,
    errors: enErrors,
    nfo: enNfo,
    usageDashboard: enUsageDashboard,
    mcp: enMcp,
    timeline: enTimeline,
    session: enSession
  },
  zh: {
    common: zhCommon,
    ui: zhUI,
    settings: zhSettings,
    errors: zhErrors,
    nfo: zhNfo,
    usageDashboard: zhUsageDashboard,
    mcp: zhMcp,
    timeline: zhTimeline,
    session: zhSession
  }
}

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: [
      'common',
      'ui',
      'settings',
      'errors',
      'nfo',
      'usageDashboard',
      'mcp',
      'timeline',
      'session'
    ],

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'catalyst-language'
    },

    interpolation: {
      escapeValue: false // React already escapes values
    },

    react: {
      useSuspense: false
    },

    // Development settings
    debug: process.env.NODE_ENV === 'development',

    // Namespace separator
    nsSeparator: ':',
    keySeparator: '.'
  })

export default i18n
