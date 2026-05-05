const db = require('../../config/db');

function normalizarTexto(valor) {
  return String(valor || '').trim();
}

function construirFiltrosProductos(filtros = {}) {
  const condiciones = ['p.eliminado_en IS NULL'];
  const parametros = [];

  const busqueda = normalizarTexto(filtros.busqueda);

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

  const estado = normalizarTexto(filtros.estado);

  if (['activo', 'inactivo'].includes(estado)) {
    condiciones.push('p.estado = ?');
    parametros.push(estado);
  }

  const stock = normalizarTexto(filtros.stock);

  if (stock === 'bajo') {
    condiciones.push(`
      p.controla_inventario = 1
      AND p.stock_actual <= p.stock_minimo
    `);
  }

  if (stock === 'sin_stock') {
    condiciones.push(`
      p.controla_inventario = 1
      AND p.stock_actual <= 0
    `);
  }

  if (stock === 'sin_control') {
    condiciones.push('p.controla_inventario = 0');
  }

  return {
    where: condiciones.join(' AND '),
    parametros,
  };
}

function listarProductos(filtros = {}) {
  const { where, parametros } = construirFiltrosProductos(filtros);

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
        p.precio_costo,
        p.precio_venta,
        p.costo_promedio,
        p.ultimo_costo,
        p.stock_actual,
        p.stock_minimo,
        p.controla_inventario,
        p.permite_venta_sin_stock,
        p.permite_cantidad_decimal,
        p.maneja_iva,
        p.porcentaje_iva,
        p.precio_incluye_iva,
        p.imagen_url,
        p.mostrar_en_pos_tactil,
        p.orden_pos_tactil,
        p.estado,
        p.creado_en,
        p.actualizado_en,
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

function contarProductos(filtros = {}) {
  const { where, parametros } = construirFiltrosProductos(filtros);

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


function buscarProductoPorId(idProducto) {
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
        p.precio_costo,
        p.precio_venta,
        p.costo_promedio,
        p.ultimo_costo,
        p.stock_actual,
        p.stock_minimo,
        p.controla_inventario,
        p.permite_venta_sin_stock,
        p.permite_cantidad_decimal,
        p.maneja_iva,
        p.porcentaje_iva,
        p.precio_incluye_iva,
        p.imagen_url,
        p.mostrar_en_pos_tactil,
        p.orden_pos_tactil,
        p.estado,
        p.creado_en,
        p.actualizado_en,
        p.eliminado_en,
        u.nombre AS unidad_nombre,
        u.abreviatura AS unidad_abreviatura,
        u.permite_decimales AS unidad_permite_decimales
      FROM productos p
      LEFT JOIN unidades_medida u
        ON u.id_unidad_medida = p.id_unidad_medida
      WHERE p.id_producto = ?
        AND p.eliminado_en IS NULL
      LIMIT 1
    `)
    .get(idProducto);
}

function buscarProductoPorCodigoInterno(codigoInterno) {
  return db
    .prepare(`
      SELECT
        id_producto,
        codigo_interno,
        nombre
      FROM productos
      WHERE LOWER(codigo_interno) = LOWER(?)
        AND eliminado_en IS NULL
      LIMIT 1
    `)
    .get(codigoInterno);
}

function buscarProductoPorCodigoBarras(codigoBarras) {
  return db
    .prepare(`
      SELECT
        id_producto,
        codigo_barras,
        nombre
      FROM productos
      WHERE codigo_barras = ?
        AND eliminado_en IS NULL
      LIMIT 1
    `)
    .get(codigoBarras);
}

function listarCodigosInternos() {
  return db
    .prepare(`
      SELECT codigo_interno
      FROM productos
      WHERE codigo_interno LIKE 'PRD-%'
    `)
    .all();
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

function listarUnidadesMedida() {
  return db
    .prepare(`
      SELECT
        id_unidad_medida,
        nombre,
        abreviatura,
        permite_decimales,
        estado
      FROM unidades_medida
      WHERE estado = 'activo'
      ORDER BY id_unidad_medida ASC
    `)
    .all();
}

function buscarUnidadPorId(idUnidadMedida) {
  return db
    .prepare(`
      SELECT
        id_unidad_medida,
        nombre,
        abreviatura,
        permite_decimales,
        estado
      FROM unidades_medida
      WHERE id_unidad_medida = ?
        AND estado = 'activo'
      LIMIT 1
    `)
    .get(idUnidadMedida);
}

function buscarUnidadPorAbreviatura(abreviatura) {
  return db
    .prepare(`
      SELECT
        id_unidad_medida,
        nombre,
        abreviatura,
        permite_decimales,
        estado
      FROM unidades_medida
      WHERE abreviatura = ?
        AND estado = 'activo'
      LIMIT 1
    `)
    .get(abreviatura);
}

function crearProductoConMovimiento({ producto, usuario, ip, userAgent }) {
  const transaccion = db.transaction(() => {
    const resultadoProducto = db
      .prepare(`
        INSERT INTO productos (
          id_categoria_producto,
          id_unidad_medida,
          codigo_interno,
          codigo_barras,
          nombre,
          descripcion,
          precio_costo,
          precio_venta,
          costo_promedio,
          ultimo_costo,
          stock_actual,
          stock_minimo,
          controla_inventario,
          permite_venta_sin_stock,
          permite_cantidad_decimal,
          maneja_iva,
          porcentaje_iva,
          precio_incluye_iva,
          imagen_url,
          mostrar_en_pos_tactil,
          orden_pos_tactil,
          estado
        ) VALUES (
          @id_categoria_producto,
          @id_unidad_medida,
          @codigo_interno,
          @codigo_barras,
          @nombre,
          @descripcion,
          @precio_costo,
          @precio_venta,
          @costo_promedio,
          @ultimo_costo,
          @stock_actual,
          @stock_minimo,
          @controla_inventario,
          @permite_venta_sin_stock,
          @permite_cantidad_decimal,
          @maneja_iva,
          @porcentaje_iva,
          @precio_incluye_iva,
          @imagen_url,
          @mostrar_en_pos_tactil,
          @orden_pos_tactil,
          'activo'
        )
      `)
      .run(producto);

    const idProducto = Number(resultadoProducto.lastInsertRowid);

    if (producto.controla_inventario === 1 && producto.stock_actual > 0) {
      db.prepare(`
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
          'entrada_inicial',
          @cantidad,
          0,
          @stock_nuevo,
          @motivo,
          'producto',
          @referencia_id
        )
      `).run({
        id_producto: idProducto,
        id_usuario: usuario?.id_usuario || 1,
        id_unidad_medida: producto.id_unidad_medida,
        cantidad: producto.stock_actual,
        stock_nuevo: producto.stock_actual,
        motivo: 'Stock inicial al crear producto.',
        referencia_id: idProducto,
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
        'crear_producto',
        'productos',
        @id_registro_afectado,
        NULL,
        @datos_nuevos,
        @ip,
        @user_agent
      )
    `).run({
      id_usuario: usuario?.id_usuario || null,
      id_registro_afectado: idProducto,
      datos_nuevos: JSON.stringify(producto),
      ip: ip || 'local',
      user_agent: userAgent || '',
    });

    return idProducto;
  });

  return transaccion();
}

function actualizarProducto(idProducto, datos) {
  return db
    .prepare(`
      UPDATE productos
      SET
        id_categoria_producto = @id_categoria_producto,
        id_unidad_medida = @id_unidad_medida,
        codigo_interno = @codigo_interno,
        codigo_barras = @codigo_barras,
        nombre = @nombre,
        descripcion = @descripcion,
        precio_costo = @precio_costo,
        precio_venta = @precio_venta,
        costo_promedio = @costo_promedio,
        ultimo_costo = @ultimo_costo,
        stock_minimo = @stock_minimo,
        controla_inventario = @controla_inventario,
        permite_venta_sin_stock = @permite_venta_sin_stock,
        permite_cantidad_decimal = @permite_cantidad_decimal,
        maneja_iva = @maneja_iva,
        porcentaje_iva = @porcentaje_iva,
        precio_incluye_iva = @precio_incluye_iva,
        imagen_url = @imagen_url,
        mostrar_en_pos_tactil = @mostrar_en_pos_tactil,
        orden_pos_tactil = @orden_pos_tactil,
        actualizado_en = CURRENT_TIMESTAMP
      WHERE id_producto = @id_producto
        AND eliminado_en IS NULL
    `)
    .run({
      id_producto: idProducto,
      ...datos,
    });
}

function cambiarEstadoProducto(idProducto, estado) {
  return db
    .prepare(`
      UPDATE productos
      SET
        estado = @estado,
        actualizado_en = CURRENT_TIMESTAMP
      WHERE id_producto = @id_producto
        AND eliminado_en IS NULL
    `)
    .run({
      id_producto: idProducto,
      estado,
    });
}

function registrarAuditoria(datos) {
  return db
    .prepare(`
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
        @accion,
        @tabla_afectada,
        @id_registro_afectado,
        @datos_anteriores,
        @datos_nuevos,
        @ip,
        @user_agent
      )
    `)
    .run(datos);
}

module.exports = {
  listarProductos,
  contarProductos,
  buscarProductoPorId,
  buscarProductoPorCodigoInterno,
  buscarProductoPorCodigoBarras,
  listarCodigosInternos,
  listarCategoriasDisponibles,
  listarUnidadesMedida,
  buscarUnidadPorId,
  buscarUnidadPorAbreviatura,
  crearProductoConMovimiento,
  actualizarProducto,
  cambiarEstadoProducto,
  registrarAuditoria,
};