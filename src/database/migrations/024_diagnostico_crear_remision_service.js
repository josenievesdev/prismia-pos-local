const db = require('../../config/db');
const remisionesService = require('../../modules/remisiones/remisiones.service');

function imprimirBloque(titulo) {
    console.log('\n====================================');
    console.log(titulo);
    console.log('====================================');
}

function obtenerUsuarioActivo() {
    return db
        .prepare(`
            SELECT id_usuario, nombre
            FROM usuarios
            WHERE estado = 'activo'
              AND eliminado_en IS NULL
            ORDER BY id_usuario ASC
            LIMIT 1
        `)
        .get();
}

function obtenerStockProductos(idsProductos) {
    if (!Array.isArray(idsProductos) || !idsProductos.length) {
        return [];
    }

    const placeholders = idsProductos.map(() => '?').join(', ');

    return db
        .prepare(`
            SELECT
                id_producto,
                nombre,
                stock_actual
            FROM productos
            WHERE id_producto IN (${placeholders})
            ORDER BY id_producto ASC
        `)
        .all(...idsProductos);
}

function ejecutarDiagnostico() {
    imprimirBloque('DIAGNÓSTICO 024 - CREAR REMISIÓN DESDE SERVICE');

    const usuario = obtenerUsuarioActivo();

    if (!usuario) {
        throw new Error('No hay usuarios activos para crear la remisión de prueba.');
    }

    const clientes = remisionesService.buscarClientes({
        busqueda: 'cliente',
        limite: 1,
    });

    if (!clientes.length) {
        throw new Error('No se encontró cliente activo para la prueba.');
    }

    const productos = remisionesService.buscarProductos({
        busqueda: '',
        limite: 2,
    });

    if (productos.length < 1) {
        throw new Error('No se encontraron productos activos para la prueba.');
    }

    const idsProductos = productos.map((producto) => producto.id_producto);

    const stockAntes = obtenerStockProductos(idsProductos);
    const siguienteAntes = remisionesService.obtenerSiguienteRemision();

    console.log('\nUsuario usado:');
    console.table([usuario]);

    console.log('\nCliente usado:');
    console.table([{
        id_cliente: clientes[0].id_cliente,
        documento: clientes[0].documento,
        nombre: clientes[0].nombre_mostrar,
    }]);

    console.log('\nProductos usados:');
    console.table(productos.map((producto) => ({
        id_producto: producto.id_producto,
        nombre: producto.nombre,
        precio_venta: producto.precio_venta,
        stock_actual: producto.stock_actual,
        unidad: producto.unidad_abreviatura,
    })));

    console.log('\nStock antes:');
    console.table(stockAntes);

    console.log('\nSiguiente antes de crear:');
    console.table([siguienteAntes]);

    const resultado = remisionesService.crearRemision({
        idUsuario: usuario.id_usuario,
        payload: {
            id_cliente: clientes[0].id_cliente,
            afecta_inventario: 0,
            fecha_entrega_estimada: new Date().toISOString().slice(0, 10),
            direccion_entrega: clientes[0].direccion_mostrar || 'Dirección de prueba',
            contacto_entrega: clientes[0].nombre_mostrar,
            telefono_entrega: clientes[0].telefono_mostrar || '3000000000',
            observaciones: 'Remisión de prueba creada desde diagnóstico 024.',
            condiciones_entrega: 'Documento de remisión sin afectación de inventario.',
            items: productos.map((producto, indice) => ({
                id_producto: producto.id_producto,
                cantidad: indice === 0 ? 2 : 1,
            })),
        },
    });

    console.log('\nResultado creación:');
    console.dir(resultado, { depth: null });

    if (!resultado.ok) {
        throw new Error(resultado.mensaje);
    }

    const detalle = remisionesService.obtenerDetalleRemision(
        resultado.remision.id_remision
    );

    console.log('\nDetalle creado:');
    console.dir(detalle, { depth: null });

    const siguienteDespues = remisionesService.obtenerSiguienteRemision();
    const stockDespues = obtenerStockProductos(idsProductos);

    console.log('\nSiguiente después de crear:');
    console.table([siguienteDespues]);

    console.log('\nStock después:');
    console.table(stockDespues);

    console.log('\nDiagnóstico 024 finalizado correctamente.');
}

ejecutarDiagnostico();