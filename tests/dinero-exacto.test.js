const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const d = require(path.join(__dirname, '..', 'src', 'utils', 'dinero'));

// Referencia exacta con BigInt (medio hacia arriba).
function ref(n, den) {
    return Number((2n * n + den) / (2n * den));
}

test('caso que fallaba con decimales flotantes: 2.499 × 2.5', () => {
    assert.equal(d.multiplicarPorCantidad(2499, 2.5), 6248);
    assert.equal(d.multiplicarPorCantidad(1, 0.5), 1); // 0,5 sube a 1
    assert.equal(d.multiplicarPorCantidad(3, 0.165), 0); // 0,495 baja a 0
    assert.equal(d.multiplicarPorCantidad(10, 0.155), 2); // 1,55 sube a 2 (en flotante 1.5499999)
});

test('multiplicar por cantidad coincide con BigInt en 20.000 casos aleatorios', () => {
    for (let i = 0; i < 20000; i++) {
        const precio = Math.floor(Math.random() * 500000);
        const milesimas = Math.floor(Math.random() * 50000);
        const esperado = ref(BigInt(precio) * BigInt(milesimas), 1000n);
        assert.equal(d.multiplicarPorCantidad(precio, milesimas / 1000), esperado, `${precio} × ${milesimas / 1000}`);
    }
});

test('IVA incluido y exclusivo coinciden con BigInt y la base + IVA suma el total', () => {
    for (let i = 0; i < 20000; i++) {
        const total = Math.floor(Math.random() * 5000000);
        const pct = [5, 8, 19][i % 3];
        const { base, iva } = d.separarIvaIncluido(total, pct);
        assert.equal(base, ref(BigInt(total) * 100n, BigInt(100 + pct)));
        assert.equal(base + iva, total);
        assert.equal(d.calcularIva(base, pct), ref(BigInt(base) * BigInt(pct), 100n));
    }
});
