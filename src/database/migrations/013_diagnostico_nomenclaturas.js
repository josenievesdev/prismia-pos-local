const db = require('../../config/db');

const PALABRAS_CLAVE_TABLAS = [
    'comprob',
    'numer',
    'nomen',
    'consecut',
    'document',
    'factur',
    'cotiz',
    'remis',
];

function imprimirTitulo(titulo) {
    console.log('\n====================================');
    console.log(titulo);
    console.log('====================================');
}

function imprimirSubtitulo(titulo) {
    console.log('\n------------------------------------');
    console.log(titulo);
    console.log('------------------------------------');
}

function tablaExiste(nombreTabla) {
    const resultado = db
        .prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name = ?
            LIMIT 1
        `)
        .get(nombreTabla);

    return Boolean(resultado);
}

function obtenerColumnas(nombreTabla) {
    if (!tablaExiste(nombreTabla)) {
        return [];
    }

    return db.prepare(`PRAGMA table_info(${nombreTabla})`).all();
}

function imprimirTablasRelacionadas() {
    imprimirTitulo('1. TABLAS RELACIONADAS CON DOCUMENTOS / NUMERACIÓN');

    const tablas = db
        .prepare(`
            SELECT name, sql
            FROM sqlite_master
            WHERE type = 'table'
            ORDER BY name ASC
        `)
        .all()
        .filter((tabla) => {
            const nombre = String(tabla.name || '').toLowerCase();

            return PALABRAS_CLAVE_TABLAS.some((palabra) => nombre.includes(palabra));
        });

    if (tablas.length === 0) {
        console.log('No se encontraron tablas relacionadas por nombre.');
        return;
    }

    for (const tabla of tablas) {
        imprimirSubtitulo(tabla.name);

        const columnas = obtenerColumnas(tabla.name);

        for (const columna of columnas) {
            console.log(`${columna.name} | ${columna.type} | default: ${columna.dflt_value ?? 'NULL'}`);
        }
    }
}

function imprimirEstructuraComprobantes() {
    imprimirTitulo('2. ESTRUCTURA TABLA comprobantes');

    if (!tablaExiste('comprobantes')) {
        console.log('No existe tabla comprobantes.');
        return;
    }

    const columnas = obtenerColumnas('comprobantes');

    for (const columna of columnas) {
        console.log(`${columna.name} | ${columna.type} | default: ${columna.dflt_value ?? 'NULL'}`);
    }
}

function imprimirResumenComprobantes() {
    imprimirTitulo('3. RESUMEN DE COMPROBANTES POR PREFIJO');

    if (!tablaExiste('comprobantes')) {
        console.log('No existe tabla comprobantes.');
        return;
    }

    const resumen = db
        .prepare(`
            SELECT
                COALESCE(tipo_comprobante, 'sin_tipo') AS tipo_comprobante,
                COALESCE(prefijo, 'SIN_PREFIJO') AS prefijo,
                COUNT(*) AS cantidad,
                COALESCE(MIN(consecutivo), 0) AS primer_consecutivo,
                COALESCE(MAX(consecutivo), 0) AS ultimo_consecutivo,
                COALESCE(MAX(consecutivo), 0) + 1 AS siguiente_consecutivo,
                COALESCE(prefijo, 'SIN_PREFIJO') || '-' || printf('%06d', COALESCE(MAX(consecutivo), 0) + 1) AS siguiente_numero_sugerido
            FROM comprobantes
            GROUP BY
                COALESCE(tipo_comprobante, 'sin_tipo'),
                COALESCE(prefijo, 'SIN_PREFIJO')
            ORDER BY prefijo ASC, tipo_comprobante ASC
        `)
        .all();

    console.table(resumen);
}

function imprimirUltimosComprobantes() {
    imprimirTitulo('4. ÚLTIMOS 20 COMPROBANTES');

    if (!tablaExiste('comprobantes')) {
        console.log('No existe tabla comprobantes.');
        return;
    }

    const comprobantes = db
        .prepare(`
            SELECT
                id_comprobante,
                id_venta,
                tipo_comprobante,
                prefijo,
                numero,
                consecutivo,
                estado,
                fecha_emision
            FROM comprobantes
            ORDER BY id_comprobante DESC
            LIMIT 20
        `)
        .all();

    console.table(comprobantes);
}

function imprimirDuplicadosComprobantes() {
    imprimirTitulo('5. POSIBLES DUPLICADOS EN COMPROBANTES');

    if (!tablaExiste('comprobantes')) {
        console.log('No existe tabla comprobantes.');
        return;
    }

    const duplicadosNumero = db
        .prepare(`
            SELECT
                prefijo,
                numero,
                COUNT(*) AS repeticiones
            FROM comprobantes
            GROUP BY prefijo, numero
            HAVING COUNT(*) > 1
            ORDER BY repeticiones DESC
        `)
        .all();

    imprimirSubtitulo('Duplicados por prefijo + numero');

    if (duplicadosNumero.length === 0) {
        console.log('Sin duplicados por número.');
    } else {
        console.table(duplicadosNumero);
    }

    const duplicadosConsecutivo = db
        .prepare(`
            SELECT
                prefijo,
                consecutivo,
                COUNT(*) AS repeticiones
            FROM comprobantes
            GROUP BY prefijo, consecutivo
            HAVING COUNT(*) > 1
            ORDER BY repeticiones DESC
        `)
        .all();

    imprimirSubtitulo('Duplicados por prefijo + consecutivo');

    if (duplicadosConsecutivo.length === 0) {
        console.log('Sin duplicados por consecutivo.');
    } else {
        console.table(duplicadosConsecutivo);
    }
}

function imprimirVentasVsComprobantes() {
    imprimirTitulo('6. CONSISTENCIA VENTAS VS COMPROBANTES');

    if (!tablaExiste('ventas') || !tablaExiste('comprobantes')) {
        console.log('No existen ambas tablas: ventas y comprobantes.');
        return;
    }

    const ventasSinComprobante = db
        .prepare(`
            SELECT
                v.id_venta,
                v.numero_venta,
                v.fecha_venta,
                v.estado,
                v.total
            FROM ventas v
            LEFT JOIN comprobantes c
                ON c.id_venta = v.id_venta
            WHERE c.id_comprobante IS NULL
            ORDER BY v.id_venta DESC
            LIMIT 30
        `)
        .all();

    imprimirSubtitulo('Ventas sin comprobante');

    if (ventasSinComprobante.length === 0) {
        console.log('Todas las ventas tienen comprobante asociado.');
    } else {
        console.table(ventasSinComprobante);
    }

    const diferenciasNumero = db
        .prepare(`
            SELECT
                v.id_venta,
                v.numero_venta,
                c.numero AS comprobante_numero,
                c.prefijo,
                c.consecutivo,
                v.fecha_venta,
                v.estado
            FROM ventas v
            INNER JOIN comprobantes c
                ON c.id_venta = v.id_venta
            WHERE COALESCE(v.numero_venta, '') <> COALESCE(c.numero, '')
            ORDER BY v.id_venta DESC
            LIMIT 30
        `)
        .all();

    imprimirSubtitulo('Ventas cuyo numero_venta no coincide con comprobante.numero');

    if (diferenciasNumero.length === 0) {
        console.log('ventas.numero_venta coincide con comprobantes.numero.');
    } else {
        console.table(diferenciasNumero);
    }
}

function imprimirConfiguracionNegocio() {
    imprimirTitulo('7. CONFIGURACIÓN RELACIONADA');

    if (!tablaExiste('configuracion_negocio')) {
        console.log('No existe tabla configuracion_negocio.');
        return;
    }

    const columnas = obtenerColumnas('configuracion_negocio');

    const columnasSospechosas = columnas
        .map((columna) => columna.name)
        .filter((nombre) => {
            const normalizado = String(nombre || '').toLowerCase();

            return [
                'factura',
                'prefijo',
                'consecut',
                'numer',
                'comprob',
                'document',
                'cotiz',
                'remis',
            ].some((palabra) => normalizado.includes(palabra));
        });

    imprimirSubtitulo('Columnas relacionadas en configuracion_negocio');

    if (columnasSospechosas.length === 0) {
        console.log('No se encontraron columnas de numeración en configuracion_negocio.');
        return;
    }

    console.log(columnasSospechosas.join(', '));

    const fila = db
        .prepare(`
            SELECT *
            FROM configuracion_negocio
            LIMIT 1
        `)
        .get();

    if (!fila) {
        console.log('configuracion_negocio no tiene registros.');
        return;
    }

    const valores = {};

    for (const columna of columnasSospechosas) {
        valores[columna] = fila[columna];
    }

    console.table([valores]);
}

function ejecutarDiagnostico() {
    imprimirTitulo('DIAGNÓSTICO DE NOMENCLATURAS Y CONSECUTIVOS');

    imprimirTablasRelacionadas();
    imprimirEstructuraComprobantes();
    imprimirResumenComprobantes();
    imprimirUltimosComprobantes();
    imprimirDuplicadosComprobantes();
    imprimirVentasVsComprobantes();
    imprimirConfiguracionNegocio();

    imprimirTitulo('FIN DEL DIAGNÓSTICO');
    console.log('Este script no modificó la base de datos.');
}

ejecutarDiagnostico();