exports.originUndefined = (req, res, next) => {
  if (!req.headers.origin) {
    res.json({
      mess: 'Hi you are visiting the service locally. If this was a CORS the origin header should not be undefined',
    });
  } else {
    next();
  }
};

// Cross Origin Resource Sharing Options
exports.cors = {
  // origin handler
  origin(origin, cb) {
    // setup a white list
    const wl = ['https://www.backoffice.yourcartel.com', 'http://localhost:5000'];
    if (origin && wl.indexOf(origin) !== -1) {
      cb(null, true);
    } else {
      cb(new Error(`invalid origin: ${origin}`), false);
    }
  },
  optionsSuccessStatus: 200,
};
