const db = require('../../config/db');
const cotizacionesService = require('../../modules/cotizaciones/cotizaciones.service');

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

function ejecutarDiagnostico() {
    imprimirBloque('DIAGNÓSTICO 021 - CREAR COTIZACIÓN DESDE SERVICE');

    const usuario = obtenerUsuarioActivo();

    if (!usuario) {
        throw new Error('No hay usuarios activos para crear la cotización de prueba.');
    }

    const clientes = cotizacionesService.buscarClientes({
        busqueda: 'cliente',
        limite: 1,
    });

    if (!clientes.length) {
        throw new Error('No se encontró cliente activo para la prueba. Crea uno antes de ejecutar este diagnóstico.');
    }

    const productos = cotizacionesService.buscarProductos({
        busqueda: '',
        limite: 2,
    });

    if (productos.length < 1) {
        throw new Error('No se encontraron productos activos para la prueba.');
    }

    const siguienteAntes = cotizacionesService.obtenerSiguienteCotizacion();

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
        unidad: producto.unidad_abreviatura,
    })));

    console.log('\nSiguiente antes de crear:');
    console.table([siguienteAntes]);

    const resultado = cotizacionesService.crearCotizacion({
        idUsuario: usuario.id_usuario,
        payload: {
            id_cliente: clientes[0].id_cliente,
            validez_dias: 15,
            observaciones: 'Cotización de prueba creada desde diagnóstico 021.',
            condiciones_comerciales: 'Precios sujetos a disponibilidad. No afecta inventario.',
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

    const detalle = cotizacionesService.obtenerDetalleCotizacion(
        resultado.cotizacion.id_cotizacion
    );

    console.log('\nDetalle creado:');
    console.dir(detalle, { depth: null });

    const siguienteDespues = cotizacionesService.obtenerSiguienteCotizacion();

    console.log('\nSiguiente después de crear:');
    console.table([siguienteDespues]);

    console.log('\nDiagnóstico 021 finalizado correctamente.');
}

ejecutarDiagnostico();