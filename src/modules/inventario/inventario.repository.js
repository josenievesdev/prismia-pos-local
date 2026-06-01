const db = require('../../config/db');

function limpiarTexto(valor) {
  return String(valor || '').trim();
}

function construirFiltrosStock(filtros = {}) {
  const condiciones = ['p.eliminado_en IS NULL'];
  const parametros = [];

  const busqueda = limpiarTexto(filtros.busqueda);

  if (busqueda) {
    condiciones.push(`
      (
        LOWER(p.nombre) LIKE LOWER(?)
        OR LOWER(p.codigo_interno) LIKE LOWER(?)
        OR LOWER(COALESCE(p.codigo_barras, '')) LIKE LOWER(?)
      )
    `);

    const patron = `%${busqueda}%`;
    parametros.push(patron, patron, patron);
  }

  const idCategoriaProducto = Number(filtros.idCategoriaProducto);

  if (idCategoriaProducto && !Number.isNaN(idCategoriaProducto)) {
    condiciones.push('p.id_categoria_producto = ?');
    parametros.push(idCategoriaProducto);
  }

  const estadoStock = limpiarTexto(filtros.estadoStock);

  if (estadoStock === 'bajo') {
    condiciones.push(`
      p.controla_inventario = 1
      AND p.stock_actual > 0
      AND p.stock_actual <= p.stock_minimo
    `);
  }

  if (estadoStock === 'sin_stock') {
    condiciones.push(`
      p.controla_inventario = 1
      AND p.stock_actual <= 0
    `);
  }

  if (estadoStock === 'sin_control') {
    condiciones.push('p.controla_inventario = 0');
  }

  if (estadoStock === 'ok') {
    condiciones.push(`
      p.controla_inventario = 1
      AND p.stock_actual > p.stock_minimo
    `);
  }

  return {
    where: condiciones.join(' AND '),
    parametros,
  };
}

function listarResumenStock(filtros = {}) {
  const { where, parametros } = construirFiltrosStock(filtros);

  const limite = Number(filtros.limite) || 10;
  const offset = Number(filtros.offset) || 0;

  return db
    .prepare(`
      SELECT
        p.id_producto,
        p.id_categoria_producto,
        p.id_unidad_medida,
        p.codigo_interno,
        p.codigo_barras,
        p.nombre,
        p.descripcion,
        p.stock_actual,
        p.stock_minimo,
        p.controla_inventario,
        p.permite_venta_sin_stock,
        p.permite_cantidad_decimal,
        p.estado,
        p.precio_costo,
        p.costo_promedio,
        p.precio_venta,
        c.nombre AS categoria_nombre,
        u.nombre AS unidad_nombre,
        u.abreviatura AS unidad_abreviatura,
        u.permite_decimales AS unidad_permite_decimales
      FROM productos p
      LEFT JOIN categorias_productos c
        ON c.id_categoria_producto = p.id_categoria_producto
      LEFT JOIN unidades_medida u
        ON u.id_unidad_medida = p.id_unidad_medida
      WHERE ${where}
      ORDER BY p.nombre ASC
      LIMIT ?
      OFFSET ?
    `)
    .all(...parametros, limite, offset);
}

function contarResumenStock(filtros = {}) {
  const { where, parametros } = construirFiltrosStock(filtros);

  const resultado = db
    .prepare(`
      SELECT COUNT(*) AS total
      FROM productos p
      LEFT JOIN categorias_productos c
        ON c.id_categoria_producto = p.id_categoria_producto
      LEFT JOIN unidades_medida u
        ON u.id_unidad_medida = p.id_unidad_medida
      WHERE ${where}
    `)
    .get(...parametros);

  return resultado?.total || 0;
}

function listarCategoriasDisponibles() {
  return db
    .prepare(`
      SELECT
        id_categoria_producto,
        nombre,
        estado
      FROM categorias_productos
      WHERE eliminado_en IS NULL
      ORDER BY nombre ASC
    `)
    .all();
}

function obtenerProductoInventarioPorId(idProducto) {
  return db
    .prepare(`
      SELECT
        p.id_producto,
        p.id_categoria_producto,
        p.id_unidad_medida,
        p.codigo_interno,
        p.codigo_barras,
        p.nombre,
        p.descripcion,
        p.stock_actual,
        p.stock_minimo,
        p.controla_inventario,
        p.permite_venta_sin_stock,
        p.permite_cantidad_decimal,
        p.estado,
        p.precio_costo,
        p.costo_promedio,
        p.precio_venta,
        c.nombre AS categoria_nombre,
        u.nombre AS unidad_nombre,
        u.abreviatura AS unidad_abreviatura,
        u.permite_decimales AS unidad_permite_decimales
      FROM productos p
      LEFT JOIN categorias_productos c
        ON c.id_categoria_producto = p.id_categoria_producto
      LEFT JOIN unidades_medida u
        ON u.id_unidad_medida = p.id_unidad_medida
      WHERE p.id_producto = ?
        AND p.eliminado_en IS NULL
      LIMIT 1
    `)
    .get(idProducto);
}

function registrarAjusteInventario({ producto, ajuste, usuario, ip, userAgent }) {
  const transaccion = db.transaction(() => {
    db.prepare(`
      UPDATE productos
      SET
        stock_actual = @stock_nuevo,
        actualizado_en = CURRENT_TIMESTAMP
      WHERE id_producto = @id_producto
        AND eliminado_en IS NULL
    `).run({
      id_producto: producto.id_producto,
      stock_nuevo: ajuste.stock_nuevo,
    });

    const resultadoMovimiento = db.prepare(`
      INSERT INTO movimientos_inventario (
        id_producto,
        id_usuario,
        id_unidad_medida,
        tipo_movimiento,
        cantidad,
        stock_anterior,
        stock_nuevo,
        motivo,
        referencia_tipo,
        referencia_id
      ) VALUES (
        @id_producto,
        @id_usuario,
        @id_unidad_medida,
        @tipo_movimiento,
        @cantidad,
        @stock_anterior,
        @stock_nuevo,
        @motivo,
        'ajuste_manual',
        NULL
      )
    `).run({
      id_producto: producto.id_producto,
      id_usuario: usuario?.id_usuario || 1,
      id_unidad_medida: producto.id_unidad_medida,
      tipo_movimiento: ajuste.tipo_movimiento,
      cantidad: ajuste.cantidad,
      stock_anterior: ajuste.stock_anterior,
      stock_nuevo: ajuste.stock_nuevo,
      motivo: ajuste.motivo,
    });

    db.prepare(`
      INSERT INTO auditoria (
        id_usuario,
        accion,
        tabla_afectada,
        id_registro_afectado,
        datos_anteriores,
        datos_nuevos,
        ip,
        user_agent
      ) VALUES (
        @id_usuario,
        'ajuste_manual_inventario',
        'productos',
        @id_registro_afectado,
        @datos_anteriores,
        @datos_nuevos,
        @ip,
        @user_agent
      )
    `).run({
      id_usuario: usuario?.id_usuario || null,
      id_registro_afectado: producto.id_producto,
      datos_anteriores: JSON.stringify({
        stock_actual: ajuste.stock_anterior,
      }),
      datos_nuevos: JSON.stringify({
        tipo_movimiento: ajuste.tipo_movimiento,
        cantidad: ajuste.cantidad,
        stock_nuevo: ajuste.stock_nuevo,
        motivo: ajuste.motivo,
        id_movimiento_inventario: resultadoMovimiento.lastInsertRowid,
      }),
      ip: ip || 'local',
      user_agent: userAgent || '',
    });

    return resultadoMovimiento.lastInsertRowid;
  });

  return transaccion();
}

function construirFiltrosMovimientos(filtros = {}) {
  const condiciones = ['1 = 1'];
  const parametros = [];

  const busqueda = limpiarTexto(filtros.busqueda);

  if (busqueda) {
    condiciones.push(`
      (
        LOWER(p.nombre) LIKE LOWER(?)
        OR LOWER(p.codigo_interno) LIKE LOWER(?)
        OR LOWER(COALESCE(p.codigo_barras, '')) LIKE LOWER(?)
      )
    `);

    const patron = `%${busqueda}%`;
    parametros.push(patron, patron, patron);
  }

  const tipoMovimiento = limpiarTexto(filtros.tipoMovimiento);

  if (tipoMovimiento) {
    condiciones.push('mi.tipo_movimiento = ?');
    parametros.push(tipoMovimiento);
  }

  const idProducto = Number(filtros.idProducto);

  if (idProducto && !Number.isNaN(idProducto)) {
    condiciones.push('mi.id_producto = ?');
    parametros.push(idProducto);
  }

  return {
    where: condiciones.join(' AND '),
    parametros,
  };
}

function listarMovimientosInventario(filtros = {}) {
  const { where, parametros } = construirFiltrosMovimientos(filtros);

  const limite = Number(filtros.limite) || 10;
  const offset = Number(filtros.offset) || 0;

  return db
    .prepare(`
      SELECT
        mi.id_movimiento_inventario,
        mi.id_producto,
        mi.id_usuario,
        mi.id_unidad_medida,
        mi.tipo_movimiento,
        mi.cantidad,
        mi.stock_anterior,
        mi.stock_nuevo,
        mi.motivo,
        mi.referencia_tipo,
        mi.referencia_id,
        mi.creado_en,
        p.codigo_interno,
        p.codigo_barras,
        p.nombre AS producto_nombre,
        u.nombre AS unidad_nombre,
        u.abreviatura AS unidad_abreviatura,
        u.permite_decimales AS unidad_permite_decimales,
        usu.nombre AS usuario_nombre,
        c.numero_compra AS numero_compra_referencia
      FROM movimientos_inventario mi
      INNER JOIN productos p
        ON p.id_producto = mi.id_producto
      LEFT JOIN unidades_medida u
        ON u.id_unidad_medida = mi.id_unidad_medida
      LEFT JOIN usuarios usu
        ON usu.id_usuario = mi.id_usuario
      LEFT JOIN compras c
        ON mi.referencia_tipo = 'compra'
       AND c.id_compra = mi.referencia_id
      WHERE ${where}
      ORDER BY mi.creado_en DESC, mi.id_movimiento_inventario DESC
      LIMIT ?
      OFFSET ?
    `)
    .all(...parametros, limite, offset);
}

function contarMovimientosInventario(filtros = {}) {
  const { where, parametros } = construirFiltrosMovimientos(filtros);

  const resultado = db
    .prepare(`
      SELECT COUNT(*) AS total
      FROM movimientos_inventario mi
      INNER JOIN productos p
        ON p.id_producto = mi.id_producto
      LEFT JOIN unidades_medida u
        ON u.id_unidad_medida = mi.id_unidad_medida
      LEFT JOIN usuarios usu
        ON usu.id_usuario = mi.id_usuario
      WHERE ${where}
    `)
    .get(...parametros);

  return resultado?.total || 0;
}

function listarNumerosConteo() {
  return db
    .prepare(`
      SELECT numero_conteo
      FROM conteos_inventario
      WHERE numero_conteo LIKE 'INV-%'
    `)
    .all();
}

function listarConteosInventario() {
  return db
    .prepare(`
      SELECT
        ci.id_conteo_inventario,
        ci.numero_conteo,
        ci.tipo_conteo,
        ci.origen,
        ci.estado,
        ci.fecha_inicio,
        ci.fecha_cierre,
        ci.fecha_aplicacion,
        ci.total_productos,
        ci.total_diferencias,
        ci.valor_diferencia_total,
        ci.observaciones,
        u.nombre AS usuario_creacion_nombre
      FROM conteos_inventario ci
      LEFT JOIN usuarios u
        ON u.id_usuario = ci.id_usuario_creacion
      ORDER BY ci.fecha_inicio DESC, ci.id_conteo_inventario DESC
    `)
    .all();
}

function crearConteoInventario({ conteo, productos }) {
  const transaccion = db.transaction(() => {
    const resultadoConteo = db
      .prepare(`
        INSERT INTO conteos_inventario (
          numero_conteo,
          id_usuario_creacion,
          tipo_conteo,
          origen,
          id_categoria_producto,
          estado,
          total_productos,
          observaciones
        ) VALUES (
          @numero_conteo,
          @id_usuario_creacion,
          @tipo_conteo,
          @origen,
          @id_categoria_producto,
          'borrador',
          @total_productos,
          @observaciones
        )
      `)
      .run(conteo);

    const idConteo = Number(resultadoConteo.lastInsertRowid);

    const insertarDetalle = db.prepare(`
      INSERT INTO detalle_conteos_inventario (
        id_conteo_inventario,
        id_producto,
        id_unidad_medida,
        codigo_interno,
        codigo_barras,
        nombre_producto,
        unidad_abreviatura,
        stock_sistema,
        stock_contado,
        diferencia,
        costo_promedio,
        valor_diferencia,
        estado
      ) VALUES (
        @id_conteo_inventario,
        @id_producto,
        @id_unidad_medida,
        @codigo_interno,
        @codigo_barras,
        @nombre_producto,
        @unidad_abreviatura,
        @stock_sistema,
        NULL,
        0,
        @costo_promedio,
        0,
        'pendiente'
      )
    `);

    for (const producto of productos) {
      insertarDetalle.run({
        id_conteo_inventario: idConteo,
        id_producto: producto.id_producto,
        id_unidad_medida: producto.id_unidad_medida,
        codigo_interno: producto.codigo_interno,
        codigo_barras: producto.codigo_barras,
        nombre_producto: producto.nombre,
        unidad_abreviatura: producto.unidad_abreviatura,
        stock_sistema: producto.stock_actual,
        costo_promedio: producto.costo_promedio || producto.precio_costo || 0,
      });
    }

    db.prepare(`
      INSERT INTO auditoria (
        id_usuario,
        accion,
        tabla_afectada,
        id_registro_afectado,
        datos_anteriores,
        datos_nuevos,
        ip,
        user_agent
      ) VALUES (
        @id_usuario,
        'crear_conteo_inventario',
        'conteos_inventario',
        @id_registro_afectado,
        NULL,
        @datos_nuevos,
        @ip,
        @user_agent
      )
    `).run({
      id_usuario: conteo.id_usuario_creacion || null,
      id_registro_afectado: idConteo,
      datos_nuevos: JSON.stringify({
        numero_conteo: conteo.numero_conteo,
        total_productos: productos.length,
      }),
      ip: conteo.ip || 'local',
      user_agent: conteo.user_agent || '',
    });

    return idConteo;
  });

  return transaccion();
}

function listarProductosParaConteo({ tipoConteo, idCategoriaProducto }) {
  const condiciones = [
    'p.eliminado_en IS NULL',
    'p.estado = ?',
    'p.controla_inventario = 1',
  ];

  const parametros = ['activo'];

  if (tipoConteo === 'categoria') {
    condiciones.push('p.id_categoria_producto = ?');
    parametros.push(idCategoriaProducto);
  }

  return db
    .prepare(`
      SELECT
        p.id_producto,
        p.id_categoria_producto,
        p.id_unidad_medida,
        p.codigo_interno,
        p.codigo_barras,
        p.nombre,
        p.stock_actual,
        p.costo_promedio,
        p.precio_costo,
        u.abreviatura AS unidad_abreviatura
      FROM productos p
      LEFT JOIN unidades_medida u
        ON u.id_unidad_medida = p.id_unidad_medida
      WHERE ${condiciones.join(' AND ')}
      ORDER BY p.nombre ASC
    `)
    .all(...parametros);
}

function obtenerConteoPorId(idConteo) {
  return db
    .prepare(`
      SELECT
        ci.id_conteo_inventario,
        ci.numero_conteo,
        ci.id_usuario_creacion,
        ci.id_usuario_aplicacion,
        ci.tipo_conteo,
        ci.origen,
        ci.id_categoria_producto,
        ci.estado,
        ci.fecha_inicio,
        ci.fecha_cierre,
        ci.fecha_aplicacion,
        ci.total_productos,
        ci.total_diferencias,
        ci.valor_diferencia_total,
        ci.observaciones,
        ci.motivo_anulacion,
        c.nombre AS categoria_nombre,
        u.nombre AS usuario_creacion_nombre
      FROM conteos_inventario ci
      LEFT JOIN categorias_productos c
        ON c.id_categoria_producto = ci.id_categoria_producto
      LEFT JOIN usuarios u
        ON u.id_usuario = ci.id_usuario_creacion
      WHERE ci.id_conteo_inventario = ?
      LIMIT 1
    `)
    .get(idConteo);
}

function listarDetalleConteo(idConteo) {
  return db
    .prepare(`
      SELECT
        d.id_detalle_conteo_inventario,
        d.id_conteo_inventario,
        d.id_producto,
        d.id_unidad_medida,
        d.codigo_interno,
        d.codigo_barras,
        d.nombre_producto,
        d.unidad_abreviatura,
        d.stock_sistema,
        d.stock_contado,
        d.diferencia,
        d.costo_promedio,
        d.valor_diferencia,
        d.estado,
        d.observaciones,
        u.permite_decimales AS unidad_permite_decimales
      FROM detalle_conteos_inventario d
      LEFT JOIN unidades_medida u
        ON u.id_unidad_medida = d.id_unidad_medida
      WHERE d.id_conteo_inventario = ?
      ORDER BY d.nombre_producto ASC
    `)
    .all(idConteo);
}

function guardarCantidadesConteo({ idConteo, detalles, usuario, ip, userAgent }) {
  const transaccion = db.transaction(() => {
    const actualizarDetalle = db.prepare(`
      UPDATE detalle_conteos_inventario
      SET
        stock_contado = @stock_contado,
        diferencia = @diferencia,
        valor_diferencia = @valor_diferencia,
        estado = 'contado',
        observaciones = @observaciones,
        actualizado_en = CURRENT_TIMESTAMP
      WHERE id_detalle_conteo_inventario = @id_detalle_conteo_inventario
        AND id_conteo_inventario = @id_conteo_inventario
    `);

    for (const detalle of detalles) {
      actualizarDetalle.run({
        id_detalle_conteo_inventario: detalle.id_detalle_conteo_inventario,
        id_conteo_inventario: idConteo,
        stock_contado: detalle.stock_contado,
        diferencia: detalle.diferencia,
        valor_diferencia: detalle.valor_diferencia,
        observaciones: detalle.observaciones,
      });
    }

    const totalDiferencias = detalles.filter(
      (detalle) => Math.abs(Number(detalle.diferencia || 0)) > 0.000001
    ).length;

    const valorDiferenciaTotal = detalles.reduce(
      (acumulado, detalle) => acumulado + Number(detalle.valor_diferencia || 0),
      0
    );

    db.prepare(`
      UPDATE conteos_inventario
      SET
        estado = 'en_revision',
        fecha_cierre = CURRENT_TIMESTAMP,
        total_diferencias = @total_diferencias,
        valor_diferencia_total = @valor_diferencia_total,
        actualizado_en = CURRENT_TIMESTAMP
      WHERE id_conteo_inventario = @id_conteo_inventario
    `).run({
      id_conteo_inventario: idConteo,
      total_diferencias: totalDiferencias,
      valor_diferencia_total: valorDiferenciaTotal,
    });

    db.prepare(`
      INSERT INTO auditoria (
        id_usuario,
        accion,
        tabla_afectada,
        id_registro_afectado,
        datos_anteriores,
        datos_nuevos,
        ip,
        user_agent
      ) VALUES (
        @id_usuario,
        'guardar_cantidades_conteo_inventario',
        'conteos_inventario',
        @id_registro_afectado,
        NULL,
        @datos_nuevos,
        @ip,
        @user_agent
      )
    `).run({
      id_usuario: usuario?.id_usuario || null,
      id_registro_afectado: idConteo,
      datos_nuevos: JSON.stringify({
        total_productos_contados: detalles.length,
        total_diferencias: totalDiferencias,
        valor_diferencia_total: valorDiferenciaTotal,
      }),
      ip: ip || 'local',
      user_agent: userAgent || '',
    });

    return {
      totalDiferencias,
      valorDiferenciaTotal,
    };
  });

  return transaccion();
}

function listarDetalleConteoParaAplicar(idConteo) {
  return db
    .prepare(`
      SELECT
        d.id_detalle_conteo_inventario,
        d.id_conteo_inventario,
        d.id_producto,
        d.id_unidad_medida,
        d.codigo_interno,
        d.nombre_producto,
        d.unidad_abreviatura,
        d.stock_sistema,
        d.stock_contado,
        d.diferencia,
        d.costo_promedio,
        d.valor_diferencia,
        d.estado,
        d.observaciones,
        p.stock_actual AS stock_actual_producto
      FROM detalle_conteos_inventario d
      INNER JOIN productos p
        ON p.id_producto = d.id_producto
      WHERE d.id_conteo_inventario = ?
      ORDER BY d.nombre_producto ASC
    `)
    .all(idConteo);
}

function aplicarConteoInventario({ conteo, detalles, usuario, ip, userAgent }) {
  const transaccion = db.transaction(() => {
    const actualizarProducto = db.prepare(`
      UPDATE productos
      SET
        stock_actual = @stock_nuevo,
        actualizado_en = CURRENT_TIMESTAMP
      WHERE id_producto = @id_producto
        AND eliminado_en IS NULL
    `);

    const insertarMovimiento = db.prepare(`
      INSERT INTO movimientos_inventario (
        id_producto,
        id_usuario,
        id_unidad_medida,
        tipo_movimiento,
        cantidad,
        stock_anterior,
        stock_nuevo,
        motivo,
        referencia_tipo,
        referencia_id
      ) VALUES (
        @id_producto,
        @id_usuario,
        @id_unidad_medida,
        @tipo_movimiento,
        @cantidad,
        @stock_anterior,
        @stock_nuevo,
        @motivo,
        'conteo_inventario',
        @referencia_id
      )
    `);

    const actualizarDetalle = db.prepare(`
      UPDATE detalle_conteos_inventario
      SET
        estado = 'ajustado',
        actualizado_en = CURRENT_TIMESTAMP
      WHERE id_detalle_conteo_inventario = @id_detalle_conteo_inventario
    `);

    for (const detalle of detalles) {
      const diferencia = Number(detalle.diferencia || 0);
      const stockNuevo = Number(detalle.stock_contado || 0);
      const stockAnterior = Number(detalle.stock_sistema || 0);

      actualizarProducto.run({
        id_producto: detalle.id_producto,
        stock_nuevo: stockNuevo,
      });

      if (Math.abs(diferencia) > 0.000001) {
        insertarMovimiento.run({
          id_producto: detalle.id_producto,
          id_usuario: usuario?.id_usuario || 1,
          id_unidad_medida: detalle.id_unidad_medida,
          tipo_movimiento:
            diferencia > 0 ? 'ajuste_positivo' : 'ajuste_negativo',
          cantidad: Math.abs(diferencia),
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          motivo: `Aplicación de conteo físico ${conteo.numero_conteo}`,
          referencia_id: conteo.id_conteo_inventario,
        });
      }

      actualizarDetalle.run({
        id_detalle_conteo_inventario:
          detalle.id_detalle_conteo_inventario,
      });
    }

    db.prepare(`
      UPDATE conteos_inventario
      SET
        estado = 'aplicado',
        id_usuario_aplicacion = @id_usuario_aplicacion,
        fecha_aplicacion = CURRENT_TIMESTAMP,
        actualizado_en = CURRENT_TIMESTAMP
      WHERE id_conteo_inventario = @id_conteo_inventario
    `).run({
      id_conteo_inventario: conteo.id_conteo_inventario,
      id_usuario_aplicacion: usuario?.id_usuario || null,
    });

    db.prepare(`
      INSERT INTO auditoria (
        id_usuario,
        accion,
        tabla_afectada,
        id_registro_afectado,
        datos_anteriores,
        datos_nuevos,
        ip,
        user_agent
      ) VALUES (
        @id_usuario,
        'aplicar_conteo_inventario',
        'conteos_inventario',
        @id_registro_afectado,
        NULL,
        @datos_nuevos,
        @ip,
        @user_agent
      )
    `).run({
      id_usuario: usuario?.id_usuario || null,
      id_registro_afectado: conteo.id_conteo_inventario,
      datos_nuevos: JSON.stringify({
        numero_conteo: conteo.numero_conteo,
        total_productos: detalles.length,
        total_diferencias: conteo.total_diferencias,
        valor_diferencia_total: conteo.valor_diferencia_total,
      }),
      ip: ip || 'local',
      user_agent: userAgent || '',
    });

    return true;
  });

  return transaccion();
}

function obtenerResumenOperativoInventario() {
  return db
    .prepare(`
      WITH productos_valorizados AS (
        SELECT
          p.id_producto,
          p.controla_inventario,
          p.stock_actual,
          p.stock_minimo,
          p.precio_costo,
          p.costo_promedio,
          p.precio_venta,
          p.maneja_iva,
          p.porcentaje_iva,
          p.precio_incluye_iva,

          CASE
            WHEN COALESCE(p.costo_promedio, 0) > 0
            THEN COALESCE(p.costo_promedio, 0)
            ELSE COALESCE(p.precio_costo, 0)
          END AS costo_referencia,

          CASE
            WHEN COALESCE(p.maneja_iva, 0) = 1
            THEN COALESCE(p.porcentaje_iva, 0) / 100.0
            ELSE 0
          END AS tasa_iva_decimal

        FROM productos p
        WHERE p.eliminado_en IS NULL
          AND p.estado = 'activo'
      ),

      calculos AS (
        SELECT
          pv.*,

          CASE
            WHEN pv.controla_inventario = 1
            THEN pv.stock_actual * pv.costo_referencia
            ELSE 0
          END AS valor_al_costo,

          CASE
            WHEN pv.controla_inventario = 1
            THEN pv.stock_actual * COALESCE(pv.precio_venta, 0)
            ELSE 0
          END AS valor_venta_base,

          CASE
            WHEN pv.controla_inventario = 1
             AND pv.maneja_iva = 1
             AND pv.precio_incluye_iva = 1
             AND pv.tasa_iva_decimal > 0
            THEN
              (pv.stock_actual * COALESCE(pv.precio_venta, 0))
              / (1 + pv.tasa_iva_decimal)

            WHEN pv.controla_inventario = 1
            THEN
              pv.stock_actual * COALESCE(pv.precio_venta, 0)

            ELSE 0
          END AS valor_venta_neto,

          CASE
            WHEN pv.controla_inventario = 1
             AND pv.maneja_iva = 1
             AND pv.precio_incluye_iva = 1
             AND pv.tasa_iva_decimal > 0
            THEN
              (pv.stock_actual * COALESCE(pv.precio_venta, 0))
              - (
                (pv.stock_actual * COALESCE(pv.precio_venta, 0))
                / (1 + pv.tasa_iva_decimal)
              )

            WHEN pv.controla_inventario = 1
             AND pv.maneja_iva = 1
             AND pv.precio_incluye_iva = 0
             AND pv.tasa_iva_decimal > 0
            THEN
              (pv.stock_actual * COALESCE(pv.precio_venta, 0))
              * pv.tasa_iva_decimal

            ELSE 0
          END AS iva_estimado,

          CASE
            WHEN pv.controla_inventario = 1
             AND pv.maneja_iva = 1
             AND pv.precio_incluye_iva = 0
             AND pv.tasa_iva_decimal > 0
            THEN
              (pv.stock_actual * COALESCE(pv.precio_venta, 0))
              * (1 + pv.tasa_iva_decimal)

            WHEN pv.controla_inventario = 1
            THEN
              pv.stock_actual * COALESCE(pv.precio_venta, 0)

            ELSE 0
          END AS valor_venta_bruto

        FROM productos_valorizados pv
      )

      SELECT
        COUNT(*) AS total_productos_activos,

        SUM(
          CASE
            WHEN controla_inventario = 1
             AND stock_actual > stock_minimo
            THEN 1 ELSE 0
          END
        ) AS total_stock_suficiente,

        SUM(
          CASE
            WHEN controla_inventario = 1
             AND stock_actual > 0
             AND stock_actual <= stock_minimo
            THEN 1 ELSE 0
          END
        ) AS total_bajo_stock,

        SUM(
          CASE
            WHEN controla_inventario = 1
             AND stock_actual <= 0
            THEN 1 ELSE 0
          END
        ) AS total_sin_stock,

        SUM(
          CASE
            WHEN controla_inventario = 0
            THEN 1 ELSE 0
          END
        ) AS total_sin_control,

        SUM(
          CASE
            WHEN controla_inventario = 1
             AND maneja_iva = 1
            THEN 1 ELSE 0
          END
        ) AS total_productos_con_iva,

        SUM(valor_al_costo) AS valor_estimado_inventario,
        SUM(valor_venta_bruto) AS valor_venta_bruto,
        SUM(valor_venta_neto) AS valor_venta_neto,
        SUM(iva_estimado) AS iva_estimado,
        SUM(valor_venta_neto - valor_al_costo) AS utilidad_bruta_estimada

      FROM calculos
    `)
    .get();
}

function listarAlertasStock(limite = 10) {
  return db
    .prepare(`
      SELECT
        p.id_producto,
        p.codigo_interno,
        p.codigo_barras,
        p.nombre,
        p.stock_actual,
        p.stock_minimo,
        p.controla_inventario,
        p.permite_cantidad_decimal,
        p.costo_promedio,
        p.precio_costo,
        c.nombre AS categoria_nombre,
        u.nombre AS unidad_nombre,
        u.abreviatura AS unidad_abreviatura,
        u.permite_decimales AS unidad_permite_decimales
      FROM productos p
      LEFT JOIN categorias_productos c
        ON c.id_categoria_producto = p.id_categoria_producto
      LEFT JOIN unidades_medida u
        ON u.id_unidad_medida = p.id_unidad_medida
      WHERE p.eliminado_en IS NULL
        AND p.estado = 'activo'
        AND p.controla_inventario = 1
        AND p.stock_actual <= p.stock_minimo
      ORDER BY
        CASE
          WHEN p.stock_actual <= 0 THEN 1
          ELSE 2
        END ASC,
        p.stock_actual ASC,
        p.nombre ASC
      LIMIT ?
    `)
    .all(limite);
}

function listarProductosMayorValorInventario(limite = 10) {
  return db
    .prepare(`
      SELECT
        p.id_producto,
        p.codigo_interno,
        p.codigo_barras,
        p.nombre,
        p.stock_actual,
        p.stock_minimo,
        p.controla_inventario,
        p.permite_cantidad_decimal,
        p.costo_promedio,
        p.precio_costo,
        c.nombre AS categoria_nombre,
        u.nombre AS unidad_nombre,
        u.abreviatura AS unidad_abreviatura,
        u.permite_decimales AS unidad_permite_decimales,

        (
          p.stock_actual *
          CASE
            WHEN COALESCE(p.costo_promedio, 0) > 0
            THEN p.costo_promedio
            ELSE COALESCE(p.precio_costo, 0)
          END
        ) AS valor_estimado

      FROM productos p
      LEFT JOIN categorias_productos c
        ON c.id_categoria_producto = p.id_categoria_producto
      LEFT JOIN unidades_medida u
        ON u.id_unidad_medida = p.id_unidad_medida
      WHERE p.eliminado_en IS NULL
        AND p.estado = 'activo'
        AND p.controla_inventario = 1
      ORDER BY valor_estimado DESC, p.nombre ASC
      LIMIT ?
    `)
    .all(limite);
}

function listarResumenMovimientosInventario30Dias() {
  return db
    .prepare(`
      SELECT
        mi.tipo_movimiento,
        COUNT(*) AS total_movimientos,

        SUM(
          ABS(mi.cantidad) *
          CASE
            WHEN COALESCE(p.costo_promedio, 0) > 0
            THEN p.costo_promedio
            ELSE COALESCE(p.precio_costo, 0)
          END
        ) AS valor_estimado

      FROM movimientos_inventario mi
      INNER JOIN productos p
        ON p.id_producto = mi.id_producto
      WHERE mi.creado_en >= datetime('now', '-30 days')
      GROUP BY mi.tipo_movimiento
      ORDER BY total_movimientos DESC
    `)
    .all();
}

function listarConteosInventarioRecientes(limite = 5) {
  return db
    .prepare(`
      SELECT
        ci.id_conteo_inventario,
        ci.numero_conteo,
        ci.tipo_conteo,
        ci.origen,
        ci.estado,
        ci.fecha_inicio,
        ci.fecha_aplicacion,
        ci.total_productos,
        ci.total_diferencias,
        ci.valor_diferencia_total,
        u.nombre AS usuario_creacion_nombre
      FROM conteos_inventario ci
      LEFT JOIN usuarios u
        ON u.id_usuario = ci.id_usuario_creacion
      ORDER BY ci.fecha_inicio DESC, ci.id_conteo_inventario DESC
      LIMIT ?
    `)
    .all(limite);
}

module.exports = {
  listarResumenStock,
  contarResumenStock,
  listarCategoriasDisponibles,
  obtenerProductoInventarioPorId,
  registrarAjusteInventario,
  listarMovimientosInventario,
  contarMovimientosInventario,

  listarNumerosConteo,
  listarConteosInventario,
  crearConteoInventario,
  listarProductosParaConteo,
  obtenerConteoPorId,
  listarDetalleConteo,
  guardarCantidadesConteo,
  listarDetalleConteoParaAplicar,
  aplicarConteoInventario,

  obtenerResumenOperativoInventario,
  listarAlertasStock,
  listarProductosMayorValorInventario,
  listarResumenMovimientosInventario30Dias,
  listarConteosInventarioRecientes,
};