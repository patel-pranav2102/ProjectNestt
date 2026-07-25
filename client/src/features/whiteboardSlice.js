import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  drawings: [],
  activeDrawing: null,
  loading: false,
  error: null,
};

const whiteboardSlice = createSlice({
  name: 'whiteboard',
  initialState,
  reducers: {
    setDrawings: (state, action) => {
      state.drawings = action.payload;
      state.loading = false;
      state.error = null;
    },
    setActiveDrawing: (state, action) => {
      state.activeDrawing = action.payload;
    },
    addDrawing: (state, action) => {
      state.drawings.unshift(action.payload);
    },
    removeDrawing: (state, action) => {
      state.drawings = state.drawings.filter(d => d._id !== action.payload);
      if (state.activeDrawing?._id === action.payload) {
        state.activeDrawing = state.drawings[0] || null;
      }
    },
    updateDrawingState: (state, action) => {
      state.drawings = state.drawings.map(d => d._id === action.payload._id ? action.payload : d);
      if (state.activeDrawing?._id === action.payload._id) {
        state.activeDrawing = action.payload;
      }
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearWhiteboardStore: (state) => {
      state.drawings = [];
      state.activeDrawing = null;
      state.loading = false;
      state.error = null;
    }
  },
});

export const {
  setDrawings,
  setActiveDrawing,
  addDrawing,
  removeDrawing,
  updateDrawingState,
  setLoading,
  setError,
  clearWhiteboardStore
} = whiteboardSlice.actions;

export default whiteboardSlice.reducer;
export const selectDrawings = (state) => state.whiteboard.drawings;
export const selectActiveDrawing = (state) => state.whiteboard.activeDrawing;
export const selectWhiteboardLoading = (state) => state.whiteboard.loading;
export const selectWhiteboardError = (state) => state.whiteboard.error;
