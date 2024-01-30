import { defineNuxtPlugin, useNuxtApp } from '#imports';

export default defineNuxtPlugin(() => {
  const { $store } = useNuxtApp();

  if (import.meta.server) {
    $store.dispatch('increment');
  }
});
