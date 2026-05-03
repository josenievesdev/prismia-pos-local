const db = require('../../config/db');

function ejecutarReparacion() {
    console.log('\n====================================');
    console.log('REPARACIÓN 025A - CLIENTE CON DOCUMENTO INVÁLIDO');
    console.log('====================================');

    const cliente = db
        .prepare(`
            SELECT
                id_cliente,
                tipo_documento,
                documento,
                nombre,
                correo
            FROM clientes
            WHERE id_cliente = 23
            LIMIT 1
        `)
        .get();

    console.log('\nCliente antes:');
    console.table(cliente ? [cliente] : []);

    if (!cliente) {
        console.log('No existe el cliente 23. No hay nada que reparar.');
        return;
    }

    db.prepare(`
        UPDATE clientes
        SET documento = @documento,
            actualizado_en = CURRENT_TIMESTAMP
        WHERE id_cliente = @id_cliente
    `).run({
        id_cliente: 23,
        documento: '1007778881',
    });

    const actualizado = db
        .prepare(`
            SELECT
                id_cliente,
                tipo_documento,
                documento,
                nombre,
                correo
            FROM clientes
            WHERE id_cliente = 23
            LIMIT 1
        `)
        .get();

    console.log('\nCliente después:');
    console.table([actualizado]);

    console.log('\nReparación 025A ejecutada correctamente.');
}

ejecutarReparacion();