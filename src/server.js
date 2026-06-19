const env = require('./config/env');

env.seguridad.validarConfigProduccion();

const { asegurarBaseDatos } = require('./database/ensure-db');

const resultadoBaseDatos = asegurarBaseDatos();

if (!resultadoBaseDatos.ok) {
    console.error('====================================');
    console.error('No se puede iniciar Prismia POS Local.');
    console.error(resultadoBaseDatos.mensaje);

    if (Array.isArray(resultadoBaseDatos.tablas_faltantes) && resultadoBaseDatos.tablas_faltantes.length > 0) {
        console.error(`Tablas faltantes: ${resultadoBaseDatos.tablas_faltantes.join(', ')}`);
    }

    console.error('Ejecuta npm run db:validate y corrige la base de datos antes de abrir el POS.');
    console.error('====================================');
    process.exit(1);
}

const app = require('./app');
const empresa = require('./config/empresa');

const HOST = '127.0.0.1';

const server = app.listen(env.app.port, HOST, () => {
    console.log('====================================');
    console.log(`${empresa.software.nombre} ejecutándose correctamente`);
    console.log(`Versión: ${empresa.software.version}`);
    console.log(`Desarrollador: ${empresa.software.desarrollador}`);
    console.log(`URL: http://localhost:${env.app.port}`);
    console.log(`Entorno: ${env.app.nodeEnv}`);
    console.log('====================================');
});

module.exports = server;