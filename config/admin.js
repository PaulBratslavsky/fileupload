module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', '964e0dc340686412277ad21ebf18f136'),
  },
});
