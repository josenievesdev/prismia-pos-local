const db = require('../config/db');

const errores = [];

const tablasCriticas = [
    'roles',
    'usuarios',
    'usuario_roles',
    'configuracion_negocio',
    'clientes',
    'productos',
    'ventas',
    'detalle_ventas',
    'pagos_venta',
    'turnos_caja',
    'movimientos_caja',
    'medios_pago',
    'unidades_medida',
    'numeraciones_documentos',
    'proveedores',
    'compras',
    'compras_detalle',
    'pagos_compras_proveedores',
    'movimientos_inventario',
    'conteos_inventario',
    'cotizaciones',
    'remisiones',
    'notas_credito',
];

const columnasCriticas = [
    { tabla: 'compras', columna: 'estado_pago' },
    { tabla: 'compras', columna: 'saldo_pendiente' },
    { tabla: 'pagos_compras_proveedores', columna: 'origen_pago' },
    { tabla: 'productos', columna: 'costo_promedio' },
    { tabla: 'productos', columna: 'ultimo_costo' },
    { tabla: 'ventas', columna: 'id_turno_caja' },
    { tabla: 'pagos_venta', columna: 'id_medio_pago' },
    { tabla: 'movimientos_caja', columna: 'id_medio_pago' },
];

const semillasMinimas = [
    {
        nombre: 'roles > 0',
        tabla: 'roles',
        sql: 'SELECT COUNT(*) AS total FROM roles',
        minimo: 1,
    },
    {
        nombre: 'usuarios >= 1',
        tabla: 'usuarios',
        sql: 'SELECT COUNT(*) AS total FROM usuarios',
        minimo: 1,
    },
    {
        nombre: 'medios_pago >= 8',
        tabla: 'medios_pago',
        sql: 'SELECT COUNT(*) AS total FROM medios_pago',
        minimo: 8,
    },
    {
        nombre: 'unidades_medida >= 10',
        tabla: 'unidades_medida',
        sql: 'SELECT COUNT(*) AS total FROM unidades_medida',
        minimo: 10,
    },
    {
        nombre: 'numeraciones_documentos >= 5',
        tabla: 'numeraciones_documentos',
        sql: 'SELECT COUNT(*) AS total FROM numeraciones_documentos',
        minimo: 5,
    },
    {
        nombre: 'cliente consumidor final = 1',
        tabla: 'clientes',
        sql: 'SELECT COUNT(*) AS total FROM clientes WHERE es_consumidor_final = 1',
        exacto: 1,
    },
];

function registrarOk(mensaje) {
    console.log(`[OK] ${mensaje}`);
}

function registrarError(mensaje) {
    errores.push(mensaje);
    console.error(`[ERROR] ${mensaje}`);
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

function obtenerColumnas(nombreTabla) {
    const tablaSegura = String(nombreTabla).replace(/"/g, '""');

    return db
        .prepare(`PRAGMA table_info("${tablaSegura}")`)
        .all()
        .map((columna) => columna.name);
}

function columnaExiste(nombreTabla, nombreColumna) {
    if (!tablaExiste(nombreTabla)) {
        return false;
    }

    return obtenerColumnas(nombreTabla).includes(nombreColumna);
}

function obtenerTotal(sql) {
    const resultado = db.prepare(sql).get();
    return Number(resultado?.total || 0);
}

function validarTablasCriticas() {
    console.log('\nValidando tablas críticas...');

    for (const tabla of tablasCriticas) {
        if (tablaExiste(tabla)) {
            registrarOk(`Tabla encontrada: ${tabla}`);
        } else {
            registrarError(`Falta la tabla crítica: ${tabla}`);
        }
    }
}

function validarColumnasCriticas() {
    console.log('\nValidando columnas críticas...');

    for (const item of columnasCriticas) {
        if (!tablaExiste(item.tabla)) {
            registrarError(`No se puede validar ${item.tabla}.${item.columna} porque falta la tabla ${item.tabla}`);
            continue;
        }

        if (columnaExiste(item.tabla, item.columna)) {
            registrarOk(`Columna encontrada: ${item.tabla}.${item.columna}`);
        } else {
            registrarError(`Falta la columna crítica: ${item.tabla}.${item.columna}`);
        }
    }
}

function validarSemillasMinimas() {
    console.log('\nValidando semillas mínimas...');

    for (const semilla of semillasMinimas) {
        if (!tablaExiste(semilla.tabla)) {
            registrarError(`No se puede validar ${semilla.nombre} porque falta la tabla ${semilla.tabla}`);
            continue;
        }

        try {
            const total = obtenerTotal(semilla.sql);

            if (typeof semilla.exacto === 'number') {
                if (total === semilla.exacto) {
                    registrarOk(`${semilla.nombre} (${total})`);
                } else {
                    registrarError(`${semilla.nombre}. Valor actual: ${total}`);
                }

                continue;
            }

            if (total >= semilla.minimo) {
                registrarOk(`${semilla.nombre} (${total})`);
            } else {
                registrarError(`${semilla.nombre}. Valor actual: ${total}`);
            }
        } catch (error) {
            registrarError(`Error validando ${semilla.nombre}: ${error.message}`);
        }
    }
}

function imprimirResultadoFinal() {
    console.log('\n====================================');

    if (errores.length > 0) {
        console.error(`Validación fallida. Errores encontrados: ${errores.length}`);
        console.log('====================================');
        process.exitCode = 1;
        return;
    }

    console.log('Validación correcta. La base de datos tiene la estructura mínima esperada.');
    console.log('====================================');
}

function validarBaseDeDatos() {
    console.log('====================================');
    console.log('Validando base de datos local...');
    console.log('====================================');

    validarTablasCriticas();
    validarColumnasCriticas();
    validarSemillasMinimas();
    imprimirResultadoFinal();
}

try {
    validarBaseDeDatos();
} catch (error) {
    console.error('Error inesperado validando la base de datos:', error);
    process.exitCode = 1;
} finally {
    db.close();
}