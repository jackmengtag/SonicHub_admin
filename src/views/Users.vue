<template>
  <div class="page">
    <PageHeader
      title="用户管理"
      eyebrow="ACCOUNT CONTROL"
      desc="查看用户资料与作品，执行警告、限制发布、封禁与解封；管理员账号受保护。"
      live
    >
      <template #actions>
        <el-button :icon="Refresh" :loading="live.loading" @click="refresh">刷新</el-button>
      </template>
    </PageHeader>

    <el-card>
      <div class="toolbar">
        <el-input v-model="query" :prefix-icon="Search" placeholder="搜索昵称、手机号或用户 ID" clearable style="width: 260px" />
        <el-select v-model="status" style="width: 150px">
          <el-option label="全部状态" value="all" />
          <el-option label="正常" value="active" />
          <el-option label="已警告" value="warned" />
          <el-option label="限制中" value="limited" />
          <el-option label="已封禁" value="banned" />
        </el-select>
        <span class="grow" />
        <span class="muted">共 {{ live.users.length }} 个账号</span>
      </div>

      <el-table :data="list" size="small">
        <el-table-column label="用户" min-width="230">
          <template #default="{ row }">
            <div class="cell-main">
              <el-avatar :size="32">{{ (row.name || '?').slice(0, 1) }}</el-avatar>
              <div>
                <b>{{ row.name }}</b>
                <p class="mono">{{ row.phone }} · {{ row.id }}</p>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="身份" width="140">
          <template #default="{ row }">
            <el-tag v-if="row.role !== 'user'" :type="row.role === 'admin' ? 'warning' : row.role === 'reviewer' ? 'success' : 'primary'" size="small">
              {{ roleLabel(row) }}
            </el-tag>
            <el-tag v-else-if="row.verified" type="success" size="small">音乐人</el-tag>
            <el-tag v-else size="small" type="info">用户</el-tag>
            <el-tag v-if="row.stage_name && row.stage_name !== row.name" size="small" effect="plain" style="margin-left: 5px">{{ row.stage_name }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="粉丝" width="80" align="right">
          <template #default="{ row }"><span class="mono">{{ compact(row.followers_count) }}</span></template>
        </el-table-column>
        <el-table-column label="作品" width="70" align="right">
          <template #default="{ row }"><span class="mono">{{ row.works_count }}</span></template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="userStatusMap[row.status]?.type" size="small">{{ userStatusMap[row.status]?.label || row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="120">
          <template #default="{ row }"><span class="mono">{{ fmtTime(row.created_at) }}</span></template>
        </el-table-column>
        <el-table-column label="操作" width="140" align="right">
          <template #default="{ row }">
            <el-button size="small" @click="open(row)">详情</el-button>
            <el-button v-if="row.role === 'user'" size="small" :type="row.status === 'banned' ? 'success' : 'warning'" plain @click="open(row)">
              {{ row.status === 'banned' ? '解封' : '处置' }}
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-box">
            <el-icon><User /></el-icon>
            <b>{{ live.loading ? '正在加载用户' : '没有符合条件的用户' }}</b>
            <p>{{ live.loading ? '请稍候…' : '调整筛选条件后重试。' }}</p>
          </div>
        </template>
      </el-table>
    </el-card>

    <el-drawer v-model="drawerVisible" title="用户详情" size="520px">
      <template v-if="user">
        <div class="work-hero">
          <el-avatar :size="56">{{ (user.name || '?').slice(0, 1) }}</el-avatar>
          <div>
            <h3>{{ user.name }}</h3>
            <p>{{ user.phone }} · {{ user.id }}</p>
          </div>
          <el-tag :type="userStatusMap[user.status]?.type" style="margin-left: auto">{{ userStatusMap[user.status]?.label || user.status }}</el-tag>
        </div>

        <div class="detail-grid mt-14">
          <div class="detail-item"><span>身份</span><b>{{ roleLabel(user) }}</b></div>
          <div class="detail-item"><span>认证</span><b>{{ user.verified ? '已认证' : '未认证' }}</b></div>
          <div class="detail-item"><span>粉丝</span><b>{{ compact(user.followers_count) }}</b></div>
          <div class="detail-item"><span>作品</span><b>{{ user.works_count }}</b></div>
          <div class="detail-item"><span>注册时间</span><b>{{ fmtTime(user.created_at) }}</b></div>
          <div class="detail-item"><span>艺名</span><b>{{ user.stage_name || '—' }}</b></div>
        </div>

        <div class="detail-section mt-14">
          <h4>简介</h4>
          <div class="detail-text">{{ user.bio || '—' }}</div>
        </div>

        <div class="detail-section">
          <h4>最近作品</h4>
          <el-table :data="detail.works || []" size="small">
            <el-table-column prop="title" label="作品" min-width="140" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="workStatusMap[row.status]?.type" size="small">{{ workStatusMap[row.status]?.label || row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="提交" width="112">
              <template #default="{ row }"><span class="mono">{{ fmtTime(row.created_at) }}</span></template>
            </el-table-column>
            <template #empty><span class="muted">暂无作品</span></template>
          </el-table>
        </div>

        <div class="detail-section">
          <h4>处置记录</h4>
          <el-timeline v-if="detail.dispositions?.length">
            <el-timeline-item
              v-for="d in detail.dispositions"
              :key="d.id"
              :timestamp="fmtTime(d.created_at)"
              placement="top"
            >
              <b style="font-size: 11.5px">{{ dispoLabel[d.action] || d.action }}</b>
              <p class="muted" style="margin: 3px 0 0">
                {{ d.reason || '无备注' }} · {{ d.operator_name || d.operator_id || '系统' }}
              </p>
            </el-timeline-item>
          </el-timeline>
          <div v-else class="muted">暂无处置记录</div>
        </div>

        <div class="detail-section">
          <h4>用户处置</h4>
          <div v-if="user.role !== 'user'" class="muted">后台成员账号不可在后台处置，请前往角色权限调整</div>
          <div v-else style="display: flex; gap: 8px; flex-wrap: wrap">
            <el-button v-if="user.status === 'banned'" type="success" @click="dispose('unban')">解封账号</el-button>
            <template v-else>
              <el-button @click="dispose('warn')">警告</el-button>
              <el-button @click="dispose('limit')">限制发布</el-button>
              <el-button type="danger" plain @click="dispose('ban')">封禁</el-button>
            </template>
          </div>
          <p class="muted" style="margin-top: 9px">
            处置会立即生效并通知用户；封禁会解除全部关注与朋友关系，记录写入审计日志。
          </p>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, User } from '@element-plus/icons-vue'
import PageHeader from '../components/PageHeader.vue'
import api from '../api'
import { live, loadAll } from '../store/live'
import { compact, dispoLabel, fmtTime, roleLabel, userStatusMap, workStatusMap } from '../utils/format'

const query = ref('')
const status = ref('all')
const drawerVisible = ref(false)
const user = ref(null)
const detail = reactive({ works: [], dispositions: [] })

const list = computed(() => {
  const q = query.value.trim().toLowerCase()
  return live.users.filter((u) => {
    const okQ = !q || (u.name + u.phone + u.id).toLowerCase().includes(q)
    const okS = status.value === 'all' || u.status === status.value
    return okQ && okS
  })
})

async function refresh() {
  await loadAll()
  ElMessage.success('用户列表已刷新')
}

async function open(row) {
  user.value = row
  detail.works = []
  detail.dispositions = []
  drawerVisible.value = true
  try {
    const d = await api.user(row.id)
    user.value = d.user || row
    detail.works = d.works || []
    detail.dispositions = d.dispositions || []
  } catch (e) {
    ElMessage.warning('用户详情加载失败：' + e.message)
  }
}

async function dispose(action) {
  const conf = {
    warn: ['警告用户', '发送站内警告并记录处置，账号状态变为已警告。'],
    limit: ['限制发布', '限制期内不可发布作品或评论，账号状态变为限制中。'],
    ban: ['封禁账号', '封禁会解除全部关注与朋友关系，账号不可登录。'],
    unban: ['解封账号', '恢复登录、发布与互动能力。']
  }[action]
  let reason
  try {
    const res = await ElMessageBox.prompt(conf[1], conf[0], {
      inputType: 'textarea',
      confirmButtonText: conf[0],
      type: action === 'ban' ? 'warning' : 'info',
      inputValidator: (v) => (v && v.trim().length >= 5) || '请填写至少 5 个字的原因'
    })
    reason = res.value.trim()
  } catch (e) {
    return
  }
  try {
    await api.decideUser(user.value.id, action, reason)
    ElMessage.success('账号状态已更新')
    await loadAll()
    user.value = live.users.find((u) => u.id === user.value.id) || user.value
  } catch (e) {
    ElMessage.error(e.message)
  }
}
</script>
