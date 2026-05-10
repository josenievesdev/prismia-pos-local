const comprasRepository = require('./compras.repository');

const ESTADOS_PERMITIDOS = ['borrador', 'registrada', 'anulada'];
const LIMITE_POR_PAGINA = 20;

function limpiarTexto(valor) {
    return String(valor || '').trim();
}

function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(Number(valor || 0));
}

function formatearFecha(valor) {
    if (!valor) {
        return 'Sin fecha';
    }

    const fecha = new Date(`${valor}T00:00:00`);

    if (Number.isNaN(fecha.getTime())) {
        return valor;
    }

    return fecha.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
}

function prepararFiltros(query = {}) {
    const paginaSolicitada = Number(query.pagina);
    const pagina = paginaSolicitada > 0 ? Math.floor(paginaSolicitada) : 1;

    const estado = limpiarTexto(query.estado);

    return {
        busqueda: limpiarTexto(query.busqueda),
        estado: ESTADOS_PERMITIDOS.includes(estado) ? estado : '',
        pagina,
        limite: LIMITE_POR_PAGINA,
        offset: (pagina - 1) * LIMITE_POR_PAGINA,
    };
}

function prepararCompraVista(compra) {
    const proveedorNombre =
        compra.proveedor_nombre_comercial ||
        compra.proveedor_razon_social ||
        `Proveedor #${compra.id_proveedor}`;

    return {
        ...compra,
        proveedor_nombre: proveedorNombre,
        proveedor_documento_mostrar: compra.proveedor_documento
            ? `${compra.proveedor_tipo_documento || 'Doc'} ${compra.proveedor_documento}`
            : 'Sin documento',
        soporte_mostrar: compra.numero_soporte || 'Sin soporte',
        fecha_compra_mostrar: formatearFecha(compra.fecha_compra),
        subtotal_mostrar: formatearMoneda(compra.subtotal),
        iva_total_mostrar: formatearMoneda(compra.iva_total),
        total_mostrar: formatearMoneda(compra.total),
        estado_etiqueta: {
            borrador: 'Borrador',
            registrada: 'Registrada',
            anulada: 'Anulada',
        }[compra.estado] || compra.estado,
    };
}

function listarCompras(query = {}) {
    const filtrosIniciales = prepararFiltros(query);
    const totalResultados = comprasRepository.contarCompras(filtrosIniciales);
    const totalPaginas = Math.max(1, Math.ceil(totalResultados / filtrosIniciales.limite));
    const paginaActual = Math.min(filtrosIniciales.pagina, totalPaginas);

    const filtros = {
        ...filtrosIniciales,
        pagina: paginaActual,
        offset: (paginaActual - 1) * filtrosIniciales.limite,
    };

    const compras = comprasRepository
        .listarCompras(filtros)
        .map(prepararCompraVista);

    return {
        filtros,
        compras,
        total_resultados: totalResultados,
        limite_resultados: filtros.limite,
        pagina_actual: paginaActual,
        total_paginas: totalPaginas,
        tiene_pagina_anterior: paginaActual > 1,
        tiene_pagina_siguiente: paginaActual < totalPaginas,
        pagina_anterior: Math.max(1, paginaActual - 1),
        pagina_siguiente: Math.min(totalPaginas, paginaActual + 1),
    };
}

module.exports = {
    listarCompras,
};