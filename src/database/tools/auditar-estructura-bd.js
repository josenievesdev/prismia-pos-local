const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const env = require('../../config/env');

const dbPath = path.resolve(process.cwd(), env.db.path);
const schemaPath = path.resolve(process.cwd(), 'src/database/schema.sql');
const reportDir = path.resolve(process.cwd(), 'src/database/reports');

const jsonReportPath = path.join(reportDir, 'diagnostico-estructura-bd.json');
const markdownReportPath = path.join(reportDir, 'diagnostico-estructura-bd.md');

function quoteIdentifier(identifier) {
    return `"${String(identifier).replace(/"/g, '""')}"`;
}

function ensureReportDir() {
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
}

function readSchemaSql() {
    if (!fs.existsSync(schemaPath)) {
        return {
            exists: false,
            raw: '',
            tables: [],
        };
    }

    const raw = fs.readFileSync(schemaPath, 'utf8');

    const tables = [];
    const regex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`[]?([a-zA-Z0-9_]+)["`\]]?/gi;

    let match;
    while ((match = regex.exec(raw)) !== null) {
        tables.push(match[1]);
    }

    return {
        exists: true,
        raw,
        tables: [...new Set(tables)].sort((a, b) => a.localeCompare(b)),
    };
}

function getRows(db, sql, params = []) {
    return db.prepare(sql).all(params);
}

function getSingleValue(db, sql, params = []) {
    const row = db.prepare(sql).get(params);
    if (!row) return null;
    const firstKey = Object.keys(row)[0];
    return row[firstKey];
}

function getTableColumns(db, tableName) {
    return getRows(db, `PRAGMA table_info(${quoteIdentifier(tableName)})`).map((column) => ({
        cid: column.cid,
        nombre: column.name,
        tipo: column.type || '',
        obligatorio: column.notnull === 1,
        valor_defecto: column.dflt_value,
        llave_primaria: column.pk === 1,
    }));
}

function getForeignKeys(db, tableName) {
    return getRows(db, `PRAGMA foreign_key_list(${quoteIdentifier(tableName)})`).map((fk) => ({
        id: fk.id,
        secuencia: fk.seq,
        tabla_referenciada: fk.table,
        desde: fk.from,
        hacia: fk.to,
        on_update: fk.on_update,
        on_delete: fk.on_delete,
        match: fk.match,
    }));
}

function getIndexes(db, tableName) {
    const indexes = getRows(db, `PRAGMA index_list(${quoteIdentifier(tableName)})`);

    return indexes.map((index) => {
        const columns = getRows(db, `PRAGMA index_info(${quoteIdentifier(index.name)})`).map((column) => ({
            secuencia: column.seqno,
            cid: column.cid,
            nombre: column.name,
        }));

        return {
            nombre: index.name,
            unico: index.unique === 1,
            origen: index.origin,
            parcial: index.partial === 1,
            columnas: columns,
        };
    });
}

function getTriggers(db, tableName) {
    return getRows(
        db,
        `
        SELECT name, sql
        FROM sqlite_master
        WHERE type = 'trigger'
          AND tbl_name = ?
        ORDER BY name
        `,
        [tableName]
    ).map((trigger) => ({
        nombre: trigger.name,
        sql: trigger.sql,
    }));
}

function getCreateSql(db, tableName) {
    return getSingleValue(
        db,
        `
        SELECT sql
        FROM sqlite_master
        WHERE type = 'table'
          AND name = ?
        LIMIT 1
        `,
        [tableName]
    );
}

function getTableCount(db, tableName) {
    try {
        return getSingleValue(db, `SELECT COUNT(*) AS total FROM ${quoteIdentifier(tableName)}`);
    } catch (error) {
        return {
            error: error.message,
        };
    }
}

function detectPotentialDevTables(tableNames) {
    return tableNames.filter((tableName) => {
        const normalized = tableName.toLowerCase();

        return (
            normalized.includes('respaldo') ||
            normalized.includes('backup') ||
            normalized.includes('tmp') ||
            normalized.includes('temp') ||
            normalized.includes('prueba') ||
            normalized.includes('diagnostico')
        );
    });
}

function auditDatabase() {
    if (!fs.existsSync(dbPath)) {
        throw new Error(`No se encontró la base de datos en: ${dbPath}`);
    }

    ensureReportDir();

    const db = new Database(dbPath, {
        readonly: true,
        fileMustExist: true,
    });

    db.pragma('foreign_keys = ON');

    const schemaSql = readSchemaSql();

    const tableRows = getRows(
        db,
        `
        SELECT name, sql
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
        `
    );

    const tableNames = tableRows.map((table) => table.name);

    const views = getRows(
        db,
        `
        SELECT name, sql
        FROM sqlite_master
        WHERE type = 'view'
        ORDER BY name
        `
    );

    const globalTriggers = getRows(
        db,
        `
        SELECT name, tbl_name, sql
        FROM sqlite_master
        WHERE type = 'trigger'
        ORDER BY name
        `
    );

    const tables = tableNames.map((tableName) => ({
        nombre: tableName,
        cantidad_registros: getTableCount(db, tableName),
        crear_sql: getCreateSql(db, tableName),
        columnas: getTableColumns(db, tableName),
        foreign_keys: getForeignKeys(db, tableName),
        indices: getIndexes(db, tableName),
        triggers: getTriggers(db, tableName),
    }));

    const schemaTablesSet = new Set(schemaSql.tables);
    const dbTablesSet = new Set(tableNames);

    const missingInSchema = tableNames.filter((tableName) => !schemaTablesSet.has(tableName));
    const missingInDatabase = schemaSql.tables.filter((tableName) => !dbTablesSet.has(tableName));

    const possibleDevTables = detectPotentialDevTables(tableNames);

    const report = {
        generado_en: new Date().toISOString(),
        db_path: dbPath,
        schema_path: schemaPath,
        resumen: {
            total_tablas_bd_actual: tableNames.length,
            total_tablas_schema_sql: schemaSql.tables.length,
            tablas_en_bd_no_en_schema: missingInSchema.length,
            tablas_en_schema_no_en_bd: missingInDatabase.length,
            posibles_tablas_desarrollo_o_respaldo: possibleDevTables.length,
            total_vistas: views.length,
            total_triggers: globalTriggers.length,
        },
        comparacion_schema_vs_bd: {
            tablas_en_bd_no_en_schema: missingInSchema,
            tablas_en_schema_no_en_bd: missingInDatabase,
            posibles_tablas_desarrollo_o_respaldo: possibleDevTables,
        },
        tablas_schema_sql: schemaSql.tables,
        tablas_bd_actual: tableNames,
        tablas: tables,
        vistas: views,
        triggers: globalTriggers,
    };

    fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2), 'utf8');
    fs.writeFileSync(markdownReportPath, buildMarkdownReport(report), 'utf8');

    db.close();

    console.log('========================================');
    console.log('Diagnóstico de estructura BD completado.');
    console.log('========================================');
    console.log(`BD analizada: ${dbPath}`);
    console.log(`Reporte JSON: ${jsonReportPath}`);
    console.log(`Reporte MD:   ${markdownReportPath}`);
    console.log('----------------------------------------');
    console.log(`Tablas BD actual: ${report.resumen.total_tablas_bd_actual}`);
    console.log(`Tablas schema.sql: ${report.resumen.total_tablas_schema_sql}`);
    console.log(`Tablas en BD no incluidas en schema.sql: ${report.resumen.tablas_en_bd_no_en_schema}`);
    console.log(`Tablas en schema.sql no presentes en BD: ${report.resumen.tablas_en_schema_no_en_bd}`);
    console.log('========================================');
}

function buildMarkdownReport(report) {
    const lines = [];

    lines.push('# Diagnóstico de estructura de base de datos');
    lines.push('');
    lines.push(`Generado en: ${report.generado_en}`);
    lines.push('');
    lines.push(`BD analizada: \`${report.db_path}\``);
    lines.push(`Schema actual: \`${report.schema_path}\``);
    lines.push('');

    lines.push('## Resumen');
    lines.push('');
    lines.push('| Métrica | Valor |');
    lines.push('|---|---:|');
    lines.push(`| Tablas en BD actual | ${report.resumen.total_tablas_bd_actual} |`);
    lines.push(`| Tablas en schema.sql | ${report.resumen.total_tablas_schema_sql} |`);
    lines.push(`| Tablas en BD no incluidas en schema.sql | ${report.resumen.tablas_en_bd_no_en_schema} |`);
    lines.push(`| Tablas en schema.sql no presentes en BD | ${report.resumen.tablas_en_schema_no_en_bd} |`);
    lines.push(`| Posibles tablas de desarrollo/respaldo | ${report.resumen.posibles_tablas_desarrollo_o_respaldo} |`);
    lines.push(`| Vistas | ${report.resumen.total_vistas} |`);
    lines.push(`| Triggers | ${report.resumen.total_triggers} |`);
    lines.push('');

    lines.push('## Tablas en BD actual que NO están en schema.sql');
    lines.push('');
    if (report.comparacion_schema_vs_bd.tablas_en_bd_no_en_schema.length === 0) {
        lines.push('No hay diferencias.');
    } else {
        for (const tableName of report.comparacion_schema_vs_bd.tablas_en_bd_no_en_schema) {
            lines.push(`- ${tableName}`);
        }
    }
    lines.push('');

    lines.push('## Tablas en schema.sql que NO están en BD actual');
    lines.push('');
    if (report.comparacion_schema_vs_bd.tablas_en_schema_no_en_bd.length === 0) {
        lines.push('No hay diferencias.');
    } else {
        for (const tableName of report.comparacion_schema_vs_bd.tablas_en_schema_no_en_bd) {
            lines.push(`- ${tableName}`);
        }
    }
    lines.push('');

    lines.push('## Posibles tablas de desarrollo, prueba o respaldo');
    lines.push('');
    if (report.comparacion_schema_vs_bd.posibles_tablas_desarrollo_o_respaldo.length === 0) {
        lines.push('No se detectaron por nombre.');
    } else {
        for (const tableName of report.comparacion_schema_vs_bd.posibles_tablas_desarrollo_o_respaldo) {
            lines.push(`- ${tableName}`);
        }
    }
    lines.push('');

    lines.push('## Estructura por tabla');
    lines.push('');

    for (const table of report.tablas) {
        lines.push(`### ${table.nombre}`);
        lines.push('');
        lines.push(`Registros actuales: ${table.cantidad_registros}`);
        lines.push('');
        lines.push('| Columna | Tipo | Obligatoria | Default | PK |');
        lines.push('|---|---|---:|---|---:|');

        for (const column of table.columnas) {
            lines.push(
                `| ${column.nombre} | ${column.tipo || ''} | ${column.obligatorio ? 'Sí' : 'No'} | ${column.valor_defecto ?? ''} | ${column.llave_primaria ? 'Sí' : 'No'} |`
            );
        }

        if (table.foreign_keys.length > 0) {
            lines.push('');
            lines.push('Foreign keys:');
            for (const fk of table.foreign_keys) {
                lines.push(
                    `- ${fk.desde} → ${fk.tabla_referenciada}.${fk.hacia} | ON UPDATE ${fk.on_update} | ON DELETE ${fk.on_delete}`
                );
            }
        }

        if (table.indices.length > 0) {
            lines.push('');
            lines.push('Índices:');
            for (const index of table.indices) {
                const columns = index.columnas.map((column) => column.nombre).join(', ');
                lines.push(`- ${index.nombre}${index.unico ? ' UNIQUE' : ''}: ${columns}`);
            }
        }

        if (table.triggers.length > 0) {
            lines.push('');
            lines.push('Triggers:');
            for (const trigger of table.triggers) {
                lines.push(`- ${trigger.nombre}`);
            }
        }

        lines.push('');
    }

    return lines.join('\n');
}

try {
    auditDatabase();
} catch (error) {
    console.error('Error generando diagnóstico de estructura BD:');
    console.error(error);
    process.exit(1);
}