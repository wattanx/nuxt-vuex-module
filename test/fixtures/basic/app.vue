<template>
  <div>count: {{ $store.state.count }}</div>
  <div>server: {{ $store.state.server.count }}</div>
</template>

<script setup>
import { useNuxtApp } from '#imports';

const { $store } = useNuxtApp();
</script>
