<template>
  <div class="page">
    <PageHeader
      title="数据看板"
      eyebrow="OVERVIEW"
      desc="待审核、举报、今日发布与用户数来自 admin/stats；趋势与关系指标为演示数据。"
      live
    >
      <template #actions>
        <el-button :icon="Refresh" :loading="live.loading" @click="refresh">刷新实时数据</el-button>
        <el-button v-if="can('moderation.review')" type="primary" :icon="Checked" @click="$router.push('/moderation')">进入审核队列</el-button>
      </template>
    </PageHeader>

    <el-alert
      v-if="live.error"
      type="error"
      :closable="false"
      show-icon
      :title="'实时接口连接失败：' + live.error"
      class="mt-14"
    />

    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-label"><el-icon><Checked /></el-icon><span>待审核作品</span></div>
        <div class="kpi-value">{{ stats.pending ?? '—' }}</div>
        <div class="kpi-foot">来自 admin/moderation 队列</div>
      </div>
      <div class="kpi gold">
        <div class="kpi-label"><el-icon><Warning /></el-icon><span>待处理举报</span></div>
        <div class="kpi-value">{{ stats.reports ?? '—' }}</div>
        <div class="kpi-foot">含未处置举报工单</div>
      </div>
      <div class="kpi mint">
        <div class="kpi-label"><el-icon><Promotion /></el-icon><span>今日发布</span></div>
        <div class="kpi-value">{{ stats.published_today ?? '—' }}</div>
        <div class="kpi-foot">今日通过审核并发布的作品</div>
      </div>
      <div class="kpi blue">
        <div class="kpi-label"><el-icon><User /></el-icon><span>用户总数</span></div>
        <div class="kpi-value">{{ stats.users ?? '—' }}</div>
        <div class="kpi-foot">含管理员与音乐人账号</div>
      </div>
    </div>

    <div class="grid-2-1">
      <el-card>
        <div class="section-title">
          <div>
            <h3>实时审核队列</h3>
            <p>处置后立即回写作品状态并刷新队列</p>
          </div>
          <el-button v-if="can('moderation.review')" text type="primary" @click="$router.push('/moderation')">查看全部</el-button>
        </div>
        <el-table :data="live.moderation.slice(0, 6)" size="small">
          <el-table-column label="作品" min-width="220">
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
          <el-table-column label="提交时间" width="120">
            <template #default="{ row }"><span class="mono">{{ fmtTime(row.created_at) }}</span></template>
          </el-table-column>
          <el-table-column label="操作" width="150" align="right">
            <template #default="{ row }">
              <el-button size="small" type="success" plain @click="approve(row)">通过</el-button>
              <el-button size="small" type="danger" plain @click="reject(row)">拒绝</el-button>
            </template>
          </el-table-column>
          <template #empty>
            <div class="empty-box">
              <el-icon><CircleCheck /></el-icon>
              <b>{{ !can('moderation.review') ? '当前角色无审核权限' : live.loading ? '正在加载审核队列' : '当前没有待审核作品' }}</b>
              <p>{{ !can('moderation.review') ? '如需审核内容，请联系超级管理员调整角色。' : live.loading ? '请稍候…' : '队列已清空，可稍后刷新。' }}</p>
            </div>
          </template>
        </el-table>
      </el-card>

      <div class="stack">
        <el-card>
          <div class="section-title">
            <div><h3>推荐策略</h3><p>来自 admin/feed-policy</p></div>
            <el-button v-if="can('recommend.publish')" text type="primary" @click="$router.push('/recommend')">配置</el-button>
          </div>
          <div class="policy-banner">
            <el-icon style="font-size: 22px; color: var(--accent)"><TrendCharts /></el-icon>
            <div class="pb-main">
              <b>策略 {{ live.policy?.version || '—' }}</b>
              <p>{{ live.policy ? '生效时间 ' + fmtTime(live.policy.effective_at) : '暂未获取到生效策略' }}</p>
            </div>
            <span class="pb-tag">{{ live.policy ? 'ACTIVE' : 'EMPTY' }}</span>
          </div>
          <div class="detail-grid" style="margin-top: 12px">
            <div v-for="item in weightItems" :key="item.key" class="detail-item">
              <span>{{ item.label }}</span>
              <b>{{ live.policy?.weights?.[item.key] ?? '—' }}%</b>
            </div>
          </div>
        </el-card>

        <el-card>
          <div class="section-title">
            <div><h3>内容供给趋势 <span class="demo-badge">演示数据</span></h3><p>趋势接口暂未接入</p></div>
          </div>
          <div class="bar-chart">
            <div v-for="bar in trend" :key="bar.label" class="bar-col">
              <div class="bar-track"><i :style="{ height: bar.value + '%' }" /></div>
              <span>{{ bar.label }}</span>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <el-card class="mt-14">
      <div class="section-title">
        <div><h3>审核效率与风格分布 <span class="demo-badge">演示数据</span></h3><p>近 7 天 · 后端暂未提供统计接口</p></div>
        <el-tag type="info">占位</el-tag>
      </div>
      <el-row :gutter="18">
        <el-col :span="12">
          <div v-for="item in reviewBars" :key="item.label" class="progress-row">
            <span>{{ item.label }}</span>
            <el-progress :percentage="item.value" :stroke-width="7" :show-text="false" />
            <b class="mono">{{ item.value }}%</b>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="tag-cloud">
            <el-tag v-for="g in genres" :key="g.name" :type="g.type" effect="plain" round>
              {{ g.name }} · {{ g.value }}%
            </el-tag>
          </div>
          <p class="muted" style="margin-top: 12px">风格分布用于界面占位，正式统计需新增聚合接口。</p>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Checked, Warning, Promotion, User, TrendCharts, CircleCheck } from '@element-plus/icons-vue'
import PageHeader from '../components/PageHeader.vue'
import api from '../api'
import { can } from '../store/auth'
import { live, loadAll } from '../store/live'
import { coverFor, compact, fmtTime } from '../utils/format'

const stats = computed(() => live.stats || {})
const weightItems = [
  { key: 'completion', label: '完播率' },
  { key: 'like', label: '点赞' },
  { key: 'share', label: '分享' },
  { key: 'follow', label: '关注' }
]
const trend = [
  { label: '11/01', value: 46 },
  { label: '11/02', value: 58 },
  { label: '11/03', value: 52 },
  { label: '11/04', value: 70 },
  { label: '11/05', value: 64 },
  { label: '11/06', value: 82 },
  { label: '11/07', value: 76 }
]
const reviewBars = [
  { label: '通过', value: 72 },
  { label: '拒绝', value: 18 },
  { label: '超时', value: 10 }
]
const genres = [
  { name: '电子', value: 28, type: 'warning' },
  { name: 'Lo-fi', value: 22, type: 'success' },
  { name: '国风', value: 18, type: 'info' },
  { name: '流行', value: 16, type: 'danger' },
  { name: '爵士', value: 9, type: 'warning' },
  { name: '其他', value: 7, type: 'info' }
]

async function refresh() {
  await loadAll()
  if (live.error) ElMessage.warning('部分数据加载失败：' + live.error)
  else ElMessage.success('数据已刷新')
}

async function approve(row) {
  try {
    await ElMessageBox.confirm(`通过《${row.title}》并发布？`, '审核通过', {
      confirmButtonText: '通过并发布',
      cancelButtonText: '取消',
      type: 'success'
    })
  } catch (e) {
    return
  }
  try {
    await api.decideWork(row.id, 'approve', '人工复核通过')
    ElMessage.success('审核通过')
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function reject(row) {
  let reason
  try {
    const res = await ElMessageBox.prompt('请填写拒绝原因，将同步给作者', '拒绝发布', {
      confirmButtonText: '拒绝发布',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputPlaceholder: '至少 5 个字，例如：封面含未授权素材',
      inputValidator: (v) => (v && v.trim().length >= 5) || '请填写至少 5 个字的原因'
    })
    reason = res.value
  } catch (e) {
    return
  }
  try {
    await api.decideWork(row.id, 'reject', reason.trim())
    ElMessage.success('已拒绝发布')
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  }
}
</script>

<style scoped>
.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  height: 132px;
  padding: 8px 4px 0;
}
.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  height: 100%;
}
.bar-track {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
  overflow: hidden;
}
.bar-track i {
  display: block;
  width: 100%;
  border-radius: 6px 6px 0 0;
  background: linear-gradient(180deg, rgba(255, 122, 69, 0.85), rgba(255, 122, 69, 0.25));
}
.bar-col span {
  font-size: 9px;
  color: var(--text-3);
  font-family: var(--font-mono);
}
.progress-row {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) 40px;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  font-size: 11px;
  color: var(--text-2);
}
.progress-row b {
  text-align: right;
  color: var(--text-3);
}
.tag-cloud {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
