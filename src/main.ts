import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import './assets/main.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error && typeof error === 'object' && 'status' in error) {
          const status = error.status as number
          if (status >= 400 && status < 500) {
            return false
          }
        }
        // Retry up to 2 times with exponential backoff
        return failureCount < 2
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'online',
      staleTime: 2 * 60 * 1000, // 2 minutes default
      gcTime: 10 * 60 * 1000, // 10 minutes default (formerly cacheTime)
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry mutations on 4xx errors
        if (error && typeof error === 'object' && 'status' in error) {
          const status = error.status as number
          if (status >= 400 && status < 500) {
            return false
          }
        }
        // Retry mutations once for network errors
        return failureCount < 1
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      networkMode: 'online',
      onError: (error) => {
        // Global error handler for mutations
        console.error('[QueryClient] Mutation error:', error)
        // TODO: Integrate with notification system if available
      },
    },
  },
})

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(VueQueryPlugin, {
  queryClient,
})
app.use(i18n)

app.mount('#app')

