const DreamTeamService = require('../utils/dream-team-service');

module.exports = (req, res, next) => {
  const jwtTeamId = req.user.teamId;
  const paramTeamId = req.params.teamId;
  if (!DreamTeamService.isDreamTeamMember(req.user.userId) && jwtTeamId !== paramTeamId) {
    return res.status(401).json({
      name: 'UnauthorizedError',
      message: 'You must be a Cartel Creater or belong to the related team to perform this request.',
      code: 'wrong_team_authority',
      status: 401,
      inner: { message: 'No administrator role was found' },
    });
  }
  next();
};
