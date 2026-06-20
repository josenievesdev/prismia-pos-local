const crypto = require('crypto');
const os = require('os');
const { execFileSync } = require('child_process');

let huellaCache = null;

function obtenerMachineGuidWindows() {
    if (process.platform !== 'win32') {
        return null;
    }

    try {
        const salida = execFileSync(
            'reg',
            [
                'query',
                'HKLM\\SOFTWARE\\Microsoft\\Cryptography',
                '/v',
                'MachineGuid',
            ],
            {
                encoding: 'utf8',
                windowsHide: true,
                timeout: 2000,
            }
        );

        const linea = salida
            .split(/\r?\n/)
            .find((texto) => texto.includes('MachineGuid'));

        if (!linea) {
            return null;
        }

        const partes = linea.trim().split(/\s+/);
        const machineGuid = partes[partes.length - 1];

        return machineGuid || null;
    } catch (error) {
        return null;
    }
}

function limpiarTexto(valor) {
    return String(valor || '')
        .trim()
        .toLowerCase();
}

function construirMaterialHuella() {
    const machineGuidWindows = obtenerMachineGuidWindows();

    const factores = {
        app_id: 'prismia-pos-local',
        plataforma: limpiarTexto(os.platform()),
        arquitectura: limpiarTexto(os.arch()),
        hostname: limpiarTexto(os.hostname()),
        machine_guid: limpiarTexto(machineGuidWindows),
    };

    const fuentePrincipal = factores.machine_guid
        ? 'windows_machine_guid'
        : 'hostname_fallback';

    const material = [
        factores.app_id,
        factores.plataforma,
        factores.arquitectura,
        factores.machine_guid || factores.hostname,
    ].join('|');

    return {
        material,
        fuentePrincipal,
        factores,
    };
}

function formatearHuellaCorta(huella) {
    const limpia = String(huella || '').toUpperCase();

    return [
        limpia.slice(0, 8),
        limpia.slice(8, 16),
        limpia.slice(16, 24),
        limpia.slice(24, 32),
    ]
        .filter(Boolean)
        .join('-');
}

function obtenerHuellaEquipo() {
    if (huellaCache) {
        return huellaCache;
    }

    const { material, fuentePrincipal, factores } = construirMaterialHuella();

    const huella = crypto
        .createHash('sha256')
        .update(material, 'utf8')
        .digest('hex');

    huellaCache = {
        huella,
        huella_corta: formatearHuellaCorta(huella),
        fuente: fuentePrincipal,
        factores_publicos: {
            app_id: factores.app_id,
            plataforma: factores.plataforma,
            arquitectura: factores.arquitectura,
            hostname_disponible: Boolean(factores.hostname),
            machine_guid_disponible: Boolean(factores.machine_guid),
        },
    };

    return huellaCache;
}

module.exports = {
    obtenerHuellaEquipo,
};