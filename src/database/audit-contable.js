const db = require('../config/db');

const errores = [];
const advertencias = [];

function dinero(valor) {
    return `$ ${Number(valor || 0).toLocaleString('es-CO')}`;
}

function registrarOk(mensaje) {
    console.log(`[OK] ${mensaje}`);
}

function registrarError(mensaje, filas = []) {
    errores.push({ mensaje, filas });
    console.error(`[ERROR] ${mensaje}`);
    imprimirFilas(filas);
}

function registrarAdvertencia(mensaje, filas = []) {
    advertencias.push({ mensaje, filas });
    console.warn(`[ADVERTENCIA] ${mensaje}`);
    imprimirFilas(filas);
}

function imprimirFilas(filas) {
    if (!Array.isArray(filas) || filas.length === 0) return;

    console.table(filas.slice(0, 10));
}

function ejecutarConsulta(sql) {
    return db.prepare(sql).all();
}

function validarControl({ nombre, sql, severidad = 'error' }) {
    const filas = ejecutarConsulta(sql);

    if (filas.length === 0) {
        registrarOk(nombre);
        return;
    }

    if (severidad === 'advertencia') {
        registrarAdvertencia(`${nombre}. Registros encontrados: ${filas.length}`, filas);
        return;
    }

    registrarError(`${nombre}. Registros encontrados: ${filas.length}`, filas);
}

function validarVentasContraDetalle() {
    validarControl({
        nombre: 'Ventas cuadran contra detalle: subtotal, descuento, IVA, total, costo y utilidad',
        sql: `
            WITH detalle AS (
                SELECT
                    id_venta,
                    ROUND(SUM(subtotal), 0) AS subtotal_detalle,
                    ROUND(SUM(descuento_unitario * cantidad), 0) AS descuento_detalle,
                    ROUND(SUM(impuesto_total), 0) AS iva_detalle,
                    ROUND(SUM(total_linea), 0) AS total_detalle,
                    ROUND(SUM(costo_total), 0) AS costo_detalle,
                    ROUND(SUM(utilidad_bruta), 0) AS utilidad_detalle
                FROM detalle_ventas
                GROUP BY id_venta
            )
            SELECT
                v.id_venta,
                v.numero_venta,
                v.estado,
                v.subtotal AS subtotal_venta,
                COALESCE(d.subtotal_detalle, 0) AS subtotal_detalle,
                v.descuento_total AS descuento_venta,
                COALESCE(d.descuento_detalle, 0) AS descuento_detalle,
                v.impuesto_total AS iva_venta,
                COALESCE(d.iva_detalle, 0) AS iva_detalle,
                v.total AS total_venta,
                COALESCE(d.total_detalle, 0) AS total_detalle,
                v.total_costo AS costo_venta,
                COALESCE(d.costo_detalle, 0) AS costo_detalle,
                v.utilidad_bruta AS utilidad_venta,
                COALESCE(d.utilidad_detalle, 0) AS utilidad_detalle
            FROM ventas v
            LEFT JOIN detalle d ON d.id_venta = v.id_venta
            WHERE
                ABS(v.subtotal - COALESCE(d.subtotal_detalle, 0)) > 1
                OR ABS(v.descuento_total - COALESCE(d.descuento_detalle, 0)) > 1
                OR ABS(v.impuesto_total - COALESCE(d.iva_detalle, 0)) > 1
                OR ABS(v.total - COALESCE(d.total_detalle, 0)) > 1
                OR ABS(v.total_costo - COALESCE(d.costo_detalle, 0)) > 1
                OR ABS(v.utilidad_bruta - COALESCE(d.utilidad_detalle, 0)) > 1
            ORDER BY v.id_venta DESC;
        `,
    });
}

function validarLineasVenta() {
    validarControl({
        nombre: 'Líneas de venta tienen fórmula subtotal + IVA = total',
        sql: `
            SELECT
                id_detalle_venta,
                id_venta,
                nombre_producto,
                cantidad,
                precio_unitario,
                descuento_unitario,
                subtotal,
                impuesto_total,
                total_linea,
                subtotal + impuesto_total AS total_calculado
            FROM detalle_ventas
            WHERE ABS((subtotal + impuesto_total) - total_linea) > 1
            ORDER BY id_detalle_venta DESC;
        `,
    });

    validarControl({
        nombre: 'Descuentos unitarios no superan precio unitario',
        sql: `
            SELECT
                id_detalle_venta,
                id_venta,
                nombre_producto,
                precio_unitario,
                descuento_unitario
            FROM detalle_ventas
            WHERE descuento_unitario < 0
               OR descuento_unitario > precio_unitario
            ORDER BY id_detalle_venta DESC;
        `,
    });
}

function validarVentasContraPagos() {
    validarControl({
        nombre: 'Ventas pagadas cuadran contra pagos registrados',
        sql: `
            WITH pagos AS (
                SELECT
                    id_venta,
                    SUM(monto) AS total_pagos,
                    SUM(monto_recibido) AS total_recibido,
                    SUM(cambio_entregado) AS cambio_entregado
                FROM pagos_venta
                WHERE estado = 'registrado'
                GROUP BY id_venta
            )
            SELECT
                v.id_venta,
                v.numero_venta,
                v.estado,
                v.total,
                v.total_pagado,
                v.saldo_pendiente,
                COALESCE(p.total_pagos, 0) AS total_pagos,
                COALESCE(p.total_recibido, 0) AS total_recibido,
                COALESCE(p.cambio_entregado, 0) AS cambio_pago
            FROM ventas v
            LEFT JOIN pagos p ON p.id_venta = v.id_venta
            WHERE v.estado = 'pagada'
              AND (
                    ABS(v.total - COALESCE(p.total_pagos, 0)) > 1
                    OR ABS(v.total_pagado - COALESCE(p.total_pagos, 0)) > 1
                    OR v.saldo_pendiente <> 0
              )
            ORDER BY v.id_venta DESC;
        `,
    });
}

function validarPagosContraCaja() {
    validarControl({
        nombre: 'Pagos de ventas pagadas cuadran contra movimientos de caja tipo venta',
        sql: `
            WITH pagos AS (
                SELECT
                    id_venta,
                    SUM(monto) AS total_pagos
                FROM pagos_venta
                WHERE estado = 'registrado'
                GROUP BY id_venta
            ),
            caja AS (
                SELECT
                    referencia_id AS id_venta,
                    SUM(monto) AS total_caja
                FROM movimientos_caja
                WHERE tipo_movimiento = 'venta'
                  AND referencia_tipo = 'venta'
                GROUP BY referencia_id
            )
            SELECT
                v.id_venta,
                v.numero_venta,
                v.total,
                COALESCE(p.total_pagos, 0) AS total_pagos,
                COALESCE(c.total_caja, 0) AS total_caja
            FROM ventas v
            LEFT JOIN pagos p ON p.id_venta = v.id_venta
            LEFT JOIN caja c ON c.id_venta = v.id_venta
            WHERE v.estado = 'pagada'
              AND ABS(COALESCE(p.total_pagos, 0) - COALESCE(c.total_caja, 0)) > 1
            ORDER BY v.id_venta DESC;
        `,
    });
}

function validarStock() {
    validarControl({
        nombre: 'No existen productos con stock negativo',
        sql: `
            SELECT
                id_producto,
                nombre,
                stock_actual,
                controla_inventario
            FROM productos
            WHERE controla_inventario = 1
              AND stock_actual < 0
            ORDER BY id_producto DESC;
        `,
    });
}

function validarComprasContraDetalle() {
    validarControl({
        nombre: 'Compras cuadran contra detalle: subtotal, IVA y total',
        sql: `
            WITH detalle AS (
                SELECT
                    id_compra,
                    ROUND(SUM(subtotal_linea), 0) AS subtotal_detalle,
                    ROUND(SUM(iva_linea), 0) AS iva_detalle,
                    ROUND(SUM(total_linea), 0) AS total_detalle
                FROM compras_detalle
                GROUP BY id_compra
            )
            SELECT
                c.id_compra,
                c.numero_compra,
                c.estado,
                c.subtotal AS subtotal_compra,
                COALESCE(d.subtotal_detalle, 0) AS subtotal_detalle,
                c.iva_total AS iva_compra,
                COALESCE(d.iva_detalle, 0) AS iva_detalle,
                c.total AS total_compra,
                COALESCE(d.total_detalle, 0) AS total_detalle
            FROM compras c
            LEFT JOIN detalle d ON d.id_compra = c.id_compra
            WHERE c.estado <> 'anulada'
              AND (
                    ABS(c.subtotal - COALESCE(d.subtotal_detalle, 0)) > 1
                    OR ABS(c.iva_total - COALESCE(d.iva_detalle, 0)) > 1
                    OR ABS(c.total - COALESCE(d.total_detalle, 0)) > 1
              )
            ORDER BY c.id_compra DESC;
        `,
    });

    validarControl({
        nombre: 'Compras tienen saldo coherente con total pagado',
        sql: `
            SELECT
                id_compra,
                numero_compra,
                total,
                total_pagado,
                saldo_pendiente,
                total - total_pagado AS saldo_calculado
            FROM compras
            WHERE estado <> 'anulada'
              AND ABS(saldo_pendiente - (total - total_pagado)) > 1
            ORDER BY id_compra DESC;
        `,
    });
}

function validarNotasCredito() {
    validarControl({
        nombre: 'Notas crédito internas por anulación cuadran contra venta anulada',
        sql: `
            SELECT
                nc.id_nota_credito,
                nc.numero_nota_credito,
                v.id_venta,
                v.numero_venta,
                v.estado AS estado_venta,
                nc.subtotal AS subtotal_nc,
                v.subtotal AS subtotal_venta,
                nc.descuento_total AS descuento_nc,
                v.descuento_total AS descuento_venta,
                nc.impuesto_total AS iva_nc,
                v.impuesto_total AS iva_venta,
                nc.total AS total_nc,
                v.total AS total_venta
            FROM notas_credito nc
            INNER JOIN ventas v ON v.id_venta = nc.id_venta
            WHERE nc.estado = 'emitida'
              AND nc.origen = 'anulacion_venta'
              AND (
                    v.estado <> 'anulada'
                    OR ABS(nc.subtotal - v.subtotal) > 1
                    OR ABS(nc.descuento_total - v.descuento_total) > 1
                    OR ABS(nc.impuesto_total - v.impuesto_total) > 1
                    OR ABS(nc.total - v.total) > 1
              )
            ORDER BY nc.id_nota_credito DESC;
        `,
        severidad: 'advertencia',
    });
}

function validarTurnosCaja() {
    validarControl({
        nombre: 'Turnos de caja tienen totales almacenados coherentes con movimientos',
        sql: `
            WITH movimientos AS (
                SELECT
                    id_turno_caja,
                    SUM(CASE WHEN tipo_movimiento = 'venta' THEN monto ELSE 0 END) AS ventas_mov,
                    SUM(CASE WHEN tipo_movimiento = 'venta' AND metodo_pago = 'efectivo' THEN monto ELSE 0 END) AS efectivo_mov,
                    SUM(CASE WHEN tipo_movimiento = 'venta' AND metodo_pago = 'transferencia' THEN monto ELSE 0 END) AS transferencia_mov,
                    SUM(CASE WHEN tipo_movimiento = 'venta' AND metodo_pago = 'tarjeta' THEN monto ELSE 0 END) AS tarjeta_mov,
                    SUM(CASE WHEN tipo_movimiento = 'venta' AND metodo_pago NOT IN ('efectivo', 'transferencia', 'tarjeta') THEN monto ELSE 0 END) AS otros_mov
                FROM movimientos_caja
                GROUP BY id_turno_caja
            )
            SELECT
                t.id_turno_caja,
                t.estado,
                t.total_ventas,
                COALESCE(m.ventas_mov, 0) AS ventas_mov,
                t.total_efectivo,
                COALESCE(m.efectivo_mov, 0) AS efectivo_mov,
                t.total_transferencia,
                COALESCE(m.transferencia_mov, 0) AS transferencia_mov,
                t.total_tarjeta,
                COALESCE(m.tarjeta_mov, 0) AS tarjeta_mov,
                t.total_otros,
                COALESCE(m.otros_mov, 0) AS otros_mov
            FROM turnos_caja t
            LEFT JOIN movimientos m ON m.id_turno_caja = t.id_turno_caja
            WHERE
                ABS(t.total_ventas - COALESCE(m.ventas_mov, 0)) > 1
                OR ABS(t.total_efectivo - COALESCE(m.efectivo_mov, 0)) > 1
                OR ABS(t.total_transferencia - COALESCE(m.transferencia_mov, 0)) > 1
                OR ABS(t.total_tarjeta - COALESCE(m.tarjeta_mov, 0)) > 1
                OR ABS(t.total_otros - COALESCE(m.otros_mov, 0)) > 1
            ORDER BY t.id_turno_caja DESC;
        `,
        severidad: 'advertencia',
    });
}

function imprimirResumen() {
    console.log('\n====================================');
    console.log('Resumen auditoría contable');
    console.log('====================================');

    console.log(`Errores críticos: ${errores.length}`);
    console.log(`Advertencias: ${advertencias.length}`);

    if (errores.length > 0) {
        console.error('\nAuditoría contable fallida. Corrige los errores críticos antes de entregar piloto.');
        process.exitCode = 1;
        return;
    }

    if (advertencias.length > 0) {
        console.warn('\nAuditoría contable aprobada con advertencias. Revisa los casos históricos o fuera de alcance.');
        return;
    }

    console.log('\nAuditoría contable correcta. Ventas, descuentos, pagos, caja, compras y notas crédito cuadran.');
}

function ejecutarAuditoriaContable() {
    console.log('====================================');
    console.log('Auditoría contable Prismia POS Local');
    console.log('====================================');

    validarVentasContraDetalle();
    validarLineasVenta();
    validarVentasContraPagos();
    validarPagosContraCaja();
    validarStock();
    validarComprasContraDetalle();
    validarNotasCredito();
    validarTurnosCaja();

    imprimirResumen();
}

try {
    ejecutarAuditoriaContable();
} catch (error) {
    console.error('Error inesperado ejecutando auditoría contable:', error);
    process.exitCode = 1;
} finally {
    db.close();
}