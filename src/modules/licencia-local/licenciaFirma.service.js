const crypto = require('crypto');
const { PUBLIC_KEY_PEM } = require('../../config/licencia-public-key');

const PREFIJO_CODIGO = 'PRM1';
const PRODUCTO_ESPERADO = 'prismia-pos-local';

const PLANES_PERMITIDOS = new Set([
    'mensual',
    'trimestral',
    'semestral',
    'anual',
    'piloto',
]);

function decodificarBase64Url(valor) {
    let normalizado = String(valor || '')
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    while (normalizado.length % 4 !== 0) {
        normalizado += '=';
    }

    return Buffer.from(normalizado, 'base64');
}

function leerPayload(payloadBase64) {
    try {
        const buffer = decodificarBase64Url(payloadBase64);
        return JSON.parse(buffer.toString('utf8'));
    } catch (error) {
        return null;
    }
}

function verificarFirma({ prefijo, payloadBase64, firmaBase64 }) {
    if (!PUBLIC_KEY_PEM || !PUBLIC_KEY_PEM.includes('BEGIN PUBLIC KEY')) {
        return {
            ok: false,
            mensaje: 'La clave pública de licenciamiento no está configurada.',
        };
    }

    try {
        const datosFirmados = `${prefijo}.${payloadBase64}`;
        const firma = decodificarBase64Url(firmaBase64);

        const firmaValida = crypto.verify(
            null,
            Buffer.from(datosFirmados, 'utf8'),
            PUBLIC_KEY_PEM,
            firma
        );

        if (!firmaValida) {
            return {
                ok: false,
                mensaje: 'El código de activación no tiene una firma válida.',
            };
        }

        return {
            ok: true,
        };
    } catch (error) {
        return {
            ok: false,
            mensaje: 'No fue posible verificar la firma del código.',
        };
    }
}

function validarFechaTexto(fechaTexto, nombreCampo) {
    const fecha = new Date(fechaTexto);

    if (Number.isNaN(fecha.getTime())) {
        return {
            ok: false,
            mensaje: `El código contiene una fecha inválida en ${nombreCampo}.`,
        };
    }

    return {
        ok: true,
        fecha,
    };
}

function validarPayload(payload, huellaEquipoActual) {
    if (!payload || typeof payload !== 'object') {
        return {
            ok: false,
            mensaje: 'El código no contiene información de licencia válida.',
        };
    }

    if (payload.v !== 1) {
        return {
            ok: false,
            mensaje: 'La versión del código de activación no es compatible.',
        };
    }

    if (payload.producto !== PRODUCTO_ESPERADO) {
        return {
            ok: false,
            mensaje: 'El código no corresponde a Prismia POS Local.',
        };
    }

    if (!PLANES_PERMITIDOS.has(String(payload.plan || '').toLowerCase())) {
        return {
            ok: false,
            mensaje: 'El plan incluido en el código no es válido.',
        };
    }

    if (!payload.huella_equipo || payload.huella_equipo !== huellaEquipoActual) {
        return {
            ok: false,
            mensaje: 'El código no corresponde a este equipo.',
        };
    }

    const validacionInicio = validarFechaTexto(
        payload.fecha_inicio,
        'fecha_inicio'
    );

    if (!validacionInicio.ok) {
        return validacionInicio;
    }

    const validacionFin = validarFechaTexto(
        payload.fecha_fin,
        'fecha_fin'
    );

    if (!validacionFin.ok) {
        return validacionFin;
    }

    if (validacionFin.fecha.getTime() <= validacionInicio.fecha.getTime()) {
        return {
            ok: false,
            mensaje: 'La fecha final del código debe ser mayor a la fecha inicial.',
        };
    }

    if (validacionFin.fecha.getTime() < new Date().getTime()) {
        return {
            ok: false,
            mensaje: 'El código de activación ya está vencido.',
        };
    }

    const diasGracia = Number(payload.dias_gracia ?? 3);

    if (!Number.isInteger(diasGracia) || diasGracia < 0) {
        return {
            ok: false,
            mensaje: 'Los días de gracia del código no son válidos.',
        };
    }

    return {
        ok: true,
        fechaInicio: validacionInicio.fecha,
        fechaFin: validacionFin.fecha,
        diasGracia,
    };
}

function validarCodigoActivacion(codigoActivacion, opciones = {}) {
    const codigo = String(codigoActivacion || '').trim();

    if (!codigo) {
        return {
            ok: false,
            mensaje: 'Debes ingresar un código de activación.',
        };
    }

    const partes = codigo.split('.');

    if (partes.length !== 3) {
        return {
            ok: false,
            mensaje: 'El formato del código de activación no es válido.',
        };
    }

    const [prefijo, payloadBase64, firmaBase64] = partes;

    if (prefijo !== PREFIJO_CODIGO) {
        return {
            ok: false,
            mensaje: 'El prefijo del código de activación no es válido.',
        };
    }

    const payload = leerPayload(payloadBase64);

    if (!payload) {
        return {
            ok: false,
            mensaje: 'No fue posible leer el contenido del código.',
        };
    }

    const resultadoFirma = verificarFirma({
        prefijo,
        payloadBase64,
        firmaBase64,
    });

    if (!resultadoFirma.ok) {
        return resultadoFirma;
    }

    const resultadoPayload = validarPayload(
        payload,
        opciones.huellaEquipoActual
    );

    if (!resultadoPayload.ok) {
        return resultadoPayload;
    }

    return {
        ok: true,
        mensaje: 'Código de activación válido.',
        payload,
        fechaInicio: resultadoPayload.fechaInicio,
        fechaFin: resultadoPayload.fechaFin,
        diasGracia: resultadoPayload.diasGracia,
    };
}

module.exports = {
    validarCodigoActivacion,
};