const db = require('../../config/db');

function imprimirClientesInvalidos() {
    const invalidos = db
        .prepare(`
            SELECT
                id_cliente,
                tipo_documento,
                documento,
                digito_verificacion,
                nombre,
                razon_social,
                nombre_comercial
            FROM clientes
            WHERE documento IS NULL
               OR TRIM(documento) = ''
               OR documento GLOB '*[^0-9]*'
               OR (
                    digito_verificacion IS NOT NULL
                    AND TRIM(digito_verificacion) <> ''
                    AND (
                        LENGTH(TRIM(digito_verificacion)) <> 1
                        OR digito_verificacion GLOB '*[^0-9]*'
                    )
               )
            ORDER BY id_cliente ASC
        `)
        .all();

    console.log('\nClientes con documento/DV inválido actualmente:');

    if (!invalidos.length) {
        console.log('No se encontraron clientes inválidos.');
        return;
    }

    console.table(invalidos);
}

function crearTriggers() {
    db.exec(`
        DROP TRIGGER IF EXISTS trg_clientes_documento_numerico_insert;
        DROP TRIGGER IF EXISTS trg_clientes_documento_numerico_update;

        CREATE TRIGGER trg_clientes_documento_numerico_insert
        BEFORE INSERT ON clientes
        FOR EACH ROW
        WHEN
            NEW.documento IS NULL
            OR TRIM(NEW.documento) = ''
            OR NEW.documento GLOB '*[^0-9]*'
        BEGIN
            SELECT RAISE(ABORT, 'El documento del cliente solo debe contener números.');
        END;

        CREATE TRIGGER trg_clientes_documento_numerico_update
        BEFORE UPDATE OF documento ON clientes
        FOR EACH ROW
        WHEN
            NEW.documento IS NULL
            OR TRIM(NEW.documento) = ''
            OR NEW.documento GLOB '*[^0-9]*'
        BEGIN
            SELECT RAISE(ABORT, 'El documento del cliente solo debe contener números.');
        END;
    `);

    console.log('Triggers de documento numérico creados correctamente.');
}

function crearTriggersDigitoVerificacion() {
    db.exec(`
        DROP TRIGGER IF EXISTS trg_clientes_dv_numerico_insert;
        DROP TRIGGER IF EXISTS trg_clientes_dv_numerico_update;

        CREATE TRIGGER trg_clientes_dv_numerico_insert
        BEFORE INSERT ON clientes
        FOR EACH ROW
        WHEN
            NEW.digito_verificacion IS NOT NULL
            AND TRIM(NEW.digito_verificacion) <> ''
            AND (
                LENGTH(TRIM(NEW.digito_verificacion)) <> 1
                OR NEW.digito_verificacion GLOB '*[^0-9]*'
            )
        BEGIN
            SELECT RAISE(ABORT, 'El dígito de verificación solo debe contener un número.');
        END;

        CREATE TRIGGER trg_clientes_dv_numerico_update
        BEFORE UPDATE OF digito_verificacion ON clientes
        FOR EACH ROW
        WHEN
            NEW.digito_verificacion IS NOT NULL
            AND TRIM(NEW.digito_verificacion) <> ''
            AND (
                LENGTH(TRIM(NEW.digito_verificacion)) <> 1
                OR NEW.digito_verificacion GLOB '*[^0-9]*'
            )
        BEGIN
            SELECT RAISE(ABORT, 'El dígito de verificación solo debe contener un número.');
        END;
    `);

    console.log('Triggers de DV numérico creados correctamente.');
}

function probarBloqueoDocumento() {
    try {
        db.prepare(`
            INSERT INTO clientes (
                tipo_documento,
                documento,
                nombre,
                estado
            ) VALUES (
                'CC',
                'ABC123',
                'Cliente Invalido Trigger',
                'activo'
            )
        `).run();

        throw new Error('La prueba falló: la base de datos permitió un documento inválido.');
    } catch (error) {
        if (String(error.message).includes('solo debe contener números')) {
            console.log('Prueba documento inválido bloqueada correctamente.');
            return;
        }

        throw error;
    }
}

function probarBloqueoDv() {
    try {
        db.prepare(`
            INSERT INTO clientes (
                tipo_documento,
                documento,
                digito_verificacion,
                nombre,
                estado
            ) VALUES (
                'NIT',
                '900123456',
                'X',
                'Cliente Invalido DV Trigger',
                'activo'
            )
        `).run();

        throw new Error('La prueba falló: la base de datos permitió un DV inválido.');
    } catch (error) {
        if (String(error.message).includes('dígito de verificación')) {
            console.log('Prueba DV inválido bloqueada correctamente.');
            return;
        }

        throw error;
    }
}

function ejecutarMigracion() {
    console.log('\n====================================');
    console.log('MIGRACIÓN 025 - VALIDAR DOCUMENTO NUMÉRICO CLIENTES');
    console.log('====================================');

    imprimirClientesInvalidos();

    crearTriggers();
    crearTriggersDigitoVerificacion();

    probarBloqueoDocumento();
    probarBloqueoDv();

    console.log('\nMigración 025 ejecutada correctamente.');
}

ejecutarMigracion();