import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue')
  },
  {
    path: '/auth',
    name: 'auth',
    component: () => import('../views/AuthView.vue')
  },
  {
    path: '/auth/callback',
    name: 'auth-callback',
    component: () => import('../views/CallbackView.vue')
  },
  {
    path: '/:slug',
    component: MainLayout,
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
    component: () => import('../views/NotFoundView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router

