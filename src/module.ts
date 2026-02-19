import {
  defineNuxtModule,
  resolveFiles,
  addTemplate,
  addTypeTemplate,
  addPlugin,
  createResolver,
} from '@nuxt/kit';
import hash from 'hash-sum';
import { genImport, genObjectFromRawEntries } from 'knitwork';

// Module options TypeScript interface definition
export interface ModuleOptions {
  /**
   * Generate typed Vuex store declarations.
   * When enabled, `.nuxt/vuex-store.d.ts` is generated to provide
   * type-safe `state`, `getters`, `commit`, and `dispatch`.
   * @default false
   */
  typedStore?: boolean;
}

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

    // Generate type declarations for typed Vuex store
    if (!options.typedStore) {
      addPlugin(resolve('./runtime/plugin'));
      return;
    }

    addTypeTemplate({
      filename: 'vuex-store.d.ts',
      getContents() {
        // Compute metadata for each module
        type ModuleInfo = {
          id: string;
          filePath: string;
          namespaces: string[];
          importAlias: string;
          typeAlias: string;
          prefix: string;
          importPath: string;
        };

        const modules: ModuleInfo[] = _storeModules.map(({ filePath, id }) => {
          const namespaces = id === 'root' ? [] : id.split('/').filter(Boolean);
          const safeName = id === 'root' ? 'root' : namespaces.join('_');
          const importAlias = `__store_${safeName}`;
          const typeAlias = `_${safeName.split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('')}`;
          const prefix =
            id === 'root' ? '' : namespaces.join('/') + '/';
          const importPath = filePath.replace(/\.(ts|js)$/, '');
          return { id, filePath, namespaces, importAlias, typeAlias, prefix, importPath };
        });

        // Build module tree for nested state type
        type TreeNode = {
          __typeAlias: string | null;
          children: Record<string, TreeNode>;
        };

        const tree: TreeNode = { __typeAlias: null, children: {} };
        for (const mod of modules) {
          if (mod.id === 'root') {
            tree.__typeAlias = mod.typeAlias;
            continue;
          }
          let node: TreeNode = tree;
          for (const ns of mod.namespaces) {
            if (!node.children[ns]) {
              node.children[ns] = { __typeAlias: null, children: {} };
            }
            node = node.children[ns];
          }
          node.__typeAlias = mod.typeAlias;
        }

        // Recursively generate nested state type string
        function genStateType(node: TreeNode, indent: string): string {
          const parts: string[] = [];
          if (node.__typeAlias) {
            parts.push(`StateOf<${node.__typeAlias}>`);
          }
          const childKeys = Object.keys(node.children);
          if (childKeys.length > 0) {
            const entries = childKeys.map((key) => {
              return `${indent}  ${key}: ${genStateType(node.children[key]!, indent + '  ')}`;
            });
            parts.push(`{\n${entries.join(';\n')};\n${indent}}`);
          }
          return parts.length === 0 ? '{}' : parts.join(' & ');
        }

        // Generate mapped type with optional namespace prefix
        function genMappedType(extractor: string, modules: ModuleInfo[]): string {
          if (modules.length === 0) return '{}';
          return modules.map((mod) => {
            const keyRemap = mod.prefix
              ? `K extends string ? \`${mod.prefix}\${K}\` : never`
              : 'K extends string ? K : never';
            return `{ [K in keyof ${extractor}<${mod.typeAlias}> as ${keyRemap}]: ${extractor}<${mod.typeAlias}>[K] }`;
          }).join(' &\n  ');
        }

        // Generate getter mapped type (extracts return types)
        function genGetterMappedType(modules: ModuleInfo[]): string {
          if (modules.length === 0) return '{}';
          return modules.map((mod) => {
            const keyRemap = mod.prefix
              ? `K extends string ? \`${mod.prefix}\${K}\` : never`
              : 'K extends string ? K : never';
            return `{ [K in keyof GettersOf<${mod.typeAlias}> as ${keyRemap}]: GetterReturnType<GettersOf<${mod.typeAlias}>[K]> }`;
          }).join(' &\n  ');
        }

        const imports = modules
          .map((mod) => `import type * as ${mod.importAlias} from '${mod.importPath}';`)
          .join('\n');

        const resolvedTypes = modules
          .map((mod) => `type ${mod.typeAlias} = ResolveModule<typeof ${mod.importAlias}>;`)
          .join('\n');

        return `${imports}

// Utility types for extracting Vuex module components
type ResolveModule<M> = M extends { default: infer D } ? D : M;
type StateOf<M> = M extends { state: infer S } ? S extends () => infer R ? R : S : {};
type GettersOf<M> = M extends { getters: infer G } ? G : {};
type MutationsOf<M> = M extends { mutations: infer Mu } ? Mu : {};
type ActionsOf<M> = M extends { actions: infer A } ? A : {};
type GetterReturnType<G> = G extends (...args: any[]) => infer R ? R : never;

// Extract payload parameters (everything after the first param: state/context).
// void payloads (from vuex-type-helper) are normalized to [] so commit/dispatch can be called without arguments.
type Tail<T extends any[]> = T extends [any, ...infer R] ? R : [];
type PayloadArgs<F> = F extends (...args: any[]) => any ? void extends Parameters<F>[1] ? [] : Tail<Parameters<F>> : [];

${resolvedTypes}

type RootState = ${genStateType(tree, '')};

type AllGetters = ${genGetterMappedType(modules)};

type AllMutations = ${genMappedType('MutationsOf', modules)};

type AllActions = ${genMappedType('ActionsOf', modules)};

interface TypedCommit {
  <T extends keyof AllMutations>(
    type: T,
    ...args: PayloadArgs<AllMutations[T]>
  ): void;
}

interface TypedDispatch {
  <T extends keyof AllActions>(
    type: T,
    ...args: PayloadArgs<AllActions[T]>
  ): Promise<any>;
}

interface TypedStore {
  readonly state: RootState;
  readonly getters: AllGetters;
  commit: TypedCommit;
  dispatch: TypedDispatch;
  replaceState(state: RootState): void;
  install(app: import('vue').App): void;
}

declare module 'vuex' {
  export function useStore(): TypedStore;
}

declare module '#app' {
  interface NuxtApp {
    $store: TypedStore;
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $store: TypedStore;
  }
}

export {};`;
      },
    });

    addPlugin(resolve('./runtime/plugin'));
  },
});
