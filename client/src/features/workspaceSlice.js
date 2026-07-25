import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  workspaces: [],
  activeWorkspace: null,
  stats: null,
  loading: false,
  error: null,
};

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setWorkspaces: (state, action) => {
      state.workspaces = action.payload;
      state.loading = false;
      state.error = null;
    },
    setActiveWorkspace: (state, action) => {
      state.activeWorkspace = action.payload;
    },
    addWorkspace: (state, action) => {
      state.workspaces.unshift(action.payload);
    },
    removeWorkspace: (state, action) => {
      state.workspaces = state.workspaces.filter(ws => ws._id !== action.payload);
      if (state.activeWorkspace?._id === action.payload) {
        state.activeWorkspace = state.workspaces[0] || null;
      }
    },
    setWorkspaceStats: (state, action) => {
      state.stats = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearWorkspaces: (state) => {
      state.workspaces = [];
      state.activeWorkspace = null;
      state.stats = null;
      state.loading = false;
      state.error = null;
    }
  },
});

export const { 
  setWorkspaces, 
  setActiveWorkspace, 
  addWorkspace, 
  removeWorkspace, 
  setWorkspaceStats,
  setLoading, 
  setError,
  clearWorkspaces 
} = workspaceSlice.actions;

export default workspaceSlice.reducer;
export const selectWorkspaces = (state) => state.workspace.workspaces;
export const selectActiveWorkspace = (state) => state.workspace.activeWorkspace;
export const selectWorkspaceLoading = (state) => state.workspace.loading;
export const selectWorkspaceError = (state) => state.workspace.error;
export const selectWorkspaceStats = (state) => state.workspace.stats;
