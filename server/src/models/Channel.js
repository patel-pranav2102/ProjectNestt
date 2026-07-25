import mongoose from 'mongoose';

const channelSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Workspace ID is required'],
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Channel name is required'],
      trim: true,
      maxlength: [100, 'Channel name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Channel description cannot exceed 500 characters'],
      default: '',
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Format channel names to be URL-friendly (e.g. "general-chat")
channelSchema.pre('save', function (next) {
  if (this.name) {
    this.name = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-_]/g, '-'); // Replace special characters with hyphens
  }
  next();
});

const Channel = mongoose.model('Channel', channelSchema);

export default Channel;
