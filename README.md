<!--
Get your module up and running quickly.

Find and replace all on all files (CMD+SHIFT+F):
- Name: My Module
- Package name: my-module
- Description: My new Nuxt module
-->

# Nuxt Vuex Module

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]

In Nuxt 2, `store` directories were supported and it was easy to use vuex.

The `store` directory is not supported in Nuxt 3.

This module allows the `store` directory to be used in Nuxt 3, reducing the difficulty of migration to Nuxt 3.

:warning: Since Nuxt 3 recommends the use of Pinia, it is preferable to avoid the use of Vuex.

[✨ &nbsp;Release Notes](/CHANGELOG.md)

  <!-- - [🏀 Online playground](https://stackblitz.com/github/your-org/my-module?file=playground%2Fapp.vue) -->
  <!-- - [📖 &nbsp;Documentation](https://example.com) -->

## Quick Setup

You can install `@wattanx/nuxt-vuex` using `nuxi`:

```bash
npm install vuex
npx nuxi@latest module add @wattanx/nuxt-vuex
```

That's it! You can now use `@wattanx/nuxt-vuex` in your Nuxt app ✨

## Usage

See Nuxt 2 docs for basic usage.
https://v2.nuxt.com/docs/directory-structure/store/

`@wattanx/nuxt-vuex` does not support nuxtServerInit.

Instead, you can use the `server side plugin` or `middleware` with `useNuxtApp().$store`.

```typescript
export default defineNuxtPlugin(() => {
  const { $store } = useNuxtApp();

  if (process.server) {
    $store.dispatch('server/increment');
  }
});
```

## Typed Store (Opt-in)

You can enable automatic TypeScript type generation for your Vuex store. When enabled, `state`, `getters`, `commit`, and `dispatch` are fully typed based on your `store/` directory structure.

### Setup

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  vuex: {
    typedStore: true,
  },
});
```

### What gets typed

```typescript
const { $store } = useNuxtApp();

// State — fully typed with nested modules
$store.state.count;
$store.state.account.email;
$store.state.account.user.setting.name;

// Commit — mutation names are auto-completed, payloads are type-checked
$store.commit('increment');
$store.commit('account/setEmail', 'foo@bar.com');

// Dispatch — same type safety as commit
$store.dispatch('account/user/setting/setName', 'Alice');

// useStore() from vuex is also typed
const store = useStore();
store.state.count;
```

Optional payloads are also supported:

```typescript
// store/index.ts
export const mutations = {
  increment(state: State, value?: number) {
    state.count += value ?? 1;
  },
};

// Both are valid
$store.commit('increment');
$store.commit('increment', 5);
```

The [vuex-type-helper](https://github.com/ktsn/vuex-type-helper) pattern (`DefineMutations`, `DefineActions`) is also supported.

## Development

```bash
# Install dependencies
npm install

# Generate type stubs
npm run dev:prepare

# Develop with the playground
npm run dev

# Build the playground
npm run dev:build

# Run ESLint
npm run lint

# Run Vitest
npm run test
npm run test:watch

# Release new version
npm run release
```

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@wattanx/nuxt-vuex/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/@wattanx/nuxt-vuex
[npm-downloads-src]: https://img.shields.io/npm/dm/@wattanx/nuxt-vuex.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/@wattanx/nuxt-vuex
[license-src]: https://img.shields.io/npm/l/@wattanx/nuxt-vuex.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://npmjs.com/package/@wattanx/nuxt-vuex
