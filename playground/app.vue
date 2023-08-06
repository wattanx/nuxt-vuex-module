<script setup>
import { useNuxtApp } from '#imports';
import { useStore } from 'vuex';

const { $store } = useNuxtApp();
const store = useStore();
</script>

<template>
  <div>$store.state.count: {{ $store.state.count }}</div>
  <div>useStore().state.count: {{ store.state.count }}</div>
  <button @click="$store.dispatch('increment')">
    $store.dispatch('increment')
  </button>
</template>
