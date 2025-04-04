const jwt = require('express-jwt');

const authCheck = jwt({ secret: process.env.JWT_SECRET });

module.exports = authCheck;
