<template>
  <el-container class="shell">
    <el-aside width="232px" class="side">
      <div class="brand">
        <span class="brand-mark">SH</span>
        <div class="brand-text">
          <b>SONIC<span>HUB</span></b>
          <p>运营控制台</p>
        </div>
      </div>

      <el-scrollbar class="menu-scroll">
        <el-menu :default-active="route.path" router class="side-menu">
          <p class="nav-group">概览</p>
          <el-menu-item index="/dashboard">
            <el-icon><Odometer /></el-icon><span>数据看板</span>
          </el-menu-item>

          <p class="nav-group">内容与创作者</p>
          <el-menu-item v-if="can('moderation.review')" index="/moderation">
            <el-icon><Checked /></el-icon><span>内容审核</span>
            <em v-if="moderationCount" class="menu-badge">{{ moderationCount }}</em>
          </el-menu-item>
          <el-menu-item v-if="can('creators.review')" index="/creators">
            <el-icon><Medal /></el-icon><span>音乐人认证</span>
            <em v-if="live.applications.length" class="menu-badge">{{ live.applications.length }}</em>
          </el-menu-item>
          <el-menu-item v-if="can('works.manage')" index="/works">
            <el-icon><Headset /></el-icon><span>作品管理</span>
          </el-menu-item>
          <el-menu-item v-if="can('users.manage')" index="/users">
            <el-icon><User /></el-icon><span>用户管理</span>
          </el-menu-item>

          <template v-if="can('recommend.publish') || can('plaza.manage') || can('messages.manage') || can('credits.manage')">
            <p class="nav-group">运营</p>
            <el-menu-item v-if="can('recommend.publish')" index="/recommend">
              <el-icon><TrendCharts /></el-icon><span>推荐配置</span>
            </el-menu-item>
            <el-menu-item v-if="can('plaza.manage')" index="/plaza">
              <el-icon><Grid /></el-icon><span>广场运营</span>
            </el-menu-item>
            <el-menu-item v-if="can('messages.manage')" index="/messages">
              <el-icon><Bell /></el-icon><span>消息运营</span>
            </el-menu-item>
            <el-menu-item v-if="can('credits.manage')" index="/credits">
              <el-icon><Coin /></el-icon><span>积分运营</span>
            </el-menu-item>
          </template>

          <template v-if="can('audit.view') || can('roles.manage')">
            <p class="nav-group">系统</p>
            <el-menu-item v-if="can('audit.view')" index="/audit">
              <el-icon><Document /></el-icon><span>审计日志</span>
            </el-menu-item>
            <el-menu-item v-if="can('roles.manage')" index="/permissions">
              <el-icon><Lock /></el-icon><span>角色权限</span>
            </el-menu-item>
          </template>
        </el-menu>
      </el-scrollbar>

      <div class="side-user">
        <el-avatar :size="34" class="user-avatar">{{ initial }}</el-avatar>
        <div class="su-main">
          <b>{{ auth.user?.display_name || '管理员' }}</b>
          <p>{{ auth.roleName || '后台成员' }}</p>
        </div>
        <el-tooltip content="退出登录" placement="top">
          <el-button text :icon="SwitchButton" class="logout-btn" @click="onLogout" />
        </el-tooltip>
      </div>
    </el-aside>

    <el-container class="body">
      <el-header class="topbar">
        <div class="tb-title">
          <span class="eyebrow">{{ route.meta.eyebrow }}</span>
          <h1>{{ route.meta.title }}</h1>
        </div>
        <div class="tb-actions">
          <span class="sync-state" :class="{ err: live.error }">
            <i></i>
            {{ live.error ? '同步异常' : live.loadedAt ? '已同步 ' + syncTime : '正在同步' }}
          </span>
          <el-button :icon="Refresh" :loading="live.loading" circle @click="refresh" />
          <el-dropdown trigger="click" @command="onCommand">
            <span class="tb-user">
              <el-avatar :size="26">{{ initial }}</el-avatar>
              <span>{{ auth.user?.display_name || '管理员' }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>{{ auth.user?.phone || '—' }}</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main">
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh, SwitchButton, ArrowDown } from '@element-plus/icons-vue'
import { auth, can, logout } from '../store/auth'
import { live, loadAll, resetLive } from '../store/live'
import { fmtTime } from '../utils/format'

const route = useRoute()
const router = useRouter()

const initial = computed(() => (auth.user?.display_name || '管').slice(0, 1))
const syncTime = computed(() => (live.loadedAt ? fmtTime(live.loadedAt) : '—'))
const moderationCount = computed(() => {
  const s = live.stats || {}
  const appeals = live.appeals.filter((a) => a.status === 'open' || a.status === 'pending').length
  return (s.pending || 0) + (s.reports || 0) + appeals
})

async function refresh() {
  await loadAll()
  if (live.error) ElMessage.warning('部分数据加载失败：' + live.error)
  else ElMessage.success('数据已刷新')
}

async function onLogout() {
  await logout()
  resetLive()
  router.replace('/login')
}

function onCommand(cmd) {
  if (cmd === 'logout') onLogout()
}

onMounted(() => {
  loadAll()
})
</script>
