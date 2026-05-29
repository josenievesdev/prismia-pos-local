const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const raizProyecto = path.resolve(__dirname, '..');

function normalizarRuta(ruta) {
    return String(ruta || '').replace(/\\/g, '/');
}

function obtenerArchivosVersionados() {
    try {
        const salida = execFileSync('git', ['ls-files'], {
            cwd: raizProyecto,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        return salida
            .split(/\r?\n/)
            .map((item) => normalizarRuta(item.trim()))
            .filter(Boolean);
    } catch (error) {
        console.error('No se pudo ejecutar git ls-files.');
        console.error('Ejecuta este comando dentro del repositorio de Prismia y confirma que Git esté instalado.');
        process.exit(1);
    }
}

function rutaTieneContenidoReal(rutaRelativa) {
    const rutaAbsoluta = path.join(raizProyecto, rutaRelativa);

    if (!fs.existsSync(rutaAbsoluta)) {
        return false;
    }

    const estado = fs.statSync(rutaAbsoluta);

    if (estado.isFile()) {
        return true;
    }

    if (!estado.isDirectory()) {
        return false;
    }

    const pendientes = [rutaAbsoluta];

    while (pendientes.length > 0) {
        const actual = pendientes.pop();
        const entradas = fs.readdirSync(actual, { withFileTypes: true });

        for (const entrada of entradas) {
            const rutaEntrada = path.join(actual, entrada.name);
            const relativa = normalizarRuta(path.relative(raizProyecto, rutaEntrada));

            if (entrada.isDirectory()) {
                pendientes.push(rutaEntrada);
                continue;
            }

            if (entrada.isFile() && !relativa.endsWith('/.gitkeep')) {
                return true;
            }
        }
    }

    return false;
}

const patronesProhibidos = [
    {
        nombre: '.env real',
        patron: /^\.env$/,
    },
    {
        nombre: 'secretos runtime',
        patron: /(^|\/)secretos\.local\.json(\.tmp)?$/,
    },
    {
        nombre: 'base de datos SQLite local',
        patron: /^src\/database\/data\/.+\.(sqlite|sqlite-shm|sqlite-wal|db)$/i,
    },
    {
        nombre: 'backups locales',
        patron: /^storage\/backups\/.+/,
    },
    {
        nombre: 'runtime local',
        patron: /^storage\/runtime\/.+/,
    },
    {
        nombre: 'certificados HTTPS locales',
        patron: /^certs\/.+\.(pem|key|crt|p12)$/i,
    },
    {
        nombre: 'trigger técnico de reinicio en desarrollo',
        patron: /^src\/restart-dev-trigger\.json$/,
    },
    {
        nombre: 'carpetas temporales de pruebas runtime',
        patron: /^(PrismiaRestoreTest|PrismiaSetupTest|PrismiaSecretsTest|PrismiaRuntimeTest)\//,
    },
];

const rutasLocalesSensibles = [
    '.env',
    'storage/runtime',
    'storage/backups',
    'src/database/data',
    'certs',
    'src/restart-dev-trigger.json',
];

const archivosVersionados = obtenerArchivosVersionados();
const problemas = [];

for (const archivo of archivosVersionados) {
    const regla = patronesProhibidos.find((item) => item.patron.test(archivo));

    if (regla) {
        problemas.push({ archivo, tipo: regla.nombre });
    }
}

console.log('====================================');
console.log('Verificación pre-Electron de Prismia');
console.log('====================================');

if (problemas.length > 0) {
    console.error('Se encontraron archivos sensibles versionados.');
    console.error('Sácalos del seguimiento de Git antes de continuar con Electron.');
    console.error('');

    problemas.forEach((problema) => {
        console.error(`- ${problema.archivo} (${problema.tipo})`);
    });

    console.error('');
    console.error('Ejemplo:');
    console.error('git rm --cached ruta/del/archivo');
    console.error('');
    process.exit(1);
}

console.log('OK: no hay secretos, bases locales, backups ni certificados sensibles versionados.');

const rutasLocalesConContenido = rutasLocalesSensibles.filter(rutaTieneContenidoReal);

if (rutasLocalesConContenido.length > 0) {
    console.log('');
    console.log('Aviso: existen archivos locales sensibles o runtime en tu máquina.');
    console.log('Esto puede ser normal en desarrollo, pero Electron debe excluirlos del instalador:');

    rutasLocalesConContenido.forEach((ruta) => {
        console.log(`- ${ruta}`);
    });
}

console.log('');
console.log('Resultado: verificación pre-Electron finalizada.');