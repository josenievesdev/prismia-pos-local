const dotenv = require('dotenv');

dotenv.config();

const env = {
    app: {
        name: process.env.APP_NAME || 'Prismia POS Local',
        port: Number(process.env.APP_PORT) || 3000,
        nodeEnv: process.env.NODE_ENV || 'development',
    },

    db: {
        client: process.env.DB_CLIENT || 'sqlite',
        name: process.env.DB_NAME || 'prismia_pos_local',
        path: process.env.DB_PATH || 'src/database/data/prismia_pos_local.sqlite',
    },

    session: {
        secret: process.env.SESSION_SECRET || 'prismia_pos_local_dev_secret',
    },

    admin: {
        name: process.env.ADMIN_NAME || 'Administrador',
        email: process.env.ADMIN_EMAIL || 'admin@prismia.local',
        password: process.env.ADMIN_PASSWORD || 'Admin12345',
    },
};

module.exports = env;