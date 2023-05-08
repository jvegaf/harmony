import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { Track } from 'src/shared/types/emusik'

export interface CollectionState {
  tracks: Track[]
}

const initialState: CollectionState = {
  tracks: [],
}

export const collectionSlice = createSlice({
  name: 'collection',
  initialState,
  reducers: {
    addTrack: (state, action: PayloadAction<Track>) => {
      state.tracks.push(action.payload)
    },
  },
})

// Action creators are generated for each case reducer function
export const { addTrack } = collectionSlice.actions

export default collectionSlice.reducer