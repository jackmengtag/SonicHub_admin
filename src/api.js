/* SonicHub Admin · API 访问层 */
const DEFAULT_ORIGIN = (() => {
  if (typeof window === 'undefined') return 'http://127.0.0.1:8080'
  const host = window.location.hostname
  if (host === '127.0.0.1' || host === 'localhost') return 'http://127.0.0.1:8080'
  return window.location.origin
})()
const BASE_KEY = 'sa_api_origin'
const AUTH_KEY = 'sa_auth'

function origin() {
  return (localStorage.getItem(BASE_KEY) || DEFAULT_ORIGIN).replace(/\/+$/, '')
}

function setOrigin(value) {
  const v = (value || '').trim().replace(/\/+$/, '')
  if (!v) return
  localStorage.setItem(BASE_KEY, v)
}

function authData() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null')
  } catch (e) {
    return null
  }
}

function setAuth(data) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(Object.assign({ saved_at: Date.now() }, data)))
}

function clearAuth() {
  localStorage.removeItem(AUTH_KEY)
}

async function request(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const a = authData()
  if (opts.auth !== false && a && a.access_token) {
    headers.Authorization = 'Bearer ' + a.access_token
  }
  let res
  try {
    res = await fetch(origin() + '/api/v1' + path, {
      method: opts.method || 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body)
    })
  } catch (e) {
    const err = new Error('无法连接 API：' + origin() + '，请确认 SonicHub_api 已启动')
    err.network = true
    throw err
  }
  let payload = null
  try {
    payload = await res.json()
  } catch (e) {
    /* empty body */
  }
  if (res.status === 401) {
    clearAuth()
    window.dispatchEvent(new CustomEvent('sa:unauthorized'))
    throw new Error((payload && payload.message) || '登录已过期，请重新登录')
  }
  if (!res.ok || (payload && payload.code && payload.code !== 'OK')) {
    throw new Error((payload && payload.message) || '请求失败 HTTP ' + res.status)
  }
  return payload ? payload.data : null
}

function qs(params) {
  const s = Object.keys(params || {})
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
    .join('&')
  return s ? '?' + s : ''
}

async function login(phone, code) {
  const data = await request('/auth/login', { method: 'POST', body: { phone, code }, auth: false })
  setAuth(data)
  return data
}

function sendSmsCode(phone) {
  return request('/auth/sms/send', { method: 'POST', body: { phone }, auth: false })
}

async function logoutRemote() {
  const a = authData()
  if (a && a.refresh_token) {
    try {
      await request('/auth/logout', { method: 'POST', body: { refresh_token: a.refresh_token } })
    } catch (e) {
      /* ignore */
    }
  }
  clearAuth()
}

const api = {
  origin,
  setOrigin,
  auth: authData,
  setAuth,
  clearAuth,
  request,
  login,
  sendSmsCode,
  logoutRemote,
  me: () => request('/me'),

  stats: () => request('/admin/stats'),
  moderation: (limit = 100) => request('/admin/moderation?limit=' + limit),
  decideWork: (id, decision, reason) =>
    request('/admin/moderation/' + encodeURIComponent(id) + '/decision', {
      method: 'POST',
      body: { decision, reason: reason || '' }
    }),
  reports: (limit = 100) => request('/admin/reports?limit=' + limit),
  decideReport: (id, decision) =>
    request('/admin/reports/' + encodeURIComponent(id) + '/decision', {
      method: 'POST',
      body: { decision }
    }),
  applications: (limit = 100) => request('/admin/applications?limit=' + limit),
  decideApplication: (userID, decision, reason) =>
    request('/admin/applications/' + encodeURIComponent(userID) + '/decision', {
      method: 'POST',
      body: { decision, reason: reason || '' }
    }),
  appeals: (limit = 100) => request('/admin/appeals?limit=' + limit),
  decideAppeal: (id, decision, reason) =>
    request('/admin/appeals/' + encodeURIComponent(id) + '/decision', {
      method: 'POST',
      body: { decision, reason: reason || '' }
    }),

  policy: () => request('/admin/feed-policy'),
  savePolicy: (version, weights, diversity) =>
    request('/admin/feed-policy', { method: 'PUT', body: { version, weights, diversity } }),
  feedLists: () => request('/admin/feed-lists'),
  addFeedList: (listType, value) =>
    request('/admin/feed-lists', { method: 'POST', body: { list_type: listType, value } }),
  deleteFeedList: (id) => request('/admin/feed-lists/' + encodeURIComponent(id), { method: 'DELETE' }),
  fallbacks: () => request('/admin/feed-fallbacks'),
  addFallback: (workId) => request('/admin/feed-fallbacks', { method: 'POST', body: { work_id: workId } }),
  deleteFallback: (id) => request('/admin/feed-fallbacks/' + encodeURIComponent(id), { method: 'DELETE' }),

  roles: () => request('/admin/roles'),
  setUserRole: (id, role) =>
    request('/admin/users/' + encodeURIComponent(id) + '/role', { method: 'PUT', body: { role } }),

  users: (query, status, limit = 200) => request('/admin/users' + qs({ query, status, limit })),
  user: (id) => request('/admin/users/' + encodeURIComponent(id)),
  decideUser: (id, action, reason) =>
    request('/admin/users/' + encodeURIComponent(id) + '/decision', {
      method: 'POST',
      body: { action, reason: reason || '' }
    }),

  works: (query, status, visibility, limit = 200) =>
    request('/admin/works' + qs({ query, status, visibility, limit })),
  work: (id) => request('/admin/works/' + encodeURIComponent(id)),
  decideWorkAction: (id, action, reason) =>
    request('/admin/works/' + encodeURIComponent(id) + '/decision', {
      method: 'POST',
      body: { action, reason: reason || '' }
    }),

  creditSummary: () => request('/admin/credits/summary'),
  creditLedger: (query, limit = 100) => request('/admin/credits/ledger' + qs({ query, limit })),
  creditAdjustments: (status, limit = 100) =>
    request('/admin/credits/adjustments' + qs({ status, limit })),
  createAdjustment: (body) => request('/admin/credits/adjustments', { method: 'POST', body }),
  decideAdjustment: (id, decision, reason) =>
    request('/admin/credits/adjustments/' + encodeURIComponent(id) + '/decision', {
      method: 'POST',
      body: { decision, reason: reason || '' }
    }),

  messages: (status, limit = 100) => request('/admin/messages' + qs({ status, limit })),
  createMessage: (body) => request('/admin/messages', { method: 'POST', body }),
  sendMessage: (id) => request('/admin/messages/' + encodeURIComponent(id) + '/send', { method: 'POST', body: {} }),
  templates: () => request('/admin/message-templates'),
  createTemplate: (body) => request('/admin/message-templates', { method: 'POST', body }),
  updateTemplate: (id, body) =>
    request('/admin/message-templates/' + encodeURIComponent(id), { method: 'PUT', body }),

  placements: () => request('/admin/plaza/placements'),
  createPlacement: (body) => request('/admin/plaza/placements', { method: 'POST', body }),
  updatePlacement: (id, body) =>
    request('/admin/plaza/placements/' + encodeURIComponent(id), { method: 'PUT', body }),
  topics: () => request('/admin/plaza/topics'),
  createTopic: (body) => request('/admin/plaza/topics', { method: 'POST', body }),
  updateTopic: (id, body) =>
    request('/admin/plaza/topics/' + encodeURIComponent(id), { method: 'PUT', body }),
  ranking: (limit = 10) => request('/admin/plaza/ranking' + qs({ limit })),

  auditLogs: (query, type, limit = 150) => request('/admin/audit-logs' + qs({ query, type, limit })),
  auditLog: (id) => request('/admin/audit-logs/' + encodeURIComponent(id))
}

export default api
