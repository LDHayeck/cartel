const mongoose = require('mongoose');

const enums = {
  PAYMENT_METHODS: ['visa', 'mastercard', 'paypal'],
};

const CustomerSchema = new mongoose.Schema(
  {
    firstname: String,
    lastname: String,
    email: String,
    birthdate: String,
    password: String,
    salt: String,
    siret: String,
    payment_method: { type: String, enums: enums.PAYMENT_METHODS },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Customer', CustomerSchema);
