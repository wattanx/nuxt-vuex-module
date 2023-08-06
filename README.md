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

1. Add `@wattanx/nuxt-vuex` dependency to your project

```bash
# Using pnpm
pnpm add -D @wattanx/nuxt-vuex

# Using yarn
yarn add --dev @wattanx/nuxt-vuex

# Using npm
npm install --save-dev @wattanx/nuxt-vuex
```

2. Add `@wattanx/nuxt-vuex` to the `modules` section of `nuxt.config.ts`

```js
export default defineNuxtConfig({
  modules: ['@wattanx/nuxt-vuex'],
});
```

That's it! You can now use My Module in your Nuxt app ✨

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
