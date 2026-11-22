/**
 * Utilidades para migraciones.
 */

function escaparIdentificador(nombre) {
    return `"${String(nombre).replace(/"/g, '""')}"`;
}

/**
 * Reconstruye una tabla aplicando una transformación a su CREATE TABLE
 * (procedimiento de 12 pasos de https://sqlite.org/lang_altertable.html).
 *
 * Requisitos: la migración debe declarar desactivarForeignKeys: true y
 * ejecutarse dentro de la transacción del migrador.
 *
 * Conserva: datos, índices, triggers y el contador AUTOINCREMENT.
 *
 * @param {Database} db
 * @param {string} tabla nombre de la tabla
 * @param {(sql: string) => string} transformarSql recibe el CREATE TABLE
 *   original y devuelve el nuevo (sin cambiar columnas).
 */
function reconstruirTabla(db, tabla, transformarSql) {
    const definicion = db
        .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`)
        .get(tabla);

    if (!definicion) {
        throw new Error(`No existe la tabla ${tabla}.`);
    }

    const sqlNuevo = transformarSql(definicion.sql);

    if (sqlNuevo === definicion.sql) {
        return { cambiada: false };
    }

    const tablaTemporal = `${tabla}__reconstruida`;

    const cabecera = /^CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?("[^"]+"|`[^`]+`|\[[^\]]+\]|[A-Za-z_][A-Za-z0-9_]*)/i;

    if (!cabecera.test(sqlNuevo)) {
        throw new Error(`No se pudo interpretar el CREATE TABLE de ${tabla}.`);
    }

    const sqlTemporal = sqlNuevo.replace(cabecera, `CREATE TABLE ${escaparIdentificador(tablaTemporal)}`);

    const columnasOriginales = db
        .prepare(`SELECT name FROM pragma_table_info(?) ORDER BY cid`)
        .all(tabla)
        .map((columna) => columna.name);

    const objetosDependientes = db
        .prepare(`
            SELECT type, name, sql
            FROM sqlite_master
            WHERE tbl_name = ?
              AND type IN ('index', 'trigger')
              AND sql IS NOT NULL
        `)
        .all(tabla);

    const secuencia = db
        .prepare(`SELECT seq FROM sqlite_sequence WHERE name = ?`)
        .get(tabla);

    db.exec(`DROP TABLE IF EXISTS ${escaparIdentificador(tablaTemporal)}`);
    db.exec(sqlTemporal);

    const columnasNuevas = db
        .prepare(`SELECT name FROM pragma_table_info(?) ORDER BY cid`)
        .all(tablaTemporal)
        .map((columna) => columna.name);

    if (columnasNuevas.join(',') !== columnasOriginales.join(',')) {
        throw new Error(`La reconstrucción de ${tabla} cambiaría sus columnas; se cancela.`);
    }

    const listaColumnas = columnasOriginales.map(escaparIdentificador).join(', ');

    const filasOriginales = db.prepare(`SELECT COUNT(*) AS total FROM ${escaparIdentificador(tabla)}`).get().total;

    db.exec(`
        INSERT INTO ${escaparIdentificador(tablaTemporal)} (${listaColumnas})
        SELECT ${listaColumnas} FROM ${escaparIdentificador(tabla)}
    `);

    db.exec(`DROP TABLE ${escaparIdentificador(tabla)}`);
    db.exec(`ALTER TABLE ${escaparIdentificador(tablaTemporal)} RENAME TO ${escaparIdentificador(tabla)}`);

    for (const objeto of objetosDependientes) {
        db.exec(objeto.sql);
    }

    if (secuencia) {
        db.prepare(`
            UPDATE sqlite_sequence
            SET seq = MAX(seq, ?)
            WHERE name = ?
        `).run(secuencia.seq, tabla);

        const existe = db.prepare(`SELECT 1 FROM sqlite_sequence WHERE name = ?`).get(tabla);

        if (!existe) {
            db.prepare(`INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)`).run(tabla, secuencia.seq);
        }
    }

    const filasFinales = db.prepare(`SELECT COUNT(*) AS total FROM ${escaparIdentificador(tabla)}`).get().total;

    if (filasFinales !== filasOriginales) {
        throw new Error(`La reconstrucción de ${tabla} perdió filas (${filasOriginales} -> ${filasFinales}).`);
    }

    return { cambiada: true, filas: filasFinales };
}

/** Registra en auditoría una acción hecha por una migración (sin usuario). */
function registrarAuditoriaMigracion(db, { accion, tabla, datosAnteriores, datosNuevos }) {
    db.prepare(`
        INSERT INTO auditoria (
            id_usuario,
            accion,
            tabla_afectada,
            id_registro_afectado,
            datos_anteriores,
            datos_nuevos,
            ip,
            user_agent
        ) VALUES (NULL, ?, ?, NULL, ?, ?, 'local', 'migracion')
    `).run(
        accion,
        tabla,
        datosAnteriores === undefined ? null : JSON.stringify(datosAnteriores),
        datosNuevos === undefined ? null : JSON.stringify(datosNuevos)
    );
}

module.exports = {
    reconstruirTabla,
    registrarAuditoriaMigracion,
};
