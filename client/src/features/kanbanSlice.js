import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  boards: [],
  activeBoard: null,
  cards: [],
  activeCard: null,
  loading: false,
  error: null,
};

const kanbanSlice = createSlice({
  name: 'kanban',
  initialState,
  reducers: {
    setBoards: (state, action) => {
      state.boards = action.payload;
      state.loading = false;
      state.error = null;
    },
    setActiveBoard: (state, action) => {
      state.activeBoard = action.payload;
    },
    addBoard: (state, action) => {
      state.boards.unshift(action.payload);
    },
    removeBoard: (state, action) => {
      state.boards = state.boards.filter(b => b._id !== action.payload);
      if (state.activeBoard?._id === action.payload) {
        state.activeBoard = state.boards[0] || null;
      }
    },
    setCards: (state, action) => {
      state.cards = action.payload;
    },
    addCard: (state, action) => {
      state.cards.push(action.payload);
    },
    updateCardState: (state, action) => {
      state.cards = state.cards.map(c => c._id === action.payload._id ? action.payload : c);
      if (state.activeCard?._id === action.payload._id) {
        state.activeCard = action.payload;
      }
    },
    removeCardState: (state, action) => {
      state.cards = state.cards.filter(c => c._id !== action.payload);
      if (state.activeCard?._id === action.payload) {
        state.activeCard = null;
      }
    },
    setActiveCard: (state, action) => {
      state.activeCard = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearKanbanStore: (state) => {
      state.boards = [];
      state.activeBoard = null;
      state.cards = [];
      state.activeCard = null;
      state.loading = false;
      state.error = null;
    }
  },
});

export const {
  setBoards,
  setActiveBoard,
  addBoard,
  removeBoard,
  setCards,
  addCard,
  updateCardState,
  removeCardState,
  setActiveCard,
  setLoading,
  setError,
  clearKanbanStore
} = kanbanSlice.actions;

export default kanbanSlice.reducer;
export const selectBoards = (state) => state.kanban.boards;
export const selectActiveBoard = (state) => state.kanban.activeBoard;
export const selectKanbanCards = (state) => state.kanban.cards;
export const selectActiveCard = (state) => state.kanban.activeCard;
export const selectKanbanLoading = (state) => state.kanban.loading;
export const selectKanbanError = (state) => state.kanban.error;
