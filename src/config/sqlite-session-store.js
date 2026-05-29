const session = require('express-session');
const db = require('./db');

const OCHO_HORAS_EN_MS = 1000 * 60 * 60 * 8;

function ahoraEnMs() {
    return Date.now();
}

function normalizarFecha(valor) {
    if (!valor) {
        return null;
    }

    const fecha = valor instanceof Date ? valor : new Date(valor);
    const tiempo = fecha.getTime();

    return Number.isFinite(tiempo) ? tiempo : null;
}

function obtenerFechaExpiracionMs(sess, ttlMs) {
    const expiracionCookie = normalizarFecha(sess?.cookie?.expires);

    if (expiracionCookie) {
        return expiracionCookie;
    }

    const maxAge = Number(sess?.cookie?.originalMaxAge || sess?.cookie?.maxAge || ttlMs);

    if (Number.isFinite(maxAge) && maxAge > 0) {
        return ahoraEnMs() + maxAge;
    }

    return ahoraEnMs() + ttlMs;
}

function esErrorConexionCerrada(error) {
    const mensaje = String(error?.message || '').toLowerCase();

    return (
        mensaje.includes('not open') ||
        mensaje.includes('closed') ||
        mensaje.includes('database connection is not open') ||
        mensaje.includes('database is not open')
    );
}

class SQLiteSessionStore extends session.Store {
    constructor(opciones = {}) {
        super();

        this.ttlMs = Number(opciones.ttlMs || OCHO_HORAS_EN_MS);
        this.intervaloLimpiezaMs = Number(opciones.intervaloLimpiezaMs || 1000 * 60 * 30);

        this.crearTablaSiNoExiste();
        this.limpiarSesionesExpiradas();
        this.programarLimpieza();
    }

    crearTablaSiNoExiste() {
        db.prepare(`
            CREATE TABLE IF NOT EXISTS sesiones_http (
                id_sesion TEXT PRIMARY KEY,
                datos TEXT NOT NULL,
                fecha_expira_ms INTEGER NOT NULL,
                creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `).run();

        db.prepare(`
            CREATE INDEX IF NOT EXISTS idx_sesiones_http_fecha_expira_ms
            ON sesiones_http (fecha_expira_ms)
        `).run();
    }

    programarLimpieza() {
        if (!Number.isFinite(this.intervaloLimpiezaMs) || this.intervaloLimpiezaMs <= 0) {
            return;
        }

        const timer = setInterval(() => {
            this.limpiarSesionesExpiradas();
        }, this.intervaloLimpiezaMs);

        if (typeof timer.unref === 'function') {
            timer.unref();
        }
    }

    limpiarSesionesExpiradas() {
        try {
            db.prepare(`
                DELETE FROM sesiones_http
                WHERE fecha_expira_ms <= ?
            `).run(ahoraEnMs());
        } catch (error) {
            if (esErrorConexionCerrada(error)) {
                return;
            }

            throw error;
        }
    }

    get(sid, callback) {
        try {
            const sesion = db
                .prepare(`
                    SELECT datos, fecha_expira_ms
                    FROM sesiones_http
                    WHERE id_sesion = ?
                    LIMIT 1
                `)
                .get(sid);

            if (!sesion) {
                return callback(null, null);
            }

            if (Number(sesion.fecha_expira_ms) <= ahoraEnMs()) {
                this.destroy(sid, () => { });
                return callback(null, null);
            }

            return callback(null, JSON.parse(sesion.datos));
        } catch (error) {
            if (esErrorConexionCerrada(error)) {
                return callback(null, null);
            }

            return callback(error);
        }
    }

    set(sid, sess, callback = () => { }) {
        try {
            const datos = JSON.stringify(sess);
            const fechaExpiraMs = obtenerFechaExpiracionMs(sess, this.ttlMs);

            db.prepare(`
                INSERT INTO sesiones_http (
                    id_sesion,
                    datos,
                    fecha_expira_ms,
                    creado_en,
                    actualizado_en
                )
                VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT(id_sesion) DO UPDATE SET
                    datos = excluded.datos,
                    fecha_expira_ms = excluded.fecha_expira_ms,
                    actualizado_en = CURRENT_TIMESTAMP
            `).run(sid, datos, fechaExpiraMs);

            return callback(null);
        } catch (error) {
            if (esErrorConexionCerrada(error)) {
                return callback(null);
            }

            return callback(error);
        }
    }

    destroy(sid, callback = () => { }) {
        try {
            db.prepare(`
                DELETE FROM sesiones_http
                WHERE id_sesion = ?
            `).run(sid);

            return callback(null);
        } catch (error) {
            if (esErrorConexionCerrada(error)) {
                return callback(null);
            }

            return callback(error);
        }
    }

    touch(sid, sess, callback = () => { }) {
        try {
            const fechaExpiraMs = obtenerFechaExpiracionMs(sess, this.ttlMs);

            db.prepare(`
                UPDATE sesiones_http
                SET fecha_expira_ms = ?,
                    actualizado_en = CURRENT_TIMESTAMP
                WHERE id_sesion = ?
            `).run(fechaExpiraMs, sid);

            return callback(null);
        } catch (error) {
            if (esErrorConexionCerrada(error)) {
                return callback(null);
            }

            return callback(error);
        }
    }
}

module.exports = SQLiteSessionStore;