import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema(
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
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader ID is required'],
    },
    name: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    url: {
      type: String,
      required: [true, 'File URL is required'],
    },
    fileType: {
      type: String,
      default: 'unknown',
    },
    size: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const FileModel = mongoose.model('File', fileSchema);
export default FileModel;
