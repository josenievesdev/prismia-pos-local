const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const fechas = require(path.join(__dirname, '..', 'src', 'utils', 'fechas'));

test('fechaLocalISO usa la fecha local, no la UTC', () => {
    // 2026-05-30 22:12 en hora local: debe seguir siendo 30 de mayo.
    const nocheLocal = new Date(2026, 4, 30, 22, 12, 41);
    assert.equal(fechas.fechaLocalISO(nocheLocal), '2026-05-30');
    assert.equal(fechas.fechaHoraLocalSQL(nocheLocal), '2026-05-30 22:12:41');
});

test('utcALocalSQL convierte CURRENT_TIMESTAMP (UTC) a hora local', () => {
    const esperado = fechas.fechaHoraLocalSQL(new Date(Date.UTC(2026, 4, 31, 3, 12, 41)));
    assert.equal(fechas.utcALocalSQL('2026-05-31 03:12:41'), esperado);
    assert.equal(fechas.utcALocalSQL('2026-05-31T03:12:41'), esperado);

    // Fechas sin hora, vacíos y otros formates se devuelven sin cambios.
    assert.equal(fechas.utcALocalSQL('2026-05-31'), '2026-05-31');
    assert.equal(fechas.utcALocalSQL(null), '');
    assert.equal(fechas.utcALocalSQL('sin fecha'), 'sin fecha');
});

test('sumarDiasLocalISO cruza meses y años', () => {
    assert.equal(fechas.sumarDiasLocalISO(15, new Date(2026, 11, 25, 23, 0, 0)), '2027-01-09');
    assert.equal(fechas.sumarDiasLocalISO(-1, new Date(2026, 2, 1, 8, 0, 0)), '2026-02-28');
});
