const env = require('./config/env');

env.seguridad.validarConfigProduccion();

const { asegurarBaseDatos } = require('./database/ensure-db');

asegurarBaseDatos();

const app = require('./app');
const empresa = require('./config/empresa');

const server = app.listen(env.app.port, () => {
    console.log('====================================');
    console.log(`${empresa.software.nombre} ejecutándose correctamente`);
    console.log(`Versión: ${empresa.software.version}`);
    console.log(`Desarrollador: ${empresa.software.desarrollador}`);
    console.log(`URL: http://localhost:${env.app.port}`);
    console.log(`Entorno: ${env.app.nodeEnv}`);
    console.log('====================================');
});

module.exports = server;