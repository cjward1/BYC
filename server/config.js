export const config = {
  port: process.env.PORT || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'byc-dock-secret-change-in-production',
  database: {
    path: process.env.DB_PATH || './data/byc.db'
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
};
