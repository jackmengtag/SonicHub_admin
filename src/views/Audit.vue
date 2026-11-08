<template>
  <div class="page">
    <PageHeader
      title="审计日志"
      eyebrow="AUDIT TRAIL"
      desc="所有后台处置留痕，支持按操作人、动作与对象检索，并可查看原始载荷。"
      live
    >
      <template #actions>
        <el-button :icon="Refresh" :loading="live.loading" @click="refresh">刷新</el-button>
      </template>
    </PageHeader>

    <el-card>
      <div class="toolbar">
        <el-input v-model="query" :prefix-icon="Search" placeholder="搜索操作人、动作、对象或详情" clearable style="width: 280px" />
        <el-select v-model="type" style="width: 150px">
          <el-option label="全部类型" value="all" />
          <el-option label="审核处置" value="review" />
          <el-option label="运营配置" value="ops" />
          <el-option label="积分调账" value="credit" />
          <el-option label="用户处置" value="user" />
        </el-select>
        <span class="grow" />
        <span class="muted">共 {{ list.length }} 条记录</span>
      </div>

      <el-table :data="list" size="small">
        <el-table-column label="时间" width="118">
          <template #default="{ row }"><span class="mono">{{ fmtTime(row.created_at) }}</span></template>
        </el-table-column>
        <el-table-column label="操作人" width="150">
          <template #default="{ row }">
            <div class="cell-user">
              <el-avatar :size="24">{{ (row.actor_name || '系').slice(0, 1) }}</el-avatar>
              <div>
                <b>{{ row.actor_name || '系统' }}</b>
                <p class="mono" style="margin: 1px 0 0">{{ row.actor_id || '—' }}</p>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="动作" width="180">
          <template #default="{ row }">
            <b style="font-weight: 550">{{ auditActionLabel[row.action] || row.action }}</b>
            <p class="mono" style="margin: 2px 0 0">{{ row.action }}</p>
          </template>
        </el-table-column>
        <el-table-column label="对象" width="170">
          <template #default="{ row }">
            <div>{{ row.target_type || '—' }}</div>
            <p class="mono" style="margin: 2px 0 0">{{ row.target_id || '—' }}</p>
          </template>
        </el-table-column>
        <el-table-column prop="detail" label="详情" min-width="240" show-overflow-tooltip />
        <el-table-column label="操作" width="90" align="right">
          <template #default="{ row }">
            <el-button size="small" @click="open(row)">详情</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-box">
            <el-icon><Document /></el-icon>
            <b>{{ live.loading ? '正在加载审计日志' : '没有符合条件的日志' }}</b>
            <p>{{ live.loading ? '请稍候…' : '调整筛选条件后重试。' }}</p>
          </div>
        </template>
      </el-table>
      <div class="table-foot">
        <span>显示 <b class="mono">{{ list.length }}</b> / {{ live.auditLogs.length }} 条</span>
        <span class="muted">审计日志只读，由后端在处置事务内写入</span>
      </div>
    </el-card>

    <el-drawer v-model="drawerVisible" title="审计详情" size="540px">
      <template v-if="current">
        <div class="detail-grid">
          <div class="detail-item"><span>操作人</span><b>{{ current.actor_name || '系统' }}</b></div>
          <div class="detail-item"><span>操作人 ID</span><b class="mono">{{ current.actor_id || '—' }}</b></div>
          <div class="detail-item"><span>对象类型</span><b>{{ current.target_type || '—' }}</b></div>
          <div class="detail-item"><span>对象 ID</span><b class="mono">{{ current.target_id || '—' }}</b></div>
          <div class="detail-item"><span>动作</span><b>{{ auditActionLabel[current.action] || current.action }}</b></div>
          <div class="detail-item"><span>时间</span><b>{{ fmtTime(current.created_at) }}</b></div>
        </div>
        <div class="detail-section mt-14">
          <h4>详情</h4>
          <div class="detail-text">{{ current.detail || '该操作未记录附加详情' }}</div>
        </div>
        <div class="detail-section">
          <h4>原始载荷</h4>
          <pre class="pre-block">{{ payload }}</pre>
        </div>
        <el-alert type="info" :closable="false" show-icon title="审计日志只读，由后端在处置事务内写入。" />
      </template>
      <template #footer>
        <el-button @click="drawerVisible = false">关闭</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search, Document } from '@element-plus/icons-vue'
import PageHeader from '../components/PageHeader.vue'
import { live, loadAll } from '../store/live'
import { auditActionLabel, auditKind, fmtTime } from '../utils/format'

const query = ref('')
const type = ref('all')
const drawerVisible = ref(false)
const current = ref(null)

const list = computed(() => {
  const q = query.value.trim().toLowerCase()
  return live.auditLogs.filter((l) => {
    const okQ =
      !q ||
      (l.actor_name + l.action + l.target_id + l.detail + l.id).toLowerCase().includes(q)
    const okT = type.value === 'all' || auditKind(l.action) === type.value
    return okQ && okT
  })
})

const payload = computed(() =>
  current.value
    ? JSON.stringify(
        {
          id: current.value.id,
          actor_id: current.value.actor_id,
          action: current.value.action,
          target_type: current.value.target_type,
          target_id: current.value.target_id,
          detail: current.value.detail,
          created_at: current.value.created_at
        },
        null,
        2
      )
    : ''
)

async function refresh() {
  await loadAll()
  ElMessage.success('审计日志已刷新')
}

function open(row) {
  current.value = row
  drawerVisible.value = true
}
</script>
