export function fmtTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return String(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return String(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function compact(n) {
  const v = Number(n || 0)
  if (v >= 10000) return (v / 10000).toFixed(1).replace(/\.0$/, '') + '万'
  if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(v)
}

export function numberText(n) {
  if (n === null || n === undefined) return '—'
  return Number(n).toLocaleString('zh-CN')
}

export function coverFor(value) {
  const keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  const c = String(value || '')
  if (/^[a-h]$/.test(c)) return c
  if (/^c[1-8]$/.test(c)) return keys[Number(c[1]) - 1]
  let n = 0
  for (let i = 0; i < c.length; i++) n = (n + c.charCodeAt(i)) % 97
  return keys[n % keys.length]
}

export const visibilityLabel = { public: '公开', friends: '朋友', private: '私密' }

export const workStatusMap = {
  published: { label: '已发布', type: 'success' },
  pending_review: { label: '审核中', type: 'warning' },
  pending: { label: '审核中', type: 'warning' },
  draft: { label: '草稿', type: 'info' },
  rejected: { label: '已拒绝', type: 'danger' },
  removed: { label: '已下架', type: 'info' }
}

export const userStatusMap = {
  active: { label: '正常', type: 'success' },
  normal: { label: '正常', type: 'success' },
  warned: { label: '已警告', type: 'warning' },
  limited: { label: '限制中', type: 'warning' },
  banned: { label: '已封禁', type: 'danger' }
}

export const reportStatusMap = {
  open: { label: '待处置', type: 'warning' },
  upheld: { label: '已成立', type: 'success' },
  dismissed: { label: '已驳回', type: 'info' }
}

export const appealStatusMap = {
  open: { label: '待处理', type: 'warning' },
  pending: { label: '待处理', type: 'warning' },
  accepted: { label: '已通过', type: 'success' },
  rejected: { label: '已驳回', type: 'danger' }
}

export const announcementStatusMap = {
  draft: { label: '草稿', type: 'info' },
  pending: { label: '待发送', type: 'warning' },
  sent: { label: '已发送', type: 'success' }
}

export const adjustmentStatusMap = {
  pending: { label: '待复核', type: 'warning' },
  approved: { label: '已通过', type: 'success' },
  rejected: { label: '已驳回', type: 'danger' }
}

export const placementStatusMap = {
  online: { label: '在线', type: 'success' },
  scheduled: { label: '排期中', type: 'warning' },
  offline: { label: '已下线', type: 'info' }
}

export const topicStatusMap = {
  online: { label: '进行中', type: 'success' },
  draft: { label: '草稿', type: 'info' },
  offline: { label: '已结束', type: 'info' }
}

export const audienceLabel = { all: '全部用户', creators: '音乐人', inactive: '7 日未活跃' }

export const dispoLabel = { warn: '警告', limit: '限制发布', ban: '封禁', unban: '解封' }

export const auditActionLabel = {
  'moderation.decide': '内容审核',
  'report.decide': '举报处置',
  'appeal.decide': '申诉复核',
  'musician.decide': '音乐人认证',
  'feed_policy.publish': '推荐策略发布',
  'feed_list.create': '新增黑白名单',
  'feed_list.delete': '移除黑白名单',
  'feed_fallback.create': '新增保底内容',
  'feed_fallback.delete': '移除保底内容',
  'work.unpublish': '作品下架',
  'work.restore': '作品恢复',
  'work.pin': '作品置顶',
  'work.unpin': '取消置顶',
  'work.delete': '作品删除',
  'user.warn': '用户警告',
  'user.limit': '限制发布',
  'user.ban': '封禁账号',
  'user.unban': '解封账号',
  'user.role': '调整后台角色',
  'credit.request': '发起调账',
  'credit.approved': '调账通过',
  'credit.rejected': '调账驳回',
  'message.draft': '公告草稿',
  'message.send': '公告发送',
  'template.create': '新建模板',
  'template.update': '更新模板',
  'plaza.placement.create': '新建运营位',
  'plaza.placement.update': '更新运营位',
  'plaza.topic.create': '新建话题',
  'plaza.topic.update': '更新话题'
}

export function auditKind(action) {
  if (/^(moderation|report|appeal|musician)\./.test(action)) return 'review'
  if (/^(feed_policy|feed_list|feed_fallback|work|message|template|plaza)\./.test(action)) return 'ops'
  if (action.indexOf('credit.') === 0) return 'credit'
  if (action.indexOf('user.') === 0) return 'user'
  return 'other'
}

export function roleLabel(user) {
  if (!user) return '—'
  if (user.role === 'admin') return '超级管理员'
  if (user.role === 'reviewer') return '内容审核员'
  if (user.role === 'operator') return '运营'
  return user.verified ? '音乐人' : '用户'
}
