import MyModule from '../../../src/module';

export default defineNuxtConfig({
  modules: [MyModule],
  vuex: {
    typedStore: true,
  },
});
