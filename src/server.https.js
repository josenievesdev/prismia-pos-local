const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { asegurarBaseDatos } = require('./database/ensure-db');

asegurarBaseDatos();

const app = require('./app');
const empresa = require('./config/empresa');

const HTTPS_PORT = Number(process.env.HTTPS_PORT || 3443);
const HOST = '0.0.0.0';

const CERT_DIR = path.join(__dirname, '..', 'certs');

const KEY_PATH = process.env.PRISMIA_HTTPS_KEY
    || path.join(CERT_DIR, 'prismia-local-key.pem');

const CERT_PATH = process.env.PRISMIA_HTTPS_CERT
    || path.join(CERT_DIR, 'prismia-local-cert.pem');

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

function leerCertificados() {
    if (!fs.existsSync(KEY_PATH) || !fs.existsSync(CERT_PATH)) {
        console.error('====================================');
        console.error('No se encontraron certificados HTTPS locales.');
        console.error('');
        console.error('Archivos esperados:');
        console.error(`KEY : ${KEY_PATH}`);
        console.error(`CERT: ${CERT_PATH}`);
        console.error('');
        console.error('Genera los certificados con mkcert antes de iniciar HTTPS.');
        console.error('====================================');

        process.exit(1);
    }

    return {
        key: fs.readFileSync(KEY_PATH),
        cert: fs.readFileSync(CERT_PATH),
    };
}

const server = https.createServer(leerCertificados(), app);

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
    console.log('Si el celular bloquea la cámara, instala la CA local de mkcert en el celular.');
    console.log('====================================');
});