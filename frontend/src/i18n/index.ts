import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enCommon from './en/common.json'
import enSections from './en/sections.json'
import enDeepDives from './en/deepdives.json'
import enTools from './en/tools.json'
import ptCommon from './pt/common.json'
import ptSections from './pt/sections.json'
import ptDeepDives from './pt/deepdives.json'
import ptTools from './pt/tools.json'

const savedLanguage = localStorage.getItem('mte-language') || 'en'

i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
      sections: enSections,
      deepdives: enDeepDives,
      tools: enTools,
    },
    pt: {
      common: ptCommon,
      sections: ptSections,
      deepdives: ptDeepDives,
      tools: ptTools,
    },
  },
  lng: savedLanguage,
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'sections', 'deepdives', 'tools'],
  interpolation: {
    escapeValue: false, // React already handles XSS
  },
})

export default i18n
