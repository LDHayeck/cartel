module.exports = (req, res, next) => {
  if (!req.user || req.user.userRole !== 'admin') {
    return res.status(401).json({
      name: 'UnauthorizedError',
      message: 'You must be a Cartel Admin to perform this request.',
      code: 'admin_role_required',
      status: 401,
      inner: { message: 'No administrator role was found' },
    });
  }
  next();
};
