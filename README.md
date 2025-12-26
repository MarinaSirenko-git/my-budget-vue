# 💰 My Budget Vue

[EN](#english) | [RU](#русский)

---

<a name="english"></a>
## 🇬🇧 English

A modern, full-featured personal budget management application built with Vue 3 and TypeScript. This application implements the **Envelope Method** for budgeting, allowing users to manage their finances across multiple currencies and scenarios.

![Vue](https://img.shields.io/badge/Vue-3.4-4FC08D?logo=vue.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.1-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-2.39-3ECF8E?logo=supabase&logoColor=white)

### 🌐 Live Demo

The application is available at: **https://my-budget-vue.pages.dev**

### ✨ Features

#### Core Functionality
- **📊 Budget Management**: Track income, expenses, savings, and financial goals
- **💵 Multi-Currency Support**: Add transactions in any currency with automatic conversion to base currency
- **📁 Scenario Planning**: Create and manage multiple budget scenarios (e.g., "Current Budget", "Future Plan", "Vacation Budget")
- **🎯 Goal Tracking**: Set and monitor financial goals with monthly payment tracking
- **💰 Savings Reuse**: Reuse savings across multiple goals with automatic allocation tracking
- **✅ Goal Achievement Status**: Visual indicators for achieved goals with remaining amount display
- **📈 Financial Reports**: Comprehensive reports showing income, expenses, savings, and goals
- **🌍 Internationalization**: Full support for English and Russian languages
- **🔐 Secure Authentication**: Google OAuth integration via Supabase

#### Technical Highlights
- **Modern Vue 3**: Built with Composition API and `<script setup>` syntax
- **Type Safety**: Full TypeScript implementation
- **State Management**: TanStack Query for server state
- **Real-time Data**: Supabase integration for cloud storage and authentication
- **Responsive Design**: Tailwind CSS for modern, mobile-friendly UI
- **Performance**: Optimized with code splitting and lazy loading

### 🚀 Tech Stack

#### Frontend
- **Vue 3.4** - Progressive JavaScript framework
- **TypeScript 5.4** - Type-safe development
- **Vite 5.1** - Next-generation build tool
- **Vue Router 4.3** - Client-side routing
- **TanStack Query Vue 5.28** - Server state management
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **i18next 23.10** - Internationalization framework

#### Backend & Services
- **Supabase** - Backend as a Service (BaaS)
  - PostgreSQL database
  - Authentication (Google OAuth)
  - Row Level Security (RLS)
  - Real-time subscriptions

### 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Google OAuth credentials (for authentication)

### 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/my-budget-vue.git
   cd my-budget-vue
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Configure Supabase**
   
   - Set up your Supabase project
   - Configure Google OAuth provider
   - Set up database tables and Row Level Security policies
   - Configure RPC functions for scenario creation

### 🏃 Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 🏗️ Build

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

### 📁 Project Structure

```
my-budget-vue/
├── src/
│   ├── components/          # Reusable Vue components
│   │   ├── expenses/       # Expense-related components
│   │   ├── forms/          # Form components
│   │   ├── goals/          # Goal-related components
│   │   ├── incomes/        # Income-related components
│   │   ├── savings/        # Savings-related components
│   │   └── report/         # Report components
│   ├── composables/        # Vue Composition API composables
│   ├── constants/          # Application constants
│   ├── i18n/              # Internationalization files
│   ├── layouts/           # Layout components
│   ├── router/            # Vue Router configuration
│   ├── stores/            # Pinia stores
│   ├── utils/             # Utility functions
│   └── views/             # Page components
├── public/                # Static assets
└── package.json
```

### 🎯 Key Features Explained

#### Envelope Method
The application implements the envelope budgeting method, where users allocate money to different categories (envelopes) before spending. This helps maintain financial discipline and prevents overspending.

#### Multi-Currency Support
Users can add transactions in any currency. The application automatically converts all amounts to a base currency for consolidated reporting, making it ideal for users who receive income or make expenses in different currencies.

#### Scenario Planning
Create multiple budget scenarios to plan for different financial situations. Each scenario has its own set of income, expenses, savings, and goals, allowing users to compare different financial plans.

#### Savings Reuse for Goals
You can allocate your existing savings to multiple financial goals. The system automatically:
- Tracks which savings are used for which goals
- Adjusts monthly payment calculations based on allocated savings
- Prevents over-allocation through database-level validation
- Shows available amount when selecting savings for goals

#### Goal Achievement Tracking
Goals display their current progress and achievement status:
- Visual progress bars showing completion percentage
- Achievement badge when a goal is fully funded
- Remaining amount display for goals in progress
- Automatic monthly payment calculation that accounts for allocated savings

### 🔒 Security

- All sensitive data is encrypted at rest
- Row Level Security (RLS) policies ensure users can only access their own data
- Secure authentication via Supabase Auth
- Environment variables for sensitive configuration

### 🌐 Internationalization

The application supports multiple languages:
- English (en)
- Russian (ru)

Language preference is stored in user profile and persists across sessions.

### 🗺️ Roadmap

For planned improvements and future features, see the [Roadmap](ROADMAP.md).

---

<a name="русский"></a>
## 🇷🇺 Русский

Современное полнофункциональное приложение для управления личным бюджетом, построенное на Vue 3 и TypeScript. Приложение реализует **Метод конвертов** для бюджетирования, позволяя пользователям управлять финансами в нескольких валютах и сценариях.

![Vue](https://img.shields.io/badge/Vue-3.4-4FC08D?logo=vue.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.1-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-2.39-3ECF8E?logo=supabase&logoColor=white)

### 🌐 Живая версия

Приложение доступно по адресу: **https://my-budget-vue.pages.dev**

### ✨ Возможности

#### Основной функционал
- **📊 Управление бюджетом**: Отслеживание доходов, расходов, сбережений и финансовых целей
- **💵 Поддержка мультивалютности**: Добавление транзакций в любой валюте с автоматической конвертацией в базовую валюту
- **📁 Планирование сценариев**: Создание и управление несколькими бюджетными сценариями (например, "Текущий бюджет", "План на будущее", "Бюджет на отпуск")
- **🎯 Отслеживание целей**: Установка и мониторинг финансовых целей с отслеживанием ежемесячных платежей
- **💰 Переиспользование накоплений**: Переиспользование накоплений для нескольких целей с автоматическим отслеживанием распределения
- **✅ Статус достижения цели**: Визуальные индикаторы для достигнутых целей с отображением оставшейся суммы
- **📈 Финансовые отчеты**: Комплексные отчеты, показывающие доходы, расходы, сбережения и цели
- **🌍 Интернационализация**: Полная поддержка английского и русского языков
- **🔐 Безопасная аутентификация**: Интеграция Google OAuth через Supabase

#### Технические особенности
- **Современный Vue 3**: Построен на Composition API и синтаксисе `<script setup>`
- **Типобезопасность**: Полная реализация на TypeScript
- **Управление состоянием**: TanStack Query для серверного состояния
- **Данные в реальном времени**: Интеграция Supabase для облачного хранилища и аутентификации
- **Адаптивный дизайн**: Tailwind CSS для современного мобильного интерфейса
- **Производительность**: Оптимизация с разделением кода и ленивой загрузкой

### 🚀 Технологический стек

#### Frontend
- **Vue 3.4** - Прогрессивный JavaScript фреймворк
- **TypeScript 5.4** - Типобезопасная разработка
- **Vite 5.1** - Инструмент сборки нового поколения
- **Vue Router 4.3** - Клиентская маршрутизация
- **TanStack Query Vue 5.28** - Управление серверным состоянием
- **Tailwind CSS 3.4** - Utility-first CSS фреймворк
- **i18next 23.10** - Фреймворк интернационализации

#### Backend и сервисы
- **Supabase** - Backend as a Service (BaaS)
  - База данных PostgreSQL
  - Аутентификация (Google OAuth)
  - Row Level Security (RLS)
  - Подписки в реальном времени

### 📋 Требования

- Node.js 18+ и npm
- Аккаунт и проект Supabase
- Учетные данные Google OAuth (для аутентификации)

### 🛠️ Установка

1. **Клонируйте репозиторий**
   ```bash
   git clone https://github.com/yourusername/my-budget-vue.git
   cd my-budget-vue
   ```

2. **Установите зависимости**
   ```bash
   npm install
   ```

3. **Настройте переменные окружения**
   
   Создайте файл `.env` в корневой директории:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Настройте Supabase**
   
   - Настройте проект Supabase
   - Настройте провайдер Google OAuth
   - Настройте таблицы базы данных и политики Row Level Security
   - Настройте RPC функции для создания сценариев

### 🏃 Разработка

Запустите сервер разработки:

```bash
npm run dev
```

Приложение будет доступно по адресу `http://localhost:5173`

### 🏗️ Сборка

Сборка для продакшена:

```bash
npm run build
```

Предпросмотр продакшен сборки:

```bash
npm run preview
```

### 📁 Структура проекта

```
my-budget-vue/
├── src/
│   ├── components/          # Переиспользуемые Vue компоненты
│   │   ├── expenses/       # Компоненты для расходов
│   │   ├── forms/          # Компоненты форм
│   │   ├── goals/          # Компоненты для целей
│   │   ├── incomes/        # Компоненты для доходов
│   │   ├── savings/        # Компоненты для сбережений
│   │   └── report/         # Компоненты отчетов
│   ├── composables/        # Vue Composition API composables
│   ├── constants/          # Константы приложения
│   ├── i18n/              # Файлы интернационализации
│   ├── layouts/           # Компоненты макетов
│   ├── router/            # Конфигурация Vue Router
│   ├── stores/            # Pinia stores
│   ├── utils/             # Утилиты
│   └── views/             # Компоненты страниц
├── public/                # Статические ресурсы
└── package.json
```

### 🎯 Ключевые возможности

#### Метод конвертов
Приложение реализует метод конвертов для бюджетирования, где пользователи распределяют деньги по разным категориям (конвертам) перед тратами. Это помогает поддерживать финансовую дисциплину и предотвращает перерасход.

#### Поддержка мультивалютности
Пользователи могут добавлять транзакции в любой валюте. Приложение автоматически конвертирует все суммы в базовую валюту для консолидированной отчетности, что делает его идеальным для пользователей, которые получают доходы или делают расходы в разных валютах.

#### Планирование сценариев
Создавайте несколько бюджетных сценариев для планирования различных финансовых ситуаций. Каждый сценарий имеет свой набор доходов, расходов, сбережений и целей, позволяя пользователям сравнивать различные финансовые планы.

#### Переиспользование накоплений для целей
Вы можете распределить существующие накопления между несколькими финансовыми целями. Система автоматически:
- Отслеживает, какие накопления используются для каких целей
- Корректирует расчет ежемесячных платежей с учетом распределенных накоплений
- Предотвращает перераспределение через валидацию на уровне базы данных
- Показывает доступную сумму при выборе накоплений для целей

#### Отслеживание достижения целей
Цели отображают свой текущий прогресс и статус достижения:
- Визуальные индикаторы прогресса, показывающие процент выполнения
- Бейдж достижения, когда цель полностью профинансирована
- Отображение оставшейся суммы для целей в процессе
- Автоматический расчет ежемесячного платежа с учетом распределенных накоплений

### 🔒 Безопасность

- Все чувствительные данные зашифрованы при хранении
- Политики Row Level Security (RLS) гарантируют, что пользователи могут получить доступ только к своим данным
- Безопасная аутентификация через Supabase Auth
- Переменные окружения для чувствительной конфигурации

### 🌐 Интернационализация

Приложение поддерживает несколько языков:
- Английский (en)
- Русский (ru)

Предпочтения языка сохраняются в профиле пользователя и сохраняются между сеансами.

### 🗺️ Дорожная карта

Для запланированных улучшений и будущих функций см. [Дорожную карту](ROADMAP.md).

---

## 📝 License

**EN**: This project is open source and available under the [MIT License](LICENSE).

**RU**: Этот проект с открытым исходным кодом и доступен под лицензией [MIT License](LICENSE).

## 🤝 Contributing

**EN**: Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

**RU**: Вклад в проект, вопросы и запросы на новые функции приветствуются! Не стесняйтесь проверить страницу с issues.

## 👤 Author

**Marina Sirenko**
- GitHub: [MarinaSirenko-git](https://github.com/MarinaSirenko-git)

## 🙏 Acknowledgments

**EN**:
- Vue.js team for the amazing framework
- Supabase for the excellent BaaS platform
- All contributors and open-source libraries used in this project

**RU**:
- Команде Vue.js за потрясающий фреймворк
- Supabase за отличную BaaS платформу
- Всем контрибьюторам и библиотекам с открытым исходным кодом, используемым в этом проекте

---

⭐ **EN**: If you find this project helpful, please consider giving it a star!

⭐ **RU**: Если этот проект оказался полезным, пожалуйста, поставьте звезду!
