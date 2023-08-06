type CountState = {
  count: number;
};

export const state = () => ({
  count: 0,
});

export const mutations = {
  increment(state: CountState) {
    state.count++;
  },
};

export const actions = {
  increment({ commit }: { commit: any }) {
    commit('increment');
  },
};
