const db = require('../../config/db');
const notasCreditoRepository = require('../../modules/notasCredito/notasCredito.repository');

function imprimirBloque(titulo) {
    console.log('\n====================================');
    console.log(titulo);
    console.log('====================================');
}

function listarColumnas(nombreTabla) {
    return db
        .prepare(`PRAGMA table_info(${nombreTabla})`)
        .all()
        .map((columna) => ({
            tabla: nombreTabla,
            columna: columna.name,
            tipo: columna.type,
            requerido: columna.notnull,
            pk: columna.pk,
            valor_defecto: columna.dflt_value,
        }));
}

function ejecutarDiagnostico() {
    imprimirBloque('DIAGNÓSTICO 029 - REPOSITORY NOTAS CRÉDITO');

    console.log('\nSiguiente nota crédito:');
    console.table([notasCreditoRepository.obtenerNumeracionNotaCredito()]);

    console.log('\nTotal notas crédito:');
    console.table([notasCreditoRepository.contarNotasCredito()]);

    console.log('\nTotal detalle notas crédito:');
    console.table([notasCreditoRepository.contarDetalleNotasCredito()]);

    console.log('\nÚltimas notas crédito:');
    console.table(notasCreditoRepository.listarUltimasNotasCredito(10));

    console.log('\nColumnas notas_credito:');
    console.table(listarColumnas('notas_credito'));

    console.log('\nColumnas detalle_notas_credito:');
    console.table(listarColumnas('detalle_notas_credito'));

    console.log('\nDiagnóstico 029 finalizado correctamente.');
}

ejecutarDiagnostico();