import {
  defineNuxtModule,
  resolveFiles,
  addTemplate,
  addPlugin,
  createResolver,
} from '@nuxt/kit';
import hash from 'hash-sum';
import { genImport, genObjectFromRawEntries } from 'knitwork';

// Module options TypeScript interface definition
export interface ModuleOptions {}

type StoreModule = {
  filePath: string;
};

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@wattanx/nuxt-vuex',
    configKey: 'vuex',
  },
  async setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url);
    const storeModules: StoreModule[] = [];

    for (const config of nuxt.options._layers.map((layer) => layer.config)) {
      const storeFiles = (
        await resolveFiles(
          config.srcDir,
          `store/**/*{${nuxt.options.extensions.join(',')}}`
        )
      ).sort((p1, p2) => {
        let res = p1.split('/').length - p2.split('/').length;
        if (res === 0 && p1.includes('/index.')) {
          res = -1;
        } else if (res === 0 && p2.includes('/index.')) {
          res = 1;
        }
        return res;
      });

      for (const file of storeFiles) {
        storeModules.push({
          filePath: file,
        });
      }
    }

    const _storeModules = storeModules.map(({ filePath }) => ({
      filePath,
      id:
        filePath
          .replace(/.*\/store\//, '') // remove srcDir
          .replace(/\.(js|ts)$/, '')
          .replace(/[\\/]/g, '/')
          .replace(/index/, '') || 'root',
    }));

    addTemplate({
      filename: 'store.mjs',
      getContents() {
        return `import { createStore } from 'vuex'
${_storeModules
  .map((s) => genImport(s.filePath, { name: '*', as: `$${hash(s.id)}` }))
  .join('\n')}

const VUEX_PROPERTIES = ['state', 'getters', 'actions', 'mutations']

const storeModules = ${genObjectFromRawEntries(
          _storeModules.map((m) => [m.id, `$${hash(m.id)}`])
        )}

export function createVuexStore() {
  let store = normalizeRoot(storeModules.root || {})
  for (const id in storeModules) {
    if (id === 'root') { continue }
    resolveStoreModules(store, storeModules[id], id)
  }
  if (typeof store === 'function') {
    return store
  }
  return createStore(Object.assign({
    strict: (process.env.NODE_ENV !== 'production')
  }, store))
}

function normalizeRoot (moduleData, id) {
  moduleData = moduleData.default || moduleData
  if (moduleData.commit) {
    throw new Error(\`[nuxt] \${id} should export a method that returns a Vuex instance.\`)
  }
  if (typeof moduleData !== 'function') {
    // Avoid TypeError: setting a property that has only a getter when overwriting top level keys
    moduleData = { ...moduleData }
  }
  moduleData.modules = moduleData.modules || {}
  return moduleData
}

function resolveStoreModules (store, moduleData, id) {
  moduleData = moduleData.default || moduleData

  const namespaces = id.split('/').filter(Boolean)
  let moduleName = namespaces[namespaces.length - 1]

  // If src is a known Vuex property
  if (VUEX_PROPERTIES.includes(moduleName)) {
    const property = moduleName
    const propertyStoreModule = getStoreModule(store, namespaces, { isProperty: true })
    // Replace state since it's a function
    mergeProperty(propertyStoreModule, moduleData, property)
    return
  }

  const storeModule = getStoreModule(store, namespaces)

  for (const property of VUEX_PROPERTIES) {
    mergeProperty(storeModule, moduleData[property], property)
  }

  if (moduleData.namespaced === false) {
    delete storeModule.namespaced
  }
}


function getStoreModule (storeModule, namespaces, { isProperty = false } = {}) {
  // If ./mutations.js
  if (!namespaces.length || (isProperty && namespaces.length === 1)) {
    return storeModule
  }

  const namespace = namespaces.shift()

  storeModule.modules[namespace] = storeModule.modules[namespace] || {}
  storeModule.modules[namespace].namespaced = true
  storeModule.modules[namespace].modules = storeModule.modules[namespace].modules || {}

  return getStoreModule(storeModule.modules[namespace], namespaces, { isProperty })
}

function mergeProperty (storeModule, moduleData, property) {
  if (!moduleData) {
    return
  }
  if (property === 'state') {
    storeModule.state = moduleData || storeModule.state
  } else {
    storeModule[property] = { ...storeModule[property], ...moduleData }
  }
}`;
      },
    });

    addPlugin(resolve('./runtime/plugin'));
  },
});
