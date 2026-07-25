import mongoose from 'mongoose';

const drawingSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Drawing board name is required'],
      trim: true,
      maxlength: [100, 'Drawing board name cannot exceed 100 characters'],
    },
    elements: {
      type: Array,
      default: [],
    },
    appState: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const Drawing = mongoose.model('Drawing', drawingSchema);

export default Drawing;
