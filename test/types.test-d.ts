import { describe, it, expectTypeOf } from 'vitest';

// Replicate the generated utility types to test them in isolation
type ResolveModule<M> = M extends { default: infer D } ? D : M;
type StateOf<M> = M extends { state: infer S }
  ? S extends () => infer R
    ? R
    : S
  : {};
type GettersOf<M> = M extends { getters: infer G } ? G : {};
type MutationsOf<M> = M extends { mutations: infer Mu } ? Mu : {};
type ActionsOf<M> = M extends { actions: infer A } ? A : {};
type GetterReturnType<G> = G extends (...args: any[]) => infer R
  ? R
  : never;
type PayloadArgs<F> = F extends (...args: any[]) => any
  ? Parameters<F> extends [any, infer P, ...any[]]
    ? [payload: P]
    : []
  : [];

// Simulated store module types
type RootModule = typeof import('../playground/store/index');
type AccountModule = typeof import('../playground/store/account/index');
type SettingModule =
  typeof import('../playground/store/account/user/setting');

// Composed types (same logic as the generated .d.ts)
type _Root = ResolveModule<RootModule>;
type _Account = ResolveModule<AccountModule>;
type _Setting = ResolveModule<SettingModule>;

type RootState = StateOf<_Root> & {
  account: StateOf<_Account> & {
    user: {
      setting: StateOf<_Setting>;
    };
  };
};

type AllMutations = {
  [K in keyof MutationsOf<_Root> as K extends string ? K : never]: MutationsOf<_Root>[K];
} & {
  [K in keyof MutationsOf<_Account> as K extends string
    ? `account/${K}`
    : never]: MutationsOf<_Account>[K];
} & {
  [K in keyof MutationsOf<_Setting> as K extends string
    ? `account/user/setting/${K}`
    : never]: MutationsOf<_Setting>[K];
};

type AllActions = {
  [K in keyof ActionsOf<_Root> as K extends string ? K : never]: ActionsOf<_Root>[K];
} & {
  [K in keyof ActionsOf<_Account> as K extends string
    ? `account/${K}`
    : never]: ActionsOf<_Account>[K];
} & {
  [K in keyof ActionsOf<_Setting> as K extends string
    ? `account/user/setting/${K}`
    : never]: ActionsOf<_Setting>[K];
};

// --- Tests ---

describe('StateOf', () => {
  it('extracts return type from function state', () => {
    expectTypeOf<StateOf<_Root>>().toEqualTypeOf<{ count: number }>();
  });

  it('returns {} when module has no state export', () => {
    expectTypeOf<StateOf<{ mutations: {} }>>().toEqualTypeOf<{}>();
  });

  it('handles object state (non-function)', () => {
    type Mod = { state: { count: number } };
    expectTypeOf<StateOf<Mod>>().toEqualTypeOf<{ count: number }>();
  });
});

describe('RootState', () => {
  it('has root state properties', () => {
    expectTypeOf<RootState>().toHaveProperty('count');
    expectTypeOf<RootState['count']>().toBeNumber();
  });

  it('has nested module state', () => {
    expectTypeOf<RootState>().toHaveProperty('account');
    expectTypeOf<RootState['account']>().toHaveProperty('email');
    expectTypeOf<RootState['account']['email']>().toBeString();
  });

  it('has deeply nested module state', () => {
    expectTypeOf<RootState['account']['user']['setting']>().toHaveProperty(
      'name'
    );
    expectTypeOf<
      RootState['account']['user']['setting']['name']
    >().toBeString();
  });
});

describe('ResolveModule', () => {
  it('unwraps default export', () => {
    type Mod = { default: { state: () => { count: number } } };
    expectTypeOf<StateOf<ResolveModule<Mod>>>().toEqualTypeOf<{
      count: number;
    }>();
  });

  it('passes through when no default export', () => {
    type Mod = { state: () => { count: number } };
    expectTypeOf<StateOf<ResolveModule<Mod>>>().toEqualTypeOf<{
      count: number;
    }>();
  });
});

describe('GettersOf / GetterReturnType', () => {
  it('extracts getter return type', () => {
    type Mod = {
      getters: {
        double: (state: { count: number }) => number;
        label: (state: { count: number }) => string;
      };
    };
    type Getters = GettersOf<Mod>;
    expectTypeOf<GetterReturnType<Getters['double']>>().toBeNumber();
    expectTypeOf<GetterReturnType<Getters['label']>>().toBeString();
  });

  it('returns {} when module has no getters', () => {
    expectTypeOf<GettersOf<{ state: () => {} }>>().toEqualTypeOf<{}>();
  });
});

describe('PayloadArgs', () => {
  it('returns [] for mutations without payload', () => {
    type Fn = (state: { count: number }) => void;
    expectTypeOf<PayloadArgs<Fn>>().toEqualTypeOf<[]>();
  });

  it('returns [payload: P] for mutations with payload', () => {
    type Fn = (state: { email: string }, email: string) => void;
    expectTypeOf<PayloadArgs<Fn>>().toEqualTypeOf<[payload: string]>();
  });

  it('returns [] for actions without payload', () => {
    type Fn = (context: { commit: any }) => void;
    expectTypeOf<PayloadArgs<Fn>>().toEqualTypeOf<[]>();
  });

  it('returns [payload: P] for actions with payload', () => {
    type Fn = (context: { commit: any }, name: string) => void;
    expectTypeOf<PayloadArgs<Fn>>().toEqualTypeOf<[payload: string]>();
  });
});

describe('AllMutations', () => {
  it('has root mutation keys without prefix', () => {
    expectTypeOf<AllMutations>().toHaveProperty('increment');
  });

  it('has namespaced mutation keys with prefix', () => {
    expectTypeOf<AllMutations>().toHaveProperty('account/setEmail');
    expectTypeOf<AllMutations>().toHaveProperty(
      'account/user/setting/setName'
    );
  });
});

describe('AllActions', () => {
  it('has root action keys without prefix', () => {
    expectTypeOf<AllActions>().toHaveProperty('increment');
  });

  it('has namespaced action keys with prefix', () => {
    expectTypeOf<AllActions>().toHaveProperty('account/setEmail');
    expectTypeOf<AllActions>().toHaveProperty(
      'account/user/setting/setName'
    );
  });
});
