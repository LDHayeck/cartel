const mongoose = require('mongoose');
const chalk = require('chalk');

const WorkflowInstanceSchema = new mongoose.Schema(
  {
    author: {
      type: String,
      required: true,
    },
  },
  {
    discriminatorKey: 'workflow_type',
    collection: 'workflow_instances',
    createdAt: { type: Date, expires: '2m' },
  },
);

/* eslint-disable func-names */
WorkflowInstanceSchema.statics.deleteExistingWFAuthor = async function (author) {
  try {
    const foundWF = await this.findOneAndRemove({ author });
    return foundWF;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};
WorkflowInstanceSchema.statics.findWFByAuthor = async function (author) {
  try {
    const foundWF = await this.findOne({ author });
    return foundWF;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};
/* eslint-enable func-names */

module.exports = mongoose.model('Workflow', WorkflowInstanceSchema);
