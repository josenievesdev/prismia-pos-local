const categoriasRepository = require('./categorias.repository');

function limpiarTexto(valor) {
    return String(valor || '').trim();
}

function listarCategorias() {
    return categoriasRepository.listarCategorias();
}

function obtenerCategoriaPorId(idCategoria) {
    const id = Number(idCategoria);

    if (!id || Number.isNaN(id)) {
        return null;
    }

    return categoriasRepository.buscarCategoriaPorId(id);
}

function validarDatosCategoria(datos) {
    const errores = [];

    if (!limpiarTexto(datos.nombre)) {
        errores.push('El nombre de la categoría es obligatorio.');
    }

    if (limpiarTexto(datos.nombre).length > 80) {
        errores.push('El nombre de la categoría no debe superar 80 caracteres.');
    }

    return errores;
}

function prepararDatosCategoria(datos) {
    return {
        nombre: limpiarTexto(datos.nombre),
        descripcion: limpiarTexto(datos.descripcion),
        estado: 'activo',
    };
}

function crearCategoria({ datosFormulario, usuario, ip, userAgent }) {
    const errores = validarDatosCategoria(datosFormulario);

    if (errores.length > 0) {
        return {
            ok: false,
            mensaje: errores[0],
        };
    }

    const datosLimpios = prepararDatosCategoria(datosFormulario);

    const categoriaExistente = categoriasRepository.buscarCategoriaPorNombre(
        datosLimpios.nombre
    );

    if (categoriaExistente) {
        return {
            ok: false,
            mensaje: 'Ya existe una categoría con ese nombre.',
        };
    }

    const resultado = categoriasRepository.crearCategoria(datosLimpios);

    categoriasRepository.registrarAuditoria({
        id_usuario: usuario?.id_usuario || null,
        accion: 'crear_categoria_producto',
        tabla_afectada: 'categorias_productos',
        id_registro_afectado: resultado.lastInsertRowid,
        datos_anteriores: null,
        datos_nuevos: JSON.stringify(datosLimpios),
        ip: ip || 'local',
        user_agent: userAgent || '',
    });

    return {
        ok: true,
        mensaje: 'Categoría creada correctamente.',
    };
}

function actualizarCategoria({
    idCategoria,
    datosFormulario,
    usuario,
    ip,
    userAgent,
}) {
    const categoriaAnterior = obtenerCategoriaPorId(idCategoria);

    if (!categoriaAnterior) {
        return {
            ok: false,
            mensaje: 'La categoría no existe.',
        };
    }

    const errores = validarDatosCategoria(datosFormulario);

    if (errores.length > 0) {
        return {
            ok: false,
            mensaje: errores[0],
        };
    }

    const datosLimpios = prepararDatosCategoria(datosFormulario);

    const categoriaMismoNombre = categoriasRepository.buscarCategoriaPorNombre(
        datosLimpios.nombre
    );

    if (
        categoriaMismoNombre &&
        categoriaMismoNombre.id_categoria_producto !==
        categoriaAnterior.id_categoria_producto
    ) {
        return {
            ok: false,
            mensaje: 'Ya existe otra categoría con ese nombre.',
        };
    }

    categoriasRepository.actualizarCategoria(idCategoria, {
        nombre: datosLimpios.nombre,
        descripcion: datosLimpios.descripcion,
    });

    categoriasRepository.registrarAuditoria({
        id_usuario: usuario?.id_usuario || null,
        accion: 'actualizar_categoria_producto',
        tabla_afectada: 'categorias_productos',
        id_registro_afectado: categoriaAnterior.id_categoria_producto,
        datos_anteriores: JSON.stringify(categoriaAnterior),
        datos_nuevos: JSON.stringify(datosLimpios),
        ip: ip || 'local',
        user_agent: userAgent || '',
    });

    return {
        ok: true,
        mensaje: 'Categoría actualizada correctamente.',
    };
}

function cambiarEstadoCategoria({
    idCategoria,
    nuevoEstado,
    usuario,
    ip,
    userAgent,
}) {
    const categoriaAnterior = obtenerCategoriaPorId(idCategoria);

    if (!categoriaAnterior) {
        return {
            ok: false,
            mensaje: 'La categoría no existe.',
        };
    }

    if (!['activo', 'inactivo'].includes(nuevoEstado)) {
        return {
            ok: false,
            mensaje: 'Estado no válido.',
        };
    }

    categoriasRepository.cambiarEstadoCategoria(idCategoria, nuevoEstado);

    categoriasRepository.registrarAuditoria({
        id_usuario: usuario?.id_usuario || null,
        accion:
            nuevoEstado === 'activo'
                ? 'activar_categoria_producto'
                : 'desactivar_categoria_producto',
        tabla_afectada: 'categorias_productos',
        id_registro_afectado: categoriaAnterior.id_categoria_producto,
        datos_anteriores: JSON.stringify(categoriaAnterior),
        datos_nuevos: JSON.stringify({
            ...categoriaAnterior,
            estado: nuevoEstado,
        }),
        ip: ip || 'local',
        user_agent: userAgent || '',
    });

    return {
        ok: true,
        mensaje:
            nuevoEstado === 'activo'
                ? 'Categoría activada correctamente.'
                : 'Categoría desactivada correctamente.',
    };
}

module.exports = {
    listarCategorias,
    obtenerCategoriaPorId,
    crearCategoria,
    actualizarCategoria,
    cambiarEstadoCategoria,
};