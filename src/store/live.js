import { reactive } from 'vue'
import api from '../api'
import { auth, can } from './auth'

export const live = reactive({
  loading: true,
  error: '',
  loadedAt: null,
  stats: null,
  moderation: [],
  reports: [],
  appeals: [],
  applications: [],
  policy: null,
  feedLists: { black: [], white: [], items: [] },
  fallbacks: [],
  rolesData: null,
  users: [],
  works: [],
  creditSummary: null,
  ledger: [],
  adjustments: [],
  announcements: [],
  templates: [],
  placements: [],
  topics: [],
  ranking: [],
  auditLogs: []
})

export function resetLive() {
  live.loading = false
  live.error = ''
  live.loadedAt = null
  live.stats = null
  live.moderation = []
  live.reports = []
  live.appeals = []
  live.applications = []
  live.policy = null
  live.feedLists = { black: [], white: [], items: [] }
  live.fallbacks = []
  live.rolesData = null
  live.users = []
  live.works = []
  live.creditSummary = null
  live.ledger = []
  live.adjustments = []
  live.announcements = []
  live.templates = []
  live.placements = []
  live.topics = []
  live.ranking = []
  live.auditLogs = []
}

export async function loadAll() {
  live.loading = true
  live.error = ''
  const tasks = {}

  // 只请求当前角色有权访问的接口，避免 403。
  if (auth.user) tasks.roles = api.roles()
  if (can('dashboard.view')) tasks.stats = api.stats()
  if (can('moderation.review')) {
    tasks.moderation = api.moderation(100)
    tasks.reports = api.reports(100)
    tasks.appeals = api.appeals(100)
  }
  if (can('creators.review')) tasks.applications = api.applications(100)
  if (can('works.manage')) tasks.works = api.works('', '', '', 300)
  if (can('users.manage')) tasks.users = api.users('', '', 200)
  if (can('recommend.publish')) {
    tasks.policy = api.policy()
    tasks.feedLists = api.feedLists()
    tasks.fallbacks = api.fallbacks()
  }
  if (can('credits.manage')) {
    tasks.creditSummary = api.creditSummary()
    tasks.ledger = api.creditLedger('', 100)
    tasks.adjustments = api.creditAdjustments('', 100)
  }
  if (can('messages.manage')) {
    tasks.announcements = api.messages('', 100)
    tasks.templates = api.templates()
  }
  if (can('plaza.manage')) {
    tasks.placements = api.placements()
    tasks.topics = api.topics()
    tasks.ranking = api.ranking(10)
  }
  if (can('audit.view')) tasks.auditLogs = api.auditLogs('', '', 150)

  const result = {}
  for (const [key, promise] of Object.entries(tasks)) {
    try {
      result[key] = await promise
    } catch (e) {
      if (!live.error) live.error = e.message
      result[key] = null
    }
  }

  if (result.stats) live.stats = result.stats
  if (result.moderation) live.moderation = result.moderation.items || []
  if (result.reports) live.reports = result.reports.items || []
  if (result.appeals) live.appeals = result.appeals.items || []
  if (result.applications) live.applications = result.applications.items || []
  if (result.policy) live.policy = result.policy
  if (result.feedLists) {
    live.feedLists = {
      black: result.feedLists.black || [],
      white: result.feedLists.white || [],
      items: result.feedLists.items || []
    }
  }
  if (result.fallbacks) live.fallbacks = result.fallbacks.items || []
  if (result.roles) live.rolesData = result.roles
  if (result.users) live.users = result.users.items || []
  if (result.works) live.works = result.works.items || []
  if (result.creditSummary) live.creditSummary = result.creditSummary
  if (result.ledger) live.ledger = result.ledger.items || []
  if (result.adjustments) live.adjustments = result.adjustments.items || []
  if (result.announcements) live.announcements = result.announcements.items || []
  if (result.templates) live.templates = result.templates.items || []
  if (result.placements) live.placements = result.placements.items || []
  if (result.topics) live.topics = result.topics.items || []
  if (result.ranking) live.ranking = result.ranking.items || []
  if (result.auditLogs) live.auditLogs = result.auditLogs.items || []

  live.loadedAt = new Date()
  live.loading = false
  return live
}
