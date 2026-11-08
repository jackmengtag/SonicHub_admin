<template>
  <div class="page">
    <PageHeader
      title="推荐配置"
      eyebrow="FEED POLICY"
      desc="权重与多样性参数来自 admin/feed-policy，发布后立即归档旧策略并生效；灰度与回滚暂未开放。"
      live
    >
      <template #actions>
        <el-input v-model="form.version" placeholder="新版本号" style="width: 210px" />
        <el-button @click="saveDraft">保存草稿</el-button>
        <el-button type="primary" :icon="Promotion" :loading="saving" @click="publish">发布策略</el-button>
      </template>
    </PageHeader>

    <div class="policy-banner" style="margin-bottom: 14px">
      <el-icon style="font-size: 24px; color: var(--accent)"><TrendCharts /></el-icon>
      <div class="pb-main">
        <b>当前生效：{{ live.policy?.version || '—' }}</b>
        <p>{{ live.policy ? '生效时间 ' + fmtTime(live.policy.effective_at) : '正在加载生效策略…' }}</p>
      </div>
      <span class="pb-tag">{{ live.policy ? 'ACTIVE' : '—' }}</span>
    </div>

    <div class="grid-2">
      <el-card>
        <div class="section-title">
          <div><h3>推荐权重</h3><p>与后端 weights 字段一致，合计需为 100%</p></div>
          <el-tag :type="total === 100 ? 'success' : 'danger'" effect="plain">{{ total }}%</el-tag>
        </div>
        <div v-for="item in weightDefs" :key="item.key" class="weight-row">
          <span>{{ item.label }}</span>
          <el-slider v-model="form.weights[item.key]" :max="60" :show-tooltip="false" />
          <el-input-number v-model="form.weights[item.key]" :min="0" :max="100" size="small" controls-position="right" />
        </div>
        <div class="weight-total" :class="{ err: total !== 100 }">
          <span>权重合计</span>
          <b>{{ total }}%</b>
        </div>
        <p class="muted" style="margin-top: 10px">发布后会立即归档旧策略并生效新版本，当前接口不支持灰度与回滚。</p>
      </el-card>

      <el-card>
        <div class="section-title">
          <div><h3>多样性与去重</h3><p>与后端 diversity 字段一致</p></div>
        </div>
        <div v-for="item in diversityDefs" :key="item.key" class="weight-row" style="grid-template-columns: 110px minmax(0, 1fr) 88px">
          <span>{{ item.label }}</span>
          <el-slider v-model="form.diversity[item.key]" :max="10" :show-tooltip="false" />
          <el-input-number v-model="form.diversity[item.key]" :min="0" :max="20" size="small" controls-position="right" />
        </div>
        <el-divider />
        <div class="rule-list">
          <div class="rule-item">
            <span class="ri-ic"><el-icon><Lock /></el-icon></span>
            <div><b>发布即生效</b><p>保存后旧策略状态变为 archive，新版本成为唯一 active 策略。</p></div>
          </div>
          <div class="rule-item good">
            <span class="ri-ic"><el-icon><Document /></el-icon></span>
            <div><b>变更留痕</b><p>每次发布会写入审计日志 feed_policy.publish。</p></div>
          </div>
        </div>
      </el-card>
    </div>

    <div class="grid-2 mt-14">
      <el-card>
        <div class="section-title">
          <div><h3>黑白名单</h3><p>名单写入 feed_lists，按类型与内容去重</p></div>
        </div>
        <h4 class="mini-title">黑名单</h4>
        <div class="list-tags">
          <el-tag
            v-for="item in blackItems"
            :key="item.id"
            type="danger"
            effect="plain"
            closable
            @close="removeListItem(item)"
          >{{ item.value }}</el-tag>
          <span v-if="!blackItems.length" class="muted">暂无黑名单</span>
        </div>
        <div class="add-row">
          <el-input v-model="newBlack" placeholder="输入作品 ID、词库或域名后回车" @keyup.enter="addListItem('black')" />
          <el-button :loading="addingBlack" @click="addListItem('black')">添加</el-button>
        </div>

        <h4 class="mini-title" style="margin-top: 16px">白名单</h4>
        <div class="list-tags">
          <el-tag
            v-for="item in whiteItems"
            :key="item.id"
            type="warning"
            effect="plain"
            closable
            @close="removeListItem(item)"
          >{{ item.value }}</el-tag>
          <span v-if="!whiteItems.length" class="muted">暂无白名单</span>
        </div>
        <div class="add-row">
          <el-input v-model="newWhite" placeholder="输入作品 ID 或标签后回车" @keyup.enter="addListItem('white')" />
          <el-button :loading="addingWhite" @click="addListItem('white')">添加</el-button>
        </div>
        <p class="muted" style="margin-top: 12px">名单变更立即写入后端并记录审计日志 feed_list.create / delete。</p>
      </el-card>

      <el-card>
        <div class="section-title">
          <div><h3>保底内容</h3><p>推荐流不足时按顺序兜底，仅支持已发布公开作品</p></div>
          <el-button size="small" type="primary" :icon="Plus" @click="openFallback">添加</el-button>
        </div>
        <div v-for="f in live.fallbacks" :key="f.id" class="fallback-row">
          <span class="cover" :class="'cover-' + coverFor(f.work_cover || f.work_id)" />
          <div class="fb-main">
            <b>{{ f.work_title || f.work_id }}</b>
            <p>{{ f.author || '—' }} · 顺序 {{ f.sort_order }}</p>
          </div>
          <el-button size="small" type="danger" text @click="removeFallback(f)">移除</el-button>
        </div>
        <div v-if="!live.fallbacks.length" class="muted">暂无保底内容，点击右上角添加。</div>
        <p class="muted" style="margin-top: 12px">保底内容存储在 feed_fallbacks，删除后立即生效。</p>
      </el-card>
    </div>

    <el-dialog v-model="fallbackDialog.visible" title="添加保底内容" width="480px">
      <el-form label-position="top">
        <el-form-item label="作品">
          <el-select v-model="fallbackDialog.workId" filterable placeholder="选择已发布且公开的作品" style="width: 100%">
            <el-option v-for="w in eligibleWorks" :key="w.id" :label="`${w.title} · ${w.id}`" :value="w.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <p class="muted">已发布且公开的作品才能进入保底位，重复添加会被拒绝。</p>
      <template #footer>
        <el-button @click="fallbackDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="fallbackDialog.saving" @click="saveFallback">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Promotion, TrendCharts, Lock, Document, Plus } from '@element-plus/icons-vue'
import PageHeader from '../components/PageHeader.vue'
import api from '../api'
import { live, loadAll } from '../store/live'
import { coverFor, fmtTime } from '../utils/format'

const weightDefs = [
  { key: 'completion', label: '完播率' },
  { key: 'like', label: '点赞' },
  { key: 'share', label: '分享' },
  { key: 'follow', label: '关注' }
]
const diversityDefs = [
  { key: 'author_gap', label: '同作者间隔' },
  { key: 'genre_cap', label: '同风格上限' },
  { key: 'new_artist', label: '新音乐人加权' }
]

function defaultVersion() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `v${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

const form = reactive({
  version: defaultVersion(),
  weights: { completion: 35, like: 25, share: 20, follow: 20 },
  diversity: { author_gap: 4, genre_cap: 3, new_artist: 1 }
})
const saving = ref(false)
const newBlack = ref('')
const newWhite = ref('')
const addingBlack = ref(false)
const addingWhite = ref(false)
const fallbackDialog = reactive({ visible: false, workId: '', saving: false })

const blackItems = computed(() => live.feedLists.items.filter((i) => i.list_type === 'black'))
const whiteItems = computed(() => live.feedLists.items.filter((i) => i.list_type === 'white'))
const total = computed(() => weightDefs.reduce((sum, item) => sum + Number(form.weights[item.key] || 0), 0))
const eligibleWorks = computed(() => {
  const used = new Set(live.fallbacks.map((f) => f.work_id))
  return live.works.filter((w) => w.status === 'published' && w.visibility === 'public' && !used.has(w.id))
})

watch(
  () => live.policy,
  (p) => {
    if (!p) return
    form.weights = { completion: 35, like: 25, share: 20, follow: 20, ...(p.weights || {}) }
    form.diversity = { author_gap: 4, genre_cap: 3, new_artist: 1, ...(p.diversity || {}) }
    form.version = defaultVersion()
  },
  { immediate: true }
)

async function addListItem(type) {
  const value = (type === 'black' ? newBlack : newWhite).value.trim()
  if (!value) {
    ElMessage.warning('请输入名单内容')
    return
  }
  const loading = type === 'black' ? addingBlack : addingWhite
  loading.value = true
  try {
    await api.addFeedList(type, value)
    if (type === 'black') newBlack.value = ''
    else newWhite.value = ''
    ElMessage.success(type === 'black' ? '已加入黑名单' : '已加入白名单')
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

async function removeListItem(item) {
  try {
    await api.deleteFeedList(item.id)
    ElMessage.success('已从名单移除')
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

function openFallback() {
  fallbackDialog.workId = ''
  fallbackDialog.visible = true
}

async function saveFallback() {
  if (!fallbackDialog.workId) {
    ElMessage.warning('请选择作品')
    return
  }
  fallbackDialog.saving = true
  try {
    await api.addFallback(fallbackDialog.workId)
    fallbackDialog.visible = false
    ElMessage.success('已添加保底内容')
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    fallbackDialog.saving = false
  }
}

async function removeFallback(row) {
  try {
    await api.deleteFallback(row.id)
    ElMessage.success('已移除保底内容')
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

function saveDraft() {
  ElMessage.info('草稿仅保存在本地，发布后才会生效')
}

async function publish() {
  if (total.value !== 100) {
    ElMessage.warning('权重合计必须为 100%，当前为 ' + total.value + '%')
    return
  }
  if (!form.version.trim()) {
    ElMessage.warning('请填写版本号')
    return
  }
  try {
    await ElMessageBox.confirm(`将立即归档当前策略并生效 ${form.version.trim()}，接口不支持灰度/回滚。`, '发布推荐策略', {
      confirmButtonText: '确认发布',
      type: 'warning'
    })
  } catch (e) {
    return
  }
  saving.value = true
  try {
    await api.savePolicy(form.version.trim(), form.weights, form.diversity)
    ElMessage.success('策略已发布')
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.mini-title {
  margin: 0 0 8px;
  font-size: 10.5px;
  font-weight: 500;
  color: var(--text-3);
}
.list-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  min-height: 24px;
}
.add-row {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.fallback-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--line);
}
.fallback-row:last-of-type {
  border-bottom: none;
}
.fb-main {
  flex: 1;
  min-width: 0;
}
.fb-main b {
  font-size: 11.5px;
  font-weight: 550;
}
.fb-main p {
  margin: 2px 0 0;
  font-size: 10px;
  color: var(--text-3);
}
</style>
