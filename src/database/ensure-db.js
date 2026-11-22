const db = require('../config/db');
const { inicializarBaseDatos } = require('./init-db');
const migrator = require('./migrator');

const tablasMinimasParaArranque = [
    'roles',
    'usuarios',
    'clientes',
    'productos',
    'ventas',
    'detalle_ventas',
    'turnos_caja',
    'medios_pago',
    'unidades_medida',
    'numeraciones_documentos',
];

function contarTablasUsuario() {
    const resultado = db
        .prepare(`
            SELECT COUNT(*) AS total
            FROM sqlite_master
            WHERE type = 'table'
              AND name NOT LIKE 'sqlite_%'
        `)
        .get();

    return Number(resultado?.total || 0);
}

function tablaExiste(nombreTabla) {
    const tabla = db
        .prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name = ?
            LIMIT 1
        `)
        .get(nombreTabla);

    return Boolean(tabla);
}

function obtenerTablasMinimasFaltantes() {
    return tablasMinimasParaArranque.filter((tabla) => !tablaExiste(tabla));
}

function asegurarBaseDatos() {
    const totalTablas = contarTablasUsuario();

    if (totalTablas === 0) {
        console.log('====================================');
        console.log('No se encontró estructura de base de datos.');
        console.log('Inicializando base de datos limpia de Prismia...');
        console.log('====================================');

        inicializarBaseDatos();

        // Base nueva: se lleva a la última versión sin respaldo (no hay datos).
        const migracion = migrator.aplicarMigracionesPendientes(db, {
            crearRespaldo: false,
        });

        return {
            creada: true,
            ok: true,
            mensaje: 'Base de datos creada automáticamente.',
            migracion,
        };
    }

    const tablasFaltantes = obtenerTablasMinimasFaltantes();

    if (tablasFaltantes.length > 0) {
        console.warn('====================================');
        console.warn('La base de datos existe, pero parece incompleta.');
        console.warn(`Tablas mínimas faltantes: ${tablasFaltantes.join(', ')}`);
        console.warn('Ejecuta npm run db:validate para diagnosticar antes de continuar.');
        console.warn('====================================');

        return {
            creada: false,
            ok: false,
            mensaje: 'Base de datos existente con estructura mínima incompleta.',
            tablas_faltantes: tablasFaltantes,
        };
    }

    // Base existente: aplica migraciones pendientes con respaldo previo.
    const migracion = migrator.aplicarMigracionesPendientes(db, {
        crearRespaldo: true,
    });

    return {
        creada: false,
        ok: true,
        mensaje: 'Base de datos existente validada para arranque.',
        migracion,
    };
}

module.exports = {
    asegurarBaseDatos,
};