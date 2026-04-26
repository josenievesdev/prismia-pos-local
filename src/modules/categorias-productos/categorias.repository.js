const db = require('../../config/db');

function listarCategorias() {
    return db
        .prepare(`
      SELECT
        id_categoria_producto,
        nombre,
        descripcion,
        estado,
        creado_en,
        actualizado_en,
        eliminado_en
      FROM categorias_productos
      WHERE eliminado_en IS NULL
      ORDER BY nombre ASC
    `)
        .all();
}

function buscarCategoriaPorId(idCategoria) {
    return db
        .prepare(`
      SELECT
        id_categoria_producto,
        nombre,
        descripcion,
        estado,
        creado_en,
        actualizado_en,
        eliminado_en
      FROM categorias_productos
      WHERE id_categoria_producto = ?
        AND eliminado_en IS NULL
      LIMIT 1
    `)
        .get(idCategoria);
}

function buscarCategoriaPorNombre(nombre) {
    return db
        .prepare(`
      SELECT
        id_categoria_producto,
        nombre,
        descripcion,
        estado
      FROM categorias_productos
      WHERE LOWER(nombre) = LOWER(?)
        AND eliminado_en IS NULL
      LIMIT 1
    `)
        .get(nombre);
}

function crearCategoria(datos) {
    return db
        .prepare(`
      INSERT INTO categorias_productos (
        nombre,
        descripcion,
        estado
      ) VALUES (
        @nombre,
        @descripcion,
        @estado
      )
    `)
        .run(datos);
}

function actualizarCategoria(idCategoria, datos) {
    return db
        .prepare(`
      UPDATE categorias_productos
      SET
        nombre = @nombre,
        descripcion = @descripcion,
        actualizado_en = CURRENT_TIMESTAMP
      WHERE id_categoria_producto = @id_categoria_producto
        AND eliminado_en IS NULL
    `)
        .run({
            id_categoria_producto: idCategoria,
            ...datos,
        });
}

function cambiarEstadoCategoria(idCategoria, estado) {
    return db
        .prepare(`
      UPDATE categorias_productos
      SET
        estado = @estado,
        actualizado_en = CURRENT_TIMESTAMP
      WHERE id_categoria_producto = @id_categoria_producto
        AND eliminado_en IS NULL
    `)
        .run({
            id_categoria_producto: idCategoria,
            estado,
        });
}

function contarProductosPorCategoria(idCategoria) {
    const resultado = db
        .prepare(`
      SELECT COUNT(*) AS total
      FROM productos
      WHERE id_categoria_producto = ?
        AND eliminado_en IS NULL
    `)
        .get(idCategoria);

    return resultado?.total || 0;
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
    listarCategorias,
    buscarCategoriaPorId,
    buscarCategoriaPorNombre,
    crearCategoria,
    actualizarCategoria,
    cambiarEstadoCategoria,
    contarProductosPorCategoria,
    registrarAuditoria,
};