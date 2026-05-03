const remisionesRepository = require('../../modules/remisiones/remisiones.repository');

function imprimirBloque(titulo) {
    console.log('\n====================================');
    console.log(titulo);
    console.log('====================================');
}

function ejecutarDiagnostico() {
    imprimirBloque('DIAGNÓSTICO 023 - REPOSITORY REMISIONES');

    const siguienteRemision = remisionesRepository.obtenerSiguienteNumeroRemision();

    console.log('\nSiguiente remisión:');
    console.table([siguienteRemision]);

    const totalRemisiones = remisionesRepository.contarRemisiones({});

    console.log('\nTotal remisiones registradas:');
    console.table([{ total_remisiones: totalRemisiones }]);

    const remisiones = remisionesRepository.listarRemisiones({
        limite: 5,
        offset: 0,
    });

    console.log('\nÚltimas remisiones:');
    console.table(remisiones.map((remision) => ({
        id_remision: remision.id_remision,
        numero_remision: remision.numero_remision,
        cliente: remision.cliente_nombre || remision.cliente_razon_social || remision.cliente_nombre_comercial || 'Sin cliente',
        total: remision.total,
        estado: remision.estado,
        afecta_inventario: remision.afecta_inventario,
    })));

    const clientes = remisionesRepository.buscarClientesParaRemision({
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

    const productos = remisionesRepository.buscarProductosParaRemision({
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

    console.log('\nDiagnóstico 023 finalizado correctamente.');
}

ejecutarDiagnostico();