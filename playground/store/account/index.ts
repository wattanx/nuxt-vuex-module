export type AccountState = {
  email: string;
};

export const state = () => ({
  email: '',
});

export const mutations = {
  setEmail(state: AccountState, email: string) {
    state.email = email;
  },
};

export const actions = {
  setEmail({ commit }: { commit: any }, email: string) {
    commit('setEmail', email);
  },
};
