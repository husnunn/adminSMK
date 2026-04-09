import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../supabase'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../pages/LoginPage.vue'),
    meta: { layout: 'none', title: 'Login | adminSekolah' }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../pages/DashboardPage.vue'),
    meta: { title: 'Dashboard | adminSekolah', requiresAuth: true }
  },
  {
    path: '/students',
    name: 'Data Induk',
    component: () => import('../pages/StudentsTeachersPage.vue'),
    meta: { title: 'User Management | adminSekolah', defaultTab: 'students', requiresAuth: true }
  },
  // {
  //   path: '/teachers',
  //   name: 'Teachers',
  //   component: () => import('../pages/StudentsTeachersPage.vue'),
  //   meta: { title: 'User Management | adminSekolah', defaultTab: 'teachers', requiresAuth: true }
  // },
  {
    path: '/schedules',
    name: 'Schedules',
    component: () => import('../pages/SchedulesPage.vue'),
    meta: { title: 'Academic & Scheduling | adminSekolah', requiresAuth: true }
  },
  {
    path: '/geofencing',
    name: 'Geofencing',
    component: () => import('../pages/GeofencingPage.vue'),
    meta: { title: 'System Settings & Geofencing | adminSekolah', requiresAuth: true }
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, from, next) => {
  document.title = to.meta.title || 'adminSekolah'

  const { data: { session } } = await supabase.auth.getSession()

  if (to.meta.requiresAuth && !session) {
    next({ name: 'Login' })
  } else if (to.name === 'Login' && session) {
    next({ name: 'Dashboard' })
  } else {
    next()
  }
})

export default router
