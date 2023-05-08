import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';
import { Track } from 'shared/types/emusik';

// Define a type for the slice state
interface CollectionState {
  tracks: Track[];
}

// Define the initial state using that type
const initialState: CollectionState = {
  tracks: [],
};

export const collectionSlice = createSlice({
  name: 'tracks',
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    addNewTrack: (state, action: PayloadAction<Track>) => {
      state.tracks.push(action.payload);
    },
    // Use the PayloadAction type to declare the contents of `action.payload`
  },
});

export const { addNewTrack } = collectionSlice.actions;

// Other code such as selectors can use the imported `RootState` type
export const selectCollection = (state: RootState) => state.collection.tracks;

export default collectionSlice.reducer;