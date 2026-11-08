<template>
  <div class="page">
    <PageHeader
      title="作品管理"
      eyebrow="WORK LIBRARY"
      desc="检索全量作品，执行下架、恢复、置顶与删除；处置结果写入审计日志并通知作者。"
      live
    >
      <template #actions>
        <el-button :icon="Refresh" :loading="live.loading" @click="refresh">刷新</el-button>
      </template>
    </PageHeader>

    <el-card>
      <div class="toolbar">
        <el-input v-model="query" :prefix-icon="Search" placeholder="搜索作品、作者或 ID" clearable style="width: 250px" />
        <el-select v-model="status" style="width: 150px">
          <el-option label="全部状态" value="all" />
          <el-option label="已发布" value="published" />
          <el-option label="审核中" value="pending_review" />
          <el-option label="草稿" value="draft" />
          <el-option label="已拒绝" value="rejected" />
          <el-option label="已下架" value="removed" />
        </el-select>
        <el-select v-model="visibility" style="width: 140px">
          <el-option label="全部可见性" value="all" />
          <el-option label="公开" value="public" />
          <el-option label="朋友可见" value="friends" />
          <el-option label="私密" value="private" />
        </el-select>
        <span class="grow" />
        <template v-if="selection.length">
          <span class="muted">已选 {{ selection.length }} 条</span>
          <el-button size="small" type="danger" plain @click="batchUnpublish">批量下架</el-button>
        </template>
      </div>

      <el-table :data="list" size="small" @selection-change="(v) => (selection = v)">
        <el-table-column type="selection" width="40" />
        <el-table-column label="作品" min-width="240">
          <template #default="{ row }">
            <div class="cell-main">
              <span class="cover" :class="'cover-' + coverFor(row.cover || row.id)" />
              <div>
                <b>{{ row.title }}</b>
                <p>
                  <el-tag v-if="row.is_pinned" type="warning" size="small" effect="plain">置顶</el-tag>
                  <span class="mono">{{ row.id }}</span>
                  <span v-if="row.genre">· {{ row.genre }}</span>
                </p>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="author" label="作者" width="105" />
        <el-table-column label="状态" width="92">
          <template #default="{ row }">
            <el-tag :type="workStatusMap[row.status]?.type" size="small">{{ workStatusMap[row.status]?.label || row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="可见性" width="80">
          <template #default="{ row }"><el-tag size="small" effect="plain" type="info">{{ visibilityLabel[row.visibility] || row.visibility }}</el-tag></template>
        </el-table-column>
        <el-table-column label="播放" width="76" align="right">
          <template #default="{ row }"><span class="mono">{{ compact(row.play_count) }}</span></template>
        </el-table-column>
        <el-table-column label="点赞" width="76" align="right">
          <template #default="{ row }"><span class="mono">{{ compact(row.like_count) }}</span></template>
        </el-table-column>
        <el-table-column label="发布时间" width="118">
          <template #default="{ row }"><span class="mono">{{ fmtTime(row.published_at || row.created_at) }}</span></template>
        </el-table-column>
        <el-table-column label="操作" width="230" align="right">
          <template #default="{ row }">
            <el-button size="small" @click="open(row)">详情</el-button>
            <el-button v-if="row.status === 'removed' || row.status === 'rejected'" size="small" type="success" plain @click="restore(row)">恢复</el-button>
            <el-button v-else size="small" type="danger" plain @click="unpublish(row)">下架</el-button>
            <el-button size="small" @click="togglePin(row)">{{ row.is_pinned ? '取消置顶' : '置顶' }}</el-button>
            <el-button size="small" type="danger" text @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-box">
            <el-icon><Headset /></el-icon>
            <b>{{ live.loading ? '正在加载作品库' : '没有符合条件的作品' }}</b>
            <p>{{ live.loading ? '请稍候…' : '调整筛选条件后重试。' }}</p>
          </div>
        </template>
      </el-table>
      <div class="table-foot">
        <span>共 <b class="mono">{{ list.length }}</b> 条 · 全部 {{ live.works.length }} 条</span>
        <span class="muted">处置会立即生效</span>
      </div>
    </el-card>

    <el-drawer v-model="drawerVisible" title="作品详情" size="500px">
      <template v-if="detail">
        <div class="work-hero">
          <span class="cover" :class="'cover-' + coverFor(detail.cover || detail.id)" />
          <div>
            <h3>{{ detail.title }}</h3>
            <p>{{ detail.author }} · {{ detail.genre || '未分类' }} · {{ detail.duration_seconds }}s</p>
          </div>
        </div>
        <div class="detail-grid mt-14">
          <div class="detail-item"><span>作品 ID</span><b class="mono">{{ detail.id }}</b></div>
          <div class="detail-item"><span>状态</span><b>{{ workStatusMap[detail.status]?.label || detail.status }}</b></div>
          <div class="detail-item"><span>可见性</span><b>{{ visibilityLabel[detail.visibility] || detail.visibility }}</b></div>
          <div class="detail-item"><span>作者 ID</span><b class="mono">{{ detail.owner_id }}</b></div>
          <div class="detail-item"><span>播放 / 点赞</span><b>{{ compact(detail.play_count) }} / {{ compact(detail.like_count) }}</b></div>
          <div class="detail-item"><span>评论 / 分享</span><b>{{ compact(detail.comment_count) }} / {{ compact(detail.share_count) }}</b></div>
          <div class="detail-item"><span>发布时间</span><b>{{ fmtTime(detail.published_at) }}</b></div>
          <div class="detail-item"><span>提交时间</span><b>{{ fmtTime(detail.created_at) }}</b></div>
        </div>
        <div class="detail-section mt-14">
          <h4>作品说明</h4>
          <div class="detail-text">{{ detail.description || '（作者未填写说明）' }}</div>
        </div>
        <div class="detail-section">
          <h4>标签</h4>
          <div style="display: flex; gap: 6px; flex-wrap: wrap">
            <el-tag v-for="tag in detail.tags" :key="tag" size="small" effect="plain">{{ tag }}</el-tag>
            <span v-if="!detail.tags?.length" class="muted">无标签</span>
          </div>
        </div>
        <div v-if="detail.audio_url" class="detail-section">
          <h4>音频试听</h4>
          <audio :src="mediaUrl(detail.audio_url)" controls preload="none" style="width: 100%" />
        </div>
        <div class="detail-section">
          <h4>风险关联</h4>
          <div class="detail-grid">
            <div class="detail-item"><span>待处理举报</span><b>{{ extra.open_reports ?? 0 }}</b></div>
            <div class="detail-item"><span>待处理申诉</span><b>{{ extra.open_appeals ?? 0 }}</b></div>
          </div>
        </div>
        <div v-if="detail.reject_reason" class="detail-section">
          <h4>最近处置原因</h4>
          <div class="detail-text">{{ detail.reject_reason }}</div>
        </div>
      </template>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 8px">
          <el-button @click="drawerVisible = false">关闭</el-button>
          <template v-if="detail">
            <el-button v-if="detail.status === 'removed' || detail.status === 'rejected'" type="success" @click="restore(detail)">恢复发布</el-button>
            <el-button v-else type="danger" @click="unpublish(detail)">下架</el-button>
            <el-button @click="togglePin(detail)">{{ detail.is_pinned ? '取消置顶' : '置顶' }}</el-button>
            <el-button type="danger" plain @click="remove(detail)">删除</el-button>
          </template>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, Headset } from '@element-plus/icons-vue'
import PageHeader from '../components/PageHeader.vue'
import api from '../api'
import { live, loadAll } from '../store/live'
import { compact, coverFor, fmtTime, visibilityLabel, workStatusMap } from '../utils/format'

const query = ref('')
const status = ref('all')
const visibility = ref('all')
const selection = ref([])
const drawerVisible = ref(false)
const detail = ref(null)
const extra = ref({})

const mediaUrl = (u) => (!u ? '' : (/^https?:\/\//.test(u) ? u : api.origin() + u))

const list = computed(() => {
  const q = query.value.trim().toLowerCase()
  return live.works.filter((w) => {
    const okQ = !q || (w.title + w.author + w.id + (w.genre || '')).toLowerCase().includes(q)
    const okS = status.value === 'all' || w.status === status.value
    const okV = visibility.value === 'all' || w.visibility === visibility.value
    return okQ && okS && okV
  })
})

async function refresh() {
  await loadAll()
  ElMessage.success('作品库已刷新')
}

async function open(row) {
  detail.value = { ...row }
  extra.value = {}
  drawerVisible.value = true
  try {
    const d = await api.work(row.id)
    detail.value = d.work
    extra.value = { open_reports: d.open_reports, open_appeals: d.open_appeals }
  } catch (e) {
    ElMessage.warning('详情补充信息加载失败：' + e.message)
  }
}

async function act(id, action, reason) {
  try {
    await api.decideWorkAction(id, action, reason)
    drawerVisible.value = false
    ElMessage.success({ unpublish: '作品已下架', restore: '作品已恢复', pin: '已置顶', unpin: '已取消置顶', delete: '作品已删除' }[action] || '操作完成')
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function unpublish(row) {
  let reason
  try {
    const res = await ElMessageBox.prompt(`下架《${row.title}》后将从广场、推荐与搜索移除。`, '确认下架', {
      inputType: 'textarea',
      confirmButtonText: '下架作品',
      inputValidator: (v) => (v && v.trim().length >= 5) || '请填写至少 5 个字的下架原因'
    })
    reason = res.value.trim()
  } catch (e) {
    return
  }
  await act(row.id, 'unpublish', reason)
}

async function restore(row) {
  try {
    await ElMessageBox.confirm(`恢复《${row.title}》并立即重新发布？`, '恢复作品', { type: 'success' })
  } catch (e) {
    return
  }
  await act(row.id, 'restore', '管理员恢复发布')
}

async function togglePin(row) {
  await act(row.id, row.is_pinned ? 'unpin' : 'pin', row.is_pinned ? '取消广场置顶' : '广场置顶')
}

async function remove(row) {
  let reason
  try {
    const res = await ElMessageBox.prompt('删除后作品与互动记录不可恢复，仅保留审计日志。', '永久删除作品', {
      inputType: 'textarea',
      confirmButtonText: '永久删除',
      type: 'error',
      inputValidator: (v) => (v && v.trim().length >= 5) || '请填写至少 5 个字的删除原因'
    })
    reason = res.value.trim()
  } catch (e) {
    return
  }
  await act(row.id, 'delete', reason)
}

async function batchUnpublish() {
  const rows = selection.value
  if (!rows.length) return
  let reason
  try {
    const res = await ElMessageBox.prompt(`批量下架 ${rows.length} 首作品，请填写统一原因。`, '批量下架', {
      inputType: 'textarea',
      confirmButtonText: '批量下架',
      inputValidator: (v) => (v && v.trim().length >= 5) || '请填写至少 5 个字的原因'
    })
    reason = res.value.trim()
  } catch (e) {
    return
  }
  try {
    await Promise.all(rows.map((row) => api.decideWorkAction(row.id, 'unpublish', reason)))
    ElMessage.success(`已下架 ${rows.length} 首作品`)
    selection.value = []
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
    await loadAll()
  }
}
</script>
