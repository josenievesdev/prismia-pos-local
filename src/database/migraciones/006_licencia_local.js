/**
 * Migración 006 · Licencia local.
 *
 * Equivale a las migraciones manuales 038, 039 y 040 (src/database/migrations),
 * que en instalaciones existentes había que correr a mano con
 * "npm run db:migrate:038" (etc.). Aquí se aplican solas al arrancar, con el
 * respaldo previo de todas las migraciones versionadas.
 *
 * Es idempotente: crea la tabla si no existe, agrega solo las columnas que
 * falten y deja el registro inicial de prueba si no hay ninguno. Una base que
 * ya corrió 038-040 a mano no cambia.
 */

const columnasAmpliadas = [
    ['plan', `ALTER TABLE licencia_local ADD COLUMN plan TEXT NOT NULL DEFAULT 'prueba'`],
    ['dias_gracia', 'ALTER TABLE licencia_local ADD COLUMN dias_gracia INTEGER NOT NULL DEFAULT 3'],
    ['fecha_ultimo_uso', 'ALTER TABLE licencia_local ADD COLUMN fecha_ultimo_uso TEXT'],
    ['fecha_activacion', 'ALTER TABLE licencia_local ADD COLUMN fecha_activacion TEXT'],
    ['huella_equipo', 'ALTER TABLE licencia_local ADD COLUMN huella_equipo TEXT'],
    ['codigo_firmado', 'ALTER TABLE licencia_local ADD COLUMN codigo_firmado TEXT'],
    ['firma_valida', 'ALTER TABLE licencia_local ADD COLUMN firma_valida INTEGER NOT NULL DEFAULT 0'],
    ['motivo_bloqueo', 'ALTER TABLE licencia_local ADD COLUMN motivo_bloqueo TEXT'],
    ['origen_activacion', `ALTER TABLE licencia_local ADD COLUMN origen_activacion TEXT NOT NULL DEFAULT 'local'`],
    ['ultima_validacion_online', 'ALTER TABLE licencia_local ADD COLUMN ultima_validacion_online TEXT'],
    ['ultimo_intento_online', 'ALTER TABLE licencia_local ADD COLUMN ultimo_intento_online TEXT'],
    ['cliente_licencia', 'ALTER TABLE licencia_local ADD COLUMN cliente_licencia TEXT'],
    ['ultimo_nonce_licencia', 'ALTER TABLE licencia_local ADD COLUMN ultimo_nonce_licencia TEXT'],
    ['fecha_emision_codigo', 'ALTER TABLE licencia_local ADD COLUMN fecha_emision_codigo TEXT'],
];

function up(db) {
    // 038: tabla base (misma definición que la migración original)
    db.exec(`
        CREATE TABLE IF NOT EXISTS licencia_local (
            id_licencia INTEGER PRIMARY KEY CHECK (id_licencia = 1),
            estado TEXT NOT NULL DEFAULT 'prueba'
                CHECK (estado IN ('prueba', 'activa', 'vencida', 'bloqueada')),
            fecha_inicio_prueba TEXT,
            fecha_fin_prueba TEXT,
            fecha_inicio_periodo TEXT,
            fecha_fin_periodo TEXT,
            dias_prueba INTEGER NOT NULL DEFAULT 30,
            codigo_activacion TEXT,
            nota TEXT,
            creado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            actualizado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );
    `);

    // 039 y 040: columnas de mensualidades y de activación firmada
    const existentes = new Set(db.prepare('PRAGMA table_info(licencia_local)').all().map((c) => c.name));

    for (const [columna, sql] of columnasAmpliadas) {
        if (!existentes.has(columna)) {
            db.exec(sql);
        }
    }

    // 038: registro inicial de prueba (único; id_licencia = 1)
    const existe = db.prepare('SELECT id_licencia FROM licencia_local WHERE id_licencia = 1').get();

    if (!existe) {
        db.prepare(`
            INSERT INTO licencia_local (id_licencia, estado, dias_prueba, nota)
            VALUES (1, 'prueba', 30, 'Registro inicial para prueba local de Prismia POS Local.')
        `).run();
    }
}

module.exports = {
    version: 6,
    nombre: 'Licencia local (equivale a las migraciones manuales 038-040)',
    up,
};
