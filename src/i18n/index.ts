import { createI18n } from 'vue-i18next'
import i18next from 'i18next'

// Initialize i18next
i18next.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      translation: {
        welcome: 'Welcome to My Budget'
      }
    },
    ru: {
      translation: {
        welcome: 'Добро пожаловать в Мой Бюджет'
      }
    }
  }
})

// Create vue-i18next instance
const i18n = createI18n(i18next)

export default i18n

