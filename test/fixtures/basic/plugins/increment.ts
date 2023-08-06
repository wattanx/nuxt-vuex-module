import { defineNuxtPlugin, useNuxtApp } from '#imports';

export default defineNuxtPlugin(() => {
  const { $store } = useNuxtApp();

  if (process.server) {
    $store.dispatch('server/increment');
  }
});
