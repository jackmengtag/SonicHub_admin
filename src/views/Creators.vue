<template>
  <div class="page">
    <PageHeader
      title="音乐人认证"
      eyebrow="CREATOR REVIEW"
      desc="核验艺名、风格与简介；通过后展示音乐人标识，处置结果写入审计日志。"
      live
    >
      <template #actions>
        <el-button :icon="Refresh" :loading="live.loading" @click="refresh">刷新</el-button>
      </template>
    </PageHeader>

    <div class="kpi-grid" style="grid-template-columns: repeat(3, minmax(0, 1fr))">
      <div class="kpi">
        <div class="kpi-label"><el-icon><Medal /></el-icon><span>待审申请</span></div>
        <div class="kpi-value">{{ live.applications.length }}</div>
        <div class="kpi-foot">来自 admin/applications</div>
      </div>
      <div class="kpi mint">
        <div class="kpi-label"><el-icon><CircleCheck /></el-icon><span>已认证音乐人</span></div>
        <div class="kpi-value">{{ live.users.filter((u) => u.verified).length }}</div>
        <div class="kpi-foot">认证状态为 verified</div>
      </div>
      <div class="kpi blue">
        <div class="kpi-label"><el-icon><User /></el-icon><span>用户总数</span></div>
        <div class="kpi-value">{{ live.users.length }}</div>
        <div class="kpi-foot">含管理员与普通用户</div>
      </div>
    </div>

    <el-card>
      <div class="toolbar">
        <el-input v-model="query" :prefix-icon="Search" placeholder="搜索艺名、申请人或简介" clearable style="width: 270px" />
        <span class="grow" />
        <span class="muted">拒绝时需填写原因，作者可修改资料后重新提交</span>
      </div>
      <el-table :data="list" size="small">
        <el-table-column label="申请人" min-width="210">
          <template #default="{ row }">
            <div class="cell-main">
              <el-avatar :size="32">{{ (row.author || '?').slice(0, 1) }}</el-avatar>
              <div>
                <b>{{ row.author }}</b>
                <p class="mono">{{ row.target_id }}</p>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="艺名" width="150">
          <template #default="{ row }"><el-tag type="warning" effect="plain">{{ row.title }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="reason" label="简介" min-width="260" show-overflow-tooltip />
        <el-table-column label="提交时间" width="120">
          <template #default="{ row }"><span class="mono">{{ fmtTime(row.created_at) }}</span></template>
        </el-table-column>
        <el-table-column label="操作" width="190" align="right">
          <template #default="{ row }">
            <el-button size="small" @click="open(row)">详情</el-button>
            <el-button size="small" type="success" plain @click="approve(row)">通过</el-button>
            <el-button size="small" type="danger" plain @click="reject(row)">拒绝</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-box">
            <el-icon><Medal /></el-icon>
            <b>{{ live.loading ? '正在加载认证申请' : '当前没有待审核认证' }}</b>
            <p>{{ live.loading ? '请稍候…' : '新的申请会自动进入该队列。' }}</p>
          </div>
        </template>
      </el-table>
    </el-card>

    <el-drawer v-model="drawerVisible" title="认证申请详情" size="460px">
      <template v-if="current">
        <div class="work-hero">
          <el-avatar :size="56">{{ (current.author || '?').slice(0, 1) }}</el-avatar>
          <div>
            <h3>{{ current.title }}</h3>
            <p>{{ current.author }} · {{ current.target_id }}</p>
          </div>
        </div>
        <div class="detail-grid mt-14">
          <div class="detail-item"><span>艺名</span><b>{{ current.title }}</b></div>
          <div class="detail-item"><span>申请人</span><b>{{ current.author }}</b></div>
          <div class="detail-item"><span>用户 ID</span><b class="mono">{{ current.target_id }}</b></div>
          <div class="detail-item"><span>提交时间</span><b>{{ fmtTime(current.created_at) }}</b></div>
        </div>
        <div class="detail-section mt-14">
          <h4>申请简介</h4>
          <div class="detail-text">{{ current.reason || '—' }}</div>
        </div>
        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="当前接口仅返回艺名、申请人与简介；实名材料与代表作需后续扩展字段。"
        />
      </template>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 8px">
          <el-button @click="drawerVisible = false">取消</el-button>
          <el-button type="danger" plain @click="reject(current)">拒绝</el-button>
          <el-button type="success" @click="approve(current)">通过认证</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, Medal, CircleCheck, User } from '@element-plus/icons-vue'
import PageHeader from '../components/PageHeader.vue'
import api from '../api'
import { live, loadAll } from '../store/live'
import { fmtTime } from '../utils/format'

const query = ref('')
const drawerVisible = ref(false)
const current = ref(null)

const list = computed(() => {
  const q = query.value.trim().toLowerCase()
  return live.applications.filter((a) => !q || ((a.author || '') + (a.title || '') + (a.reason || '')).toLowerCase().includes(q))
})

async function refresh() {
  await loadAll()
  ElMessage.success('认证队列已刷新')
}

function open(row) {
  current.value = row
  drawerVisible.value = true
}

async function approve(row) {
  if (!row) return
  try {
    await ElMessageBox.confirm(`通过「${row.author}」的音乐人认证？`, '通过认证', {
      confirmButtonText: '通过认证',
      type: 'success'
    })
  } catch (e) {
    return
  }
  try {
    await api.decideApplication(row.target_id || row.id, 'approve', '资料完整，审核通过')
    drawerVisible.value = false
    ElMessage.success('认证已通过')
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function reject(row) {
  if (!row) return
  let reason
  try {
    const res = await ElMessageBox.prompt('请填写拒绝原因，将通知申请人', '拒绝认证', {
      inputType: 'textarea',
      confirmButtonText: '拒绝认证',
      inputValidator: (v) => (v && v.trim().length >= 5) || '请填写至少 5 个字的原因'
    })
    reason = res.value.trim()
  } catch (e) {
    return
  }
  try {
    await api.decideApplication(row.target_id || row.id, 'reject', reason)
    drawerVisible.value = false
    ElMessage.success('认证已拒绝')
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  }
}
</script>
