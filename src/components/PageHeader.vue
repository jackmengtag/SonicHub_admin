<template>
  <div class="page-head">
    <div class="ph-main">
      <p class="eyebrow">{{ eyebrow }}</p>
      <h1>
        {{ title }}
        <span v-if="live" class="live-badge"><i></i>实时数据</span>
        <span v-if="demo" class="demo-badge">演示数据</span>
      </h1>
      <p class="ph-desc">{{ desc }}</p>
    </div>
    <div class="ph-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  eyebrow: { type: String, default: '' },
  desc: { type: String, default: '' },
  live: { type: Boolean, default: false },
  demo: { type: Boolean, default: false }
})
</script>
