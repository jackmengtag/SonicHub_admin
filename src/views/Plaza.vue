<template>
  <div class="page">
    <PageHeader
      title="广场运营"
      eyebrow="PLAZA OPS"
      desc="管理运营位、话题活动与实时榜单；运营位状态可手动切换上线或下线。"
      live
    >
      <template #actions>
        <el-button :icon="Refresh" :loading="live.loading" @click="refresh">刷新</el-button>
      </template>
    </PageHeader>

    <el-card>
      <el-tabs v-model="tab">
        <el-tab-pane label="运营位" name="placements">
          <div class="toolbar">
            <span class="muted">运营位保存后立即生效；状态可随时切换上线 / 下线</span>
            <span class="grow" />
            <el-button type="primary" :icon="Plus" @click="openPlacement(null)">新建运营位</el-button>
          </div>
          <el-table :data="live.placements" size="small">
            <el-table-column label="运营位" min-width="220">
              <template #default="{ row }">
                <div class="cell-main">
                  <span class="cover" :class="'cover-' + coverFor(row.work_cover || row.work_id || row.name)" />
                  <div>
                    <b>{{ row.name }}</b>
                    <p class="mono">{{ row.work_title || row.work_id || '未关联作品' }}</p>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="position" label="位置" width="150" />
            <el-table-column label="排期" width="190">
              <template #default="{ row }"><span class="mono">{{ row.schedule || '—' }}</span></template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="placementStatusMap[row.status]?.type" size="small">{{ placementStatusMap[row.status]?.label || row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="曝光" width="86" align="right">
              <template #default="{ row }"><span class="mono">{{ row.exposure ? compact(row.exposure) : '—' }}</span></template>
            </el-table-column>
            <el-table-column label="点击" width="86" align="right">
              <template #default="{ row }"><span class="mono">{{ row.clicks ? compact(row.clicks) : '—' }}</span></template>
            </el-table-column>
            <el-table-column prop="owner" label="负责人" width="120" />
            <el-table-column label="操作" width="150" align="right">
              <template #default="{ row }">
                <el-button size="small" @click="openPlacement(row)">编辑</el-button>
                <el-button size="small" type="warning" plain @click="togglePlacement(row)">
                  {{ row.status === 'online' ? '下线' : '上线' }}
                </el-button>
              </template>
            </el-table-column>
            <template #empty>
              <div class="empty-box"><b>{{ live.loading ? '正在加载运营位' : '暂无运营位' }}</b><p>{{ live.loading ? '请稍候…' : '点击右上角新建运营位。' }}</p></div>
            </template>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="话题活动" name="topics" lazy>
          <div class="toolbar">
            <span class="muted">话题上线后展示在广场；作品数与参与人数为运营录入数据</span>
            <span class="grow" />
            <el-button type="primary" :icon="Plus" @click="openTopic(null)">新建话题</el-button>
          </div>
          <el-table :data="live.topics" size="small">
            <el-table-column label="话题" min-width="220">
              <template #default="{ row }">
                <b style="font-weight: 550">{{ row.name }}</b>
                <p class="mono" style="margin: 2px 0 0">{{ row.id }}</p>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="规则说明" min-width="240" show-overflow-tooltip />
            <el-table-column label="作品" width="80" align="right">
              <template #default="{ row }"><span class="mono">{{ row.works_count }}</span></template>
            </el-table-column>
            <el-table-column label="参与" width="80" align="right">
              <template #default="{ row }"><span class="mono">{{ row.participants }}</span></template>
            </el-table-column>
            <el-table-column label="周期" width="190">
              <template #default="{ row }"><span class="mono">{{ row.schedule || '—' }}</span></template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="topicStatusMap[row.status]?.type" size="small">{{ topicStatusMap[row.status]?.label || row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150" align="right">
              <template #default="{ row }">
                <el-button size="small" @click="openTopic(row)">编辑</el-button>
                <el-button size="small" type="warning" plain @click="toggleTopic(row)">
                  {{ row.status === 'online' ? '下线' : '上线' }}
                </el-button>
              </template>
            </el-table-column>
            <template #empty>
              <div class="empty-box"><b>{{ live.loading ? '正在加载话题' : '暂无话题' }}</b><p>{{ live.loading ? '请稍候…' : '点击右上角新建话题。' }}</p></div>
            </template>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="榜单" name="rank" lazy>
          <div class="grid-2-1">
            <el-table :data="live.ranking" size="small">
              <el-table-column label="#" width="52">
                <template #default="{ row }"><span class="mono rank-no">{{ row.rank }}</span></template>
              </el-table-column>
              <el-table-column label="作品" min-width="230">
                <template #default="{ row }">
                  <div class="cell-main">
                    <span class="cover" :class="'cover-' + coverFor(row.cover || row.id)" />
                    <div>
                      <b>{{ row.title }}</b>
                      <p>{{ row.author }} · {{ row.genre || '未分类' }}</p>
                    </div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="播放" width="86" align="right">
                <template #default="{ row }"><span class="mono">{{ compact(row.play_count) }}</span></template>
              </el-table-column>
              <el-table-column label="点赞" width="86" align="right">
                <template #default="{ row }"><span class="mono">{{ compact(row.like_count) }}</span></template>
              </el-table-column>
              <el-table-column label="分享" width="86" align="right">
                <template #default="{ row }"><span class="mono">{{ compact(row.share_count) }}</span></template>
              </el-table-column>
              <el-table-column label="来源" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.is_pinned ? 'warning' : 'info'" size="small" effect="plain">{{ row.is_pinned ? '已置顶' : '自然' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="110" align="right">
                <template #default="{ row }">
                  <el-button size="small" @click="togglePin(row)">{{ row.is_pinned ? '取消置顶' : '置顶' }}</el-button>
                </template>
              </el-table-column>
              <template #empty>
                <div class="empty-box"><b>暂无榜单数据</b><p>需要至少一首已发布公开作品。</p></div>
              </template>
            </el-table>
            <div class="stack">
              <el-card>
                <div class="section-title"><div><h3>榜单口径</h3><p>当前排序规则</p></div><el-tag size="small" type="info">只读</el-tag></div>
                <div class="detail-grid">
                  <div class="detail-item"><span>排序字段</span><b>播放量</b></div>
                  <div class="detail-item"><span>次级排序</span><b>点赞量</b></div>
                  <div class="detail-item"><span>作品范围</span><b>已发布 + 公开</b></div>
                  <div class="detail-item"><span>取数条数</span><b>Top {{ live.ranking.length || 10 }}</b></div>
                </div>
                <p class="muted" style="margin-top: 12px">榜单由后端实时计算，不提供人工调权；置顶仅改变广场展示顺序，不影响榜单排名。</p>
              </el-card>
              <el-card>
                <div class="section-title"><div><h3>榜首作品</h3><p>当前周期最高播放</p></div></div>
                <div v-if="live.ranking[0]" class="cell-main">
                  <span class="cover" :class="'cover-' + coverFor(live.ranking[0].cover || live.ranking[0].id)" />
                  <div>
                    <b>{{ live.ranking[0].title }}</b>
                    <p>{{ live.ranking[0].author }} · 播放 {{ compact(live.ranking[0].play_count) }}</p>
                  </div>
                </div>
                <div v-else class="muted">暂无数据</div>
              </el-card>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="placementDialog.visible" :title="placementDialog.editing ? '编辑运营位' : '新建运营位'" width="560px">
      <el-form :model="placementDialog.form" label-position="top">
        <el-form-item label="运营位名称">
          <el-input v-model="placementDialog.form.name" placeholder="例如：新年第一首歌" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="位置">
              <el-select v-model="placementDialog.form.position">
                <el-option v-for="p in positions" :key="p" :label="p" :value="p" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select v-model="placementDialog.form.status">
                <el-option label="在线" value="online" />
                <el-option label="排期中" value="scheduled" />
                <el-option label="已下线" value="offline" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="关联作品">
              <el-select v-model="placementDialog.form.work_id" filterable clearable placeholder="不关联作品">
                <el-option v-for="w in live.works" :key="w.id" :label="`${w.title} · ${w.id}`" :value="w.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排期">
              <el-input v-model="placementDialog.form.schedule" placeholder="2026-11-10 ~ 2026-11-24" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="负责人">
          <el-input v-model="placementDialog.form.owner" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="placementDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="placementDialog.saving" @click="savePlacement">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="topicDialog.visible" :title="topicDialog.editing ? '编辑话题' : '新建话题'" width="540px">
      <el-form :model="topicDialog.form" label-position="top">
        <el-form-item label="话题名称">
          <el-input v-model="topicDialog.form.name" placeholder="以 # 开头，例如：#把冬天写成歌" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select v-model="topicDialog.form.status">
                <el-option label="进行中" value="online" />
                <el-option label="草稿" value="draft" />
                <el-option label="已结束" value="offline" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="周期">
              <el-input v-model="topicDialog.form.schedule" placeholder="2026-11-12 ~ 2026-11-26" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="规则说明">
          <el-input v-model="topicDialog.form.description" type="textarea" :rows="3" placeholder="参与方式、评选规则与奖励" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="topicDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="topicDialog.saving" @click="saveTopic">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Plus } from '@element-plus/icons-vue'
import PageHeader from '../components/PageHeader.vue'
import api from '../api'
import { live, loadAll } from '../store/live'
import { compact, coverFor, placementStatusMap, topicStatusMap } from '../utils/format'

const tab = ref('placements')
const positions = ['广场顶部 Banner', '推荐首页卡片', '广场次卡位']

const placementDialog = reactive({
  visible: false,
  editing: false,
  saving: false,
  form: { id: '', name: '', position: positions[0], work_id: '', schedule: '', status: 'scheduled', owner: '' }
})
const topicDialog = reactive({
  visible: false,
  editing: false,
  saving: false,
  form: { id: '', name: '', description: '', schedule: '', status: 'draft' }
})

async function refresh() {
  await loadAll()
  ElMessage.success('广场数据已刷新')
}

function openPlacement(row) {
  placementDialog.editing = !!row
  placementDialog.form = row
    ? { id: row.id, name: row.name, position: row.position, work_id: row.work_id, schedule: row.schedule, status: row.status, owner: row.owner }
    : { id: '', name: '', position: positions[0], work_id: '', schedule: '', status: 'scheduled', owner: '运营 · 周宁' }
  placementDialog.visible = true
}

async function savePlacement() {
  const f = placementDialog.form
  if (!f.name.trim()) {
    ElMessage.warning('请填写运营位名称')
    return
  }
  placementDialog.saving = true
  const body = { name: f.name.trim(), position: f.position, work_id: f.work_id || '', schedule: f.schedule.trim(), status: f.status, owner: f.owner.trim() }
  try {
    if (placementDialog.editing) await api.updatePlacement(f.id, body)
    else await api.createPlacement(body)
    placementDialog.visible = false
    ElMessage.success(placementDialog.editing ? '运营位已更新' : '运营位已创建')
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    placementDialog.saving = false
  }
}

async function togglePlacement(row) {
  const next = row.status === 'online' ? 'offline' : 'online'
  try {
    await api.updatePlacement(row.id, { name: row.name, position: row.position, work_id: row.work_id, schedule: row.schedule, status: next, owner: row.owner })
    ElMessage.success(next === 'online' ? '运营位已上线' : '运营位已下线')
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

function openTopic(row) {
  topicDialog.editing = !!row
  topicDialog.form = row
    ? { id: row.id, name: row.name, description: row.description, schedule: row.schedule, status: row.status }
    : { id: '', name: '', description: '', schedule: '', status: 'draft' }
  topicDialog.visible = true
}

async function saveTopic() {
  const f = topicDialog.form
  if (!f.name.trim()) {
    ElMessage.warning('请填写话题名称')
    return
  }
  topicDialog.saving = true
  const body = { name: f.name.trim(), description: f.description.trim(), schedule: f.schedule.trim(), status: f.status }
  try {
    if (topicDialog.editing) await api.updateTopic(f.id, body)
    else await api.createTopic(body)
    topicDialog.visible = false
    ElMessage.success(topicDialog.editing ? '话题已更新' : '话题已创建')
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    topicDialog.saving = false
  }
}

async function toggleTopic(row) {
  const next = row.status === 'online' ? 'offline' : 'online'
  try {
    await api.updateTopic(row.id, { name: row.name, description: row.description, schedule: row.schedule, status: next })
    ElMessage.success(next === 'online' ? '话题已上线' : '话题已下线')
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function togglePin(row) {
  try {
    await api.decideWorkAction(row.id, row.is_pinned ? 'unpin' : 'pin', row.is_pinned ? '取消广场置顶' : '广场置顶')
    ElMessage.success(row.is_pinned ? '已取消置顶' : '已置顶')
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  }
}
</script>

<style scoped>
.rank-no {
  color: var(--accent);
  font-weight: 600;
}
</style>
