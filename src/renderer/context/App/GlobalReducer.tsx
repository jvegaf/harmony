import { ADD_TRACKS } from '../types';

const GlobalReducer = (state, action) => {
  const { payload, type } = action;

  switch (type) {
    case ADD_TRACKS:
      return {
        ...state,
        tracks: payload,
      };

    default:
      return state;
  }
};

export default GlobalReducer;
