/**
 * Entorno aislado para pruebas.
 *
 * IMPORTANTE: debe requerirse ANTES que cualquier módulo de src/, porque
 * src/config/db.js abre la base de datos al cargarse.
 *
 * Cada archivo de prueba corre en su propio proceso (node --test) y obtiene
 * una base SQLite nueva en la carpeta temporal del sistema. Nunca toca la
 * base real del proyecto.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');

function configurarVariables(nombre) {
    const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), `prismia-test-${nombre}-`));

    process.env.NODE_ENV = 'test';
    process.env.DB_PATH = path.join(carpeta, 'prismia_test.sqlite');
    process.env.BACKUP_BASE_DIR = path.join(carpeta, 'backups');
    process.env.UPLOADS_PUBLIC_DIR = path.join(carpeta, 'uploads');
    process.env.SESSION_SECRET = 'prismia-test-session-secret-no-usar-en-produccion';
    process.env.SUPPORT_BACKUP_KEY = 'prismia-test-support-key';

    const rutaBase = path.resolve(process.env.DB_PATH);

    if (!rutaBase.startsWith(path.resolve(os.tmpdir()))) {
        throw new Error(`Guardia de pruebas: la base ${rutaBase} no está en la carpeta temporal.`);
    }

    process.chdir(RAIZ);

    return carpeta;
}

function requerir(rutaRelativa) {
    return require(path.join(RAIZ, rutaRelativa));
}

const ADMIN_PRUEBA = {
    nombre: 'Admin Pruebas',
    correo: 'admin@pruebas.local',
    contrasena: 'ClavePruebas2026!',
};

/**
 * Crea la base (init + migraciones), el administrador y deja helpers.
 */
function crearEntornoPrueba(nombre) {
    const carpeta = configurarVariables(nombre);

    const logOriginal = console.log;
    console.log = () => {};

    let db;
    try {
        requerir('src/database/ensure-db').asegurarBaseDatos();
        db = requerir('src/config/db');
    } finally {
        console.log = logOriginal;
    }

    const setup = requerir('src/modules/setup/setup.service').crearPrimerAdministrador({
        nombre: ADMIN_PRUEBA.nombre,
        correo: ADMIN_PRUEBA.correo,
        contrasena: ADMIN_PRUEBA.contrasena,
        confirmar_contrasena: ADMIN_PRUEBA.contrasena,
    });

    if (!setup.ok) {
        throw new Error(`No se pudo crear el administrador de pruebas: ${setup.mensaje}`);
    }

    const admin = db
        .prepare('SELECT id_usuario, nombre, correo FROM usuarios WHERE correo = ?')
        .get(ADMIN_PRUEBA.correo);

    const usuarioAdmin = {
        ...admin,
        roles: ['administrador'],
        rol_principal: 'administrador',
    };

    let contadorProductos = 0;

    function idUnidad(abreviatura) {
        return db.prepare('SELECT id_unidad_medida FROM unidades_medida WHERE abreviatura = ?').get(abreviatura).id_unidad_medida;
    }

    function crearProducto({
        nombre = 'Producto prueba',
        precio = 1000,
        costo = 500,
        stock = 100,
        unidad = 'und',
        decimal = false,
        iva = 0,
        ivaIncluido = false,
        permiteSinStock = false,
        controlaInventario = true,
    } = {}) {
        contadorProductos += 1;

        const resultado = db.prepare(`
            INSERT INTO productos (
                codigo_interno, nombre, precio_costo, precio_venta, stock_actual,
                controla_inventario, permite_venta_sin_stock, id_unidad_medida,
                permite_cantidad_decimal, costo_promedio, ultimo_costo,
                maneja_iva, porcentaje_iva, precio_incluye_iva, estado
            ) VALUES (
                @codigo, @nombre, @costo, @precio, @stock,
                @controla, @sinStock, @unidad,
                @decimal, @costo, @costo,
                @manejaIva, @iva, @ivaIncluido, 'activo'
            )
        `).run({
            codigo: `PRB-${String(contadorProductos).padStart(4, '0')}`,
            nombre,
            costo,
            precio,
            stock,
            controla: controlaInventario ? 1 : 0,
            sinStock: permiteSinStock ? 1 : 0,
            unidad: idUnidad(unidad),
            decimal: decimal ? 1 : 0,
            manejaIva: iva > 0 ? 1 : 0,
            iva,
            ivaIncluido: ivaIncluido ? 1 : 0,
        });

        return Number(resultado.lastInsertRowid);
    }

    function idMedioPago(codigo) {
        return db.prepare('SELECT id_medio_pago FROM medios_pago WHERE codigo = ?').get(codigo).id_medio_pago;
    }

    function stock(idProducto) {
        return db.prepare('SELECT stock_actual FROM productos WHERE id_producto = ?').get(idProducto).stock_actual;
    }

    function turnoAbierto() {
        return db.prepare(`SELECT * FROM turnos_caja WHERE estado = 'abierto'`).get();
    }

    return {
        carpeta,
        db,
        requerir,
        usuarioAdmin,
        credencialesAdmin: { correo: ADMIN_PRUEBA.correo, contrasena: ADMIN_PRUEBA.contrasena },
        crearProducto,
        idMedioPago,
        stock,
        turnoAbierto,
    };
}

/** Levanta la app Express en un puerto libre. */
function iniciarServidor() {
    const app = requerir('src/app');

    return new Promise((resolve) => {
        const servidor = app.listen(0, '127.0.0.1', () => {
            const { port } = servidor.address();

            resolve({
                url: `http://127.0.0.1:${port}`,
                cerrar: () => new Promise((fin) => servidor.close(fin)),
            });
        });
    });
}

/** Silencia console.error mientras corre fn (errores esperados de la app). */
function silenciarErrores(fn) {
    const original = console.error;
    console.error = () => {};

    try {
        return fn();
    } finally {
        console.error = original;
    }
}

module.exports = {
    crearEntornoPrueba,
    iniciarServidor,
    silenciarErrores,
    configurarVariables,
    requerir,
};
