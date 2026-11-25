/**
 * Migración 009 · El negocio define si es responsable de IVA.
 *
 * Un negocio no responsable de IVA no puede cobrarlo. Desde ahora, cuando el
 * negocio dice que NO es responsable, ninguna venta, cotización ni remisión
 * lleva IVA. Si dice que SÍ, el IVA se elige en cada producto.
 *
 * Antes, "responsable de IVA" solo afectaba las compras y venía desmarcado por
 * defecto, así que un "no" guardado no significa que el negocio lo haya
 * decidido. `iva_definido` distingue eso: mientras sea 0 todo sigue como antes
 * (cada producto cobra su IVA) y el Inicio pide definirlo. Quien ya se había
 * marcado responsable sí lo decidió.
 */

function up(db) {
    const columnas = db.prepare('PRAGMA table_info(configuracion_negocio)').all().map((columna) => columna.name);

    if (!columnas.includes('iva_definido')) {
        db.prepare(`
            ALTER TABLE configuracion_negocio
            ADD COLUMN iva_definido INTEGER NOT NULL DEFAULT 0 CHECK (iva_definido IN (0, 1))
        `).run();
    }

    db.prepare('UPDATE configuracion_negocio SET iva_definido = 1 WHERE maneja_iva = 1').run();
}

module.exports = {
    version: 9,
    nombre: 'El negocio define si es responsable de IVA',
    up,
};
