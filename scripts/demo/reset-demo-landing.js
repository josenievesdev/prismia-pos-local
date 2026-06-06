const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const raizProyecto = path.resolve(__dirname, '../..');

const demoDir = path.join(raizProyecto, 'PrismiaDemoLanding');
const dataDir = path.join(demoDir, 'data');
const uploadsDir = path.join(demoDir, 'uploads');
const productosDir = path.join(uploadsDir, 'productos');
const productosDemoDir = path.join(productosDir, 'demo');
const backupsDir = path.join(demoDir, 'backups');

const DB_PATH = path.join(dataDir, 'prismia_pos_local.sqlite');
const DEMO_EMAIL = 'admin@demo.prismia.local';
const DEMO_PASSWORD = 'Demo12345';
const DEMO_SUPPORT_KEY = 'PRM-SOP-DEMO-LAND-2026';

function asegurarCarpeta(ruta) {
    fs.mkdirSync(ruta, { recursive: true });
}

function limpiarDemo() {
    if (fs.existsSync(demoDir)) {
        fs.rmSync(demoDir, { recursive: true, force: true });
    }

    asegurarCarpeta(dataDir);
    asegurarCarpeta(productosDemoDir);
    asegurarCarpeta(backupsDir);
}

function configurarEntorno() {
    process.env.DB_PATH = DB_PATH;
    process.env.UPLOADS_PUBLIC_DIR = uploadsDir;
    process.env.UPLOADS_PRODUCTOS_DIR = productosDir;
    process.env.BACKUP_BASE_DIR = backupsDir;
    process.env.SUPPORT_BACKUP_KEY = DEMO_SUPPORT_KEY;

    process.env.ADMIN_NAME = 'Administrador Demo';
    process.env.ADMIN_EMAIL = DEMO_EMAIL;
    process.env.ADMIN_PASSWORD = DEMO_PASSWORD;
}

function slug(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function escaparXml(texto) {
    return String(texto || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function crearImagenProducto(nombreArchivo, titulo, colorA, colorB) {
    const texto = escaparXml(titulo).slice(0, 34);

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="900" height="650" viewBox="0 0 900 650" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fondo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
    <linearGradient id="producto" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colorA}"/>
      <stop offset="100%" stop-color="${colorB}"/>
    </linearGradient>
    <filter id="sombra" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#0f172a" flood-opacity="0.18"/>
    </filter>
  </defs>

  <rect width="900" height="650" rx="54" fill="url(#fondo)"/>
  <circle cx="735" cy="120" r="78" fill="${colorB}" opacity="0.13"/>
  <circle cx="160" cy="525" r="110" fill="${colorA}" opacity="0.12"/>

  <g filter="url(#sombra)">
    <rect x="255" y="135" width="390" height="300" rx="42" fill="url(#producto)"/>
    <rect x="290" y="170" width="320" height="40" rx="20" fill="#ffffff" opacity="0.78"/>
    <rect x="290" y="235" width="250" height="28" rx="14" fill="#ffffff" opacity="0.5"/>
    <rect x="290" y="285" width="290" height="28" rx="14" fill="#ffffff" opacity="0.38"/>
    <rect x="290" y="335" width="210" height="28" rx="14" fill="#ffffff" opacity="0.32"/>
  </g>

  <text x="450" y="510" text-anchor="middle"
        font-family="Inter, Arial, sans-serif"
        font-size="38" font-weight="800" fill="#0f172a">${texto}</text>
  <text x="450" y="558" text-anchor="middle"
        font-family="Inter, Arial, sans-serif"
        font-size="22" font-weight="600" fill="#64748b">Casa Prisma · Demo</text>
</svg>`;

    fs.writeFileSync(path.join(productosDemoDir, nombreArchivo), svg, 'utf8');
}

function formatoFecha(offsetDias = 0, hora = '10:00:00') {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + offsetDias);

    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd} ${hora}`;
}

function dinero(valor) {
    return Math.round(Number(valor || 0));
}

function desglosarPrecioConIva(precioFinal, porcentajeIva) {
    const total = dinero(precioFinal);

    if (!porcentajeIva) {
        return {
            base: total,
            iva: 0,
            total,
        };
    }

    const base = dinero(total / (1 + porcentajeIva / 100));
    const iva = total - base;

    return {
        base,
        iva,
        total,
    };
}

function obtenerId(db, tabla, columna, valor, idColumna) {
    const fila = db
        .prepare(`SELECT ${idColumna} AS id FROM ${tabla} WHERE ${columna} = ? LIMIT 1`)
        .get(valor);

    if (!fila) {
        throw new Error(`No se encontró ${tabla}.${columna} = ${valor}`);
    }

    return fila.id;
}

function seedDemo(db) {
    db.prepare(`
        UPDATE configuracion_negocio
        SET
            nombre_negocio = 'Casa Prisma Papelería & Hogar',
            nombre_comercial = 'Casa Prisma',
            tipo_documento = 'NIT',
            documento = '901234567',
            direccion = 'Carrera 10 # 25-40 · Pereira',
            telefono = '300 000 0000',
            correo = 'contacto@casaprisma.demo',
            moneda = 'COP',
            impuesto_por_defecto = 0,
            mensaje_recibo = 'Gracias por comprar en Casa Prisma. Vuelve pronto.',
            maneja_iva = 1,
            iva_incluido_en_precio = 1,
            porcentaje_iva_defecto = 19,
            actualizado_en = CURRENT_TIMESTAMP
        WHERE id_configuracion = 1
    `).run();

    const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);

    db.prepare(`
        INSERT INTO usuarios (
            nombre,
            correo,
            contrasena_hash,
            telefono,
            estado
        ) VALUES (?, ?, ?, ?, 'activo')
    `).run(
        'Administrador Demo',
        DEMO_EMAIL,
        hash,
        '3000000000'
    );

    const idUsuario = obtenerId(db, 'usuarios', 'correo', DEMO_EMAIL, 'id_usuario');
    const idRolAdmin = obtenerId(db, 'roles', 'nombre', 'administrador', 'id_rol');

    db.prepare(`
        INSERT OR IGNORE INTO usuario_roles (
            id_usuario,
            id_rol
        ) VALUES (?, ?)
    `).run(idUsuario, idRolAdmin);

    const categorias = [
        ['Papelería', 'Cuadernos, lapiceros y útiles escolares.'],
        ['Oficina', 'Insumos para trabajo administrativo.'],
        ['Hogar', 'Productos útiles para casa y organización.'],
        ['Accesorios', 'Artículos prácticos y de uso diario.'],
        ['Regalos', 'Detalles, empaques y productos decorativos.'],
        ['Ferretería ligera', 'Herramientas pequeñas y soluciones rápidas.'],
        ['Organización', 'Cajas, soportes y productos para ordenar.'],
        ['Tecnología básica', 'Accesorios simples de tecnología.'],
    ];

    const insertarCategoria = db.prepare(`
        INSERT OR IGNORE INTO categorias_productos (
            nombre,
            descripcion,
            estado
        ) VALUES (?, ?, 'activo')
    `);

    categorias.forEach((categoria) => insertarCategoria.run(categoria));

    const idUnidad = obtenerId(db, 'unidades_medida', 'abreviatura', 'und', 'id_unidad_medida');
    const idMetro = obtenerId(db, 'unidades_medida', 'abreviatura', 'm', 'id_unidad_medida');

    const productos = [
        ['Cuaderno argollado premium', 'Papelería', 'und', 11800, 18900, 34, 8, '#14b8a6', '#60a5fa'],
        ['Resma carta 500 hojas', 'Oficina', 'und', 16800, 23500, 16, 5, '#64748b', '#38bdf8'],
        ['Bolígrafo gel azul', 'Papelería', 'und', 1200, 2800, 90, 20, '#2563eb', '#22c55e'],
        ['Marcador borrable negro', 'Oficina', 'und', 2500, 4900, 42, 10, '#111827', '#64748b'],
        ['Cinta transparente grande', 'Papelería', 'und', 2700, 5500, 28, 6, '#f59e0b', '#f97316'],
        ['Carpeta oficio plástica', 'Oficina', 'und', 1500, 3200, 55, 12, '#06b6d4', '#3b82f6'],
        ['Organizador de escritorio', 'Organización', 'und', 17000, 28900, 12, 4, '#8b5cf6', '#06b6d4'],
        ['Caja organizadora mediana', 'Hogar', 'und', 22500, 34900, 8, 3, '#10b981', '#84cc16'],
        ['Termo acero 500 ml', 'Accesorios', 'und', 27500, 42000, 9, 3, '#0f172a', '#38bdf8'],
        ['Lámpara LED compacta', 'Hogar', 'und', 24800, 39900, 4, 5, '#facc15', '#f97316'],
        ['Cable USB-C reforzado', 'Tecnología básica', 'und', 9200, 18000, 18, 6, '#3b82f6', '#14b8a6'],
        ['Mouse inalámbrico básico', 'Tecnología básica', 'und', 22000, 36000, 7, 3, '#475569', '#0ea5e9'],
        ['Tijeras multiuso', 'Papelería', 'und', 4200, 8500, 23, 6, '#ef4444', '#f97316'],
        ['Pegante escolar líquido', 'Papelería', 'und', 2100, 4300, 36, 10, '#22c55e', '#06b6d4'],
        ['Papel regalo diseño neutro', 'Regalos', 'm', 900, 2200, 80, 15, '#ec4899', '#f59e0b'],
        ['Cinta decorativa satinada', 'Regalos', 'm', 700, 1800, 120, 20, '#a855f7', '#ec4899'],
        ['Bolsa regalo mediana', 'Regalos', 'und', 2100, 4700, 25, 8, '#f97316', '#eab308'],
        ['Set notas adhesivas', 'Oficina', 'und', 5200, 9900, 20, 7, '#fde047', '#22c55e'],
        ['Agenda semanal minimalista', 'Papelería', 'und', 14800, 24900, 11, 4, '#0ea5e9', '#6366f1'],
        ['Alambre decorativo negro', 'Accesorios', 'm', 900, 2200, 150, 30, '#111827', '#64748b'],
    ];

    const insertarProducto = db.prepare(`
        INSERT INTO productos (
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
            venta_fraccionada_habilitada,
            mostrar_en_pos_tactil,
            orden_pos_tactil
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
            1,
            0,
            @imagen_url,
            'activo',
            @id_unidad_medida,
            @permite_cantidad_decimal,
            @precio_costo,
            @precio_costo,
            1,
            19,
            1,
            0,
            @permite_cantidad_decimal,
            1,
            @orden_pos_tactil
        )
    `);

    productos.forEach((producto, index) => {
        const [
            nombre,
            categoria,
            unidad,
            costo,
            precio,
            stock,
            stockMinimo,
            colorA,
            colorB,
        ] = producto;

        const nombreArchivo = `${slug(nombre)}.svg`;
        crearImagenProducto(nombreArchivo, nombre, colorA, colorB);

        insertarProducto.run({
            id_categoria_producto: obtenerId(
                db,
                'categorias_productos',
                'nombre',
                categoria,
                'id_categoria_producto'
            ),
            codigo_interno: `PRD-${String(index + 1).padStart(4, '0')}`,
            codigo_barras: `77000010${String(index + 1).padStart(4, '0')}`,
            nombre,
            descripcion: `Producto demo para capturas de ${categoria.toLowerCase()}.`,
            precio_costo: costo,
            precio_venta: precio,
            stock_actual: stock,
            stock_minimo: stockMinimo,
            imagen_url: `/uploads/productos/demo/${nombreArchivo}`,
            id_unidad_medida: unidad === 'm' ? idMetro : idUnidad,
            permite_cantidad_decimal: unidad === 'm' ? 1 : 0,
            orden_pos_tactil: index + 1,
        });
    });

    const clientes = [
        ['CC', '1001001001', 'Laura Méndez', '3001112233', 'laura.demo@correo.com', 'Pereira'],
        ['CC', '1001001002', 'Andrés Ramírez', '3002223344', 'andres.demo@correo.com', 'Dosquebradas'],
        ['NIT', '901000111', 'Oficina Norte SAS', '3003334455', 'compras@oficinanorte.demo', 'Pereira'],
    ];

    const insertarCliente = db.prepare(`
        INSERT INTO clientes (
            tipo_documento,
            documento,
            nombre,
            telefono,
            correo,
            direccion,
            observaciones,
            es_consumidor_final,
            estado
        ) VALUES (?, ?, ?, ?, ?, ?, 'Cliente demo para capturas.', 0, 'activo')
    `);

    clientes.forEach((cliente) => insertarCliente.run(cliente));

    const proveedores = [
        ['Distribuciones Nova', 'Distribuciones Nova SAS', '900111222', 'compras@nova.demo'],
        ['Mayorista Andino', 'Mayorista Andino SAS', '900333444', 'ventas@andino.demo'],
        ['Suministros Prisma', 'Suministros Prisma SAS', '900555666', 'contacto@suministrosprisma.demo'],
    ];

    const insertarProveedor = db.prepare(`
        INSERT INTO proveedores (
            nombre_comercial,
            razon_social,
            tipo_documento,
            documento,
            telefono,
            correo,
            direccion,
            ciudad,
            departamento,
            contacto_nombre,
            estado
        ) VALUES (?, ?, 'NIT', ?, '3000000000', ?, 'Zona comercial demo', 'Pereira', 'Risaralda', 'Asesor comercial', 'activo')
    `);

    proveedores.forEach((proveedor) => insertarProveedor.run(proveedor));

    crearCajaVentasDemo(db, idUsuario);
}

function crearCajaVentasDemo(db, idUsuario) {
    const idClienteFinal = db
        .prepare('SELECT id_cliente FROM clientes WHERE es_consumidor_final = 1 LIMIT 1')
        .get().id_cliente;

    const medios = {};
    db.prepare('SELECT * FROM medios_pago').all().forEach((medio) => {
        medios[medio.codigo] = medio;
    });

    const crearTurno = db.prepare(`
        INSERT INTO turnos_caja (
            id_usuario_apertura,
            id_usuario_cierre,
            fecha_apertura,
            fecha_cierre,
            monto_inicial,
            monto_esperado,
            monto_contado,
            diferencia,
            estado,
            observaciones_apertura,
            observaciones_cierre
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const turnoCerrado = crearTurno.run(
        idUsuario,
        idUsuario,
        formatoFecha(-1, '08:20:00'),
        formatoFecha(-1, '18:10:00'),
        100000,
        100000,
        100000,
        0,
        'cerrado',
        'Apertura demo del día anterior.',
        'Cierre demo sin diferencia.'
    ).lastInsertRowid;

    const turnoAbierto = crearTurno.run(
        idUsuario,
        null,
        formatoFecha(0, '08:35:00'),
        null,
        120000,
        120000,
        null,
        null,
        'abierto',
        'Caja demo abierta para capturas.',
        null
    ).lastInsertRowid;

    insertarIngresoManual(db, turnoAbierto, idUsuario, 25000, 'Ingreso manual demo para caja');

    const ventas = [
        {
            turno: turnoAbierto,
            fecha: formatoFecha(0, '09:12:00'),
            pago: 'efectivo',
            lineas: [
                ['Cuaderno argollado premium', 1],
                ['Bolígrafo gel azul', 2],
                ['Set notas adhesivas', 1],
            ],
        },
        {
            turno: turnoAbierto,
            fecha: formatoFecha(0, '10:05:00'),
            pago: 'nequi',
            lineas: [
                ['Organizador de escritorio', 1],
                ['Carpeta oficio plástica', 3],
            ],
        },
        {
            turno: turnoAbierto,
            fecha: formatoFecha(0, '11:40:00'),
            pago: 'tarjeta_debito',
            lineas: [
                ['Termo acero 500 ml', 1],
                ['Cable USB-C reforzado', 1],
            ],
        },
        {
            turno: turnoAbierto,
            fecha: formatoFecha(0, '14:18:00'),
            pago: 'efectivo',
            lineas: [
                ['Papel regalo diseño neutro', 3],
                ['Cinta decorativa satinada', 4],
                ['Bolsa regalo mediana', 2],
            ],
        },
        {
            turno: turnoAbierto,
            fecha: formatoFecha(0, '16:02:00'),
            pago: 'bancolombia',
            lineas: [
                ['Lámpara LED compacta', 1],
                ['Caja organizadora mediana', 1],
            ],
        },
        {
            turno: turnoCerrado,
            fecha: formatoFecha(-1, '13:25:00'),
            pago: 'efectivo',
            lineas: [
                ['Mouse inalámbrico básico', 1],
                ['Resma carta 500 hojas', 1],
            ],
        },
        {
            turno: turnoCerrado,
            fecha: formatoFecha(-1, '17:02:00'),
            pago: 'daviplata',
            lineas: [
                ['Agenda semanal minimalista', 1],
                ['Marcador borrable negro', 2],
            ],
        },
    ];

    ventas.forEach((venta, index) => {
        insertarVentaDemo(db, {
            idUsuario,
            idCliente: idClienteFinal,
            idTurnoCaja: venta.turno,
            numeroVenta: `FV-DEMO-${String(index + 1).padStart(4, '0')}`,
            fechaVenta: venta.fecha,
            lineas: venta.lineas,
            medioPago: medios[venta.pago],
        });
    });

    recalcularTurno(db, turnoAbierto);
    recalcularTurno(db, turnoCerrado, true);
}

function insertarIngresoManual(db, idTurnoCaja, idUsuario, monto, descripcion) {
    db.prepare(`
        INSERT INTO movimientos_caja (
            id_turno_caja,
            id_usuario,
            tipo_movimiento,
            metodo_pago,
            monto,
            descripcion,
            referencia_tipo,
            referencia_id
        ) VALUES (?, ?, 'ingreso_manual', 'efectivo', ?, ?, 'demo', NULL)
    `).run(idTurnoCaja, idUsuario, monto, descripcion);
}

function insertarVentaDemo(db, opciones) {
    const {
        idUsuario,
        idCliente,
        idTurnoCaja,
        numeroVenta,
        fechaVenta,
        lineas,
        medioPago,
    } = opciones;

    const productos = lineas.map(([nombre, cantidad]) => {
        const producto = db
            .prepare(`
                SELECT
                    p.*,
                    u.abreviatura AS unidad_abreviatura
                FROM productos p
                LEFT JOIN unidades_medida u
                    ON u.id_unidad_medida = p.id_unidad_medida
                WHERE p.nombre = ?
                LIMIT 1
            `)
            .get(nombre);

        if (!producto) {
            throw new Error(`Producto no encontrado: ${nombre}`);
        }

        return {
            producto,
            cantidad,
        };
    });

    let subtotalVenta = 0;
    let ivaVenta = 0;
    let totalVenta = 0;
    let totalCosto = 0;

    const lineasPreparadas = productos.map(({ producto, cantidad }) => {
        const precio = desglosarPrecioConIva(producto.precio_venta, producto.porcentaje_iva);
        const totalLinea = dinero(producto.precio_venta * cantidad);
        const subtotalLinea = dinero(precio.base * cantidad);
        const ivaLinea = totalLinea - subtotalLinea;
        const costoTotal = dinero(producto.precio_costo * cantidad);
        const utilidad = totalLinea - ivaLinea - costoTotal;

        subtotalVenta += subtotalLinea;
        ivaVenta += ivaLinea;
        totalVenta += totalLinea;
        totalCosto += costoTotal;

        return {
            producto,
            cantidad,
            precio,
            subtotalLinea,
            ivaLinea,
            totalLinea,
            costoTotal,
            utilidad,
        };
    });

    const utilidadVenta = subtotalVenta - totalCosto;

    const idVenta = db.prepare(`
        INSERT INTO ventas (
            id_cliente,
            id_usuario,
            id_turno_caja,
            numero_venta,
            fecha_venta,
            subtotal,
            descuento_total,
            impuesto_total,
            total,
            estado,
            observaciones,
            total_pagado,
            saldo_pendiente,
            cambio_entregado,
            total_costo,
            utilidad_bruta,
            origen,
            tipo_venta,
            requiere_factura
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'pagada', 'Venta demo para capturas.', ?, 0, 0, ?, ?, 'pos', 'contado', 0)
    `).run(
        idCliente,
        idUsuario,
        idTurnoCaja,
        numeroVenta,
        fechaVenta,
        subtotalVenta,
        ivaVenta,
        totalVenta,
        totalVenta,
        totalCosto,
        utilidadVenta
    ).lastInsertRowid;

    const insertarDetalle = db.prepare(`
        INSERT INTO detalle_ventas (
            id_venta,
            id_producto,
            id_unidad_medida,
            unidad_abreviatura,
            codigo_interno,
            codigo_barras,
            nombre_producto,
            cantidad,
            precio_unitario,
            precio_costo_unitario,
            descuento_unitario,
            porcentaje_iva,
            impuesto_unitario,
            impuesto_total,
            subtotal,
            total_linea,
            costo_total,
            utilidad_bruta
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertarMovimientoInventario = db.prepare(`
        INSERT INTO movimientos_inventario (
            id_producto,
            id_usuario,
            id_unidad_medida,
            unidad_abreviatura,
            tipo_movimiento,
            cantidad,
            stock_anterior,
            stock_nuevo,
            costo_unitario,
            costo_total,
            motivo,
            referencia_tipo,
            referencia_id
        ) VALUES (?, ?, ?, ?, 'venta', ?, ?, ?, ?, ?, ?, 'venta', ?)
    `);

    const actualizarStock = db.prepare(`
        UPDATE productos
        SET stock_actual = ?, actualizado_en = CURRENT_TIMESTAMP
        WHERE id_producto = ?
    `);

    lineasPreparadas.forEach((linea) => {
        const p = linea.producto;
        const stockAnterior = Number(p.stock_actual || 0);
        const stockNuevo = stockAnterior - Number(linea.cantidad || 0);

        insertarDetalle.run(
            idVenta,
            p.id_producto,
            p.id_unidad_medida,
            p.unidad_abreviatura,
            p.codigo_interno,
            p.codigo_barras,
            p.nombre,
            linea.cantidad,
            p.precio_venta,
            p.precio_costo,
            p.porcentaje_iva,
            linea.precio.iva,
            linea.ivaLinea,
            linea.subtotalLinea,
            linea.totalLinea,
            linea.costoTotal,
            linea.utilidad
        );

        insertarMovimientoInventario.run(
            p.id_producto,
            idUsuario,
            p.id_unidad_medida,
            p.unidad_abreviatura,
            linea.cantidad,
            stockAnterior,
            stockNuevo,
            p.precio_costo,
            linea.costoTotal,
            `Salida por venta ${numeroVenta}`,
            idVenta
        );

        actualizarStock.run(stockNuevo, p.id_producto);
    });

    db.prepare(`
        INSERT INTO pagos_venta (
            id_venta,
            metodo_pago,
            monto,
            referencia,
            entidad,
            observaciones,
            id_medio_pago,
            id_usuario,
            monto_recibido,
            cambio_entregado,
            estado
        ) VALUES (?, ?, ?, ?, ?, 'Pago demo.', ?, ?, ?, 0, 'registrado')
    `).run(
        idVenta,
        medioPago.tipo,
        totalVenta,
        `DEMO-${numeroVenta}`,
        medioPago.nombre,
        medioPago.id_medio_pago,
        idUsuario,
        totalVenta
    );

    db.prepare(`
        INSERT INTO movimientos_caja (
            id_turno_caja,
            id_usuario,
            tipo_movimiento,
            metodo_pago,
            monto,
            descripcion,
            referencia_tipo,
            referencia_id,
            id_medio_pago,
            referencia_pago,
            entidad_pago
        ) VALUES (?, ?, 'venta', ?, ?, ?, 'venta', ?, ?, ?, ?)
    `).run(
        idTurnoCaja,
        idUsuario,
        medioPago.tipo,
        totalVenta,
        `Venta ${numeroVenta}`,
        idVenta,
        medioPago.id_medio_pago,
        `DEMO-${numeroVenta}`,
        medioPago.nombre
    );
}

function recalcularTurno(db, idTurnoCaja, cerrado = false) {
    const resumen = db.prepare(`
        SELECT
            COALESCE(SUM(CASE WHEN tipo_movimiento = 'venta' THEN monto ELSE 0 END), 0) AS ventas,
            COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' AND tipo_movimiento = 'venta' THEN monto ELSE 0 END), 0) AS efectivo,
            COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia' AND tipo_movimiento = 'venta' THEN monto ELSE 0 END), 0) AS transferencia,
            COALESCE(SUM(CASE WHEN metodo_pago = 'tarjeta' AND tipo_movimiento = 'venta' THEN monto ELSE 0 END), 0) AS tarjeta,
            COALESCE(SUM(CASE WHEN metodo_pago = 'otro' AND tipo_movimiento = 'venta' THEN monto ELSE 0 END), 0) AS otros,
            COALESCE(SUM(CASE WHEN tipo_movimiento = 'ingreso_manual' THEN monto ELSE 0 END), 0) AS ingresos,
            COALESCE(SUM(CASE WHEN tipo_movimiento = 'egreso_manual' THEN monto ELSE 0 END), 0) AS egresos
        FROM movimientos_caja
        WHERE id_turno_caja = ?
    `).get(idTurnoCaja);

    const turno = db
        .prepare('SELECT monto_inicial FROM turnos_caja WHERE id_turno_caja = ?')
        .get(idTurnoCaja);

    const montoEsperado = dinero(
        turno.monto_inicial
        + resumen.efectivo
        + resumen.ingresos
        - resumen.egresos
    );

    db.prepare(`
        UPDATE turnos_caja
        SET
            total_ventas = ?,
            total_efectivo = ?,
            total_transferencia = ?,
            total_tarjeta = ?,
            total_otros = ?,
            total_ingresos_manuales = ?,
            total_egresos_manuales = ?,
            monto_esperado = ?,
            monto_contado = ?,
            diferencia = ?,
            actualizado_en = CURRENT_TIMESTAMP
        WHERE id_turno_caja = ?
    `).run(
        resumen.ventas,
        resumen.efectivo,
        resumen.transferencia,
        resumen.tarjeta,
        resumen.otros,
        resumen.ingresos,
        resumen.egresos,
        montoEsperado,
        cerrado ? montoEsperado : null,
        cerrado ? 0 : null,
        idTurnoCaja
    );
}

async function crearBackupsDemo() {
    const backupsService = require('../../src/modules/backups/backups.service');

    const resultado = await backupsService.crearBackupManual();

    if (!resultado.ok) {
        console.warn(`No se pudo crear backup demo: ${resultado.mensaje}`);
        return;
    }

    console.log(`Backup demo creado: ${resultado.backup.archivo}`);
}

async function main() {
    console.log('====================================');
    console.log('Creando demo reseteable de Prismia');
    console.log('====================================');

    limpiarDemo();
    configurarEntorno();

    const { inicializarBaseDatos } = require('../../src/database/init-db');
    const db = require('../../src/config/db');

    inicializarBaseDatos();

    const transaccion = db.transaction(() => {
        seedDemo(db);
    });

    transaccion();

    await crearBackupsDemo();

    try {
        db.pragma('wal_checkpoint(TRUNCATE)');
    } catch (error) {
        console.warn(`No se pudo truncar WAL demo: ${error.message}`);
    }

    if (typeof db.close === 'function') {
        db.close();
    }

    console.log('====================================');
    console.log('Demo creada correctamente.');
    console.log(`Ruta demo: ${demoDir}`);
    console.log(`Base demo: ${DB_PATH}`);
    console.log(`Usuario: ${DEMO_EMAIL}`);
    console.log(`Contraseña: ${DEMO_PASSWORD}`);
    console.log(`Clave soporte backups: ${DEMO_SUPPORT_KEY}`);
    console.log('====================================');
}

main().catch((error) => {
    console.error('Error creando demo:', error);
    process.exit(1);
});