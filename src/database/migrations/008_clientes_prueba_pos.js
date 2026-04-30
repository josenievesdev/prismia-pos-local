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
    if (!tablaExiste('clientes')) {
        throw new Error('No existe la tabla clientes. Ejecuta primero la inicialización de la base de datos.');
    }
}

function insertarClientesPrueba() {
    const clientes = [
        {
            tipo_documento: 'CC',
            documento: '1001001001',
            nombre: 'Carlos Alberto Ramírez',
            telefono: '3001112233',
            correo: 'carlos.ramirez@test.com',
            direccion: 'Cra 12 # 45-20',
            observaciones: 'Cliente frecuente de ferretería.',
        },
        {
            tipo_documento: 'CC',
            documento: '1001001002',
            nombre: 'María Fernanda López',
            telefono: '3012223344',
            correo: 'maria.lopez@test.com',
            direccion: 'Calle 8 # 14-55',
            observaciones: 'Compra productos de boutique y hogar.',
        },
        {
            tipo_documento: 'NIT',
            documento: '901100200',
            nombre: 'Constructora Los Pinos S.A.S.',
            telefono: '6023456789',
            correo: 'compras@lospinos.test',
            direccion: 'Zona Industrial Bodega 12',
            observaciones: 'Cliente empresarial para materiales.',
        },
        {
            tipo_documento: 'CC',
            documento: '1001001003',
            nombre: 'Julián Andrés Gómez',
            telefono: '3023334455',
            correo: 'julian.gomez@test.com',
            direccion: 'Mz 4 Casa 18',
            observaciones: 'Cliente de mostrador.',
        },
        {
            tipo_documento: 'CC',
            documento: '1001001004',
            nombre: 'Laura Marcela Torres',
            telefono: '3034445566',
            correo: 'laura.torres@test.com',
            direccion: 'Av. Principal # 22-10',
            observaciones: 'Cliente de papelería y accesorios.',
        },
        {
            tipo_documento: 'NIT',
            documento: '901100201',
            nombre: 'Taller El Tornillo Feliz',
            telefono: '6045556677',
            correo: 'admin@tornillofeliz.test',
            direccion: 'Calle 40 # 11-33',
            observaciones: 'Compra tornillería y herramientas.',
        },
        {
            tipo_documento: 'CC',
            documento: '1001001005',
            nombre: 'Andrés Felipe Castaño',
            telefono: '3045556677',
            correo: 'andres.castano@test.com',
            direccion: 'Conjunto La Pradera Torre 2',
            observaciones: 'Cliente ocasional.',
        },
        {
            tipo_documento: 'CC',
            documento: '1001001006',
            nombre: 'Daniela Restrepo Molina',
            telefono: '3056667788',
            correo: 'daniela.restrepo@test.com',
            direccion: 'Barrio Centro',
            observaciones: 'Compra artículos de aseo.',
        },
        {
            tipo_documento: 'CC',
            documento: '1001001007',
            nombre: 'Santiago Morales Peña',
            telefono: '3067778899',
            correo: 'santiago.morales@test.com',
            direccion: 'Vereda El Jardín',
            observaciones: 'Cliente rural, compras grandes.',
        },
        {
            tipo_documento: 'NIT',
            documento: '901100202',
            nombre: 'Papelería Punto Azul',
            telefono: '6078889900',
            correo: 'ventas@puntoazul.test',
            direccion: 'Centro Comercial Local 205',
            observaciones: 'Cliente comercial.',
        },
        {
            tipo_documento: 'CC',
            documento: '1001001008',
            nombre: 'Camila Andrea Vélez',
            telefono: '3078889900',
            correo: 'camila.velez@test.com',
            direccion: 'Calle 15 # 9-80',
            observaciones: 'Cliente de boutique.',
        },
        {
            tipo_documento: 'CC',
            documento: '1001001009',
            nombre: 'Mateo Hernández Ruiz',
            telefono: '3089990011',
            correo: 'mateo.hernandez@test.com',
            direccion: 'Barrio San José',
            observaciones: 'Cliente de tecnología básica.',
        },
        {
            tipo_documento: 'NIT',
            documento: '901100203',
            nombre: 'Mantenimiento Pereira Express',
            telefono: '6090001122',
            correo: 'operaciones@pereiraexpress.test',
            direccion: 'Cra 7 # 30-44',
            observaciones: 'Compra frecuente para mantenimientos.',
        },
        {
            tipo_documento: 'CC',
            documento: '1001001010',
            nombre: 'Valentina Quintero',
            telefono: '3101112233',
            correo: 'valentina.quintero@test.com',
            direccion: 'Urbanización Los Cedros',
            observaciones: 'Cliente minorista.',
        },
        {
            tipo_documento: 'CC',
            documento: '1001001011',
            nombre: 'Sebastián Mejía',
            telefono: '3112223344',
            correo: 'sebastian.mejia@test.com',
            direccion: 'Cra 18 # 6-40',
            observaciones: 'Cliente de herramientas manuales.',
        },
    ];

    const insertarCliente = db.prepare(`
        INSERT OR IGNORE INTO clientes (
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
            @tipo_documento,
            @documento,
            @nombre,
            @telefono,
            @correo,
            @direccion,
            @observaciones,
            0,
            'activo'
        )
    `);

    const transaccion = db.transaction(() => {
        for (const cliente of clientes) {
            insertarCliente.run(cliente);
        }
    });

    transaccion();

    console.log(`Clientes de prueba POS verificados: ${clientes.length}`);
}

function ejecutarMigracion() {
    validarTablas();
    insertarClientesPrueba();

    console.log('Migración 008_clientes_prueba_pos ejecutada correctamente.');
}

try {
    ejecutarMigracion();
} catch (error) {
    console.error('Error ejecutando migración 008_clientes_prueba_pos:');
    console.error(error);
    process.exit(1);
}