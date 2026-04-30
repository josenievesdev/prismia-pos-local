const db = require('../../config/db');

function tablaExiste(nombreTabla) {
    const resultado = db
        .prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name = ?
            LIMIT 1
        `)
        .get(nombreTabla);

    return Boolean(resultado);
}

function validarTablas() {
    const tablasRequeridas = [
        'productos',
        'categorias_productos',
        'unidades_medida',
    ];

    for (const tabla of tablasRequeridas) {
        if (!tablaExiste(tabla)) {
            throw new Error(`No existe la tabla ${tabla}. Ejecuta primero las migraciones base.`);
        }
    }
}

function insertarCategoriaSiNoExiste(nombre, descripcion = '') {
    db.prepare(`
        INSERT OR IGNORE INTO categorias_productos (
            nombre,
            descripcion,
            estado
        ) VALUES (
            ?,
            ?,
            'activo'
        )
    `).run(nombre, descripcion);

    const categoria = db
        .prepare(`
            SELECT id_categoria_producto
            FROM categorias_productos
            WHERE nombre = ?
              AND eliminado_en IS NULL
            LIMIT 1
        `)
        .get(nombre);

    if (!categoria) {
        throw new Error(`No se pudo obtener la categoría ${nombre}.`);
    }

    return categoria.id_categoria_producto;
}

function obtenerUnidad(abreviatura) {
    const unidad = db
        .prepare(`
            SELECT id_unidad_medida
            FROM unidades_medida
            WHERE abreviatura = ?
              AND estado = 'activo'
            LIMIT 1
        `)
        .get(abreviatura);

    if (!unidad) {
        throw new Error(`No existe la unidad de medida con abreviatura ${abreviatura}. Ejecuta la migración 001.`);
    }

    return unidad.id_unidad_medida;
}

function prepararCatalogos() {
    const categorias = {
        ferreteria: insertarCategoriaSiNoExiste('Ferretería', 'Productos generales de ferretería.'),
        electricos: insertarCategoriaSiNoExiste('Eléctricos', 'Material eléctrico y accesorios.'),
        iluminacion: insertarCategoriaSiNoExiste('Iluminación', 'Bombillos, lámparas y luces.'),
        herramientas: insertarCategoriaSiNoExiste('Herramientas', 'Herramientas manuales y accesorios.'),
        plomeria: insertarCategoriaSiNoExiste('Plomería', 'Tubería, conexiones y accesorios.'),
        pinturas: insertarCategoriaSiNoExiste('Pinturas', 'Pinturas, brochas y complementos.'),
        papeleria: insertarCategoriaSiNoExiste('Papelería', 'Útiles y artículos de oficina.'),
        boutique: insertarCategoriaSiNoExiste('Boutique', 'Prendas y accesorios.'),
        aseo: insertarCategoriaSiNoExiste('Aseo', 'Productos de limpieza.'),
        tecnologia: insertarCategoriaSiNoExiste('Tecnología', 'Accesorios tecnológicos básicos.'),
    };

    const unidades = {
        und: obtenerUnidad('und'),
        m: obtenerUnidad('m'),
        cm: obtenerUnidad('cm'),
        kg: obtenerUnidad('kg'),
        l: obtenerUnidad('l'),
        caja: obtenerUnidad('caja'),
        rollo: obtenerUnidad('rollo'),
    };

    return {
        categorias,
        unidades,
    };
}

function crearProducto({
    categoria,
    unidad,
    codigo,
    barras,
    nombre,
    descripcion = '',
    costo,
    precio,
    stock,
    minimo,
    decimal = 0,
    iva = 0,
    precioIncluyeIva = 0,
}) {
    return {
        id_categoria_producto: categoria,
        id_unidad_medida: unidad,
        codigo_interno: codigo,
        codigo_barras: barras,
        nombre,
        descripcion,
        precio_costo: costo,
        precio_venta: precio,
        stock_actual: stock,
        stock_minimo: minimo,
        controla_inventario: 1,
        permite_venta_sin_stock: 0,
        permite_cantidad_decimal: decimal,
        costo_promedio: costo,
        ultimo_costo: costo,
        maneja_iva: iva > 0 ? 1 : 0,
        porcentaje_iva: iva,
        precio_incluye_iva: precioIncluyeIva,
        stock_reservado: 0,
        venta_fraccionada_habilitada: decimal,
        imagen_url: '',
        estado: 'activo',
    };
}

function obtenerProductosPrueba(catalogos) {
    const { categorias, unidades } = catalogos;

    const productos = [
        crearProducto({
            categoria: categorias.ferreteria,
            unidad: unidades.und,
            codigo: 'TEST-FER-0001',
            barras: '770990100001',
            nombre: 'Tornillo drywall 6x1 pulgada',
            costo: 40,
            precio: 120,
            stock: 850,
            minimo: 100,
        }),
        crearProducto({
            categoria: categorias.ferreteria,
            unidad: unidades.und,
            codigo: 'TEST-FER-0002',
            barras: '770990100002',
            nombre: 'Tornillo madera 8x1 1/2',
            costo: 55,
            precio: 150,
            stock: 620,
            minimo: 80,
        }),
        crearProducto({
            categoria: categorias.ferreteria,
            unidad: unidades.und,
            codigo: 'TEST-FER-0003',
            barras: '770990100003',
            nombre: 'Chazo plástico 1/4',
            costo: 35,
            precio: 100,
            stock: 900,
            minimo: 120,
        }),
        crearProducto({
            categoria: categorias.ferreteria,
            unidad: unidades.und,
            codigo: 'TEST-FER-0004',
            barras: '770990100004',
            nombre: 'Puntilla acero 2 pulgadas',
            costo: 30,
            precio: 90,
            stock: 1200,
            minimo: 150,
        }),
        crearProducto({
            categoria: categorias.electricos,
            unidad: unidades.m,
            codigo: 'TEST-ELE-0001',
            barras: '770990200001',
            nombre: 'Cable dúplex calibre 12 blanco',
            costo: 2100,
            precio: 3900,
            stock: 265.5,
            minimo: 40,
            decimal: 1,
        }),
        crearProducto({
            categoria: categorias.electricos,
            unidad: unidades.m,
            codigo: 'TEST-ELE-0002',
            barras: '770990200002',
            nombre: 'Cable eléctrico calibre 14 rojo',
            costo: 1500,
            precio: 2800,
            stock: 310.75,
            minimo: 50,
            decimal: 1,
        }),
        crearProducto({
            categoria: categorias.electricos,
            unidad: unidades.m,
            codigo: 'TEST-ELE-0003',
            barras: '770990200003',
            nombre: 'Cable UTP categoría 6',
            costo: 1300,
            precio: 2500,
            stock: 420.25,
            minimo: 60,
            decimal: 1,
        }),
        crearProducto({
            categoria: categorias.electricos,
            unidad: unidades.und,
            codigo: 'TEST-ELE-0004',
            barras: '770990200004',
            nombre: 'Toma corriente doble blanco',
            costo: 3800,
            precio: 7200,
            stock: 95,
            minimo: 15,
        }),
        crearProducto({
            categoria: categorias.electricos,
            unidad: unidades.und,
            codigo: 'TEST-ELE-0005',
            barras: '770990200005',
            nombre: 'Interruptor sencillo blanco',
            costo: 3200,
            precio: 6500,
            stock: 110,
            minimo: 20,
        }),
        crearProducto({
            categoria: categorias.iluminacion,
            unidad: unidades.und,
            codigo: 'TEST-ILU-0001',
            barras: '770990300001',
            nombre: 'Bombillo LED 9W luz blanca',
            costo: 2600,
            precio: 5900,
            stock: 180,
            minimo: 30,
        }),
        crearProducto({
            categoria: categorias.iluminacion,
            unidad: unidades.und,
            codigo: 'TEST-ILU-0002',
            barras: '770990300002',
            nombre: 'Bombillo LED 12W luz cálida',
            costo: 3100,
            precio: 6900,
            stock: 145,
            minimo: 25,
        }),
        crearProducto({
            categoria: categorias.iluminacion,
            unidad: unidades.und,
            codigo: 'TEST-ILU-0003',
            barras: '770990300003',
            nombre: 'Panel LED redondo 18W',
            costo: 14500,
            precio: 28900,
            stock: 40,
            minimo: 8,
            iva: 19,
            precioIncluyeIva: 1,
        }),
        crearProducto({
            categoria: categorias.herramientas,
            unidad: unidades.und,
            codigo: 'TEST-HER-0001',
            barras: '770990400001',
            nombre: 'Martillo mango fibra 16 oz',
            costo: 12500,
            precio: 24900,
            stock: 28,
            minimo: 5,
            iva: 19,
            precioIncluyeIva: 1,
        }),
        crearProducto({
            categoria: categorias.herramientas,
            unidad: unidades.und,
            codigo: 'TEST-HER-0002',
            barras: '770990400002',
            nombre: 'Destornillador estrella mediano',
            costo: 3500,
            precio: 7900,
            stock: 65,
            minimo: 10,
        }),
        crearProducto({
            categoria: categorias.herramientas,
            unidad: unidades.und,
            codigo: 'TEST-HER-0003',
            barras: '770990400003',
            nombre: 'Alicate universal 8 pulgadas',
            costo: 9800,
            precio: 19900,
            stock: 34,
            minimo: 6,
            iva: 19,
            precioIncluyeIva: 1,
        }),
        crearProducto({
            categoria: categorias.herramientas,
            unidad: unidades.und,
            codigo: 'TEST-HER-0004',
            barras: '770990400004',
            nombre: 'Flexómetro 5 metros',
            costo: 6200,
            precio: 13900,
            stock: 50,
            minimo: 8,
        }),
        crearProducto({
            categoria: categorias.plomeria,
            unidad: unidades.und,
            codigo: 'TEST-PLO-0001',
            barras: '770990500001',
            nombre: 'Codo PVC presión 1/2',
            costo: 500,
            precio: 1200,
            stock: 220,
            minimo: 30,
        }),
        crearProducto({
            categoria: categorias.plomeria,
            unidad: unidades.und,
            codigo: 'TEST-PLO-0002',
            barras: '770990500002',
            nombre: 'Tee PVC presión 1/2',
            costo: 800,
            precio: 1800,
            stock: 160,
            minimo: 25,
        }),
        crearProducto({
            categoria: categorias.plomeria,
            unidad: unidades.m,
            codigo: 'TEST-PLO-0003',
            barras: '770990500003',
            nombre: 'Manguera transparente 1/2',
            costo: 1200,
            precio: 2600,
            stock: 130.5,
            minimo: 20,
            decimal: 1,
        }),
        crearProducto({
            categoria: categorias.pinturas,
            unidad: unidades.und,
            codigo: 'TEST-PIN-0001',
            barras: '770990600001',
            nombre: 'Brocha 2 pulgadas económica',
            costo: 2200,
            precio: 4900,
            stock: 75,
            minimo: 12,
        }),
        crearProducto({
            categoria: categorias.pinturas,
            unidad: unidades.und,
            codigo: 'TEST-PIN-0002',
            barras: '770990600002',
            nombre: 'Rodillo felpa 9 pulgadas',
            costo: 5800,
            precio: 12900,
            stock: 45,
            minimo: 8,
        }),
        crearProducto({
            categoria: categorias.pinturas,
            unidad: unidades.l,
            codigo: 'TEST-PIN-0003',
            barras: '770990600003',
            nombre: 'Pintura vinilo blanco tipo 1',
            costo: 8500,
            precio: 16900,
            stock: 70.5,
            minimo: 10,
            decimal: 1,
        }),
        crearProducto({
            categoria: categorias.papeleria,
            unidad: unidades.und,
            codigo: 'TEST-PAP-0001',
            barras: '770990700001',
            nombre: 'Cuaderno argollado 100 hojas',
            costo: 5200,
            precio: 9900,
            stock: 85,
            minimo: 15,
        }),
        crearProducto({
            categoria: categorias.papeleria,
            unidad: unidades.und,
            codigo: 'TEST-PAP-0002',
            barras: '770990700002',
            nombre: 'Lapicero negro punta fina',
            costo: 700,
            precio: 1500,
            stock: 260,
            minimo: 40,
        }),
        crearProducto({
            categoria: categorias.papeleria,
            unidad: unidades.caja,
            codigo: 'TEST-PAP-0003',
            barras: '770990700003',
            nombre: 'Caja resma carta 75g',
            costo: 98000,
            precio: 135000,
            stock: 18,
            minimo: 4,
            iva: 19,
            precioIncluyeIva: 1,
        }),
        crearProducto({
            categoria: categorias.boutique,
            unidad: unidades.und,
            codigo: 'TEST-BOU-0001',
            barras: '770990800001',
            nombre: 'Camiseta básica negra talla M',
            costo: 18000,
            precio: 39900,
            stock: 24,
            minimo: 5,
        }),
        crearProducto({
            categoria: categorias.boutique,
            unidad: unidades.und,
            codigo: 'TEST-BOU-0002',
            barras: '770990800002',
            nombre: 'Gorra urbana beige',
            costo: 14500,
            precio: 32900,
            stock: 19,
            minimo: 4,
        }),
        crearProducto({
            categoria: categorias.boutique,
            unidad: unidades.und,
            codigo: 'TEST-BOU-0003',
            barras: '770990800003',
            nombre: 'Aretes dorados pequeños',
            costo: 6500,
            precio: 19900,
            stock: 38,
            minimo: 8,
        }),
        crearProducto({
            categoria: categorias.aseo,
            unidad: unidades.l,
            codigo: 'TEST-ASE-0001',
            barras: '770990900001',
            nombre: 'Límpido tradicional litro',
            costo: 2600,
            precio: 5500,
            stock: 95,
            minimo: 15,
        }),
        crearProducto({
            categoria: categorias.aseo,
            unidad: unidades.und,
            codigo: 'TEST-ASE-0002',
            barras: '770990900002',
            nombre: 'Esponja abrasiva paquete x3',
            costo: 1600,
            precio: 3900,
            stock: 120,
            minimo: 20,
        }),
        crearProducto({
            categoria: categorias.tecnologia,
            unidad: unidades.und,
            codigo: 'TEST-TEC-0001',
            barras: '770991000001',
            nombre: 'Cable USB tipo C 1 metro',
            costo: 4200,
            precio: 9900,
            stock: 68,
            minimo: 12,
        }),
        crearProducto({
            categoria: categorias.tecnologia,
            unidad: unidades.und,
            codigo: 'TEST-TEC-0002',
            barras: '770991000002',
            nombre: 'Cargador pared 20W USB-C',
            costo: 16000,
            precio: 34900,
            stock: 32,
            minimo: 6,
            iva: 19,
            precioIncluyeIva: 1,
        }),
    ];

    return productos;
}

function insertarProductosPrueba() {
    const catalogos = prepararCatalogos();
    const productos = obtenerProductosPrueba(catalogos);

    const insertarProducto = db.prepare(`
        INSERT OR IGNORE INTO productos (
            id_categoria_producto,
            codigo_interno,
            codigo_barras,
            nombre,
            descripcion,
            precio_costo,
            precio_venta,
            stock_actual,
            stock_minimo,
            controla_inventario,
            permite_venta_sin_stock,
            imagen_url,
            estado,
            id_unidad_medida,
            permite_cantidad_decimal,
            costo_promedio,
            ultimo_costo,
            maneja_iva,
            porcentaje_iva,
            precio_incluye_iva,
            stock_reservado,
            venta_fraccionada_habilitada
        ) VALUES (
            @id_categoria_producto,
            @codigo_interno,
            @codigo_barras,
            @nombre,
            @descripcion,
            @precio_costo,
            @precio_venta,
            @stock_actual,
            @stock_minimo,
            @controla_inventario,
            @permite_venta_sin_stock,
            @imagen_url,
            @estado,
            @id_unidad_medida,
            @permite_cantidad_decimal,
            @costo_promedio,
            @ultimo_costo,
            @maneja_iva,
            @porcentaje_iva,
            @precio_incluye_iva,
            @stock_reservado,
            @venta_fraccionada_habilitada
        )
    `);

    const transaccion = db.transaction(() => {
        for (const producto of productos) {
            insertarProducto.run(producto);
        }
    });

    transaccion();

    console.log(`Productos de prueba POS verificados: ${productos.length}`);
}

function ejecutarMigracion() {
    validarTablas();
    insertarProductosPrueba();

    console.log('Migración 009_productos_prueba_pos ejecutada correctamente.');
}

try {
    ejecutarMigracion();
} catch (error) {
    console.error('Error ejecutando migración 009_productos_prueba_pos:');
    console.error(error);
    process.exit(1);
}