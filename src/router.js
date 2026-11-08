import { createRouter, createWebHashHistory } from 'vue-router'
import { auth, can, ensureSession } from './store/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('./views/Login.vue'),
    meta: { public: true, title: '登录' }
  },
  {
    path: '/',
    component: () => import('./layout/AdminLayout.vue'),
    children: [
      { path: '', redirect: '/dashboard' },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('./views/Dashboard.vue'),
        meta: { title: '数据看板', eyebrow: 'OVERVIEW', perm: 'dashboard.view' }
      },
      {
        path: 'moderation',
        name: 'moderation',
        component: () => import('./views/Moderation.vue'),
        meta: { title: '内容审核', eyebrow: 'CONTENT SAFETY', perm: 'moderation.review' }
      },
      {
        path: 'creators',
        name: 'creators',
        component: () => import('./views/Creators.vue'),
        meta: { title: '音乐人认证', eyebrow: 'CREATOR REVIEW', perm: 'creators.review' }
      },
      {
        path: 'works',
        name: 'works',
        component: () => import('./views/Works.vue'),
        meta: { title: '作品管理', eyebrow: 'WORK LIBRARY', perm: 'works.manage' }
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('./views/Users.vue'),
        meta: { title: '用户管理', eyebrow: 'ACCOUNT CONTROL', perm: 'users.manage' }
      },
      {
        path: 'recommend',
        name: 'recommend',
        component: () => import('./views/Recommend.vue'),
        meta: { title: '推荐配置', eyebrow: 'FEED POLICY', perm: 'recommend.publish' }
      },
      {
        path: 'plaza',
        name: 'plaza',
        component: () => import('./views/Plaza.vue'),
        meta: { title: '广场运营', eyebrow: 'PLAZA OPS', perm: 'plaza.manage' }
      },
      {
        path: 'messages',
        name: 'messages',
        component: () => import('./views/Messages.vue'),
        meta: { title: '消息运营', eyebrow: 'MESSAGING', perm: 'messages.manage' }
      },
      {
        path: 'credits',
        name: 'credits',
        component: () => import('./views/Credits.vue'),
        meta: { title: '积分运营', eyebrow: 'CREDIT OPS', perm: 'credits.manage' }
      },
      {
        path: 'audit',
        name: 'audit',
        component: () => import('./views/Audit.vue'),
        meta: { title: '审计日志', eyebrow: 'AUDIT TRAIL', perm: 'audit.view' }
      },
      {
        path: 'permissions',
        name: 'permissions',
        component: () => import('./views/Permissions.vue'),
        meta: { title: '角色权限', eyebrow: 'ACCESS CONTROL', perm: 'roles.manage' }
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach(async (to) => {
  if (to.meta.public) return true
  const ok = await ensureSession()
  if (!ok) return { path: '/login', query: { redirect: to.fullPath } }
  if (to.meta.perm && !can(to.meta.perm)) return { path: '/dashboard' }
  return true
})

window.addEventListener('sa:unauthorized', () => {
  auth.user = null
  auth.permissions = []
  auth.roleName = ''
  if (router.currentRoute.value.path !== '/login') router.replace('/login')
})

export default router
