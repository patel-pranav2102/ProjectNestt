import mongoose from 'mongoose';

const boardSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Board name is required'],
      trim: true,
      maxlength: [100, 'Board name cannot exceed 100 characters'],
    },
    columns: {
      type: [String],
      default: ['To Do', 'In Progress', 'Testing', 'Done'],
    },
  },
  {
    timestamps: true,
  }
);

const Board = mongoose.model('Board', boardSchema);

export default Board;
