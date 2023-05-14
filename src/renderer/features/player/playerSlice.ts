
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { Track } from 'shared/types/emusik';

// Define a type for the slice state
export interface PlayerState {
  trackPlaying: Track | null;
  isPlaying: boolean;
}

// Define the initial state using that type
const initialState: PlayerState = {
  trackPlaying: null,
  isPlaying: false
};

export const playerSlice = createSlice({
  name: 'player',
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    playTrack: (state, action: PayloadAction<Track>) => {
      state.trackPlaying = action.payload;
      state.isPlaying = true;
    },
    // Use the PayloadAction type to declare the contents of `action.payload`
  },
});

export const { playTrack } = playerSlice.actions;

export default playerSlice.reducer;