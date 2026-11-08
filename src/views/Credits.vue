<template>
  <div class="page">
    <PageHeader
      title="积分运营"
      eyebrow="CREDIT OPS"
      desc="赠送、调账与退款双人复核；余额与账本同事务更新，可按用户追溯。"
      live
    >
      <template #actions>
        <el-button :icon="Refresh" :loading="live.loading" @click="refresh">刷新</el-button>
      </template>
    </PageHeader>

    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-label"><el-icon><Coin /></el-icon><span>流通积分</span></div>
        <div class="kpi-value">{{ numberText(summary.circulating) }}</div>
        <div class="kpi-foot">{{ summary.accounts || 0 }} 个积分账户</div>
      </div>
      <div class="kpi blue">
        <div class="kpi-label"><el-icon><Lock /></el-icon><span>冻结中</span></div>
        <div class="kpi-value">{{ numberText(summary.reserved) }}</div>
        <div class="kpi-foot">生成任务占用</div>
      </div>
      <div class="kpi gold">
        <div class="kpi-label"><el-icon><TrendCharts /></el-icon><span>今日消耗</span></div>
        <div class="kpi-value">{{ numberText(summary.consumed_today) }}</div>
        <div class="kpi-foot">今日账本负数合计</div>
      </div>
      <div class="kpi mint">
        <div class="kpi-label"><el-icon><Clock /></el-icon><span>待复核</span></div>
        <div class="kpi-value">{{ summary.pending_adjustments ?? 0 }}</div>
        <div class="kpi-foot">双人复核后生效</div>
      </div>
    </div>

    <div class="grid-2">
      <el-card>
        <div class="section-title">
          <div><h3>发起调账</h3><p>提交后进入复核队列，由其他管理员审批</p></div>
          <el-tag type="warning" size="small">双人复核</el-tag>
        </div>
        <el-form :model="form" label-position="top">
          <el-row :gutter="12">
            <el-col :span="14">
              <el-form-item label="用户">
                <el-select v-model="form.user_id" filterable placeholder="选择用户">
                  <el-option v-for="u in live.users" :key="u.id" :label="`${u.name} · ${u.id}`" :value="u.id" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="10">
              <el-form-item label="类型">
                <el-select v-model="form.kind">
                  <el-option v-for="k in kinds" :key="k" :label="k" :value="k" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="积分数量（正数增加 / 负数扣减）">
                <el-input-number v-model="form.amount" :step="50" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="复核方式">
                <el-input value="由其他管理员审批" disabled />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="原因（同步至审计日志）">
            <el-input v-model="form.reason" type="textarea" :rows="2" placeholder="填写工单号与补偿/扣减依据" />
          </el-form-item>
          <div style="display: flex; align-items: center; gap: 10px">
            <el-button type="primary" :icon="Promotion" :loading="submitting" @click="submit">提交复核</el-button>
            <span class="muted">申请人不能复核自己的单据；扣减时余额不足会被拒绝。</span>
          </div>
        </el-form>
      </el-card>

      <el-card>
        <div class="section-title"><div><h3>调账规则</h3><p>后端强约束，不可绕过</p></div></div>
        <div class="rule-list">
          <div class="rule-item">
            <span class="ri-ic"><el-icon><Lock /></el-icon></span>
            <div><b>申请人与复核人必须不同</b><p>服务端校验 requester_id ≠ reviewer_id，前端提示仅作辅助。</p></div>
          </div>
          <div class="rule-item">
            <span class="ri-ic"><el-icon><Coin /></el-icon></span>
            <div><b>扣减校验可用余额</b><p>可用积分不足时整笔失败，不会产生负余额。</p></div>
          </div>
          <div class="rule-item good">
            <span class="ri-ic"><el-icon><CircleCheck /></el-icon></span>
            <div><b>余额与账本同事务写入</b><p>每笔通过都会写入 credit_ledger，可用账本重建余额。</p></div>
          </div>
        </div>
      </el-card>
    </div>

    <el-card class="mt-14">
      <div class="section-title">
        <div><h3>调账审批队列</h3><p>共 {{ pendingCount }} 笔待复核 · 数据来自 admin/credits/adjustments</p></div>
      </div>
      <el-table :data="live.adjustments" size="small">
        <el-table-column label="工单" min-width="190">
          <template #default="{ row }">
            <b class="mono" style="color: var(--text-1)">{{ row.id }}</b>
            <p class="mono" style="margin: 2px 0 0">{{ fmtTime(row.created_at) }}</p>
          </template>
        </el-table-column>
        <el-table-column label="用户 / 类型" width="160">
          <template #default="{ row }">
            <b style="font-weight: 500">{{ row.user_name || row.user_id }}</b>
            <p class="muted" style="margin: 2px 0 0">{{ row.kind }}</p>
          </template>
        </el-table-column>
        <el-table-column label="积分" width="96" align="right">
          <template #default="{ row }">
            <span class="mono" :style="{ color: row.amount > 0 ? 'var(--mint)' : 'var(--danger)' }">
              {{ row.amount > 0 ? '+' : '' }}{{ numberText(row.amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="原因" min-width="220" show-overflow-tooltip />
        <el-table-column label="申请人 / 复核人" width="170">
          <template #default="{ row }">
            <div>{{ row.requester_name || row.requester_id }}</div>
            <p class="muted" style="margin: 2px 0 0">{{ row.reviewer_name ? '复核：' + row.reviewer_name : '待复核' }}</p>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="adjustmentStatusMap[row.status]?.type" size="small">{{ adjustmentStatusMap[row.status]?.label || row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="right">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <el-button size="small" type="success" plain @click="decide(row, 'approve')">复核通过</el-button>
              <el-button size="small" type="danger" plain @click="decide(row, 'reject')">驳回</el-button>
            </template>
            <span v-else class="muted">{{ row.reviewed_at ? fmtTime(row.reviewed_at) : '—' }}</span>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-box"><b>{{ live.loading ? '正在加载调账队列' : '暂无调账单据' }}</b><p>{{ live.loading ? '请稍候…' : '发起一笔调账后会出现在这里。' }}</p></div>
        </template>
      </el-table>
    </el-card>

    <el-card class="mt-14">
      <div class="section-title">
        <div><h3>积分账本</h3><p>最近 {{ live.ledger.length }} 笔变动 · 余额可由账本重建</p></div>
        <el-button size="small" :icon="Refresh" @click="refresh">刷新</el-button>
      </div>
      <el-table :data="live.ledger" size="small">
        <el-table-column label="时间" width="120">
          <template #default="{ row }"><span class="mono">{{ fmtTime(row.created_at) }}</span></template>
        </el-table-column>
        <el-table-column label="用户" width="130">
          <template #default="{ row }">{{ row.user_name || row.user_id || row.tenant_id }}</template>
        </el-table-column>
        <el-table-column prop="entry_type" label="类型" width="100" />
        <el-table-column label="变动" width="100" align="right">
          <template #default="{ row }">
            <span class="mono" :style="{ color: row.amount > 0 ? 'var(--mint)' : row.amount < 0 ? 'var(--danger)' : 'var(--text-3)' }">
              {{ row.amount > 0 ? '+' : '' }}{{ numberText(row.amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="余额" width="100" align="right">
          <template #default="{ row }"><span class="mono">{{ numberText(row.balance_after) }}</span></template>
        </el-table-column>
        <el-table-column label="关联" min-width="170">
          <template #default="{ row }"><span class="mono">{{ row.ref_id || row.id }}</span></template>
        </el-table-column>
        <el-table-column prop="ref_type" label="渠道" width="100" />
        <template #empty>
          <div class="empty-box"><b>暂无账本记录</b><p>用户注册赠送或积分变动后写入。</p></div>
        </template>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Coin, Lock, TrendCharts, Clock, Promotion, CircleCheck } from '@element-plus/icons-vue'
import PageHeader from '../components/PageHeader.vue'
import api from '../api'
import { live, loadAll } from '../store/live'
import { adjustmentStatusMap, fmtTime, numberText } from '../utils/format'

const kinds = ['客诉补偿', '活动赠送', '违规扣减', '退款']
const submitting = ref(false)
const form = reactive({ user_id: '', kind: kinds[0], amount: 200, reason: '' })

const summary = computed(() => live.creditSummary || {})
const pendingCount = computed(() => live.adjustments.filter((a) => a.status === 'pending').length)

async function refresh() {
  await loadAll()
  ElMessage.success('积分数据已刷新')
}

async function submit() {
  if (!form.user_id) {
    ElMessage.warning('请选择用户')
    return
  }
  if (!form.amount) {
    ElMessage.warning('积分数量不能为 0')
    return
  }
  if (form.reason.trim().length < 5) {
    ElMessage.warning('原因至少 5 个字，将同步到审计日志')
    return
  }
  submitting.value = true
  try {
    await api.createAdjustment({
      user_id: form.user_id,
      amount: form.amount,
      kind: form.kind,
      reason: form.reason.trim()
    })
    ElMessage.success('已提交复核，需由其他管理员审批')
    form.reason = ''
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}

async function decide(row, decision) {
  const approve = decision === 'approve'
  let reason = ''
  try {
    if (approve) {
      const res = await ElMessageBox.prompt('可填写复核意见（选填）', `复核通过 ${row.id}`, {
        confirmButtonText: '复核通过',
        inputPlaceholder: '选填',
        type: 'success'
      })
      reason = (res.value || '').trim()
    } else {
      const res = await ElMessageBox.prompt('请填写驳回意见（选填）', `驳回 ${row.id}`, {
        confirmButtonText: '驳回',
        inputPlaceholder: '选填',
        type: 'warning'
      })
      reason = (res.value || '').trim()
    }
  } catch (e) {
    return
  }
  try {
    await api.decideAdjustment(row.id, decision, reason)
    ElMessage.success(approve ? '复核通过，积分已生效' : '已驳回')
    await loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  }
}
</script>
