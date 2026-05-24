const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const env = require('../../config/env');

const dbPath = path.resolve(process.cwd(), env.db.path);
const outputDir = path.resolve(process.cwd(), 'src/database/reports');
const outputSqlPath = path.join(outputDir, 'schema-consolidado-draft.sql');
const outputMdPath = path.join(outputDir, 'schema-consolidado-draft.md');

const TABLAS_EXCLUIDAS = new Set([
    'detalle_ventas_respaldo_007',
    'movimientos_inventario_respaldo_007',
]);

const ORDEN_PREFERIDO_TABLAS = [
    'roles',
    'usuarios',
    'usuario_roles',
    'configuracion_negocio',

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

function ensureOutputDir() {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
}

function normalizeCreateTableSql(sql) {
    if (!sql) return '';

    return sql.replace(
        /^CREATE\s+TABLE\s+/i,
        'CREATE TABLE IF NOT EXISTS '
    );
}

function normalizeCreateIndexSql(sql) {
    if (!sql) return '';

    return sql.replace(
        /^CREATE\s+(UNIQUE\s+)?INDEX\s+/i,
        (match, uniquePart) => `CREATE ${uniquePart || ''}INDEX IF NOT EXISTS `
    );
}

function normalizeCreateTriggerSql(sql) {
    if (!sql) return '';

    return sql.replace(
        /^CREATE\s+TRIGGER\s+/i,
        'CREATE TRIGGER IF NOT EXISTS '
    );
}

function getRows(db, sql, params = []) {
    return db.prepare(sql).all(params);
}

function getTables(db) {
    const rows = getRows(
        db,
        `
        SELECT name, sql
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
        `
    );

    return rows.filter((table) => !TABLAS_EXCLUIDAS.has(table.name));
}

function getIndexes(db, tableName) {
    const rows = getRows(
        db,
        `
        SELECT name, tbl_name, sql
        FROM sqlite_master
        WHERE type = 'index'
          AND tbl_name = ?
          AND sql IS NOT NULL
        ORDER BY name
        `,
        [tableName]
    );

    return rows;
}

function getTriggers(db, tableName) {
    const rows = getRows(
        db,
        `
        SELECT name, tbl_name, sql
        FROM sqlite_master
        WHERE type = 'trigger'
          AND tbl_name = ?
          AND sql IS NOT NULL
        ORDER BY name
        `,
        [tableName]
    );

    return rows;
}

function sortTables(tables) {
    const orderMap = new Map();

    ORDEN_PREFERIDO_TABLAS.forEach((tableName, index) => {
        orderMap.set(tableName, index);
    });

    return [...tables].sort((a, b) => {
        const orderA = orderMap.has(a.name) ? orderMap.get(a.name) : Number.MAX_SAFE_INTEGER;
        const orderB = orderMap.has(b.name) ? orderMap.get(b.name) : Number.MAX_SAFE_INTEGER;

        if (orderA !== orderB) {
            return orderA - orderB;
        }

        return a.name.localeCompare(b.name);
    });
}

function buildSchemaSql({ tables, indexesByTable, triggersByTable }) {
    const lines = [];

    lines.push('-- =========================================================');
    lines.push('-- Prismia POS Local');
    lines.push('-- Schema consolidado draft');
    lines.push('-- Generado automáticamente desde la BD actual de desarrollo');
    lines.push('-- Revisar antes de reemplazar src/database/schema.sql');
    lines.push('-- =========================================================');
    lines.push('');
    lines.push('PRAGMA foreign_keys = ON;');
    lines.push('');

    lines.push('-- =========================================================');
    lines.push('-- Tablas');
    lines.push('-- =========================================================');
    lines.push('');

    for (const table of tables) {
        lines.push(`-- Tabla: ${table.name}`);
        lines.push(`${normalizeCreateTableSql(table.sql)};`);
        lines.push('');
    }

    lines.push('-- =========================================================');
    lines.push('-- Índices');
    lines.push('-- =========================================================');
    lines.push('');

    for (const table of tables) {
        const indexes = indexesByTable.get(table.name) || [];

        if (indexes.length === 0) {
            continue;
        }

        lines.push(`-- Índices de ${table.name}`);

        for (const index of indexes) {
            lines.push(`${normalizeCreateIndexSql(index.sql)};`);
        }

        lines.push('');
    }

    lines.push('-- =========================================================');
    lines.push('-- Triggers');
    lines.push('-- =========================================================');
    lines.push('');

    for (const table of tables) {
        const triggers = triggersByTable.get(table.name) || [];

        if (triggers.length === 0) {
            continue;
        }

        lines.push(`-- Triggers de ${table.name}`);

        for (const trigger of triggers) {
            lines.push(`${normalizeCreateTriggerSql(trigger.sql)};`);
        }

        lines.push('');
    }

    return lines.join('\n');
}

function buildMarkdownReport({ tables, indexesByTable, triggersByTable, excludedTables }) {
    const lines = [];

    lines.push('# Schema consolidado draft');
    lines.push('');
    lines.push(`Generado en: ${new Date().toISOString()}`);
    lines.push('');
    lines.push(`BD origen: \`${dbPath}\``);
    lines.push(`SQL generado: \`${outputSqlPath}\``);
    lines.push('');
    lines.push('## Resumen');
    lines.push('');
    lines.push('| Métrica | Valor |');
    lines.push('|---|---:|');
    lines.push(`| Tablas incluidas | ${tables.length} |`);
    lines.push(`| Tablas excluidas | ${excludedTables.length} |`);
    lines.push(`| Índices creados manualmente | ${Array.from(indexesByTable.values()).reduce((total, indexes) => total + indexes.length, 0)} |`);
    lines.push(`| Triggers | ${Array.from(triggersByTable.values()).reduce((total, triggers) => total + triggers.length, 0)} |`);
    lines.push('');

    lines.push('## Tablas incluidas');
    lines.push('');
    for (const table of tables) {
        lines.push(`- ${table.name}`);
    }
    lines.push('');

    lines.push('## Tablas excluidas');
    lines.push('');
    if (excludedTables.length === 0) {
        lines.push('No se excluyeron tablas.');
    } else {
        for (const tableName of excludedTables) {
            lines.push(`- ${tableName}`);
        }
    }
    lines.push('');

    lines.push('## Revisión requerida');
    lines.push('');
    lines.push('- Confirmar que el archivo generado NO incluya tablas de respaldo o prueba.');
    lines.push('- Confirmar que no se incluyan datos de QA.');
    lines.push('- Confirmar que las tablas de catálogo se llenarán con semillas controladas.');
    lines.push('- Confirmar que roles, medios de pago, unidades, numeraciones y consumidor final se insertarán desde init-db.js.');
    lines.push('- Confirmar que este draft puede reemplazar schema.sql después de revisión.');
    lines.push('');

    return lines.join('\n');
}

function generateSchema() {
    if (!fs.existsSync(dbPath)) {
        throw new Error(`No se encontró la base de datos en: ${dbPath}`);
    }

    ensureOutputDir();

    const db = new Database(dbPath, {
        readonly: true,
        fileMustExist: true,
    });

    const allTables = getRows(
        db,
        `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
        `
    ).map((table) => table.name);

    const excludedTables = allTables.filter((tableName) => TABLAS_EXCLUIDAS.has(tableName));

    const tables = sortTables(getTables(db));

    const indexesByTable = new Map();
    const triggersByTable = new Map();

    for (const table of tables) {
        indexesByTable.set(table.name, getIndexes(db, table.name));
        triggersByTable.set(table.name, getTriggers(db, table.name));
    }

    const schemaSql = buildSchemaSql({
        tables,
        indexesByTable,
        triggersByTable,
    });

    const markdownReport = buildMarkdownReport({
        tables,
        indexesByTable,
        triggersByTable,
        excludedTables,
    });

    fs.writeFileSync(outputSqlPath, schemaSql, 'utf8');
    fs.writeFileSync(outputMdPath, markdownReport, 'utf8');

    db.close();

    console.log('========================================');
    console.log('Schema consolidado draft generado.');
    console.log('========================================');
    console.log(`SQL: ${outputSqlPath}`);
    console.log(`MD:  ${outputMdPath}`);
    console.log('----------------------------------------');
    console.log(`Tablas incluidas: ${tables.length}`);
    console.log(`Tablas excluidas: ${excludedTables.length}`);
    console.log('Excluidas:', excludedTables.join(', ') || 'ninguna');
    console.log('========================================');
}

try {
    generateSchema();
} catch (error) {
    console.error('Error generando schema consolidado draft:');
    console.error(error);
    process.exit(1);
}