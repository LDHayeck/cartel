const mongoose = require('mongoose');

const CartelMemberSchema = new mongoose.Schema(
  {
    slack_uid: {
      type: String,
      required: true,
    },
    name: String,
    birthdate: String,
    email: String,
    admin: Boolean,
    owner: Boolean,
    title: String,
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('CartelMember', CartelMemberSchema);
