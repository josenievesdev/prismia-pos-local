const fs = require('fs');
const path = require('path');

const env = require('../src/config/env');
const runtimePaths = require('../src/config/runtime-paths');
const runtimeSecrets = require('../src/config/runtime-secrets');

const raizProyecto = process.cwd();

function normalizarRuta(ruta) {
    return String(ruta || '').replace(/\\/g, '/');
}

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

function existeRuta(ruta) {
    return ruta && fs.existsSync(ruta);
}

function estaDentroDelProyecto(ruta) {
    if (!ruta) {
        return false;
    }

    const rutaNormalizada = normalizarRuta(path.resolve(ruta));
    const raizNormalizada = normalizarRuta(path.resolve(raizProyecto));

    return rutaNormalizada === raizNormalizada
        || rutaNormalizada.startsWith(`${raizNormalizada}/`);
}

function obtenerCarpetaCertificados() {
    const rutaConfigurada = String(process.env.PRISMIA_HTTPS_CERT_DIR || '').trim();

    if (rutaConfigurada) {
        return resolverRuta(rutaConfigurada);
    }

    if (runtimePaths.estaEnProduccion()) {
        return path.join(
            runtimePaths.obtenerDirectorioDatosProduccion(),
            'certs'
        );
    }

    return path.resolve(raizProyecto, 'certs');
}

function obtenerRutasCertificados() {
    const carpetaCertificados = obtenerCarpetaCertificados();

    const keyConfigurada = String(process.env.PRISMIA_HTTPS_KEY || '').trim();
    const certConfigurada = String(process.env.PRISMIA_HTTPS_CERT || '').trim();

    const keyPath = keyConfigurada
        ? resolverRuta(keyConfigurada)
        : path.join(carpetaCertificados, 'prismia-local-key.pem');

    const certPath = certConfigurada
        ? resolverRuta(certConfigurada)
        : path.join(carpetaCertificados, 'prismia-local-cert.pem');

    return {
        carpetaCertificados,
        keyPath,
        certPath,
    };
}

function imprimirRuta(nombre, ruta) {
    console.log(`${nombre}:`);
    console.log(`  ${ruta}`);
    console.log(`  existe: ${existeRuta(ruta) ? 'sí' : 'no'}`);
}

function validarRutasProduccion(rutas) {
    if (!runtimePaths.estaEnProduccion()) {
        return [];
    }

    const errores = [];
    const advertencias = [];

    const prismiaDataDir = String(process.env.PRISMIA_DATA_DIR || '').trim();

    if (prismiaDataDir && !path.isAbsolute(prismiaDataDir)) {
        advertencias.push('PRISMIA_DATA_DIR está definido como ruta relativa. En producción se recomienda ruta absoluta o dejarlo vacío.');
    }

    Object.entries(rutas).forEach(([nombre, ruta]) => {
        if (!ruta) {
            return;
        }

        if (estaDentroDelProyecto(ruta)) {
            errores.push(`${nombre} apunta dentro del proyecto: ${ruta}`);
        }
    });

    return {
        errores,
        advertencias,
    };
}

const rutasCertificados = obtenerRutasCertificados();

const rutasRuntime = {
    directorioDatosProduccion: runtimePaths.obtenerDirectorioDatosProduccion(),
    baseDatos: runtimePaths.obtenerRutaBaseDatos(),
    uploadsPublicos: runtimePaths.obtenerCarpetaUploadsPublicos(),
    uploadsProductos: runtimePaths.obtenerCarpetaUploadsProductos(),
    backups: runtimePaths.obtenerCarpetaBackupsBase(),
    secretosRuntime: runtimeSecrets.obtenerRutaArchivoSecretos(),
    certificadosHttps: rutasCertificados.carpetaCertificados,
};

console.log('====================================');
console.log('Diagnóstico runtime de Prismia');
console.log('====================================');
console.log(`NODE_ENV: ${env.app.nodeEnv}`);
console.log(`Producción: ${runtimePaths.estaEnProduccion() ? 'sí' : 'no'}`);
console.log('');

imprimirRuta('Directorio datos producción', rutasRuntime.directorioDatosProduccion);
console.log('');

imprimirRuta('Base de datos SQLite', rutasRuntime.baseDatos);
console.log('');

imprimirRuta('Uploads públicos', rutasRuntime.uploadsPublicos);
console.log('');

imprimirRuta('Uploads productos', rutasRuntime.uploadsProductos);
console.log('');

imprimirRuta('Backups', rutasRuntime.backups);
console.log('');

imprimirRuta('Secretos runtime', rutasRuntime.secretosRuntime);
console.log('');

imprimirRuta('Carpeta certificados HTTPS', rutasRuntime.certificadosHttps);
console.log('');

imprimirRuta('Certificado HTTPS KEY esperado', rutasCertificados.keyPath);
console.log('');

imprimirRuta('Certificado HTTPS CERT esperado', rutasCertificados.certPath);
console.log('');

const resultadoProduccion = validarRutasProduccion(rutasRuntime);

if (resultadoProduccion.advertencias && resultadoProduccion.advertencias.length > 0) {
    console.log('Advertencias:');

    resultadoProduccion.advertencias.forEach((advertencia) => {
        console.log(`- ${advertencia}`);
    });

    console.log('');
}

if (resultadoProduccion.errores && resultadoProduccion.errores.length > 0) {
    console.error('Errores críticos para producción/Electron:');

    resultadoProduccion.errores.forEach((error) => {
        console.error(`- ${error}`);
    });

    console.error('');
    console.error('Resultado: diagnóstico fallido.');
    process.exit(1);
}

console.log('Resultado: diagnóstico runtime finalizado correctamente.');