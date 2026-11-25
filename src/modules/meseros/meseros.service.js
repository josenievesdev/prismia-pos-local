/**
 * Meseros (perfil comidas y bares): quien atiende la mesa. Cada propina queda
 * a nombre del mesero que atendió; no se reparte entre todos.
 */
const meserosRepository = require('./meseros.repository');
const { limpiarTexto } = require('../../utils/comunes');

function normalizarNombre(valor) {
    return limpiarTexto(valor).replace(/\s+/g, ' ');
}

function listarMeseros() {
    return meserosRepository.listarMeseros();
}

function listarMeserosActivos() {
    return meserosRepository.listarMeseros({ soloActivos: true });
}

function crearMesero(datos = {}) {
    const nombre = normalizarNombre(datos.nombre);

    if (nombre.length < 2) {
        return { ok: false, mensaje: 'Escribe el nombre del mesero (mínimo 2 letras).' };
    }

    if (nombre.length > 60) {
        return { ok: false, mensaje: 'El nombre del mesero no puede pasar de 60 caracteres.' };
    }

    const existente = meserosRepository.obtenerMeseroPorNombre(nombre);

    if (existente) {
        return {
            ok: false,
            mensaje: existente.estado === 'activo'
                ? `Ya existe un mesero llamado "${existente.nombre}".`
                : `"${existente.nombre}" ya existe y está inactivo: actívalo en la lista.`,
        };
    }

    meserosRepository.crearMesero(nombre);

    return { ok: true, mensaje: `Mesero "${nombre}" agregado.` };
}

function cambiarEstadoMesero(idMesero, activar) {
    const id = Number.parseInt(idMesero, 10);
    const mesero = Number.isInteger(id) && id > 0 ? meserosRepository.obtenerMeseroPorId(id) : null;

    if (!mesero) {
        return { ok: false, mensaje: 'No se encontró el mesero.' };
    }

    meserosRepository.cambiarEstadoMesero(id, activar ? 'activo' : 'inactivo');

    return {
        ok: true,
        mensaje: activar ? `"${mesero.nombre}" está activo.` : `"${mesero.nombre}" quedó inactivo (sus propinas se conservan).`,
    };
}

function obtenerPorcentajeSugerido() {
    return meserosRepository.obtenerPorcentajePropinaSugerido();
}

function guardarPorcentajeSugerido(valor) {
    const porcentaje = Number.parseInt(String(valor ?? '').trim(), 10);

    if (!Number.isInteger(porcentaje) || porcentaje < 0 || porcentaje > 100) {
        return { ok: false, mensaje: 'El porcentaje sugerido debe estar entre 0 y 100.' };
    }

    meserosRepository.guardarPorcentajePropinaSugerido(porcentaje);

    return { ok: true, mensaje: `Propina sugerida: ${porcentaje} %.` };
}

module.exports = {
    listarMeseros,
    listarMeserosActivos,
    crearMesero,
    cambiarEstadoMesero,
    obtenerPorcentajeSugerido,
    guardarPorcentajeSugerido,
};
