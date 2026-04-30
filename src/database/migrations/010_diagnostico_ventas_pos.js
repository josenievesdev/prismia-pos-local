const db = require('../../config/db');

const TABLAS = [
    'ventas',
    'detalle_ventas',
    'pagos_venta',
    'movimientos_inventario',
    'movimientos_caja',
    'turnos_caja',
    'productos',
    'clientes',
    'comprobantes',
    'medios_pago',
];

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
    return db
        .prepare(`PRAGMA table_info(${nombreTabla})`)
        .all()
        .map((columna) => ({
            cid: columna.cid,
            nombre: columna.name,
            tipo: columna.type,
            requerido: columna.notnull === 1 ? 'SI' : 'NO',
            defecto: columna.dflt_value,
            pk: columna.pk === 1 ? 'SI' : 'NO',
        }));
}

function obtenerIndices(nombreTabla) {
    return db
        .prepare(`PRAGMA index_list(${nombreTabla})`)
        .all()
        .map((indice) => ({
            nombre: indice.name,
            unico: indice.unique === 1 ? 'SI' : 'NO',
            origen: indice.origin,
        }));
}

function obtenerLlavesForaneas(nombreTabla) {
    return db
        .prepare(`PRAGMA foreign_key_list(${nombreTabla})`)
        .all()
        .map((fk) => ({
            tabla_destino: fk.table,
            desde: fk.from,
            hacia: fk.to,
            on_update: fk.on_update,
            on_delete: fk.on_delete,
        }));
}

function imprimirSeparador(titulo) {
    console.log('');
    console.log('='.repeat(80));
    console.log(titulo);
    console.log('='.repeat(80));
}

function imprimirTabla(nombreTabla) {
    imprimirSeparador(`TABLA: ${nombreTabla}`);

    if (!tablaExiste(nombreTabla)) {
        console.log(`❌ No existe la tabla ${nombreTabla}`);
        return;
    }

    const columnas = obtenerColumnas(nombreTabla);
    const indices = obtenerIndices(nombreTabla);
    const llaves = obtenerLlavesForaneas(nombreTabla);

    console.log('');
    console.log('COLUMNAS');
    console.table(columnas);

    console.log('');
    console.log('ÍNDICES');
    if (indices.length === 0) {
        console.log('Sin índices registrados.');
    } else {
        console.table(indices);
    }

    console.log('');
    console.log('LLAVES FORÁNEAS');
    if (llaves.length === 0) {
        console.log('Sin llaves foráneas registradas.');
    } else {
        console.table(llaves);
    }
}

function validarDatosBase() {
    imprimirSeparador('DATOS BASE PARA POS');

    const turnoAbierto = tablaExiste('turnos_caja')
        ? db.prepare(`
            SELECT
                id_turno_caja,
                id_usuario_apertura,
                fecha_apertura,
                estado,
                total_ventas,
                total_efectivo,
                total_transferencia,
                total_tarjeta,
                total_otros,
                monto_esperado
            FROM turnos_caja
            WHERE estado = 'abierto'
            ORDER BY fecha_apertura DESC, id_turno_caja DESC
            LIMIT 1
        `).get()
        : null;

    console.log('');
    console.log('Turno abierto:');
    console.log(turnoAbierto || 'No hay turno abierto.');

    const consumidorFinal = tablaExiste('clientes')
        ? db.prepare(`
            SELECT
                id_cliente,
                tipo_documento,
                documento,
                nombre,
                es_consumidor_final,
                estado
            FROM clientes
            WHERE es_consumidor_final = 1
              AND estado = 'activo'
              AND eliminado_en IS NULL
            LIMIT 1
        `).get()
        : null;

    console.log('');
    console.log('Consumidor final:');
    console.log(consumidorFinal || 'No hay consumidor final activo.');

    const mediosPago = tablaExiste('medios_pago')
        ? db.prepare(`
            SELECT
                id_medio_pago,
                codigo,
                nombre,
                tipo,
                requiere_referencia,
                afecta_efectivo_caja,
                activo,
                orden
            FROM medios_pago
            WHERE activo = 1
            ORDER BY orden ASC, nombre ASC
        `).all()
        : [];

    console.log('');
    console.log('Medios de pago activos:');
    console.table(mediosPago);

    const productosVendibles = tablaExiste('productos')
        ? db.prepare(`
            SELECT
                id_producto,
                codigo_interno,
                codigo_barras,
                nombre,
                precio_venta,
                stock_actual,
                stock_reservado,
                controla_inventario,
                permite_venta_sin_stock,
                permite_cantidad_decimal,
                venta_fraccionada_habilitada,
                maneja_iva,
                porcentaje_iva,
                precio_incluye_iva,
                estado
            FROM productos
            WHERE estado = 'activo'
              AND eliminado_en IS NULL
            ORDER BY id_producto DESC
            LIMIT 10
        `).all()
        : [];

    console.log('');
    console.log('Últimos productos activos:');
    console.table(productosVendibles);
}

function validarIntegridad() {
    imprimirSeparador('VALIDACIÓN DE INTEGRIDAD');

    const errores = db.prepare('PRAGMA foreign_key_check').all();

    if (errores.length === 0) {
        console.log('✅ PRAGMA foreign_key_check sin errores.');
        return;
    }

    console.log('❌ Hay errores de llaves foráneas:');
    console.table(errores);
}

function ejecutarDiagnostico() {
    console.log('');
    console.log('DIAGNÓSTICO POS VENTAS');
    console.log('Este script no modifica datos. Solo imprime estructura real.');
    console.log('');

    for (const tabla of TABLAS) {
        imprimirTabla(tabla);
    }

    validarDatosBase();
    validarIntegridad();

    console.log('');
    console.log('Diagnóstico finalizado.');
}

try {
    ejecutarDiagnostico();
} catch (error) {
    console.error('');
    console.error('Error ejecutando diagnóstico POS ventas:');
    console.error(error);
    process.exit(1);
}