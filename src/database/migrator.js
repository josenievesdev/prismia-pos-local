/**
 * Ejecutor de migraciones versionadas.
 *
 * - La versión del esquema vive en PRAGMA user_version (0 = esquema base de
 *   schema.sql, equivalente a las migraciones legacy 001-037 ya aplicadas).
 * - Las migraciones nuevas están en ./migraciones y se registran en orden en
 *   ./migraciones/index.js. Cada una se aplica en su propia transacción junto
 *   con el cambio de user_version: o se aplica completa o no se aplica.
 * - Antes de migrar una base con datos se crea una copia de respaldo
 *   (VACUUM INTO) en <backups>/pre-migracion.
 * - Se ejecuta automáticamente al arrancar (ver ensure-db.js), así las
 *   instalaciones de clientes se actualizan solas al instalar una versión nueva.
 */

const path = require('path');

const runtimePaths = require('../config/runtime-paths');
const migraciones = require('./migraciones');

function obtenerVersionActual(db) {
    return Number(db.pragma('user_version', { simple: true })) || 0;
}

function obtenerVersionObjetivo() {
    return migraciones.length;
}

function validarListaMigraciones() {
    migraciones.forEach((migracion, indice) => {
        const versionEsperada = indice + 1;

        if (migracion.version !== versionEsperada) {
            throw new Error(
                `Migración fuera de orden: posición ${versionEsperada} declara versión ${migracion.version}.`
            );
        }

        if (typeof migracion.up !== 'function' || !migracion.nombre) {
            throw new Error(`La migración ${versionEsperada} no tiene nombre o función up().`);
        }
    });
}

function crearRespaldoPreMigracion(db, versionActual, versionObjetivo) {
    const carpeta = path.join(runtimePaths.obtenerCarpetaBackupsBase(), 'pre-migracion');
    runtimePaths.asegurarCarpeta(carpeta);

    const marca = new Date().toISOString().replace(/[:.]/g, '-');
    const destino = path.join(
        carpeta,
        `prismia_v${versionActual}_a_v${versionObjetivo}_${marca}.sqlite`
    );

    db.exec(`VACUUM INTO '${destino.replace(/'/g, "''")}'`);

    return destino;
}

function aplicarMigracion(db, migracion) {
    const desactivarForeignKeys = migracion.desactivarForeignKeys === true;

    // PRAGMA foreign_keys no tiene efecto dentro de una transacción:
    // debe cambiarse antes de abrirla.
    if (desactivarForeignKeys) {
        db.pragma('foreign_keys = OFF');
    }

    try {
        db.transaction(() => {
            migracion.up(db);

            if (desactivarForeignKeys) {
                const violaciones = db.pragma('foreign_key_check');

                if (violaciones.length > 0) {
                    throw new Error(
                        `La migración ${migracion.version} dejaría ${violaciones.length} referencias inválidas.`
                    );
                }
            }

            db.pragma(`user_version = ${migracion.version}`);
        }).immediate();
    } finally {
        if (desactivarForeignKeys) {
            db.pragma('foreign_keys = ON');
        }
    }
}

/**
 * Aplica las migraciones pendientes.
 * @param {object} opciones.crearRespaldo false para bases recién creadas.
 * @param {function} opciones.log función de log (console.log por defecto).
 */
function aplicarMigracionesPendientes(db, { crearRespaldo = true, log = console.log } = {}) {
    validarListaMigraciones();

    const versionInicial = obtenerVersionActual(db);
    const versionObjetivo = obtenerVersionObjetivo();

    if (versionInicial > versionObjetivo) {
        throw new Error(
            `La base de datos está en la versión ${versionInicial}, más nueva que esta aplicación (${versionObjetivo}). `
            + 'Actualiza Prismia antes de abrir esta base.'
        );
    }

    const pendientes = migraciones.filter((migracion) => migracion.version > versionInicial);

    if (pendientes.length === 0) {
        return {
            version_inicial: versionInicial,
            version_final: versionInicial,
            aplicadas: [],
            respaldo: null,
        };
    }

    const respaldo = crearRespaldo
        ? crearRespaldoPreMigracion(db, versionInicial, versionObjetivo)
        : null;

    if (respaldo) {
        log(`Respaldo previo a migración creado: ${respaldo}`);
    }

    const aplicadas = [];

    for (const migracion of pendientes) {
        log(`Aplicando migración ${migracion.version}: ${migracion.nombre}...`);
        aplicarMigracion(db, migracion);
        aplicadas.push(migracion.version);
    }

    const integridad = db.pragma('quick_check', { simple: true });

    if (integridad !== 'ok') {
        throw new Error(`La verificación de integridad después de migrar falló: ${integridad}`);
    }

    log(`Base de datos actualizada a la versión ${obtenerVersionActual(db)}.`);

    return {
        version_inicial: versionInicial,
        version_final: obtenerVersionActual(db),
        aplicadas,
        respaldo,
    };
}

module.exports = {
    obtenerVersionActual,
    obtenerVersionObjetivo,
    aplicarMigracionesPendientes,
};
