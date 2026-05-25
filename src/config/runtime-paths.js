const fs = require('fs');
const os = require('os');
const path = require('path');

const env = require('./env');

const raizProyecto = process.cwd();

function resolverRuta(ruta) {
    const valor = String(ruta || '').trim();

    if (!valor) {
        return '';
    }

    if (path.isAbsolute(valor)) {
        return valor;
    }

    return path.resolve(raizProyecto, valor);
}

function resolverRutaConfigurada(nombreVariable, opciones = {}) {
    const valor = String(process.env[nombreVariable] || '').trim();

    if (!valor) {
        return '';
    }

    const ignorarRelativaEnProduccion = opciones.ignorarRelativaEnProduccion === true;

    if (
        estaEnProduccion()
        && ignorarRelativaEnProduccion
        && !path.isAbsolute(valor)
    ) {
        return '';
    }

    return resolverRuta(valor);
}

function estaEnProduccion() {
    return env.app.nodeEnv === 'production';
}

function obtenerDirectorioDatosProduccion() {
    const rutaConfigurada = resolverRutaConfigurada('PRISMIA_DATA_DIR');

    if (rutaConfigurada) {
        return rutaConfigurada;
    }

    if (process.platform === 'win32') {
        return path.join(
            process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
            'Prismia POS Local'
        );
    }

    if (process.platform === 'darwin') {
        return path.join(
            os.homedir(),
            'Library',
            'Application Support',
            'Prismia POS Local'
        );
    }

    return path.join(
        os.homedir(),
        '.local',
        'share',
        'prismia-pos-local'
    );
}

function obtenerRutaBaseDatos() {
    const rutaConfigurada = resolverRutaConfigurada('DB_PATH', {
        ignorarRelativaEnProduccion: true,
    });

    if (rutaConfigurada) {
        return rutaConfigurada;
    }

    if (estaEnProduccion()) {
        return path.join(
            obtenerDirectorioDatosProduccion(),
            'data',
            'prismia_pos_local.sqlite'
        );
    }

    return path.resolve(
        raizProyecto,
        'src/database/data/prismia_pos_local.sqlite'
    );
}

function obtenerCarpetaUploadsPublicos() {
    const rutaConfigurada = resolverRutaConfigurada('UPLOADS_PUBLIC_DIR', {
        ignorarRelativaEnProduccion: true,
    });

    if (rutaConfigurada) {
        return rutaConfigurada;
    }

    if (estaEnProduccion()) {
        return path.join(
            obtenerDirectorioDatosProduccion(),
            'uploads'
        );
    }

    return path.resolve(
        raizProyecto,
        'src/public/uploads'
    );
}

function obtenerCarpetaUploadsProductos() {
    const rutaConfigurada = resolverRutaConfigurada('UPLOADS_PRODUCTOS_DIR', {
        ignorarRelativaEnProduccion: true,
    });

    if (rutaConfigurada) {
        return rutaConfigurada;
    }

    return path.join(
        obtenerCarpetaUploadsPublicos(),
        'productos'
    );
}

function obtenerCarpetaBackupsBase() {
    const rutaConfigurada = resolverRutaConfigurada('BACKUP_BASE_DIR', {
        ignorarRelativaEnProduccion: true,
    });

    if (rutaConfigurada) {
        return rutaConfigurada;
    }

    if (estaEnProduccion()) {
        return path.join(
            obtenerDirectorioDatosProduccion(),
            'backups'
        );
    }

    return path.resolve(
        raizProyecto,
        'storage/backups'
    );
}

function asegurarCarpeta(rutaCarpeta) {
    if (!rutaCarpeta) {
        return;
    }

    if (!fs.existsSync(rutaCarpeta)) {
        fs.mkdirSync(rutaCarpeta, { recursive: true });
    }
}

function asegurarCarpetasRuntime() {
    asegurarCarpeta(path.dirname(obtenerRutaBaseDatos()));
    asegurarCarpeta(obtenerCarpetaUploadsPublicos());
    asegurarCarpeta(obtenerCarpetaUploadsProductos());
    asegurarCarpeta(obtenerCarpetaBackupsBase());
}

module.exports = {
    estaEnProduccion,
    obtenerDirectorioDatosProduccion,
    obtenerRutaBaseDatos,
    obtenerCarpetaUploadsPublicos,
    obtenerCarpetaUploadsProductos,
    obtenerCarpetaBackupsBase,
    asegurarCarpeta,
    asegurarCarpetasRuntime,
};