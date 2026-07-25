import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  teams: [],
  activeTeam: null,
  loading: false,
  error: null,
};

const teamSlice = createSlice({
  name: 'team',
  initialState,
  reducers: {
    setTeams: (state, action) => {
      state.teams = action.payload;
      state.loading = false;
      state.error = null;
    },
    setActiveTeam: (state, action) => {
      state.activeTeam = action.payload;
    },
    addTeam: (state, action) => {
      state.teams.unshift(action.payload);
    },
    removeTeam: (state, action) => {
      state.teams = state.teams.filter(t => t._id !== action.payload);
      if (state.activeTeam?._id === action.payload) {
        state.activeTeam = state.teams[0] || null;
      }
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearTeams: (state) => {
      state.teams = [];
      state.activeTeam = null;
      state.loading = false;
      state.error = null;
    }
  },
});

export const { 
  setTeams, 
  setActiveTeam, 
  addTeam, 
  removeTeam, 
  setLoading, 
  setError,
  clearTeams 
} = teamSlice.actions;

export default teamSlice.reducer;
export const selectTeams = (state) => state.team.teams;
export const selectActiveTeam = (state) => state.team.activeTeam;
export const selectTeamLoading = (state) => state.team.loading;
export const selectTeamError = (state) => state.team.error;
