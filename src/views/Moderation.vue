<template>
  <div class="page">
    <PageHeader
      title="内容审核"
      eyebrow="CONTENT SAFETY"
      desc="发布前机审、人工复核、举报与申诉在同一队列流转，处置结果自动回写作品状态。"
      live
    >
      <template #actions>
        <el-button :icon="Refresh" :loading="live.loading" @click="refresh">刷新</el-button>
      </template>
    </PageHeader>

    <el-card>
      <el-tabs v-model="tab">
        <el-tab-pane name="works">
          <template #label>
            作品审核
            <el-badge v-if="live.moderation.length" :value="live.moderation.length" type="warning" class="tab-badge" />
          </template>
          <div class="toolbar">
            <el-input v-model="query" :prefix-icon="Search" placeholder="搜索作品、作者或 ID" clearable style="width: 260px" />
            <span class="grow" />
            <template v-if="selection.length">
              <span class="muted">已选 {{ selection.length }} 条</span>
              <el-button size="small" type="success" plain @click="batchDecision('approve')">批量通过</el-button>
              <el-button size="small" type="danger" plain @click="batchDecision('reject')">批量拒绝</el-button>
            </template>
          </div>
          <el-table :data="workList" size="small" @selection-change="(v) => (selection = v)">
            <el-table-column type="selection" width="40" />
            <el-table-column label="作品" min-width="230">
              <template #default="{ row }">
                <div class="cell-main">
                  <span class="cover" :class="'cover-' + coverFor(row.cover || row.id)" />
                  <div>
                    <b>{{ row.title }}</b>
                    <p><span class="mono">{{ row.id }}</span><span v-if="row.genre">· {{ row.genre }}</span></p>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="author" label="作者" width="110" />
            <el-table-column label="时长" width="76">
              <template #default="{ row }"><span class="mono">{{ row.duration_seconds }}s</span></template>
            </el-table-column>
            <el-table-column label="可见性" width="90">
              <template #default="{ row }">
                <el-tag size="small" effect="plain">{{ visibilityLabel[row.visibility] || row.visibility }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="提交时间" width="120">
              <template #default="{ row }"><span class="mono">{{ fmtTime(row.created_at) }}</span></template>
            </el-table-column>
            <el-table-column label="操作" width="150" align="right">
              <template #default="{ row }">
                <el-button size="small" @click="openWork(row)">审核</el-button>
                <el-button size="small" type="success" plain @click="approveWork(row)">通过</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <div class="empty-box">
                <el-icon><CircleCheck /></el-icon>
                <b>{{ live.loading ? '正在加载实时审核队列' : '当前没有待审核作品' }}</b>
                <p>{{ live.loading ? '请稍候…' : '队列已清空，可稍后刷新。' }}</p>
              </div>
            </template>
          </el-table>
        </el-tab-pane>

        <el-tab-pane name="reports" lazy>
          <template #label>
            举报工单
            <el-badge v-if="openReports.length" :value="openReports.length" type="danger" class="tab-badge" />
          </template>
          <div class="toolbar">
            <el-input v-model="query" :prefix-icon="Search" placeholder="搜索对象、举报人或原因" clearable style="width: 260px" />
          </div>
          <el-table :data="reportList" size="small">
            <el-table-column label="被举报内容" min-width="200">
              <template #default="{ row }">
                <b style="font-weight: 550">{{ row.target_title || row.target_id }}</b>
                <p class="mono" style="margin: 2px 0 0">{{ row.target_type }} · {{ row.target_id }}</p>
              </template>
            </el-table-column>
            <el-table-column prop="reporter" label="举报人" width="110" />
            <el-table-column label="原因" min-width="180">
              <template #default="{ row }">
                <div>{{ row.reason }}</div>
                <div class="muted">{{ row.detail || '—' }}</div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="reportStatusMap[row.status]?.type" size="small">{{ reportStatusMap[row.status]?.label || row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="提交时间" width="120">
              <template #default="{ row }"><span class="mono">{{ fmtTime(row.created_at) }}</span></template>
            </el-table-column>
            <el-table-column label="操作" width="170" align="right">
              <template #default="{ row }">
                <el-button size="small" @click="openReport(row)">详情</el-button>
                <template v-if="row.status === 'open'">
                  <el-button size="small" type="danger" plain @click="decideReport(row, 'upheld')">成立</el-button>
                  <el-button size="small" @click="decideReport(row, 'dismissed')">驳回</el-button>
                </template>
              </template>
            </el-table-column>
            <template #empty>
              <div class="empty-box"><b>暂无举报工单</b><p>当前没有待处理举报。</p></div>
            </template>
          </el-table>
        </el-tab-pane>

        <el-tab-pane name="appeals" lazy>
          <template #label>
            申诉复核
            <el-badge v-if="openAppeals.length" :value="openAppeals.length" type="warning" class="tab-badge" />
          </template>
          <div class="toolbar">
            <el-input v-model="query" :prefix-icon="Search" placeholder="搜索作品、申诉人或理由" clearable style="width: 260px" />
          </div>
          <el-table :data="appealList" size="small">
            <el-table-column label="作品" min-width="200">
              <template #default="{ row }">
                <b style="font-weight: 550">{{ row.work_title || row.work_id }}</b>
                <p class="mono" style="margin: 2px 0 0">{{ row.work_id }}</p>
              </template>
            </el-table-column>
            <el-table-column prop="user_id" label="申诉人" width="140" />
            <el-table-column prop="reason" label="申诉理由" min-width="220" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="appealStatusMap[row.status]?.type" size="small">{{ appealStatusMap[row.status]?.label || row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="提交时间" width="120">
              <template #default="{ row }"><span class="mono">{{ fmtTime(row.created_at) }}</span></template>
            </el-table-column>
            <el-table-column label="操作" width="160" align="right">
              <template #default="{ row }">
                <el-button size="small" @click="openAppeal(row)">详情</el-button>
                <template v-if="row.status === 'open' || row.status === 'pending'">
                  <el-button size="small" type="success" plain @click="decideAppeal(row, 'accept')">通过</el-button>
                  <el-button size="small" type="danger" plain @click="decideAppeal(row, 'reject')">驳回</el-button>
                </template>
              </template>
            </el-table-column>
            <template #empty>
              <div class="empty-box"><b>暂无申诉工单</b><p>当前没有待处理申诉。</p></div>
            </template>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-drawer v-model="drawer.visible" :title="drawerTitle" size="480px">
      <template v-if="drawer.kind === 'work' && drawer.item">
        <div class="work-hero">
          <span class="cover" :class="'cover-' + coverFor(drawer.item.cover || drawer.item.id)" />
          <div>
            <h3>{{ drawer.item.title }}</h3>
            <p>{{ drawer.item.author }} · {{ drawer.item.genre || '未分类' }} · {{ drawer.item.duration_seconds }}s</p>
          </div>
        </div>
        <div class="detail-grid mt-14">
          <div class="detail-item"><span>作品 ID</span><b class="mono">{{ drawer.item.id }}</b></div>
          <div class="detail-item"><span>可见性</span><b>{{ visibilityLabel[drawer.item.visibility] || drawer.item.visibility }}</b></div>
          <div class="detail-item"><span>提交时间</span><b>{{ fmtTime(drawer.item.created_at) }}</b></div>
          <div class="detail-item"><span>当前状态</span><b>{{ workStatusMap[drawer.item.status]?.label || drawer.item.status }}</b></div>
        </div>
        <div class="detail-section mt-14">
          <h4>作品说明</h4>
          <div class="detail-text">{{ drawer.item.reason || drawer.item.description || '（作者未填写说明）' }}</div>
        </div>
        <div class="detail-section">
          <h4>审核处置</h4>
          <el-radio-group v-model="review.decision">
            <el-radio value="approve">通过并发布</el-radio>
            <el-radio value="reject">拒绝发布</el-radio>
          </el-radio-group>
          <el-input
            v-model="review.note"
            type="textarea"
            :rows="3"
            class="mt-14"
            placeholder="审核备注（拒绝时必填，将同步给作者）"
          />
        </div>
      </template>

      <template v-if="drawer.kind === 'report' && drawer.item">
        <div class="detail-grid">
          <div class="detail-item"><span>被举报内容</span><b>{{ drawer.item.target_title || drawer.item.target_id }}</b></div>
          <div class="detail-item"><span>对象 ID</span><b class="mono">{{ drawer.item.target_id }}</b></div>
          <div class="detail-item"><span>举报人</span><b>{{ drawer.item.reporter || '—' }}</b></div>
          <div class="detail-item"><span>提交时间</span><b>{{ fmtTime(drawer.item.created_at) }}</b></div>
        </div>
        <div class="detail-section mt-14">
          <h4>举报原因</h4>
          <div class="detail-text">{{ drawer.item.reason }}</div>
        </div>
        <div class="detail-section">
          <h4>补充说明</h4>
          <div class="detail-text">{{ drawer.item.detail || '—' }}</div>
        </div>
      </template>

      <template v-if="drawer.kind === 'appeal' && drawer.item">
        <div class="detail-grid">
          <div class="detail-item"><span>作品</span><b>{{ drawer.item.work_title || drawer.item.work_id }}</b></div>
          <div class="detail-item"><span>作品 ID</span><b class="mono">{{ drawer.item.work_id }}</b></div>
          <div class="detail-item"><span>申诉人</span><b class="mono">{{ drawer.item.user_id }}</b></div>
          <div class="detail-item"><span>提交时间</span><b>{{ fmtTime(drawer.item.created_at) }}</b></div>
        </div>
        <div class="detail-section mt-14">
          <h4>申诉理由</h4>
          <div class="detail-text">{{ drawer.item.reason || '—' }}</div>
        </div>
      </template>

      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 8px">
          <el-button @click="drawer.visible = false">取消</el-button>
          <template v-if="drawer.kind === 'work'">
            <el-button type="primary" @click="submitReview">提交处置</el-button>
          </template>
          <template v-else-if="drawer.kind === 'report' && drawer.item?.status === 'open'">
            <el-button @click="decideReport(drawer.item, 'dismissed')">驳回举报</el-button>
            <el-button type="danger" @click="decideReport(drawer.item, 'upheld')">成立并下架</el-button>
          </template>
          <template v-else-if="drawer.kind === 'appeal' && (drawer.item?.status === 'open' || drawer.item?.status === 'pending')">
            <el-button type="danger" plain @click="decideAppeal(drawer.item, 'reject')">维持原判</el-button>
            <el-button type="success" @click="decideAppeal(drawer.item, 'accept')">申诉通过</el-button>
          </template>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, CircleCheck } from '@element-plus/icons-vue'
import PageHeader from '../components/PageHeader.vue'
import api from '../api'
import { live, loadAll } from '../store/live'
import {
  appealStatusMap,
  coverFor,
  fmtTime,
  reportStatusMap,
  visibilityLabel,
  workStatusMap
} from '../utils/format'

const tab = ref('works')
const query = ref('')
const selection = ref([])
const drawer = reactive({ visible: false, kind: '', item: null })
const review = reactive({ decision: 'approve', note: '' })

const openReports = computed(() => live.reports.filter((r) => r.status === 'open'))
const openAppeals = computed(() => live.appeals.filter((a) => a.status === 'open' || a.status === 'pending'))

const workList = computed(() => {
  const q = query.value.trim().toLowerCase()
  return live.moderation.filter((w) => !q || (w.title + w.author + w.id + (w.genre || '')).toLowerCase().includes(q))
})
const reportList = computed(() => {
  const q = query.value.trim().toLowerCase()
  return live.reports.filter((r) => !q || ((r.target_title || '') + r.target_id + r.reporter + r.reason + r.id).toLowerCase().includes(q))
})
const appealList = computed(() => {
  const q = query.value.trim().toLowerCase()
  return live.appeals.filter((a) => !q || ((a.work_title || '') + a.user_id + a.reason + a.id).toLowerCase().includes(q))
})
const drawerTitle = computed(() => ({ work: '作品审核', report: '举报处置', appeal: '申诉复核' }[drawer.kind] || '详情'))

async function refresh() {
  await loadAll()
  ElMessage.success('队列已刷新')
}

function openWork(row) {
  drawer.kind = 'work'
  drawer.item = row
  review.decision = 'approve'
  review.note = ''
  drawer.visible = true
}

function openReport(row) {
  drawer.kind = 'report'
  drawer.item = row
  drawer.visible = true
}

function openAppeal(row) {
  drawer.kind = 'appeal'
  drawer.item = row
  drawer.visible = true
}

async function approveWork(row) {
  try {
    await ElMessageBox.confirm(`通过《${row.title}》并发布？`, '审核通过', {
      confirmButtonText: '通过并发布',
      cancelButtonText: '取消',
      type: 'success'
    })
  } catch (e) {
    return
  }
  await decideWork(row.id, 'approve', '人工复核通过')
}

async function submitReview() {
  if (review.decision === 'reject' && review.note.trim().length < 5) {
    ElMessage.warning('拒绝发布时请填写至少 5 个字的原因')
    return
  }
  await decideWork(drawer.item.id, review.decision, review.note.trim())
}

async function decideWork(id, decision, note) {
  try {
    await api.decideWork(id, decision, note)
    drawer.visible = false
    ElMessage.success(decision === 'approve' ? '审核通过' : '已拒绝发布')
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function batchDecision(decision) {
  const rows = selection.value
  if (!rows.length) return
  let reason = ''
  if (decision === 'reject') {
    try {
      const res = await ElMessageBox.prompt(`批量拒绝 ${rows.length} 首作品，请填写统一原因`, '批量拒绝', {
        inputType: 'textarea',
        inputValidator: (v) => (v && v.trim().length >= 5) || '请填写至少 5 个字的原因'
      })
      reason = res.value.trim()
    } catch (e) {
      return
    }
  } else {
    try {
      await ElMessageBox.confirm(`批量通过 ${rows.length} 首作品？`, '批量通过', { type: 'success' })
    } catch (e) {
      return
    }
  }
  try {
    await Promise.all(rows.map((row) => api.decideWork(row.id, decision, reason || '人工复核通过')))
    ElMessage.success(`已处理 ${rows.length} 条作品`)
    selection.value = []
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
    await loadAll()
  }
}

async function decideReport(row, decision) {
  const upheld = decision === 'upheld'
  try {
    await ElMessageBox.confirm(
      upheld ? `将对《${row.target_title || row.target_id}》执行下架，并通知作者。` : '驳回后作者内容不受影响。',
      upheld ? '举报成立并下架？' : '驳回该举报？',
      { confirmButtonText: upheld ? '成立并下架' : '驳回举报', type: upheld ? 'warning' : 'info' }
    )
  } catch (e) {
    return
  }
  try {
    await api.decideReport(row.id, decision)
    drawer.visible = false
    ElMessage.success(upheld ? '举报已成立' : '举报已驳回')
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function decideAppeal(row, decision) {
  let reason = ''
  const accept = decision === 'accept'
  try {
    if (accept) {
      await ElMessageBox.confirm('通过后作品将恢复发布，并重新进入广场与推荐。', '申诉通过？', {
        confirmButtonText: '申诉通过',
        type: 'success'
      })
    } else {
      const res = await ElMessageBox.prompt('请填写维持原判的原因', '维持原判', {
        confirmButtonText: '维持原判',
        inputType: 'textarea',
        inputValidator: (v) => (v && v.trim().length >= 5) || '请填写至少 5 个字的原因'
      })
      reason = res.value.trim()
    }
  } catch (e) {
    return
  }
  try {
    await api.decideAppeal(row.id, decision, reason)
    drawer.visible = false
    ElMessage.success(accept ? '申诉通过' : '已维持原判')
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  }
}
</script>

<style scoped>
.tab-badge {
  margin-left: 6px;
  vertical-align: middle;
}
.tab-badge :deep(.el-badge__content) {
  position: static;
  transform: none;
}
</style>
