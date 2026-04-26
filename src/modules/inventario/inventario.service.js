const XLSX = require('xlsx');
const inventarioRepository = require('./inventario.repository');

function limpiarTexto(valor) {
    return String(valor || '').trim();
}

function convertirCantidad(valor, valorPorDefecto = 0) {
    const numero = Number(String(valor || '').replace(',', '.'));

    if (Number.isNaN(numero)) {
        return valorPorDefecto;
    }

    return Math.max(0, numero);
}

function tieneDecimales(numero) {
    return Math.abs(numero % 1) > 0;
}

function redondearCantidad(numero) {
    return Math.round((Number(numero || 0) + Number.EPSILON) * 1000) / 1000;
}

function formatearCantidad(cantidad, abreviatura, permiteDecimales) {
    const numero = Number(cantidad || 0);

    const texto = new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: permiteDecimales ? 3 : 0,
    }).format(numero);

    return `${texto} ${abreviatura || ''}`.trim();
}

function normalizarFiltros(filtros = {}) {
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
        estadoStock: limpiarTexto(filtros.estadoStock),
        tipoMovimiento: limpiarTexto(filtros.tipoMovimiento),
        idProducto: limpiarTexto(filtros.idProducto),
        pagina,
        limite,
    };
}

function enriquecerProductoStock(producto) {
    const permiteDecimales = Number(producto.unidad_permite_decimales) === 1;

    let estadoStock = 'ok';
    let estadoStockTexto = 'Stock suficiente';

    if (Number(producto.controla_inventario) === 0) {
        estadoStock = 'sin_control';
        estadoStockTexto = 'Sin control';
    } else if (Number(producto.stock_actual) <= 0) {
        estadoStock = 'sin_stock';
        estadoStockTexto = 'Sin stock';
    } else if (Number(producto.stock_actual) <= Number(producto.stock_minimo)) {
        estadoStock = 'bajo';
        estadoStockTexto = 'Bajo stock';
    }

    return {
        ...producto,
        estado_stock: estadoStock,
        estado_stock_texto: estadoStockTexto,
        stock_actual_texto: formatearCantidad(
            producto.stock_actual,
            producto.unidad_abreviatura,
            permiteDecimales
        ),
        stock_minimo_texto: formatearCantidad(
            producto.stock_minimo,
            producto.unidad_abreviatura,
            permiteDecimales
        ),
    };
}

function listarResumenInventario(filtros = {}) {
    const filtrosLimpios = normalizarFiltros(filtros);

    const totalRegistros = inventarioRepository.contarResumenStock(filtrosLimpios);
    const totalPaginas = Math.max(
        1,
        Math.ceil(totalRegistros / filtrosLimpios.limite)
    );

    const paginaActual = Math.min(filtrosLimpios.pagina, totalPaginas);
    const offset = (paginaActual - 1) * filtrosLimpios.limite;

    const productos = inventarioRepository
        .listarResumenStock({
            ...filtrosLimpios,
            offset,
        })
        .map(enriquecerProductoStock);

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
    return inventarioRepository.listarCategoriasDisponibles();
}

function obtenerProductoInventarioPorId(idProducto) {
    const id = Number(idProducto);

    if (!id || Number.isNaN(id)) {
        return null;
    }

    const producto = inventarioRepository.obtenerProductoInventarioPorId(id);

    if (!producto) {
        return null;
    }

    return enriquecerProductoStock(producto);
}

function validarAjuste({ producto, datosFormulario }) {
    const errores = [];

    if (!producto) {
        errores.push('El producto no existe.');
        return errores;
    }

    if (Number(producto.controla_inventario) !== 1) {
        errores.push('Este producto no controla inventario.');
    }

    const tipoAjuste = limpiarTexto(datosFormulario.tipo_ajuste);

    if (!['entrada', 'salida'].includes(tipoAjuste)) {
        errores.push('El tipo de ajuste no es válido.');
    }

    const cantidad = convertirCantidad(datosFormulario.cantidad, 0);

    if (cantidad <= 0) {
        errores.push('La cantidad debe ser mayor a cero.');
    }

    const permiteDecimales = Number(producto.unidad_permite_decimales) === 1;

    if (!permiteDecimales && tieneDecimales(cantidad)) {
        errores.push(`La unidad "${producto.unidad_nombre}" no permite decimales.`);
    }

    const motivo = limpiarTexto(datosFormulario.motivo);

    if (!motivo) {
        errores.push('El motivo del ajuste es obligatorio.');
    }

    if (tipoAjuste === 'salida' && cantidad > Number(producto.stock_actual)) {
        errores.push('La salida no puede ser mayor al stock actual.');
    }

    return errores;
}

function registrarAjusteManual({
    idProducto,
    datosFormulario,
    usuario,
    ip,
    userAgent,
}) {
    const producto = obtenerProductoInventarioPorId(idProducto);
    const errores = validarAjuste({ producto, datosFormulario });

    if (errores.length > 0) {
        return {
            ok: false,
            mensaje: errores[0],
        };
    }

    const tipoAjuste = limpiarTexto(datosFormulario.tipo_ajuste);
    const cantidad = redondearCantidad(
        convertirCantidad(datosFormulario.cantidad, 0)
    );

    const stockAnterior = Number(producto.stock_actual || 0);
    const stockNuevo =
        tipoAjuste === 'entrada'
            ? redondearCantidad(stockAnterior + cantidad)
            : redondearCantidad(stockAnterior - cantidad);

    const tipoMovimiento =
        tipoAjuste === 'entrada' ? 'ajuste_positivo' : 'ajuste_negativo';

    inventarioRepository.registrarAjusteInventario({
        producto,
        ajuste: {
            tipo_movimiento: tipoMovimiento,
            cantidad,
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            motivo: limpiarTexto(datosFormulario.motivo),
        },
        usuario,
        ip,
        userAgent,
    });

    return {
        ok: true,
        mensaje: 'Ajuste de inventario registrado correctamente.',
    };
}

function traducirTipoMovimiento(tipoMovimiento) {
    const mapa = {
        entrada_inicial: 'Entrada inicial',
        ajuste_positivo: 'Ajuste positivo',
        ajuste_negativo: 'Ajuste negativo',
        venta: 'Venta',
        devolucion: 'Devolución',
        compra: 'Compra',
        anulacion_venta: 'Anulación de venta',
        anulacion_devolucion: 'Anulación de devolución',
    };

    return mapa[tipoMovimiento] || tipoMovimiento;
}

function enriquecerMovimiento(movimiento) {
    const permiteDecimales = Number(movimiento.unidad_permite_decimales) === 1;

    return {
        ...movimiento,
        tipo_movimiento_texto: traducirTipoMovimiento(movimiento.tipo_movimiento),
        cantidad_texto: formatearCantidad(
            movimiento.cantidad,
            movimiento.unidad_abreviatura,
            permiteDecimales
        ),
        stock_anterior_texto: formatearCantidad(
            movimiento.stock_anterior,
            movimiento.unidad_abreviatura,
            permiteDecimales
        ),
        stock_nuevo_texto: formatearCantidad(
            movimiento.stock_nuevo,
            movimiento.unidad_abreviatura,
            permiteDecimales
        ),
    };
}

function listarHistorialMovimientos(filtros = {}) {
    const filtrosLimpios = normalizarFiltros(filtros);

    const totalRegistros =
        inventarioRepository.contarMovimientosInventario(filtrosLimpios);

    const totalPaginas = Math.max(
        1,
        Math.ceil(totalRegistros / filtrosLimpios.limite)
    );

    const paginaActual = Math.min(filtrosLimpios.pagina, totalPaginas);
    const offset = (paginaActual - 1) * filtrosLimpios.limite;

    const movimientos = inventarioRepository
        .listarMovimientosInventario({
            ...filtrosLimpios,
            offset,
        })
        .map(enriquecerMovimiento);

    return {
        movimientos,
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

function generarNumeroConteo() {
    const numeros = inventarioRepository.listarNumerosConteo();

    let maximo = 0;

    for (const item of numeros) {
        const numeroConteo = String(item.numero_conteo || '');
        const coincidencia = numeroConteo.match(/^INV-(\d+)$/);

        if (coincidencia) {
            const numero = Number(coincidencia[1]);

            if (!Number.isNaN(numero) && numero > maximo) {
                maximo = numero;
            }
        }
    }

    return `INV-${String(maximo + 1).padStart(6, '0')}`;
}

function listarConteosInventario() {
    return inventarioRepository.listarConteosInventario();
}

function crearConteoInventario({ datosFormulario, usuario, ip, userAgent }) {
    const tipoConteo = limpiarTexto(datosFormulario.tipo_conteo) || 'total';
    const observaciones = limpiarTexto(datosFormulario.observaciones);

    if (!['total', 'categoria'].includes(tipoConteo)) {
        return {
            ok: false,
            mensaje: 'El tipo de conteo no es válido.',
        };
    }

    const idCategoriaProducto = Number(datosFormulario.id_categoria_producto);

    if (tipoConteo === 'categoria' && (!idCategoriaProducto || Number.isNaN(idCategoriaProducto))) {
        return {
            ok: false,
            mensaje: 'Debes seleccionar una categoría para el conteo por categoría.',
        };
    }

    const productos = inventarioRepository.listarProductosParaConteo({
        tipoConteo,
        idCategoriaProducto,
    });

    if (!productos || productos.length === 0) {
        return {
            ok: false,
            mensaje: 'No hay productos activos con control de inventario para este conteo.',
        };
    }

    const numeroConteo = generarNumeroConteo();

    const idConteo = inventarioRepository.crearConteoInventario({
        conteo: {
            numero_conteo: numeroConteo,
            id_usuario_creacion: usuario?.id_usuario || null,
            tipo_conteo: tipoConteo,
            origen: 'manual',
            id_categoria_producto:
                tipoConteo === 'categoria' ? idCategoriaProducto : null,
            total_productos: productos.length,
            observaciones,
            ip: ip || 'local',
            user_agent: userAgent || '',
        },
        productos,
    });

    return {
        ok: true,
        mensaje: 'Conteo físico creado correctamente.',
        idConteo,
    };
}

function obtenerConteoConDetalle(idConteo) {
    const id = Number(idConteo);

    if (!id || Number.isNaN(id)) {
        return null;
    }

    const conteo = inventarioRepository.obtenerConteoPorId(id);

    if (!conteo) {
        return null;
    }

    const detalles = inventarioRepository.listarDetalleConteo(id).map((detalle) => {
        const permiteDecimales = Number(detalle.unidad_permite_decimales) === 1;

        return {
            ...detalle,
            stock_sistema_texto: formatearCantidad(
                detalle.stock_sistema,
                detalle.unidad_abreviatura,
                permiteDecimales
            ),
            stock_contado_texto:
                detalle.stock_contado === null || typeof detalle.stock_contado === 'undefined'
                    ? 'Pendiente'
                    : formatearCantidad(
                        detalle.stock_contado,
                        detalle.unidad_abreviatura,
                        permiteDecimales
                    ),
            diferencia_texto: formatearCantidad(
                detalle.diferencia,
                detalle.unidad_abreviatura,
                permiteDecimales
            ),
        };
    });

    const totalProductos = detalles.length;

    const totalPendientes = detalles.filter(
        (detalle) =>
            detalle.stock_contado === null ||
            typeof detalle.stock_contado === 'undefined' ||
            detalle.estado === 'pendiente'
    ).length;

    const totalContados = detalles.filter(
        (detalle) => detalle.estado === 'contado'
    ).length;

    const totalAjustados = detalles.filter(
        (detalle) => detalle.estado === 'ajustado'
    ).length;

    const totalConDiferencia = detalles.filter(
        (detalle) => Math.abs(Number(detalle.diferencia || 0)) > 0.000001
    ).length;

    const valorDiferenciaTotal = detalles.reduce(
        (total, detalle) => total + Number(detalle.valor_diferencia || 0),
        0
    );

    const puedeGuardarCantidades = ['borrador', 'en_revision'].includes(
        conteo.estado
    );

    const puedeImportarPlantilla = ['borrador', 'en_revision'].includes(
        conteo.estado
    );

    const puedeAplicar =
        conteo.estado === 'en_revision' &&
        totalProductos > 0 &&
        totalPendientes === 0 &&
        totalContados === totalProductos;

    const resumen = {
        total_productos: totalProductos,
        total_pendientes: totalPendientes,
        total_contados: totalContados,
        total_ajustados: totalAjustados,
        total_con_diferencia: totalConDiferencia,
        valor_diferencia_total: valorDiferenciaTotal,
        puede_guardar_cantidades: puedeGuardarCantidades,
        puede_importar_plantilla: puedeImportarPlantilla,
        puede_aplicar: puedeAplicar,
    };

    return {
        conteo,
        detalles,
        resumen,
    };
}

function traducirEstadoConteo(estado) {
    const mapa = {
        borrador: 'Borrador',
        en_revision: 'En revisión',
        aplicado: 'Aplicado',
        anulado: 'Anulado',
    };

    return mapa[estado] || estado;
}

function normalizarComoArray(valor) {
    if (Array.isArray(valor)) {
        return valor;
    }

    if (typeof valor === 'undefined') {
        return [];
    }

    return [valor];
}

function convertirCantidadObligatoria(valor) {
    const texto = String(valor ?? '').trim();

    if (!texto) {
        return null;
    }

    const numero = Number(texto.replace(',', '.'));

    if (Number.isNaN(numero)) {
        return null;
    }

    return numero;
}

function guardarCantidadesConteo({
    idConteo,
    datosFormulario,
    usuario,
    ip,
    userAgent,
}) {
    const resultadoConteo = obtenerConteoConDetalle(idConteo);

    if (!resultadoConteo) {
        return {
            ok: false,
            mensaje: 'El conteo físico no existe.',
        };
    }

    const { conteo, detalles } = resultadoConteo;

    if (!['borrador', 'en_revision'].includes(conteo.estado)) {
        return {
            ok: false,
            mensaje: 'Este conteo ya no permite modificar cantidades.',
        };
    }

    const idsDetalle = normalizarComoArray(datosFormulario.id_detalle);
    const stocksContados = normalizarComoArray(datosFormulario.stock_contado);
    const observaciones = normalizarComoArray(datosFormulario.observaciones);

    if (idsDetalle.length === 0) {
        return {
            ok: false,
            mensaje: 'No se recibieron productos para contar.',
        };
    }

    if (idsDetalle.length !== detalles.length) {
        return {
            ok: false,
            mensaje: 'Debes registrar cantidad para todos los productos del conteo.',
        };
    }

    const detallesPorId = new Map(
        detalles.map((detalle) => [
            Number(detalle.id_detalle_conteo_inventario),
            detalle,
        ])
    );

    const detallesProcesados = [];

    for (let i = 0; i < idsDetalle.length; i += 1) {
        const idDetalle = Number(idsDetalle[i]);
        const detalleOriginal = detallesPorId.get(idDetalle);

        if (!detalleOriginal) {
            return {
                ok: false,
                mensaje: 'Uno de los productos del conteo no es válido.',
            };
        }

        const stockContado = convertirCantidadObligatoria(stocksContados[i]);

        if (stockContado === null) {
            return {
                ok: false,
                mensaje: `Debes ingresar el stock contado para "${detalleOriginal.nombre_producto}".`,
            };
        }

        if (stockContado < 0) {
            return {
                ok: false,
                mensaje: `El stock contado de "${detalleOriginal.nombre_producto}" no puede ser negativo.`,
            };
        }

        const permiteDecimales =
            Number(detalleOriginal.unidad_permite_decimales) === 1;

        if (!permiteDecimales && tieneDecimales(stockContado)) {
            return {
                ok: false,
                mensaje: `La unidad de "${detalleOriginal.nombre_producto}" no permite decimales.`,
            };
        }

        const stockSistema = Number(detalleOriginal.stock_sistema || 0);
        const diferencia = redondearCantidad(stockContado - stockSistema);
        const costoPromedio = Number(detalleOriginal.costo_promedio || 0);
        const valorDiferencia = Math.round(diferencia * costoPromedio);

        detallesProcesados.push({
            id_detalle_conteo_inventario: idDetalle,
            stock_contado: redondearCantidad(stockContado),
            diferencia,
            valor_diferencia: valorDiferencia,
            observaciones: limpiarTexto(observaciones[i]),
        });
    }

    inventarioRepository.guardarCantidadesConteo({
        idConteo: Number(idConteo),
        detalles: detallesProcesados,
        usuario,
        ip,
        userAgent,
    });

    return {
        ok: true,
        mensaje: 'Cantidades contadas guardadas correctamente.',
    };
}

function aplicarConteoInventario({ idConteo, usuario, ip, userAgent }) {
    const id = Number(idConteo);

    if (!id || Number.isNaN(id)) {
        return {
            ok: false,
            mensaje: 'El conteo físico no es válido.',
        };
    }

    const conteo = inventarioRepository.obtenerConteoPorId(id);

    if (!conteo) {
        return {
            ok: false,
            mensaje: 'El conteo físico no existe.',
        };
    }

    if (conteo.estado !== 'en_revision') {
        return {
            ok: false,
            mensaje:
                'Solo se pueden aplicar conteos que estén en estado en revisión.',
        };
    }

    const detalles = inventarioRepository.listarDetalleConteoParaAplicar(id);

    if (!detalles || detalles.length === 0) {
        return {
            ok: false,
            mensaje: 'El conteo no tiene productos para aplicar.',
        };
    }

    const detallePendiente = detalles.find(
        (detalle) =>
            detalle.stock_contado === null ||
            typeof detalle.stock_contado === 'undefined' ||
            detalle.estado !== 'contado'
    );

    if (detallePendiente) {
        return {
            ok: false,
            mensaje:
                'Todos los productos deben tener stock contado antes de aplicar el conteo.',
        };
    }

    const productoConStockModificado = detalles.find((detalle) => {
        const stockSistema = Number(detalle.stock_sistema || 0);
        const stockActualProducto = Number(detalle.stock_actual_producto || 0);

        return Math.abs(stockSistema - stockActualProducto) > 0.000001;
    });

    if (productoConStockModificado) {
        return {
            ok: false,
            mensaje: `No se puede aplicar el conteo porque el stock de "${productoConStockModificado.nombre_producto}" cambió después de crear el conteo.`,
        };
    }

    inventarioRepository.aplicarConteoInventario({
        conteo,
        detalles,
        usuario,
        ip,
        userAgent,
    });

    return {
        ok: true,
        mensaje: 'Conteo físico aplicado correctamente.',
    };
}

function obtenerReporteDiferenciasConteo(idConteo) {
    const resultado = obtenerConteoConDetalle(idConteo);

    if (!resultado) {
        return null;
    }

    const { conteo, detalles } = resultado;

    let totalSobrantes = 0;
    let totalFaltantes = 0;
    let totalSinDiferencia = 0;

    let valorSobrantes = 0;
    let valorFaltantes = 0;

    const detallesConDiferencia = detalles.map((detalle) => {
        const diferencia = Number(detalle.diferencia || 0);
        const valorDiferencia = Number(detalle.valor_diferencia || 0);

        let tipoDiferencia = 'sin_diferencia';
        let tipoDiferenciaTexto = 'Sin diferencia';

        if (diferencia > 0) {
            tipoDiferencia = 'sobrante';
            tipoDiferenciaTexto = 'Sobrante';
            totalSobrantes += 1;
            valorSobrantes += valorDiferencia;
        } else if (diferencia < 0) {
            tipoDiferencia = 'faltante';
            tipoDiferenciaTexto = 'Faltante';
            totalFaltantes += 1;
            valorFaltantes += Math.abs(valorDiferencia);
        } else {
            totalSinDiferencia += 1;
        }

        return {
            ...detalle,
            tipo_diferencia: tipoDiferencia,
            tipo_diferencia_texto: tipoDiferenciaTexto,
            valor_diferencia_absoluto: Math.abs(valorDiferencia),
        };
    });

    const detallesSoloDiferencias = detallesConDiferencia.filter(
        (detalle) => detalle.tipo_diferencia !== 'sin_diferencia'
    );

    return {
        conteo: {
            ...conteo,
            estado_texto: traducirEstadoConteo(conteo.estado),
        },
        resumen: {
            total_productos: detalles.length,
            total_sobrantes: totalSobrantes,
            total_faltantes: totalFaltantes,
            total_sin_diferencia: totalSinDiferencia,
            total_diferencias: totalSobrantes + totalFaltantes,
            valor_sobrantes: valorSobrantes,
            valor_faltantes: valorFaltantes,
            impacto_neto: valorSobrantes - valorFaltantes,
        },
        detalles: detallesConDiferencia,
        diferencias: detallesSoloDiferencias,
    };
}

function limpiarNombreArchivo(valor) {
    return String(valor || '')
        .trim()
        .replace(/[^\w\-]+/g, '_')
        .replace(/_+/g, '_');
}

function crearBufferExcel(workbook) {
    return XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'buffer',
    });
}

function generarExcelDiferenciasConteo(idConteo) {
    const reporte = obtenerReporteDiferenciasConteo(idConteo);

    if (!reporte) {
        return null;
    }

    const { conteo, resumen, diferencias, detalles } = reporte;

    const workbook = XLSX.utils.book_new();

    const hojaResumen = XLSX.utils.aoa_to_sheet([
        ['Reporte de diferencias de inventario'],
        [],
        ['Conteo', conteo.numero_conteo],
        ['Estado', conteo.estado_texto],
        ['Fecha inicio', conteo.fecha_inicio || ''],
        ['Fecha aplicación', conteo.fecha_aplicacion || ''],
        [],
        ['Indicador', 'Valor'],
        ['Productos del conteo', resumen.total_productos],
        ['Productos con sobrante', resumen.total_sobrantes],
        ['Productos con faltante', resumen.total_faltantes],
        ['Productos sin diferencia', resumen.total_sin_diferencia],
        ['Total diferencias', resumen.total_diferencias],
        ['Valor sobrantes', resumen.valor_sobrantes],
        ['Valor faltantes', resumen.valor_faltantes],
        ['Impacto neto', resumen.impacto_neto],
    ]);

    hojaResumen['!cols'] = [
        { wch: 28 },
        { wch: 24 },
    ];

    XLSX.utils.book_append_sheet(workbook, hojaResumen, 'Resumen');

    const hojaDiferencias = XLSX.utils.json_to_sheet(
        diferencias.map((detalle) => ({
            codigo_interno: detalle.codigo_interno,
            codigo_barras: detalle.codigo_barras || '',
            producto: detalle.nombre_producto,
            unidad: detalle.unidad_abreviatura || '',
            stock_sistema: Number(detalle.stock_sistema || 0),
            stock_contado: Number(detalle.stock_contado || 0),
            diferencia: Number(detalle.diferencia || 0),
            tipo: detalle.tipo_diferencia_texto,
            valor_estimado: Number(detalle.valor_diferencia_absoluto || 0),
            observacion: detalle.observaciones || '',
        }))
    );

    hojaDiferencias['!cols'] = [
        { wch: 16 },
        { wch: 18 },
        { wch: 34 },
        { wch: 10 },
        { wch: 16 },
        { wch: 16 },
        { wch: 14 },
        { wch: 14 },
        { wch: 18 },
        { wch: 32 },
    ];

    XLSX.utils.book_append_sheet(workbook, hojaDiferencias, 'Diferencias');

    const hojaDetalleCompleto = XLSX.utils.json_to_sheet(
        detalles.map((detalle) => ({
            codigo_interno: detalle.codigo_interno,
            codigo_barras: detalle.codigo_barras || '',
            producto: detalle.nombre_producto,
            unidad: detalle.unidad_abreviatura || '',
            stock_sistema: Number(detalle.stock_sistema || 0),
            stock_contado:
                detalle.stock_contado === null || typeof detalle.stock_contado === 'undefined'
                    ? ''
                    : Number(detalle.stock_contado || 0),
            diferencia: Number(detalle.diferencia || 0),
            tipo: detalle.tipo_diferencia_texto,
            valor_estimado: Math.abs(Number(detalle.valor_diferencia || 0)),
            estado: detalle.estado,
            observacion: detalle.observaciones || '',
        }))
    );

    hojaDetalleCompleto['!cols'] = [
        { wch: 16 },
        { wch: 18 },
        { wch: 34 },
        { wch: 10 },
        { wch: 16 },
        { wch: 16 },
        { wch: 14 },
        { wch: 16 },
        { wch: 18 },
        { wch: 14 },
        { wch: 32 },
    ];

    XLSX.utils.book_append_sheet(workbook, hojaDetalleCompleto, 'Detalle completo');

    return {
        nombreArchivo: `${limpiarNombreArchivo(conteo.numero_conteo)}_diferencias.xlsx`,
        buffer: crearBufferExcel(workbook),
    };
}

function generarExcelPlantillaConteo(idConteo) {
    const resultado = obtenerConteoConDetalle(idConteo);

    if (!resultado) {
        return null;
    }

    const { conteo, detalles } = resultado;

    const workbook = XLSX.utils.book_new();

    const hojaInstrucciones = XLSX.utils.aoa_to_sheet([
        ['Plantilla de conteo físico'],
        [],
        ['Conteo', conteo.numero_conteo],
        ['Estado', traducirEstadoConteo(conteo.estado)],
        [],
        ['Instrucciones'],
        ['1. No cambies el código interno.'],
        ['2. No cambies el nombre del producto.'],
        ['3. Diligencia únicamente stock_contado y observacion.'],
        ['4. Usa la unidad indicada para cada producto.'],
        ['5. No ingreses cantidades negativas.'],
    ]);

    hojaInstrucciones['!cols'] = [
        { wch: 28 },
        { wch: 28 },
    ];

    XLSX.utils.book_append_sheet(workbook, hojaInstrucciones, 'Instrucciones');

    const hojaPlantilla = XLSX.utils.json_to_sheet(
        detalles.map((detalle) => ({
            id_detalle: detalle.id_detalle_conteo_inventario,
            codigo_interno: detalle.codigo_interno,
            codigo_barras: detalle.codigo_barras || '',
            producto: detalle.nombre_producto,
            unidad: detalle.unidad_abreviatura || '',
            stock_sistema: Number(detalle.stock_sistema || 0),
            stock_contado:
                detalle.stock_contado === null || typeof detalle.stock_contado === 'undefined'
                    ? ''
                    : Number(detalle.stock_contado || 0),
            observacion: detalle.observaciones || '',
        }))
    );

    hojaPlantilla['!cols'] = [
        { wch: 12 },
        { wch: 16 },
        { wch: 18 },
        { wch: 36 },
        { wch: 10 },
        { wch: 16 },
        { wch: 16 },
        { wch: 32 },
    ];

    XLSX.utils.book_append_sheet(workbook, hojaPlantilla, 'Conteo');

    return {
        nombreArchivo: `${limpiarNombreArchivo(conteo.numero_conteo)}_plantilla_conteo.xlsx`,
        buffer: crearBufferExcel(workbook),
    };
}

function normalizarEncabezadoExcel(valor) {
    return String(valor || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');
}

function normalizarFilaExcel(fila) {
    const filaNormalizada = {};

    for (const [clave, valor] of Object.entries(fila)) {
        filaNormalizada[normalizarEncabezadoExcel(clave)] = valor;
    }

    return filaNormalizada;
}

function importarPlantillaConteo({
    idConteo,
    archivo,
    usuario,
    ip,
    userAgent,
}) {
    if (!archivo || !archivo.buffer) {
        return {
            ok: false,
            mensaje: 'Debes seleccionar un archivo Excel válido.',
        };
    }

    let workbook;

    try {
        workbook = XLSX.read(archivo.buffer, {
            type: 'buffer',
        });
    } catch (error) {
        return {
            ok: false,
            mensaje: 'No fue posible leer el archivo Excel.',
        };
    }

    const hoja = workbook.Sheets.Conteo;

    if (!hoja) {
        return {
            ok: false,
            mensaje: 'El archivo debe tener una hoja llamada "Conteo".',
        };
    }

    const filasOriginales = XLSX.utils.sheet_to_json(hoja, {
        defval: '',
    });

    const filas = filasOriginales
        .map(normalizarFilaExcel)
        .filter((fila) => String(fila.id_detalle || '').trim() !== '');

    if (filas.length === 0) {
        return {
            ok: false,
            mensaje: 'La plantilla no contiene productos para importar.',
        };
    }

    const idsDetalle = [];
    const stocksContados = [];
    const observaciones = [];

    for (const fila of filas) {
        idsDetalle.push(String(fila.id_detalle || '').trim());
        stocksContados.push(String(fila.stock_contado ?? '').trim());
        observaciones.push(String(fila.observacion || '').trim());
    }

    const resultado = guardarCantidadesConteo({
        idConteo,
        datosFormulario: {
            id_detalle: idsDetalle,
            stock_contado: stocksContados,
            observaciones,
        },
        usuario,
        ip,
        userAgent,
    });

    if (!resultado.ok) {
        return resultado;
    }

    return {
        ok: true,
        mensaje: 'Plantilla importada correctamente. Revisa las diferencias antes de aplicar el conteo.',
    };
}

module.exports = {
    listarResumenInventario,
    listarCategoriasDisponibles,
    obtenerProductoInventarioPorId,
    registrarAjusteManual,
    listarHistorialMovimientos,

    generarNumeroConteo,
    listarConteosInventario,
    crearConteoInventario,
    obtenerConteoConDetalle,
    traducirEstadoConteo,
    guardarCantidadesConteo,
    aplicarConteoInventario,
    obtenerReporteDiferenciasConteo,
    generarExcelDiferenciasConteo,
    generarExcelPlantillaConteo,
    importarPlantillaConteo,
};