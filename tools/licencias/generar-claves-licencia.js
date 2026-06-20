const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rutaRaiz = path.resolve(__dirname, '..', '..');
const rutaPrivadaDir = path.join(__dirname, 'private');

const rutaPrivateKey = path.join(
    rutaPrivadaDir,
    'prismia-license-private.pem'
);

const rutaPublicConfig = path.join(
    rutaRaiz,
    'src',
    'config',
    'licencia-public-key.js'
);

function asegurarDirectorio(ruta) {
    if (!fs.existsSync(ruta)) {
        fs.mkdirSync(ruta, { recursive: true });
    }
}

function generarClaves() {
    asegurarDirectorio(rutaPrivadaDir);

    if (fs.existsSync(rutaPrivateKey)) {
        throw new Error(
            `Ya existe una clave privada en ${rutaPrivateKey}. No se sobrescribe por seguridad.`
        );
    }

    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

    const privatePem = privateKey.export({
        type: 'pkcs8',
        format: 'pem',
    });

    const publicPem = publicKey.export({
        type: 'spki',
        format: 'pem',
    });

    fs.writeFileSync(rutaPrivateKey, privatePem, {
        encoding: 'utf8',
        mode: 0o600,
    });

    const contenidoConfig = `const PUBLIC_KEY_PEM = \`${publicPem.trim()}\`;

module.exports = {
    PUBLIC_KEY_PEM,
};
`;

    fs.writeFileSync(rutaPublicConfig, contenidoConfig, 'utf8');

    console.log('Claves de licencia generadas correctamente.');
    console.log('');
    console.log('Clave privada:');
    console.log(rutaPrivateKey);
    console.log('');
    console.log('Clave pública actualizada en:');
    console.log(rutaPublicConfig);
    console.log('');
    console.log('IMPORTANTE: nunca subas la clave privada al repositorio.');
}

generarClaves();