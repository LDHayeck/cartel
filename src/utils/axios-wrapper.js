const axios = require('axios');

// axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';

exports.axiosSlack = axios.create({
  baseURL: 'https://slack.com/api',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  // baseURL: 'http://P00030494/DST.Services.Traduction.WebApi/api/',
  // baseURL: 'http://localhost/DST.Services.Traduction.WebApi/api/',
  timeout: 15000,
});
