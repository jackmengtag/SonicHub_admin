<template>
  <div class="page">
    <PageHeader
      title="消息运营"
      eyebrow="MESSAGING"
      desc="公告、定向推送与模板管理；发送后写入目标用户通知与审计日志。"
      live
    >
      <template #actions>
        <el-button :icon="Refresh" :loading="live.loading" @click="refresh">刷新</el-button>
      </template>
    </PageHeader>

    <el-card>
      <el-tabs v-model="tab">
        <el-tab-pane label="公告 / 推送" name="announcements">
          <div class="grid-2-1">
            <el-card shadow="never" class="inner-card">
              <div class="section-title">
                <div><h3>新建公告 / 定向推送</h3><p>保存草稿后可再次发送；发送会立即写入目标用户通知</p></div>
                <el-tag type="warning" size="small">即时生效</el-tag>
              </div>
              <el-form :model="form" label-position="top">
                <el-row :gutter="12">
                  <el-col :span="12">
                    <el-form-item label="消息类型">
                      <el-select v-model="form.type">
                        <el-option label="公告" value="announcement" />
                        <el-option label="定向推送" value="push" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="目标人群">
                      <el-select v-model="form.audience">
                        <el-option :label="`全部用户 · ${live.users.length}`" value="all" />
                        <el-option :label="`音乐人 · ${creatorCount}`" value="creators" />
                        <el-option label="7 日未活跃" value="inactive" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-form-item label="标题">
                  <el-input v-model="form.title" maxlength="30" show-word-limit placeholder="不超过 30 字" />
                </el-form-item>
                <el-form-item label="正文">
                  <el-input v-model="form.body" type="textarea" :rows="3" maxlength="120" show-word-limit placeholder="不超过 120 字，支持 {nickname} 变量" />
                </el-form-item>
                <el-row :gutter="12">
                  <el-col :span="14">
                    <el-form-item label="跳转页面">
                      <el-select v-model="form.link">
                        <el-option label="不跳转" value="" />
                        <el-option label="积分中心" value="/credits" />
                        <el-option label="广场话题" value="/plaza" />
                        <el-option label="写歌页" value="/create" />
                        <el-option label="活动落地页" value="/activity" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="10">
                    <el-form-item label="推送">
                      <el-switch v-model="form.push" active-text="同时发送系统推送" />
                    </el-form-item>
                  </el-col>
                </el-row>
                <div style="display: flex; align-items: center; gap: 8px">
                  <el-button :loading="drafting" @click="saveDraft">保存草稿</el-button>
                  <el-button type="primary" :icon="Promotion" :loading="sending" @click="submitAndSend">提交并发送</el-button>
                  <span class="muted" style="margin-left: auto">预计触达 <b class="mono">{{ estimate }}</b> 人</span>
                </div>
              </el-form>
            </el-card>

            <el-card shadow="never" class="inner-card">
              <div class="section-title"><div><h3>实时预览</h3><p>站内消息卡片效果</p></div></div>
              <div class="phone-preview">
                <div class="phone-screen">
                  <div class="phone-status"><span>9:41</span><span>SonicHub</span><span>5G</span></div>
                  <div class="phone-msg">
                    <span class="pm-tag">公告</span>
                    <b>{{ form.title || '消息标题' }}</b>
                    <p>{{ form.body || '消息正文将在这里展示，建议控制在 60 字以内。' }}</p>
                    <div class="pm-link">{{ form.link ? '查看详情 ›' : '不跳转' }}</div>
                  </div>
                  <p class="preview-note">发送后可在“审计日志”查看 message.send 记录与触达人数。</p>
                </div>
              </div>
            </el-card>
          </div>

          <div class="section-title mt-14">
            <div><h3>发送记录</h3><p>公告与定向推送统一留痕</p></div>
          </div>
          <el-table :data="live.announcements" size="small">
            <el-table-column label="标题" min-width="220">
              <template #default="{ row }">
                <b style="font-weight: 550">{{ row.title }}</b>
                <p class="mono" style="margin: 2px 0 0">{{ row.id }}</p>
              </template>
            </el-table-column>
            <el-table-column label="人群" width="110">
              <template #default="{ row }">{{ audienceLabel[row.audience] || row.audience }}</template>
            </el-table-column>
            <el-table-column label="渠道" width="140">
              <template #default="{ row }">
                <el-tag v-for="c in row.channels" :key="c" size="small" effect="plain" style="margin-right: 4px">{{ c }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="announcementStatusMap[row.status]?.type" size="small">{{ announcementStatusMap[row.status]?.label || row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="时间" width="120">
              <template #default="{ row }"><span class="mono">{{ fmtTime(row.sent_at || row.created_at) }}</span></template>
            </el-table-column>
            <el-table-column prop="author" label="创建人" width="100" />
            <el-table-column label="操作" width="140" align="right">
              <template #default="{ row }">
                <el-button size="small" @click="viewAnnouncement(row)">查看</el-button>
                <el-button v-if="row.status === 'draft'" size="small" type="primary" plain @click="sendDraft(row)">发送</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <div class="empty-box"><b>{{ live.loading ? '正在加载公告' : '暂无发送记录' }}</b><p>{{ live.loading ? '请稍候…' : '创建第一条公告后展示在这里。' }}</p></div>
            </template>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="消息模板" name="templates" lazy>
          <div class="toolbar">
            <span class="muted">模板变量支持 {nickname}、{title}、{amount} 等占位符</span>
            <span class="grow" />
            <el-button type="primary" :icon="Plus" @click="openTemplate(null)">新建模板</el-button>
          </div>
          <el-table :data="live.templates" size="small">
            <el-table-column label="模板" min-width="200">
              <template #default="{ row }">
                <b style="font-weight: 550">{{ row.name }}</b>
                <p class="mono" style="margin: 2px 0 0">{{ row.id }}</p>
              </template>
            </el-table-column>
            <el-table-column prop="scene" label="场景" width="110" />
            <el-table-column prop="channel" label="渠道" width="120" />
            <el-table-column prop="content" label="内容" min-width="260" show-overflow-tooltip />
            <el-table-column label="更新时间" width="120">
              <template #default="{ row }"><span class="mono">{{ fmtTime(row.updated_at) }}</span></template>
            </el-table-column>
            <el-table-column label="启用" width="80">
              <template #default="{ row }">
                <el-switch :model-value="row.enabled" @change="toggleTemplate(row)" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="90" align="right">
              <template #default="{ row }">
                <el-button size="small" @click="openTemplate(row)">编辑</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <div class="empty-box"><b>{{ live.loading ? '正在加载模板' : '暂无模板' }}</b><p>{{ live.loading ? '请稍候…' : '点击右上角新建模板。' }}</p></div>
            </template>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="viewDialog.visible" :title="viewDialog.item?.title || '公告详情'" width="520px">
      <template v-if="viewDialog.item">
        <div class="detail-grid">
          <div class="detail-item"><span>人群</span><b>{{ audienceLabel[viewDialog.item.audience] || viewDialog.item.audience }}</b></div>
          <div class="detail-item"><span>状态</span><b>{{ announcementStatusMap[viewDialog.item.status]?.label || viewDialog.item.status }}</b></div>
          <div class="detail-item"><span>跳转</span><b class="mono">{{ viewDialog.item.link || '不跳转' }}</b></div>
          <div class="detail-item"><span>创建人</span><b>{{ viewDialog.item.author || '—' }}</b></div>
        </div>
        <div class="detail-section mt-14">
          <h4>正文</h4>
          <div class="detail-text">{{ viewDialog.item.body }}</div>
        </div>
        <p class="muted">创建时间 {{ fmtTime(viewDialog.item.created_at) }} · 发送时间 {{ fmtTime(viewDialog.item.sent_at) }}</p>
      </template>
      <template #footer>
        <el-button @click="viewDialog.visible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="tplDialog.visible" :title="tplDialog.editing ? '编辑模板' : '新建模板'" width="540px">
      <el-form :model="tplDialog.form" label-position="top">
        <el-row :gutter="12">
          <el-col :span="14">
            <el-form-item label="模板名称">
              <el-input v-model="tplDialog.form.name" placeholder="例如：生成完成通知" />
            </el-form-item>
          </el-col>
          <el-col :span="10">
            <el-form-item label="场景">
              <el-select v-model="tplDialog.form.scene">
                <el-option v-for="s in scenes" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="发送渠道">
          <el-select v-model="tplDialog.form.channel">
            <el-option v-for="c in channels" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="模板内容">
          <el-input v-model="tplDialog.form.content" type="textarea" :rows="3" placeholder="不超过 120 字" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="tplDialog.form.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="tplDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="tplDialog.saving" @click="saveTemplate">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Plus, Promotion } from '@element-plus/icons-vue'
import PageHeader from '../components/PageHeader.vue'
import api from '../api'
import { live, loadAll } from '../store/live'
import { announcementStatusMap, audienceLabel, fmtTime } from '../utils/format'

const tab = ref('announcements')
const drafting = ref(false)
const sending = ref(false)
const form = reactive({ type: 'announcement', audience: 'all', title: '', body: '', link: '', push: true })
const viewDialog = reactive({ visible: false, item: null })

const scenes = ['写歌完成', '内容审核', '认证审核', '积分变动', '增长召回']
const channels = ['站内', '站内 + 推送', '站内 + 短信']
const tplDialog = reactive({ visible: false, editing: false, saving: false, form: { id: '', name: '', scene: scenes[0], channel: channels[0], content: '', enabled: true } })

const creatorCount = computed(() => live.users.filter((u) => u.verified).length)
const estimate = computed(() => {
  if (form.audience === 'all') return live.users.length
  if (form.audience === 'creators') return creatorCount.value
  return '—'
})

function payload() {
  return {
    title: form.title.trim(),
    body: form.body.trim(),
    audience: form.audience,
    link: form.link,
    channels: form.push ? ['站内', '推送'] : ['站内']
  }
}

async function refresh() {
  await loadAll()
  ElMessage.success('消息数据已刷新')
}

async function saveDraft() {
  const body = payload()
  if (!body.title) {
    ElMessage.warning('请填写标题')
    return
  }
  drafting.value = true
  try {
    await api.createMessage(body)
    ElMessage.success('草稿已保存')
    form.title = ''
    form.body = ''
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    drafting.value = false
  }
}

async function submitAndSend() {
  const body = payload()
  if (!body.title || !body.body) {
    ElMessage.warning('标题与正文均不能为空')
    return
  }
  try {
    await ElMessageBox.confirm(`将向「${audienceLabel[body.audience]}」发送，发送后不可撤回。`, '发送公告', {
      confirmButtonText: '提交并发送',
      type: 'warning'
    })
  } catch (e) {
    return
  }
  sending.value = true
  try {
    const created = await api.createMessage(body)
    const res = await api.sendMessage(created.id)
    ElMessage.success(`公告已发送，触达 ${res.recipients} 位用户`)
    form.title = ''
    form.body = ''
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    sending.value = false
  }
}

function viewAnnouncement(row) {
  viewDialog.item = row
  viewDialog.visible = true
}

async function sendDraft(row) {
  try {
    await ElMessageBox.confirm(`向「${audienceLabel[row.audience] || row.audience}」发送该公告？`, '发送公告', { type: 'warning' })
  } catch (e) {
    return
  }
  try {
    const res = await api.sendMessage(row.id)
    ElMessage.success(`已发送，触达 ${res.recipients} 位用户`)
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

function openTemplate(row) {
  tplDialog.editing = !!row
  tplDialog.form = row
    ? { id: row.id, name: row.name, scene: row.scene, channel: row.channel, content: row.content, enabled: row.enabled }
    : { id: '', name: '', scene: scenes[0], channel: channels[0], content: '', enabled: true }
  tplDialog.visible = true
}

async function saveTemplate() {
  const f = tplDialog.form
  if (!f.name.trim() || !f.content.trim()) {
    ElMessage.warning('模板名称与内容均不能为空')
    return
  }
  tplDialog.saving = true
  const body = { name: f.name.trim(), scene: f.scene, channel: f.channel, content: f.content.trim(), enabled: f.enabled }
  try {
    if (tplDialog.editing) await api.updateTemplate(f.id, body)
    else await api.createTemplate(body)
    tplDialog.visible = false
    ElMessage.success(tplDialog.editing ? '模板已更新' : '模板已创建')
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    tplDialog.saving = false
  }
}

async function toggleTemplate(row) {
  try {
    await api.updateTemplate(row.id, {
      name: row.name,
      scene: row.scene,
      channel: row.channel,
      content: row.content,
      enabled: !row.enabled
    })
    ElMessage.success(!row.enabled ? '模板已启用' : '模板已停用')
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
    await loadAll()
  }
}
</script>

<style scoped>
.inner-card {
  background: rgba(255, 255, 255, 0.012);
}
</style>
