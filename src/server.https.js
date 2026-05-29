const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');

const env = require('./config/env');
const runtimePaths = require('./config/runtime-paths');

env.seguridad.validarConfigProduccion();

const { asegurarBaseDatos } = require('./database/ensure-db');

asegurarBaseDatos();

const app = require('./app');
const empresa = require('./config/empresa');

const HTTPS_PORT = Number(process.env.HTTPS_PORT || 3443);
const HOST = '0.0.0.0';

function obtenerIPv4Locales() {
    const interfaces = os.networkInterfaces();
    const direcciones = [];

    Object.values(interfaces).forEach((grupo) => {
        if (!Array.isArray(grupo)) {
            return;
        }

        grupo.forEach((item) => {
            if (
                item
                && item.family === 'IPv4'
                && !item.internal
                && item.address
            ) {
                direcciones.push(item.address);
            }
        });
    });

    return direcciones;
}

function obtenerCarpetaCertificados() {
    const rutaConfigurada = String(process.env.PRISMIA_HTTPS_CERT_DIR || '').trim();

    if (rutaConfigurada) {
        return path.isAbsolute(rutaConfigurada)
            ? rutaConfigurada
            : path.resolve(process.cwd(), rutaConfigurada);
    }

    if (runtimePaths.estaEnProduccion()) {
        return path.join(
            runtimePaths.obtenerDirectorioDatosProduccion(),
            'certs'
        );
    }

    return path.join(__dirname, '..', 'certs');
}

function obtenerRutasCertificados() {
    const carpetaCertificados = obtenerCarpetaCertificados();

    const keyPath = process.env.PRISMIA_HTTPS_KEY
        || path.join(carpetaCertificados, 'prismia-local-key.pem');

    const certPath = process.env.PRISMIA_HTTPS_CERT
        || path.join(carpetaCertificados, 'prismia-local-cert.pem');

    return {
        carpetaCertificados,
        keyPath,
        certPath,
    };
}

function mostrarMensajeCertificadosFaltantes(rutas) {
    console.error('====================================');
    console.error('No se encontraron certificados HTTPS locales.');
    console.error('');
    console.error('El sistema principal puede funcionar por HTTP.');
    console.error('El acceso móvil con cámara requiere HTTPS local configurado.');
    console.error('');
    console.error('Archivos esperados:');
    console.error(`KEY : ${rutas.keyPath}`);
    console.error(`CERT: ${rutas.certPath}`);
    console.error('');
    console.error('En desarrollo, genera certificados con mkcert.');
    console.error('En producción, estos certificados deben quedar en la carpeta runtime del cliente.');
    console.error('====================================');
}

function leerCertificados() {
    const rutas = obtenerRutasCertificados();

    if (!fs.existsSync(rutas.keyPath) || !fs.existsSync(rutas.certPath)) {
        mostrarMensajeCertificadosFaltantes(rutas);
        process.exit(1);
    }

    return {
        key: fs.readFileSync(rutas.keyPath),
        cert: fs.readFileSync(rutas.certPath),
        rutas,
    };
}

const certificados = leerCertificados();

const server = https.createServer({
    key: certificados.key,
    cert: certificados.cert,
}, app);

server.listen(HTTPS_PORT, HOST, () => {
    const ips = obtenerIPv4Locales();

    console.log('====================================');
    console.log(`${empresa.software.nombre} ejecutándose con HTTPS local`);
    console.log(`Versión: ${empresa.software.version}`);
    console.log(`Desarrollador: ${empresa.software.desarrollador}`);
    console.log('');
    console.log(`PC local: https://localhost:${HTTPS_PORT}`);
    console.log(`POS móvil local: https://localhost:${HTTPS_PORT}/ventas/movil`);

    ips.forEach((ip) => {
        console.log(`Celular misma red: https://${ip}:${HTTPS_PORT}/ventas/movil`);
    });

    console.log('');
    console.log(`Certificados HTTPS: ${certificados.rutas.carpetaCertificados}`);
    console.log('Si el celular bloquea la cámara, instala la CA local correspondiente en el celular.');
    console.log('====================================');
});