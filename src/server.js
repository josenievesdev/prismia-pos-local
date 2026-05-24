const { asegurarBaseDatos } = require('./database/ensure-db');

asegurarBaseDatos();

const app = require('./app');
const env = require('./config/env');
const empresa = require('./config/empresa');

app.listen(env.app.port, () => {
    console.log('====================================');
    console.log(`${empresa.software.nombre} ejecutándose correctamente`);
    console.log(`Versión: ${empresa.software.version}`);
    console.log(`Desarrollador: ${empresa.software.desarrollador}`);
    console.log(`URL: http://localhost:${env.app.port}`);
    console.log(`Entorno: ${env.app.nodeEnv}`);
    console.log('====================================');
});