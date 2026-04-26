const productosRepository = require('./productos.repository');

function limpiarTexto(valor) {
    return String(valor || '').trim();
}

function convertirEntero(valor, valorPorDefecto = 0) {
    const numero = Number(String(valor || '').replace(',', '.'));

    if (Number.isNaN(numero)) {
        return valorPorDefecto;
    }

    return Math.max(0, Math.round(numero));
}

function convertirCantidad(valor, valorPorDefecto = 0) {
    const numero = Number(String(valor || '').replace(',', '.'));

    if (Number.isNaN(numero)) {
        return valorPorDefecto;
    }

    return Math.max(0, numero);
}

function convertirId(valor) {
    const numero = Number(valor);

    if (!numero || Number.isNaN(numero)) {
        return null;
    }

    return numero;
}

function convertirCheckbox(valor) {
    return valor ? 1 : 0;
}

function tieneDecimales(numero) {
    return Math.abs(numero % 1) > 0;
}

function convertirPorcentajeACentesimas(valor) {
    const numero = Number(String(valor || '').replace(',', '.'));

    if (Number.isNaN(numero)) {
        return 0;
    }

    return Math.max(0, Math.round(numero * 100));
}

function formatearCantidad(cantidad, abreviatura, permiteDecimales) {
    const numero = Number(cantidad || 0);

    const texto = new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: permiteDecimales ? 3 : 0,
    }).format(numero);

    return `${texto} ${abreviatura || ''}`.trim();
}

function calcularIndicadoresProducto(producto) {
    const porcentajeIva = Number(producto.porcentaje_iva || 0);
    const tasaIva = porcentajeIva / 10000;

    let precioVentaNeto = Number(producto.precio_venta || 0);

    if (
        Number(producto.maneja_iva) === 1 &&
        Number(producto.precio_incluye_iva) === 1 &&
        tasaIva > 0
    ) {
        precioVentaNeto = Math.round(precioVentaNeto / (1 + tasaIva));
    }

    const costoReferencia =
        Number(producto.costo_promedio || 0) ||
        Number(producto.precio_costo || 0) ||
        Number(producto.ultimo_costo || 0);

    const gananciaBrutaUnitaria = precioVentaNeto - costoReferencia;

    const margenBruto =
        precioVentaNeto > 0
            ? (gananciaBrutaUnitaria / precioVentaNeto) * 100
            : 0;

    const markup =
        costoReferencia > 0
            ? (gananciaBrutaUnitaria / costoReferencia) * 100
            : 0;

    return {
        ...producto,
        costo_referencia: costoReferencia,
        precio_venta_neto: precioVentaNeto,
        ganancia_bruta_unitaria: gananciaBrutaUnitaria,
        margen_bruto_porcentaje: margenBruto,
        markup_porcentaje: markup,
        margen_bruto_texto: `${margenBruto.toFixed(1)}%`,
        markup_texto: `${markup.toFixed(1)}%`,
        stock_actual_texto: formatearCantidad(
            producto.stock_actual,
            producto.unidad_abreviatura,
            Number(producto.unidad_permite_decimales) === 1
        ),
        stock_minimo_texto: formatearCantidad(
            producto.stock_minimo,
            producto.unidad_abreviatura,
            Number(producto.unidad_permite_decimales) === 1
        ),
    };
}

function generarCodigoProducto() {
    const codigos = productosRepository.listarCodigosInternos();

    let maximo = 0;

    for (const item of codigos) {
        const codigo = String(item.codigo_interno || '');
        const coincidencia = codigo.match(/^PRD-(\d+)$/);

        if (coincidencia) {
            const numero = Number(coincidencia[1]);

            if (!Number.isNaN(numero) && numero > maximo) {
                maximo = numero;
            }
        }
    }

    return `PRD-${String(maximo + 1).padStart(4, '0')}`;
}

function normalizarFiltrosListado(filtros = {}) {
    const limitesPermitidos = [10, 25, 50];

    const limiteSolicitado = Number(filtros.limite);
    const limite = limitesPermitidos.includes(limiteSolicitado)
        ? limiteSolicitado
        : 10;

    const paginaSolicitada = Number(filtros.pagina);
    const pagina = paginaSolicitada > 0 ? paginaSolicitada : 1;

    return {
        busqueda: limpiarTexto(filtros.busqueda),
        idCategoriaProducto: limpiarTexto(filtros.idCategoriaProducto),
        estado: limpiarTexto(filtros.estado),
        stock: limpiarTexto(filtros.stock),
        pagina,
        limite,
    };
}

function listarProductos(filtros = {}) {
    const filtrosLimpios = normalizarFiltrosListado(filtros);

    const totalRegistros = productosRepository.contarProductos(filtrosLimpios);
    const totalPaginas = Math.max(
        1,
        Math.ceil(totalRegistros / filtrosLimpios.limite)
    );

    const paginaActual = Math.min(filtrosLimpios.pagina, totalPaginas);
    const offset = (paginaActual - 1) * filtrosLimpios.limite;

    const productos = productosRepository
        .listarProductos({
            ...filtrosLimpios,
            offset,
        })
        .map((producto) => calcularIndicadoresProducto(producto));

    return {
        productos,
        filtros: {
            ...filtrosLimpios,
            pagina: paginaActual,
        },
        paginacion: {
            paginaActual,
            totalPaginas,
            totalRegistros,
            limite: filtrosLimpios.limite,
            tieneAnterior: paginaActual > 1,
            tieneSiguiente: paginaActual < totalPaginas,
        },
    };
}

function listarCategoriasDisponibles() {
    return productosRepository.listarCategoriasDisponibles();
}

function listarUnidadesMedida() {
    return productosRepository.listarUnidadesMedida();
}

function obtenerUnidadPredeterminada() {
    return (
        productosRepository.buscarUnidadPorAbreviatura('und') ||
        productosRepository.listarUnidadesMedida()[0] ||
        null
    );
}

function obtenerProductoPorId(idProducto) {
    const id = Number(idProducto);

    if (!id || Number.isNaN(id)) {
        return null;
    }

    const producto = productosRepository.buscarProductoPorId(id);

    if (!producto) {
        return null;
    }

    return calcularIndicadoresProducto(producto);
}

function validarProducto(datos, productoActual = null, opciones = {}) {
    const errores = [];

    if (!limpiarTexto(datos.nombre)) {
        errores.push('El nombre del producto es obligatorio.');
    }

    if (!limpiarTexto(datos.codigo_interno)) {
        errores.push('El código interno es obligatorio.');
    }

    if (!convertirId(datos.id_categoria_producto)) {
        errores.push('La categoría del producto es obligatoria.');
    }

    const idUnidadMedida = convertirId(datos.id_unidad_medida);

    if (!idUnidadMedida) {
        errores.push('La unidad de medida es obligatoria.');
    }

    const unidad = idUnidadMedida
        ? productosRepository.buscarUnidadPorId(idUnidadMedida)
        : null;

    if (idUnidadMedida && !unidad) {
        errores.push('La unidad de medida seleccionada no existe o está inactiva.');
    }

    const precioCosto = convertirEntero(datos.precio_costo, 0);
    const precioVenta = convertirEntero(datos.precio_venta, 0);
    const stockInicial = convertirCantidad(datos.stock_inicial, 0);
    const stockMinimo = convertirCantidad(datos.stock_minimo, 0);

    if (precioCosto < 0) {
        errores.push('El precio de costo no puede ser negativo.');
    }

    if (precioVenta < 0) {
        errores.push('El precio de venta no puede ser negativo.');
    }

    if (stockInicial < 0) {
        errores.push('El stock inicial no puede ser negativo.');
    }

    if (stockMinimo < 0) {
        errores.push('El stock mínimo no puede ser negativo.');
    }

    if (unidad && Number(unidad.permite_decimales) === 0) {
        if (opciones.validarStockInicial && tieneDecimales(stockInicial)) {
            errores.push(
                `La unidad "${unidad.nombre}" no permite cantidades decimales.`
            );
        }

        if (tieneDecimales(stockMinimo)) {
            errores.push(
                `El stock mínimo no puede tener decimales para la unidad "${unidad.nombre}".`
            );
        }
    }

    const manejaIva = convertirCheckbox(datos.maneja_iva);
    const porcentajeIva = convertirPorcentajeACentesimas(
        datos.porcentaje_iva_visual
    );

    if (manejaIva === 1 && porcentajeIva <= 0) {
        errores.push('Si el producto maneja IVA, el porcentaje debe ser mayor a cero.');
    }

    const codigoInternoExistente =
        productosRepository.buscarProductoPorCodigoInterno(
            limpiarTexto(datos.codigo_interno)
        );

    if (
        codigoInternoExistente &&
        (!productoActual ||
            codigoInternoExistente.id_producto !== productoActual.id_producto)
    ) {
        errores.push('Ya existe un producto con ese código interno.');
    }

    const codigoBarras = limpiarTexto(datos.codigo_barras);

    if (codigoBarras) {
        const codigoBarrasExistente =
            productosRepository.buscarProductoPorCodigoBarras(codigoBarras);

        if (
            codigoBarrasExistente &&
            (!productoActual ||
                codigoBarrasExistente.id_producto !== productoActual.id_producto)
        ) {
            errores.push('Ya existe un producto con ese código de barras.');
        }
    }

    return errores;
}

function prepararDatosProducto(datos, { incluirStockInicial = false } = {}) {
    const idUnidadMedida = convertirId(datos.id_unidad_medida);
    const unidad = productosRepository.buscarUnidadPorId(idUnidadMedida);

    const controlaInventario = convertirCheckbox(datos.controla_inventario);
    const permiteVentaSinStock = convertirCheckbox(datos.permite_venta_sin_stock);
    const manejaIva = convertirCheckbox(datos.maneja_iva);
    const precioIncluyeIva = manejaIva
        ? convertirCheckbox(datos.precio_incluye_iva)
        : 0;

    const precioCosto = convertirEntero(datos.precio_costo, 0);

    const producto = {
        id_categoria_producto: convertirId(datos.id_categoria_producto),
        id_unidad_medida: idUnidadMedida,
        codigo_interno: limpiarTexto(datos.codigo_interno),
        codigo_barras: limpiarTexto(datos.codigo_barras) || null,
        nombre: limpiarTexto(datos.nombre),
        descripcion: limpiarTexto(datos.descripcion),
        precio_costo: precioCosto,
        precio_venta: convertirEntero(datos.precio_venta, 0),
        costo_promedio: precioCosto,
        ultimo_costo: precioCosto,
        stock_minimo: controlaInventario
            ? convertirCantidad(datos.stock_minimo, 0)
            : 0,
        controla_inventario: controlaInventario,
        permite_venta_sin_stock: controlaInventario
            ? permiteVentaSinStock
            : 1,
        permite_cantidad_decimal: Number(unidad?.permite_decimales || 0),
        maneja_iva: manejaIva,
        porcentaje_iva: manejaIva
            ? convertirPorcentajeACentesimas(datos.porcentaje_iva_visual)
            : 0,
        precio_incluye_iva: precioIncluyeIva,
        imagen_url: limpiarTexto(datos.imagen_url),
    };

    if (incluirStockInicial) {
        producto.stock_actual = controlaInventario
            ? convertirCantidad(datos.stock_inicial, 0)
            : 0;
    }

    return producto;
}

function crearProducto({ datosFormulario, usuario, ip, userAgent }) {
    const datosConCodigo = {
        ...datosFormulario,
        codigo_interno:
            limpiarTexto(datosFormulario.codigo_interno) || generarCodigoProducto(),
    };

    const errores = validarProducto(datosConCodigo, null, {
        validarStockInicial: true,
    });

    if (errores.length > 0) {
        return {
            ok: false,
            mensaje: errores[0],
            valores: datosConCodigo,
        };
    }

    const producto = prepararDatosProducto(datosConCodigo, {
        incluirStockInicial: true,
    });

    productosRepository.crearProductoConMovimiento({
        producto,
        usuario,
        ip,
        userAgent,
    });

    return {
        ok: true,
        mensaje: 'Producto creado correctamente.',
    };
}

function actualizarProducto({
    idProducto,
    datosFormulario,
    usuario,
    ip,
    userAgent,
}) {
    const productoActual = obtenerProductoPorId(idProducto);

    if (!productoActual) {
        return {
            ok: false,
            mensaje: 'El producto no existe.',
        };
    }

    const errores = validarProducto(datosFormulario, productoActual, {
        validarStockInicial: false,
    });

    if (errores.length > 0) {
        return {
            ok: false,
            mensaje: errores[0],
        };
    }

    const producto = prepararDatosProducto(datosFormulario, {
        incluirStockInicial: false,
    });

    productosRepository.actualizarProducto(productoActual.id_producto, producto);

    productosRepository.registrarAuditoria({
        id_usuario: usuario?.id_usuario || null,
        accion: 'actualizar_producto',
        tabla_afectada: 'productos',
        id_registro_afectado: productoActual.id_producto,
        datos_anteriores: JSON.stringify(productoActual),
        datos_nuevos: JSON.stringify(producto),
        ip: ip || 'local',
        user_agent: userAgent || '',
    });

    return {
        ok: true,
        mensaje: 'Producto actualizado correctamente.',
    };
}

function cambiarEstadoProducto({
    idProducto,
    nuevoEstado,
    usuario,
    ip,
    userAgent,
}) {
    const productoActual = obtenerProductoPorId(idProducto);

    if (!productoActual) {
        return {
            ok: false,
            mensaje: 'El producto no existe.',
        };
    }

    if (!['activo', 'inactivo'].includes(nuevoEstado)) {
        return {
            ok: false,
            mensaje: 'Estado no válido.',
        };
    }

    productosRepository.cambiarEstadoProducto(
        productoActual.id_producto,
        nuevoEstado
    );

    productosRepository.registrarAuditoria({
        id_usuario: usuario?.id_usuario || null,
        accion:
            nuevoEstado === 'activo'
                ? 'activar_producto'
                : 'desactivar_producto',
        tabla_afectada: 'productos',
        id_registro_afectado: productoActual.id_producto,
        datos_anteriores: JSON.stringify(productoActual),
        datos_nuevos: JSON.stringify({
            ...productoActual,
            estado: nuevoEstado,
        }),
        ip: ip || 'local',
        user_agent: userAgent || '',
    });

    return {
        ok: true,
        mensaje:
            nuevoEstado === 'activo'
                ? 'Producto activado correctamente.'
                : 'Producto desactivado correctamente.',
    };
}

module.exports = {
    generarCodigoProducto,
    listarProductos,
    listarCategoriasDisponibles,
    listarUnidadesMedida,
    obtenerUnidadPredeterminada,
    obtenerProductoPorId,
    crearProducto,
    actualizarProducto,
    cambiarEstadoProducto,
};