export default defineNuxtConfig({
  modules: ['../src/module'],
  vuex: {
    typedStore: true,
  },
  devtools: { enabled: true },
});
