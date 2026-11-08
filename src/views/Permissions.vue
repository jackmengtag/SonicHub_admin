<template>
  <div class="page">
    <PageHeader
      title="角色权限"
      eyebrow="ACCESS CONTROL"
      desc="后台按角色控制菜单与接口权限；所有管理接口由服务端校验权限，管理员可调整成员角色。"
      live
    >
      <template #actions>
        <el-button :icon="Refresh" :loading="live.loading" @click="refresh">刷新</el-button>
      </template>
    </PageHeader>

    <el-alert
      v-if="live.rolesData"
      type="info"
      :closable="false"
      show-icon
      :title="`当前登录角色：${live.rolesData.my_role_name} · 拥有 ${live.rolesData.my_permissions.length} 项后台权限`"
      style="margin-bottom: 14px"
    />

    <div class="role-cards">
      <div v-for="r in staffRoles" :key="r.key" class="role-card">
        <div class="rc-head">
          <el-avatar :size="38" :class="'role-' + r.key">{{ r.name.slice(0, 1) }}</el-avatar>
          <div>
            <b>{{ r.name }}</b>
            <p>{{ r.key }}</p>
          </div>
          <el-tag size="small" effect="plain" style="margin-left: auto">{{ r.permissions.length }} 项权限</el-tag>
        </div>
        <p>{{ r.description }}</p>
        <div class="rc-tags">
          <el-tag v-for="p in r.permissions.slice(0, 4)" :key="p" size="small" effect="plain">{{ permName(p) }}</el-tag>
        </div>
      </div>
    </div>

    <el-card class="mt-14">
      <div class="section-title">
        <div><h3>权限矩阵</h3><p>能力与角色由后端 rbac 定义，接口按权限键校验；游客/登录用户/音乐人为前台身份，无后台权限</p></div>
        <el-tag size="small" type="info">实时</el-tag>
      </div>
      <el-table :data="matrixRows" size="small" border>
        <el-table-column prop="name" label="能力" min-width="200" fixed />
        <el-table-column v-for="col in baseCols" :key="col.key" :label="col.label" align="center" width="100">
          <template #default><span class="muted">—</span></template>
        </el-table-column>
        <el-table-column v-for="role in staffRoles" :key="role.key" :label="role.name" align="center" width="120">
          <template #default="{ row }">
            <el-icon v-if="allowed(role.key, row.key)" color="var(--mint)"><Check /></el-icon>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="mt-14">
      <div class="section-title">
        <div><h3>后台成员</h3><p>包含管理员、审核员与运营；角色调整后需重新登录生效</p></div>
      </div>
      <el-table :data="staffUsers" size="small">
        <el-table-column label="账号" min-width="220">
          <template #default="{ row }">
            <div class="cell-main">
              <el-avatar :size="30">{{ (row.name || '?').slice(0, 1) }}</el-avatar>
              <div>
                <b>{{ row.name }}</b>
                <p class="mono">{{ row.phone }} · {{ row.id }}</p>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="130">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'warning' : row.role === 'reviewer' ? 'success' : 'primary'" size="small">
              {{ roleNameOf(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="userStatusMap[row.status]?.type" size="small">{{ userStatusMap[row.status]?.label || row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="140">
          <template #default="{ row }"><span class="mono">{{ fmtTime(row.created_at) }}</span></template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="right">
          <template #default="{ row }">
            <el-button size="small" @click="openAssign(row)">调整角色</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-box"><b>暂无后台成员</b><p>请确认已执行演示数据初始化。</p></div>
        </template>
      </el-table>
    </el-card>

    <el-dialog v-model="assign.visible" title="调整后台角色" width="460px">
      <div v-if="assign.user" class="detail-grid" style="margin-bottom: 14px">
        <div class="detail-item"><span>账号</span><b>{{ assign.user.name }}</b></div>
        <div class="detail-item"><span>当前角色</span><b>{{ roleNameOf(assign.user.role) }}</b></div>
      </div>
      <el-form label-position="top">
        <el-form-item label="新角色">
          <el-select v-model="assign.role" style="width: 100%">
            <el-option v-for="r in (live.rolesData?.roles || [])" :key="r.key" :label="r.name" :value="r.key" />
          </el-select>
        </el-form-item>
      </el-form>
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        title="角色变更写入审计日志；当前登录账号不能修改自己的角色，至少保留一个超级管理员。"
      />
      <template #footer>
        <el-button @click="assign.visible = false">取消</el-button>
        <el-button type="primary" :loading="assign.saving" @click="saveAssign">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Check } from '@element-plus/icons-vue'
import PageHeader from '../components/PageHeader.vue'
import api from '../api'
import { live, loadAll } from '../store/live'
import { fmtTime, userStatusMap } from '../utils/format'

const baseCols = [
  { key: 'guest', label: '游客' },
  { key: 'user', label: '登录用户' },
  { key: 'musician', label: '音乐人' }
]
const assign = reactive({ visible: false, user: null, role: '', saving: false })

const staffRoles = computed(() => (live.rolesData?.roles || []).filter((r) => r.permissions.length > 0))
const matrixRows = computed(() => live.rolesData?.permissions || [])
const staffUsers = computed(() => live.users.filter((u) => u.role !== 'user'))

function permName(key) {
  const p = (live.rolesData?.permissions || []).find((x) => x.key === key)
  return p ? p.name : key
}

function roleNameOf(key) {
  const r = (live.rolesData?.roles || []).find((x) => x.key === key)
  return r ? r.name : key
}

function allowed(roleKey, permKey) {
  return !!(live.rolesData?.matrix?.[roleKey] || {})[permKey]
}

async function refresh() {
  await loadAll()
  ElMessage.success('权限数据已刷新')
}

function openAssign(row) {
  assign.user = row
  assign.role = row.role
  assign.visible = true
}

async function saveAssign() {
  if (!assign.user) return
  assign.saving = true
  try {
    await api.setUserRole(assign.user.id, assign.role)
    assign.visible = false
    ElMessage.success('角色已更新，成员需要重新登录后生效')
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    assign.saving = false
  }
}
</script>

<style scoped>
.role-admin {
  background: linear-gradient(135deg, rgba(255, 122, 69, 0.9), rgba(255, 179, 107, 0.75));
  color: #1a1009;
  font-weight: 700;
}
.role-reviewer {
  background: linear-gradient(135deg, rgba(61, 220, 151, 0.75), rgba(111, 214, 196, 0.65));
  color: #08130f;
  font-weight: 700;
}
.role-operator {
  background: linear-gradient(135deg, rgba(110, 168, 255, 0.8), rgba(122, 162, 255, 0.65));
  color: #08101f;
  font-weight: 700;
}
</style>
