const cotizacionesRepository = require('../../modules/cotizaciones/cotizaciones.repository');

function imprimirBloque(titulo) {
    console.log('\n====================================');
    console.log(titulo);
    console.log('====================================');
}

function ejecutarDiagnostico() {
    imprimirBloque('DIAGNÓSTICO 020 - REPOSITORY COTIZACIONES');

    const siguienteCotizacion = cotizacionesRepository.obtenerSiguienteNumeroCotizacion();

    console.log('\nSiguiente cotización:');
    console.table([siguienteCotizacion]);

    const totalCotizaciones = cotizacionesRepository.contarCotizaciones({});

    console.log('\nTotal cotizaciones registradas:');
    console.table([{ total_cotizaciones: totalCotizaciones }]);

    const cotizaciones = cotizacionesRepository.listarCotizaciones({
        limite: 5,
        offset: 0,
    });

    console.log('\nÚltimas cotizaciones:');
    console.table(cotizaciones.map((cotizacion) => ({
        id_cotizacion: cotizacion.id_cotizacion,
        numero_cotizacion: cotizacion.numero_cotizacion,
        cliente: cotizacion.cliente_nombre || cotizacion.cliente_razon_social || cotizacion.cliente_nombre_comercial || 'Sin cliente',
        total: cotizacion.total,
        estado: cotizacion.estado,
    })));

    const clientes = cotizacionesRepository.buscarClientesParaCotizacion({
        busqueda: 'cliente',
        limite: 5,
    });

    console.log('\nClientes encontrados con búsqueda "cliente":');
    console.table(clientes.map((cliente) => ({
        id_cliente: cliente.id_cliente,
        documento: cliente.documento,
        nombre: cliente.nombre || cliente.razon_social || cliente.nombre_comercial,
        celular: cliente.celular,
        estado: cliente.estado,
    })));

    const productos = cotizacionesRepository.buscarProductosParaCotizacion({
        busqueda: '',
        limite: 5,
    });

    console.log('\nProductos activos de muestra:');
    console.table(productos.map((producto) => ({
        id_producto: producto.id_producto,
        codigo_interno: producto.codigo_interno,
        nombre: producto.nombre,
        precio_venta: producto.precio_venta,
        stock_actual: producto.stock_actual,
        unidad: producto.unidad_abreviatura,
    })));

    console.log('\nDiagnóstico 020 finalizado correctamente.');
}

ejecutarDiagnostico();