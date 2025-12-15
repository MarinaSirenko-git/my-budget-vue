import type { App } from 'vue'
import i18next, { type TFunction } from 'i18next'

// Initialize i18next
i18next.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      translation: {
        welcome: 'Welcome to My Budget',
        envelope_method: 'Envelope method in action!',
        continue_with_google: 'Continue with Google',
        redirecting_title: 'Redirecting...',
        redirecting_message: 'Checking your session and preparing your workspace.',
        detecting_language_message: 'Determining your interface language...',
        detecting_scenario_message: 'Determining your current scenario...',
        base_currency_setup_message: 'Welcome! Base currency setup is coming soon.',
        scenario_slug_error_message: 'Could not fetch scenario slug. Please try again.'
      }
    },
    ru: {
      translation: {
        welcome: 'Добро пожаловать в Мой Бюджет',
        envelope_method: 'Метод конвертов в действии!',
        continue_with_google: 'Продолжить через Google',
        redirecting_title: 'Перенаправляем...',
        redirecting_message: 'Проверяем вашу сессию и готовим рабочее пространство.',
        detecting_language_message: 'Определяем язык вашего интерфейса...',
        detecting_scenario_message: 'Определяем ваш текущий сценарий...',
        base_currency_setup_message: 'Добро пожаловать! Скоро выберем базовую валюту.',
        scenario_slug_error_message: 'Не удалось получить slug сценария. Попробуйте ещё раз.'
      }
    }
  }
})

// Simple plugin to expose i18next via Vue global properties
export default {
  install(app: App) {
    app.config.globalProperties.$t = i18next.t.bind(i18next)
  },
}

// Composition helper for components
export const useTranslation = () => {
  const t = i18next.t.bind(i18next) as TFunction
  return { t }
}

