const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const raizProyecto = process.cwd();
const nombreArchivoSecretos = 'secretos.local.json';

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

function estaEnProduccion() {
    return (process.env.NODE_ENV || 'development') === 'production';
}

function obtenerDirectorioRuntime() {
    const rutaConfigurada = resolverRuta(process.env.PRISMIA_DATA_DIR);

    if (rutaConfigurada) {
        return rutaConfigurada;
    }

    if (!estaEnProduccion()) {
        return path.resolve(raizProyecto, 'storage/runtime');
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

function obtenerCarpetaConfigRuntime() {
    return path.join(obtenerDirectorioRuntime(), 'config');
}

function obtenerRutaArchivoSecretos() {
    return path.join(obtenerCarpetaConfigRuntime(), nombreArchivoSecretos);
}

function asegurarCarpeta(rutaCarpeta) {
    if (!fs.existsSync(rutaCarpeta)) {
        fs.mkdirSync(rutaCarpeta, { recursive: true });
    }
}

function generarSessionSecret() {
    return crypto.randomBytes(48).toString('hex');
}

function generarGrupoClave(longitud = 4) {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let grupo = '';

    for (let i = 0; i < longitud; i += 1) {
        const indice = crypto.randomInt(0, caracteres.length);
        grupo += caracteres[indice];
    }

    return grupo;
}

function generarSupportBackupKey() {
    return [
        'PRM',
        'SOP',
        generarGrupoClave(),
        generarGrupoClave(),
        generarGrupoClave(),
    ].join('-');
}

function leerSecretosRuntime() {
    const rutaArchivo = obtenerRutaArchivoSecretos();

    if (!fs.existsSync(rutaArchivo)) {
        return {};
    }

    try {
        const contenido = fs.readFileSync(rutaArchivo, 'utf8');
        const secretos = JSON.parse(contenido);

        if (!secretos || typeof secretos !== 'object' || Array.isArray(secretos)) {
            return {};
        }

        return secretos;
    } catch (error) {
        throw new Error(`No se pudo leer el archivo de secretos runtime: ${error.message}`);
    }
}

function guardarSecretosRuntime(secretos) {
    const rutaArchivo = obtenerRutaArchivoSecretos();
    const carpetaConfig = path.dirname(rutaArchivo);
    const rutaTemporal = `${rutaArchivo}.tmp`;

    asegurarCarpeta(carpetaConfig);

    fs.writeFileSync(
        rutaTemporal,
        `${JSON.stringify(secretos, null, 2)}\n`,
        'utf8'
    );

    fs.renameSync(rutaTemporal, rutaArchivo);

    try {
        fs.chmodSync(rutaArchivo, 0o600);
    } catch (error) {
        // Windows puede ignorar permisos POSIX. No se bloquea el arranque por esto.
    }
}

function asegurarSecretosRuntime() {
    const ahora = new Date().toISOString();
    const secretos = leerSecretosRuntime();
    let huboCambios = false;

    if (!secretos.creado_en) {
        secretos.creado_en = ahora;
        huboCambios = true;
    }

    if (!secretos.SESSION_SECRET) {
        secretos.SESSION_SECRET = generarSessionSecret();
        huboCambios = true;
    }

    if (!secretos.SUPPORT_BACKUP_KEY) {
        secretos.SUPPORT_BACKUP_KEY = generarSupportBackupKey();
        huboCambios = true;
    }

    if (huboCambios) {
        secretos.actualizado_en = ahora;
        guardarSecretosRuntime(secretos);
    }

    return secretos;
}

function obtenerSessionSecret() {
    return asegurarSecretosRuntime().SESSION_SECRET;
}

function obtenerSupportBackupKey() {
    return asegurarSecretosRuntime().SUPPORT_BACKUP_KEY;
}

function obtenerEstadoSecretosRuntime() {
    const secretos = asegurarSecretosRuntime();

    return {
        ruta_archivo: obtenerRutaArchivoSecretos(),
        clave_soporte: secretos.SUPPORT_BACKUP_KEY || '',
        creado_en: secretos.creado_en || '',
        actualizado_en: secretos.actualizado_en || '',
    };
}

function regenerarSupportBackupKey() {
    const secretos = asegurarSecretosRuntime();
    const claveAnterior = secretos.SUPPORT_BACKUP_KEY || '';

    secretos.SUPPORT_BACKUP_KEY = generarSupportBackupKey();
    secretos.actualizado_en = new Date().toISOString();

    guardarSecretosRuntime(secretos);

    return {
        clave_anterior: claveAnterior,
        clave_soporte: secretos.SUPPORT_BACKUP_KEY,
        ruta_archivo: obtenerRutaArchivoSecretos(),
        actualizado_en: secretos.actualizado_en,
    };
}

module.exports = {
    obtenerRutaArchivoSecretos,
    obtenerSessionSecret,
    obtenerSupportBackupKey,
    obtenerEstadoSecretosRuntime,
    regenerarSupportBackupKey,
};