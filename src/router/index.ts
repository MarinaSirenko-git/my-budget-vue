import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'
import { supabase } from '@/composables/useSupabase'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/auth',
    name: 'auth',
    component: () => import('../views/AuthView.vue'),
    meta: { requiresAuth: false, guestOnly: true }
  },
  {
    path: '/auth/callback',
    name: 'auth-callback',
    component: () => import('../views/CallbackView.vue'),
    meta: { requiresAuth: false, guestOnly: true }
  },
  {
    path: '/:slug',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: 'income',
        name: 'income',
        component: () => import('../views/IncomeView.vue')
      },
      {
        path: 'expense',
        name: 'expense',
        component: () => import('../views/ExpenseView.vue')
      },
      {
        path: 'savings',
        name: 'savings',
        component: () => import('../views/SavingsView.vue')
      },
      {
        path: 'goal',
        name: 'goal',
        component: () => import('../views/GoalView.vue')
      },
      {
        path: 'idea',
        name: 'idea',
        component: () => import('../views/IdeaView.vue')
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('../views/SettingsView.vue')
      },
      {
        path: 'report',
        name: 'report',
        component: () => import('../views/ReportView.vue')
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue'),
    meta: { requiresAuth: false }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// Navigation guard для защиты роутов
router.beforeEach(async (to, _from, next) => {
  // Проверяем сессию пользователя
  const { data: { session } } = await supabase.auth.getSession()
  const isAuthenticated = !!session

  // Если роут требует авторизации, но пользователь не авторизован
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'auth', query: { redirect: to.fullPath } })
    return
  }

  // Если роут только для гостей, но пользователь авторизован
  if (to.meta.guestOnly && isAuthenticated) {
    // Отменяем текущую навигацию
    next(false)
    
    // Проверяем, что session существует (TypeScript guard)
    if (!session?.user?.id) {
      router.replace('/')
      return
    }

    // Перенаправляем на первый сценарий пользователя
    try {
      const { data: scenario, error } = await supabase
        .from('scenarios')
        .select('slug')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      
      if (error) {
        console.error('Error fetching scenario:', error)
        router.replace('/')
        return
      }
      
      if (scenario?.slug) {
        // Используем router.replace() напрямую для гарантированного изменения URL
        router.replace(`/${scenario.slug}/income`)
      } else {
        router.replace('/')
      }
    } catch (error) {
      console.error('Error in navigation guard:', error)
      router.replace('/')
    }
    return
  }

  next()
})

export default router

