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

test('sumarDiasLocalISO cruza meses y años', () => {
    assert.equal(fechas.sumarDiasLocalISO(15, new Date(2026, 11, 25, 23, 0, 0)), '2027-01-09');
    assert.equal(fechas.sumarDiasLocalISO(-1, new Date(2026, 2, 1, 8, 0, 0)), '2026-02-28');
});
