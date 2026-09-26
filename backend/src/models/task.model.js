const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: null },
    status: {
      type: String,
      enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'],
      default: 'TODO'
    },
    order: { type: Number, default: 0 },
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: true
    },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
      createrId:{
         type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      }
      ,dueDate: {
       type: Date,
       default: null
}
    
  },
  { timestamps: true }
);

// Prisma ka @@index([boardId, status]) fast query indexing ke liye:
taskSchema.index({ boardId: 1, status: 1 });

module.exports = mongoose.model('Task', taskSchema);