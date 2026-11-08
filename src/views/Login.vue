<template>
  <div class="login-page">
    <div class="login-glow one"></div>
    <div class="login-glow two"></div>

    <div class="login-wrap">
      <section class="login-brand">
        <div class="lb-logo">
          <span class="brand-mark">SH</span>
          <b>SONIC<span>HUB</span></b>
        </div>
        <h1>用 AI 写歌，<br />让运营更简单。</h1>
        <p>内容审核、创作者认证、推荐策略与积分账本，全部收在一个控制台里。</p>
        <ul class="lb-points">
          <li><el-icon><Checked /></el-icon>实时审核与双人复核</li>
          <li><el-icon><Coin /></el-icon>积分账本逐笔可追溯</li>
          <li><el-icon><Document /></el-icon>全量操作审计留痕</li>
        </ul>
        <div class="lb-foot">SONIC HUB ADMIN · v2.0</div>
      </section>

      <el-card class="login-card" shadow="never">
        <div class="lc-head">
          <p class="eyebrow">SIGN IN</p>
          <h2>登录运营后台</h2>
          <p>仅管理员账号可访问，演示环境使用短信验证码登录。</p>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" size="large" @submit.prevent="submit">
          <el-form-item label="手机号" prop="phone">
            <el-input v-model="form.phone" :prefix-icon="Phone" maxlength="11" placeholder="请输入 11 位手机号" />
          </el-form-item>
          <el-form-item label="验证码" prop="code">
            <el-input v-model="form.code" :prefix-icon="Key" maxlength="6" placeholder="演示验证码 1234" />
          </el-form-item>
          <el-button type="primary" class="login-btn" :loading="loading" @click="submit">
            进入控制台
          </el-button>
        </el-form>

        <div class="lc-demo">
          <span>演示账号</span>
          <button type="button" @click="fill('13800138000')">沈知 · 超级管理员</button>
          <button type="button" @click="fill('13900000010')">陆晓 · 审核员</button>
          <button type="button" @click="fill('13900000011')">周宁 · 运营</button>
          <p>手机号对应不同后台权限，验证码统一为 1234</p>
        </div>

        <div class="lc-foot">
          <span>API：{{ origin }}</span>
          <el-button text size="small" @click="settingsOpen = true">设置</el-button>
        </div>
      </el-card>
    </div>

    <el-dialog v-model="settingsOpen" title="API 地址" width="440px">
      <p class="dialog-desc">默认连接本机 SonicHub_api。修改后重新登录生效。</p>
      <el-input v-model="originInput" placeholder="http://127.0.0.1:8080" />
      <template #footer>
        <el-button @click="settingsOpen = false">取消</el-button>
        <el-button type="primary" @click="saveOrigin">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Phone, Key, Checked, Coin, Document } from '@element-plus/icons-vue'
import api from '../api'
import { auth, login } from '../store/auth'
import { loadAll } from '../store/live'

const route = useRoute()
const router = useRouter()
const formRef = ref()
const loading = ref(false)
const settingsOpen = ref(false)
const origin = ref(api.origin())
const originInput = ref(api.origin())

const form = reactive({ phone: '13800138000', code: '1234' })
const rules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '请输入 11 位手机号', trigger: 'blur' }
  ],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
}

function fill(phone) {
  form.phone = phone
  form.code = '1234'
}

function saveOrigin() {
  api.setOrigin(originInput.value)
  origin.value = api.origin()
  settingsOpen.value = false
  ElMessage.success('API 地址已更新')
}

async function submit() {
  if (loading.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    await login(form.phone.trim(), form.code.trim())
    await loadAll()
    ElMessage.success('登录成功，欢迎回来')
    router.replace(route.query.redirect || '/dashboard')
  } catch (e) {
    ElMessage.error(e.message || '登录失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (auth.user) router.replace('/dashboard')
})
</script>
