const db = require('../config/db');
const { inicializarBaseDatos } = require('./init-db');
const migrator = require('./migrator');

const tablasMinimasParaArranque = [
    'roles',
    'usuarios',
    'usuario_roles',
    'configuracion_negocio',
    'licencia_local',
    'catalogo_departamentos',
    'catalogo_municipios',
    'categorias_productos',
    'unidades_medida',
    'productos',
    'clientes',
    'proveedores',
    'medios_pago',
    'numeraciones_documentos',
    'turnos_caja',
    'movimientos_caja',
    'ventas',
    'detalle_ventas',
    'pagos_venta',
    'comprobantes',
    'anulaciones_venta',
    'devoluciones_venta',
    'detalle_devoluciones_venta',
    'notas_credito',
    'detalle_notas_credito',
    'movimientos_inventario',
    'conteos_inventario',
    'detalle_conteos_inventario',
    'categorias_gasto',
    'gastos',
    'compras',
    'compras_detalle',
    'pagos_compras_proveedores',
    'cotizaciones',
    'detalle_cotizaciones',
    'remisiones',
    'detalle_remisiones',
    'auditoria',
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

// Tablas que crean las migraciones versionadas (no el esquema base): en una base
// existente pueden faltar ANTES de migrar; se verifican después de migrar.
const tablasCreadasPorMigraciones = new Set(['licencia_local']);

function obtenerTablasMinimasFaltantes({ incluirMigradas = true } = {}) {
    return tablasMinimasParaArranque
        .filter((tabla) => incluirMigradas || !tablasCreadasPorMigraciones.has(tabla))
        .filter((tabla) => !tablaExiste(tabla));
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

    const tablasFaltantes = obtenerTablasMinimasFaltantes({ incluirMigradas: false });

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

    // Después de migrar deben estar todas (incluida licencia_local).
    const faltantesTrasMigrar = obtenerTablasMinimasFaltantes();

    if (faltantesTrasMigrar.length > 0) {
        console.warn(`Tablas mínimas faltantes tras migrar: ${faltantesTrasMigrar.join(', ')}`);

        return {
            creada: false,
            ok: false,
            mensaje: 'Base de datos existente con estructura mínima incompleta.',
            tablas_faltantes: faltantesTrasMigrar,
            migracion,
        };
    }

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