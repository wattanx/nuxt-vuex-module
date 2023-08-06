import { defineNuxtPlugin } from '#app';
// @ts-ignore virtual path
import { createVuexStore } from '#build/store.mjs';

export default defineNuxtPlugin((nuxtApp) => {
  const store = createVuexStore();
  nuxtApp.vueApp.use(store);

  if (process.server) {
    nuxtApp.payload.store = store.state;
  } else if (nuxtApp.payload && nuxtApp.payload.store) {
    store.replaceState(nuxtApp.payload.store);
  }

  return {
    provide: {
      store,
    },
  };
});
