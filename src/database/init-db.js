const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const db = require('../config/db');
const env = require('../config/env');

function ejecutarSchema() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    db.exec(schema);

    console.log('Schema ejecutado correctamente.');
}

function insertarConfiguracionInicial() {
    const existe = db
        .prepare('SELECT id_configuracion FROM configuracion_negocio LIMIT 1')
        .get();

    if (existe) {
        console.log('Configuración inicial ya existe.');
        return;
    }

    db.prepare(`
    INSERT INTO configuracion_negocio (
      nombre_negocio,
      nombre_comercial,
      tipo_documento,
      documento,
      direccion,
      telefono,
      correo,
      moneda,
      impuesto_por_defecto,
      mensaje_recibo,
      estado
    ) VALUES (
      @nombre_negocio,
      @nombre_comercial,
      @tipo_documento,
      @documento,
      @direccion,
      @telefono,
      @correo,
      @moneda,
      @impuesto_por_defecto,
      @mensaje_recibo,
      @estado
    )
  `).run({
        nombre_negocio: 'Negocio de prueba',
        nombre_comercial: 'Negocio de prueba',
        tipo_documento: 'NIT',
        documento: '',
        direccion: '',
        telefono: '',
        correo: '',
        moneda: 'COP',
        impuesto_por_defecto: 0,
        mensaje_recibo: 'Gracias por su compra.',
        estado: 'activo',
    });

    console.log('Configuración inicial creada.');
}

function insertarRolesIniciales() {
    const roles = [
        {
            nombre: 'administrador',
            descripcion: 'Acceso completo al sistema.',
        },
        {
            nombre: 'cajero',
            descripcion: 'Acceso a ventas, caja y consulta de sus operaciones.',
        },
        {
            nombre: 'inventario',
            descripcion: 'Gestión de productos e inventario.',
        },
        {
            nombre: 'consulta',
            descripcion: 'Acceso de solo lectura a reportes y consultas.',
        },
    ];

    const insertarRol = db.prepare(`
    INSERT OR IGNORE INTO roles (nombre, descripcion, estado)
    VALUES (@nombre, @descripcion, 'activo')
  `);

    const transaccion = db.transaction(() => {
        for (const rol of roles) {
            insertarRol.run(rol);
        }
    });

    transaccion();

    console.log('Roles iniciales verificados.');
}

function insertarCategoriasGastoIniciales() {
    const categorias = [
        'Arriendo',
        'Servicios',
        'Transporte',
        'Mercancía',
        'Nómina',
        'Mantenimiento',
        'Otros',
    ];

    const insertarCategoria = db.prepare(`
    INSERT OR IGNORE INTO categorias_gasto (nombre, descripcion, estado)
    VALUES (?, '', 'activo')
  `);

    const transaccion = db.transaction(() => {
        for (const categoria of categorias) {
            insertarCategoria.run(categoria);
        }
    });

    transaccion();

    console.log('Categorías de gasto verificadas.');
}

function insertarCategoriasProductoIniciales() {
    const categorias = [
        'General',
        'Bebidas',
        'Snacks',
        'Aseo',
        'Papelería',
        'Accesorios',
    ];

    const insertarCategoria = db.prepare(`
    INSERT OR IGNORE INTO categorias_productos (nombre, descripcion, estado)
    VALUES (?, '', 'activo')
  `);

    const transaccion = db.transaction(() => {
        for (const categoria of categorias) {
            insertarCategoria.run(categoria);
        }
    });

    transaccion();

    console.log('Categorías de productos verificadas.');
}

function insertarClienteConsumidorFinal() {
    const existe = db
        .prepare(`
      SELECT id_cliente
      FROM clientes
      WHERE es_consumidor_final = 1
      LIMIT 1
    `)
        .get();

    if (existe) {
        console.log('Cliente consumidor final ya existe.');
        return;
    }

    db.prepare(`
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
    ) VALUES (
      'CF',
      '0000000000',
      'Consumidor final',
      '',
      '',
      '',
      'Cliente genérico para ventas rápidas.',
      1,
      'activo'
    )
  `).run();

    console.log('Cliente consumidor final creado.');
}

function insertarUsuarioAdmin() {
    const existe = db
        .prepare('SELECT id_usuario FROM usuarios WHERE correo = ? LIMIT 1')
        .get(env.admin.email);

    if (existe) {
        console.log('Usuario administrador ya existe.');
        return;
    }

    const contrasenaHash = bcrypt.hashSync(env.admin.password, 10);

    const insertarUsuario = db.prepare(`
    INSERT INTO usuarios (
      nombre,
      correo,
      contrasena_hash,
      telefono,
      estado
    ) VALUES (
      @nombre,
      @correo,
      @contrasena_hash,
      '',
      'activo'
    )
  `);

    const resultadoUsuario = insertarUsuario.run({
        nombre: env.admin.name,
        correo: env.admin.email,
        contrasena_hash: contrasenaHash,
    });

    const idUsuario = resultadoUsuario.lastInsertRowid;

    const rolAdministrador = db
        .prepare('SELECT id_rol FROM roles WHERE nombre = ? LIMIT 1')
        .get('administrador');

    if (!rolAdministrador) {
        throw new Error('No existe el rol administrador.');
    }

    db.prepare(`
    INSERT OR IGNORE INTO usuario_roles (id_usuario, id_rol)
    VALUES (?, ?)
  `).run(idUsuario, rolAdministrador.id_rol);

    console.log('Usuario administrador creado.');
    console.log(`Correo: ${env.admin.email}`);
    console.log(`Contraseña inicial: ${env.admin.password}`);
}

function registrarAuditoriaInicial() {
    const existe = db
        .prepare(`
      SELECT id_auditoria
      FROM auditoria
      WHERE accion = 'inicializar_base_datos'
      LIMIT 1
    `)
        .get();

    if (existe) {
        return;
    }

    const admin = db
        .prepare('SELECT id_usuario FROM usuarios WHERE correo = ? LIMIT 1')
        .get(env.admin.email);

    db.prepare(`
    INSERT INTO auditoria (
      id_usuario,
      accion,
      tabla_afectada,
      id_registro_afectado,
      datos_anteriores,
      datos_nuevos,
      ip,
      user_agent
    ) VALUES (
      @id_usuario,
      'inicializar_base_datos',
      'sistema',
      NULL,
      NULL,
      @datos_nuevos,
      'local',
      'script_init_db'
    )
  `).run({
        id_usuario: admin?.id_usuario || null,
        datos_nuevos: JSON.stringify({
            mensaje: 'Base de datos inicializada correctamente.',
            motor: 'SQLite',
            version: '0.1.0',
        }),
    });
}

function inicializarBaseDatos() {
    console.log('====================================');
    console.log('Inicializando base de datos local...');
    console.log('====================================');

    ejecutarSchema();
    insertarConfiguracionInicial();
    insertarRolesIniciales();
    insertarCategoriasGastoIniciales();
    insertarCategoriasProductoIniciales();
    insertarClienteConsumidorFinal();
    insertarUsuarioAdmin();
    registrarAuditoriaInicial();

    console.log('====================================');
    console.log('Base de datos lista correctamente.');
    console.log('====================================');
}

try {
    inicializarBaseDatos();
} catch (error) {
    console.error('Error inicializando la base de datos:', error);
    process.exit(1);
}