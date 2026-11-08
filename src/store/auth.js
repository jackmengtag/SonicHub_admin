import { reactive } from 'vue'
import api from '../api'

export const auth = reactive({
  user: null,
  permissions: [],
  roleName: '',
  ready: false
})

let restored = false

export function can(permission) {
  return auth.permissions.includes(permission)
}

export async function ensureSession() {
  if (restored) return !!auth.user
  restored = true
  if (!api.auth()) {
    auth.ready = true
    return false
  }
  try {
    const me = await api.me()
    auth.user = me.user
    auth.permissions = me.permissions || []
    auth.roleName = me.role_name || ''
  } catch (e) {
    api.clearAuth()
    auth.user = null
    auth.permissions = []
    auth.roleName = ''
  }
  auth.ready = true
  return !!auth.user && auth.permissions.length > 0
}

export async function login(phone, code) {
  const data = await api.login(phone, code)
  if (!data.user || !data.permissions || data.permissions.length === 0) {
    api.clearAuth()
    throw new Error('该账号没有后台权限')
  }
  auth.user = data.user
  auth.permissions = data.permissions
  auth.roleName = data.role_name || ''
  return data
}

export async function logout() {
  await api.logoutRemote()
  auth.user = null
  auth.permissions = []
  auth.roleName = ''
}
