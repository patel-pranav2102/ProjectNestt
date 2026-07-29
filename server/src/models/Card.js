import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema(
  {
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: [true, 'Board ID is required'],
      index: true,
    },
    column: {
      type: String,
      required: [true, 'Column name is required'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Card name is required'],
      trim: true,
      maxlength: [150, 'Card name cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    dueDate: {
      type: Date,
      default: null,
    },
    labels: [
      {
        type: String,
        trim: true,
      },
    ],
    position: {
      type: Number,
      default: 0,
    },
    comments: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        text: {
          type: String,
          required: true,
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    activityLog: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        action: {
          type: String,
          required: true,
        },
        details: {
          type: String,
          default: '',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound index for fast board card ordering and assignee filtering
cardSchema.index({ boardId: 1, column: 1, position: 1 });
cardSchema.index({ assignees: 1 });

const Card = mongoose.model('Card', cardSchema);

export default Card;
