const mongoose = require('mongoose');

const workspaceMemberSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['OWNER', 'EDITOR', 'VIEWER'],
      default: 'VIEWER'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true
    }
  },
  { timestamps: true }
);

// Prisma ki @@unique([userId, workspaceId]) condition ke liye index:
workspaceMemberSchema.index({ userId: 1, workspaceId: 1 }, { unique: true });

module.exports = mongoose.model('WorkspaceMember', workspaceMemberSchema);