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
        scenario_slug_error_message: 'Could not fetch scenario slug. Please try again.',
        base_currency_setup_title: 'Choose base currency',
        base_currency_setup_description: 'You can add income, expenses, and savings in any currency. To see consolidated totals, choose a base currency. You can change it later in your account settings.',
        select_currency_placeholder: 'Select a currency',
        select_currency_helper: 'This will be used as your base currency.',
        select_currency_error: 'Please choose a currency.',
        cancel: 'Cancel',
        continue: 'Continue',
        nav_income: 'Income',
        nav_expense: 'Expense',
        nav_savings: 'Savings',
        nav_goal: 'Goal',
        nav_idea: 'Idea',
        nav_report: 'Report',
        nav_settings: 'Settings',
        nav_my_income: 'My Income',
        nav_my_savings: 'My Savings',
        nav_my_expense: 'My Expenses',
        nav_my_goal: 'My Goals',
        nav_how_can_help: 'Method envelopes',
        nav_download_report: 'Full report',
        summary_title: 'Summary',
        summary_income: 'Income',
        summary_savings: 'Savings',
        summary_expense: 'Expenses',
        summary_goal: 'Goals',
        summary_balance: 'Balance',
        currency_symbol: 'USD',
        sign_out: 'Sign Out',
        page_title_income: 'Income',
        page_title_expense: 'Expense',
        page_title_savings: 'Savings',
        page_title_goal: 'Goal',
        page_title_idea: 'Idea',
        page_title_report: 'Report',
        page_title_settings: 'Settings',
        page_title_dashboard: 'Dashboard',
        not_found_title: '404 - Page Not Found',
        not_found_message: 'Oops! The page you are looking for seems to have disappeared. Our little mouse couldn\'t find it either.',
        not_found_back_home: 'Back to Home'
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
        scenario_slug_error_message: 'Не удалось получить slug сценария. Попробуйте ещё раз.',
        base_currency_setup_title: 'Выберите базовую валюту',
        base_currency_setup_description: 'Вы можете вносить доходы, расходы и накопления в любой валюте. Чтобы подвести общие итоги, выберите базовую валюту. Её можно будет поменять в настройках личного кабинета.',
        select_currency_placeholder: 'Выберите валюту',
        select_currency_helper: 'Она будет использоваться как базовая валюта.',
        select_currency_error: 'Пожалуйста, выберите валюту.',
        cancel: 'Отмена',
        continue: 'Продолжить',
        nav_income: 'Доходы',
        nav_expense: 'Расходы',
        nav_savings: 'Накопления',
        nav_goal: 'Цели',
        nav_idea: 'Идеи',
        nav_report: 'Отчёты',
        nav_settings: 'Настройки',
        nav_my_income: 'Мои доходы',
        nav_my_savings: 'Мои накопления',
        nav_my_expense: 'Мои расходы',
        nav_my_goal: 'Мои цели',
        nav_how_can_help: 'Метод конвертов',
        nav_download_report: 'Полный отчёт',
        summary_title: 'СВОДКА',
        summary_income: 'Доходы',
        summary_savings: 'Накопления',
        summary_expense: 'Расходы',
        summary_goal: 'Цели',
        summary_balance: 'Остаток',
        currency_symbol: 'Р',
        sign_out: 'Выйти',
        page_title_income: 'Доходы',
        page_title_expense: 'Расходы',
        page_title_savings: 'Накопления',
        page_title_goal: 'Цели',
        page_title_idea: 'Идеи',
        page_title_report: 'Отчёты',
        page_title_settings: 'Настройки',
        page_title_dashboard: 'Панель управления',
        not_found_title: '404 - Страница не найдена',
        not_found_message: 'Упс! Страница, которую вы ищете, похоже, исчезла. Наша маленькая мышка тоже не смогла её найти.',
        not_found_back_home: 'Вернуться на главную'
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

