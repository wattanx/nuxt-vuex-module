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

        const lines: string[] = [];

        // Section 1: Type imports
        for (const mod of modules) {
          lines.push(`import type * as ${mod.importAlias} from '${mod.importPath}';`);
        }
        lines.push('');

        // Section 2: Utility types
        lines.push('// Utility types for extracting Vuex module components');
        lines.push('type ResolveModule<M> = M extends { default: infer D } ? D : M;');
        lines.push('type StateOf<M> = M extends { state: infer S } ? S extends () => infer R ? R : S : {};');
        lines.push('type GettersOf<M> = M extends { getters: infer G } ? G : {};');
        lines.push('type MutationsOf<M> = M extends { mutations: infer Mu } ? Mu : {};');
        lines.push('type ActionsOf<M> = M extends { actions: infer A } ? A : {};');
        lines.push('type GetterReturnType<G> = G extends (...args: any[]) => infer R ? R : never;');
        lines.push('');

        // Section 3: Resolved module types
        for (const mod of modules) {
          lines.push(`type ${mod.typeAlias} = ResolveModule<typeof ${mod.importAlias}>;`);
        }
        lines.push('');

        // Section 4: RootState
        lines.push(`type RootState = ${genStateType(tree, '')};`);
        lines.push('');

        // Section 5: AllGetters
        const getterParts = modules.map((mod) => {
          const keyRemap = mod.prefix
            ? `K extends string ? \`${mod.prefix}\${K}\` : never`
            : 'K extends string ? K : never';
          return `{ [K in keyof GettersOf<${mod.typeAlias}> as ${keyRemap}]: GetterReturnType<GettersOf<${mod.typeAlias}>[K]> }`;
        });
        lines.push(`type AllGetters = ${getterParts.join(' &\n  ') || '{}'};`);
        lines.push('');

        // Section 5: AllMutations
        const mutationParts = modules.map((mod) => {
          const keyRemap = mod.prefix
            ? `K extends string ? \`${mod.prefix}\${K}\` : never`
            : 'K extends string ? K : never';
          return `{ [K in keyof MutationsOf<${mod.typeAlias}> as ${keyRemap}]: MutationsOf<${mod.typeAlias}>[K] }`;
        });
        lines.push(`type AllMutations = ${mutationParts.join(' &\n  ') || '{}'};`);
        lines.push('');

        // Section 5: AllActions
        const actionParts = modules.map((mod) => {
          const keyRemap = mod.prefix
            ? `K extends string ? \`${mod.prefix}\${K}\` : never`
            : 'K extends string ? K : never';
          return `{ [K in keyof ActionsOf<${mod.typeAlias}> as ${keyRemap}]: ActionsOf<${mod.typeAlias}>[K] }`;
        });
        lines.push(`type AllActions = ${actionParts.join(' &\n  ') || '{}'};`);
        lines.push('');

        // Section 6: TypedCommit / TypedDispatch
        // Use Parameters tuple check instead of function signature matching
        // to correctly distinguish functions with/without a payload parameter.
        // A 1-param function `(state) => void` matches `(state, payload: infer P) => any`
        // in TypeScript due to function assignability rules, so we use tuple extends instead.
        lines.push('type MutationPayloadArgs<F> = F extends (...args: any[]) => any ? Parameters<F> extends [any, infer P, ...any[]] ? [payload: P] : [] : [];');
        lines.push('type ActionPayloadArgs<F> = F extends (...args: any[]) => any ? Parameters<F> extends [any, infer P, ...any[]] ? [payload: P] : [] : [];');
        lines.push('');
        lines.push('interface TypedCommit {');
        lines.push('  <T extends keyof AllMutations>(');
        lines.push('    type: T,');
        lines.push('    ...args: MutationPayloadArgs<AllMutations[T]>');
        lines.push('  ): void;');
        lines.push('}');
        lines.push('');
        lines.push('interface TypedDispatch {');
        lines.push('  <T extends keyof AllActions>(');
        lines.push('    type: T,');
        lines.push('    ...args: ActionPayloadArgs<AllActions[T]>');
        lines.push('  ): Promise<any>;');
        lines.push('}');
        lines.push('');

        // Section 7: TypedStore and module augmentations
        lines.push('interface TypedStore {');
        lines.push('  readonly state: RootState;');
        lines.push('  readonly getters: AllGetters;');
        lines.push('  commit: TypedCommit;');
        lines.push('  dispatch: TypedDispatch;');
        lines.push('  replaceState(state: RootState): void;');
        lines.push("  install(app: import('vue').App): void;");
        lines.push('}');
        lines.push('');
        lines.push("declare module 'vuex' {");
        lines.push('  export function useStore(): TypedStore;');
        lines.push('}');
        lines.push('');
        lines.push("declare module '#app' {");
        lines.push('  interface NuxtApp {');
        lines.push('    $store: TypedStore;');
        lines.push('  }');
        lines.push('}');
        lines.push('');
        lines.push("declare module '@vue/runtime-core' {");
        lines.push('  interface ComponentCustomProperties {');
        lines.push('    $store: TypedStore;');
        lines.push('  }');
        lines.push('}');
        lines.push('');
        lines.push('export {};');

        return lines.join('\n');
      },
    });

    addPlugin(resolve('./runtime/plugin'));
  },
});
