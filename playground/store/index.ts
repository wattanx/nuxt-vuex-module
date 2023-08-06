export type IndexState = {
  count: number;
};

export const state = () => ({
  count: 0,
});

export const mutations = {
  increment(state: IndexState) {
    state.count++;
  },
};

export const actions = {
  increment({ commit }: { commit: any }) {
    commit('increment');
  },
};
