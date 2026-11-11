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
          <p>仅管理员账号可访问，请使用手机号接收短信验证码登录。</p>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" size="large" @submit.prevent="submit">
          <el-form-item label="手机号" prop="phone">
            <el-input v-model="form.phone" :prefix-icon="Phone" maxlength="11" placeholder="请输入 11 位手机号" />
          </el-form-item>
          <el-form-item label="验证码" prop="code">
            <el-input v-model="form.code" :prefix-icon="Key" maxlength="6" placeholder="请输入短信验证码">
              <template #append>
                <el-button
                  :disabled="countdown > 0"
                  :loading="sending"
                  @click="sendCode"
                >
                  {{ countdown > 0 ? countdown + 's 后重发' : '获取验证码' }}
                </el-button>
              </template>
            </el-input>
          </el-form-item>
          <el-button type="primary" class="login-btn" :loading="loading" @click="submit">
            进入控制台
          </el-button>
        </el-form>

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
import { onMounted, onUnmounted, reactive, ref } from 'vue'
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
const sending = ref(false)
const countdown = ref(0)
const settingsOpen = ref(false)
const origin = ref(api.origin())
const originInput = ref(api.origin())
let timer = null

const form = reactive({ phone: '', code: '' })
const rules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '请输入 11 位手机号', trigger: 'blur' }
  ],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
}

function startCountdown(seconds) {
  countdown.value = seconds
  clearInterval(timer)
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      countdown.value = 0
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

function smsErrorMessage(e) {
  const msg = (e && e.message) || ''
  if (/frequency/i.test(msg)) return '发送过于频繁，请稍后再试（同一手机号有发送频控）'
  if (/余额不足|AMOUNT_NOT_ENOUGH/i.test(msg)) return '短信账户余额不足，请联系管理员充值'
  if (/非法参数|INVALID_PARAMETERS/i.test(msg)) return '短信签名或模板配置不正确，请联系管理员'
  return msg || '验证码发送失败'
}

async function sendCode() {
  if (sending.value || countdown.value > 0) return
  const phoneValid = await formRef.value.validateField('phone').then(() => true).catch(() => false)
  if (!phoneValid) return
  sending.value = true
  try {
    const data = await api.sendSmsCode(form.phone.trim())
    if (data && data.demo) {
      ElMessage.warning(data.message || '当前为演示模式，未下发短信')
    } else {
      ElMessage.success('验证码已发送，请注意查收')
      startCountdown((data && data.interval_seconds) || 60)
    }
  } catch (e) {
    ElMessage.error(smsErrorMessage(e))
  } finally {
    sending.value = false
  }
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

onUnmounted(() => {
  clearInterval(timer)
  timer = null
})
</script>
