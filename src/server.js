const env = require('./config/env');

env.seguridad.validarConfigProduccion();

const { asegurarBaseDatos } = require('./database/ensure-db');

asegurarBaseDatos();

const app = require('./app');
const empresa = require('./config/empresa');

// Por defecto solo escucha en este equipo: nadie en la red local puede
// conectarse al POS. Para exponerlo a propósito: APP_HOST=0.0.0.0
const server = app.listen(env.app.port, env.app.host, () => {
    console.log('====================================');
    console.log(`${empresa.software.nombre} ejecutándose correctamente`);
    console.log(`Versión: ${empresa.software.version}`);
    console.log(`Desarrollador: ${empresa.software.desarrollador}`);
    console.log(`URL: http://localhost:${env.app.port}`);
    console.log(`Escuchando en: ${env.app.host}`);
    console.log(`Entorno: ${env.app.nodeEnv}`);
    console.log('====================================');
});

module.exports = server;