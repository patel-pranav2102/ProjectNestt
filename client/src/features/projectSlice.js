import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  projects: [],
  activeProject: null,
  loading: false,
  error: null,
};

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setProjects: (state, action) => {
      state.projects = action.payload;
      state.loading = false;
      state.error = null;
    },
    setActiveProject: (state, action) => {
      state.activeProject = action.payload;
    },
    addProject: (state, action) => {
      state.projects.unshift(action.payload);
    },
    removeProject: (state, action) => {
      state.projects = state.projects.filter(p => p._id !== action.payload);
      if (state.activeProject?._id === action.payload) {
        state.activeProject = state.projects[0] || null;
      }
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearProjects: (state) => {
      state.projects = [];
      state.activeProject = null;
      state.loading = false;
      state.error = null;
    }
  },
});

export const { 
  setProjects, 
  setActiveProject, 
  addProject, 
  removeProject, 
  setLoading, 
  setError,
  clearProjects 
} = projectSlice.actions;

export default projectSlice.reducer;
export const selectProjects = (state) => state.project.projects;
export const selectActiveProject = (state) => state.project.activeProject;
export const selectProjectLoading = (state) => state.project.loading;
export const selectProjectError = (state) => state.project.error;
