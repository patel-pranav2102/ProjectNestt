import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  documents: [],
  activeDocument: null,
  loading: false,
  error: null,
};

const documentSlice = createSlice({
  name: 'document',
  initialState,
  reducers: {
    setDocuments: (state, action) => {
      state.documents = action.payload;
      state.loading = false;
      state.error = null;
    },
    setActiveDocument: (state, action) => {
      state.activeDocument = action.payload;
    },
    addDocument: (state, action) => {
      state.documents.unshift(action.payload);
    },
    removeDocument: (state, action) => {
      state.documents = state.documents.filter(d => d._id !== action.payload);
      if (state.activeDocument?._id === action.payload) {
        state.activeDocument = state.documents[0] || null;
      }
    },
    updateDocumentState: (state, action) => {
      state.documents = state.documents.map(d => d._id === action.payload._id ? action.payload : d);
      if (state.activeDocument?._id === action.payload._id) {
        state.activeDocument = action.payload;
      }
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearDocumentStore: (state) => {
      state.documents = [];
      state.activeDocument = null;
      state.loading = false;
      state.error = null;
    }
  },
});

export const {
  setDocuments,
  setActiveDocument,
  addDocument,
  removeDocument,
  updateDocumentState,
  setLoading,
  setError,
  clearDocumentStore
} = documentSlice.actions;

export default documentSlice.reducer;
export const selectDocuments = (state) => state.document.documents;
export const selectActiveDocument = (state) => state.document.activeDocument;
export const selectDocumentLoading = (state) => state.document.loading;
export const selectDocumentError = (state) => state.document.error;
