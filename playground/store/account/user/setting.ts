export type UserState = {
  name: string;
};

export const state = () => ({
  name: '',
});

export const mutations = {
  setName(state: UserState, name: string) {
    state.name = name;
  },
};

export const actions = {
  setName({ commit }: { commit: any }, name: string) {
    commit('setName', name);
  },
};
