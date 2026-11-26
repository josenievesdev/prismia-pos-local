/**
 * Compras con aritmética exacta (public/js/compras-calculo.js).
 *
 * Antes cada valor se calculaba con decimales y se redondeaba por separado:
 * subtotal + IVA podía no dar el total de la línea. Ahora todo va en pesos
 * enteros (redondeo medio hacia arriba) y el formulario usa el mismo archivo
 * que el servidor.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const comprasCalculo = require('../src/utils/compras-calculo');

const CAMPOS_EN_PESOS = [
    'descuentoUnitario', 'costoUnitarioNeto', 'ivaUnitario', 'costoUnitarioFinal',
    'descuentoLinea', 'subtotalLinea', 'ivaLinea', 'totalLinea', 'precioVentaSugerido',
];

function azarConSemilla(semilla) {
    let estado = semilla;

    return function (maximo) {
        estado = (estado * 1103515245 + 12345) % 2147483648;
        return estado % maximo;
    };
}

test('línea con cantidad decimal, descuento e IVA: cada peso cuadra', () => {
    const linea = comprasCalculo.calcularLinea({
        cantidad: '2.5',
        costo_unitario: '2499',
        descuento_porcentaje: '5',
        porcentaje_iva: '19',
        ganancia_sobre_costo_porcentaje: '30',
    });

    assert.deepEqual(
        Object.fromEntries(CAMPOS_EN_PESOS.map((campo) => [campo, linea[campo]])),
        {
            descuentoUnitario: 125, // 2.499 × 5 % = 124,95
            costoUnitarioNeto: 2374,
            ivaUnitario: 451, // 2.374 × 19 % = 451,06
            costoUnitarioFinal: 2825,
            descuentoLinea: 313, // 125 × 2,5 = 312,5
            subtotalLinea: 5935, // 2.374 × 2,5
            ivaLinea: 1128, // 5.935 × 19 % = 1.127,65
            totalLinea: 7063,
            precioVentaSugerido: 3673, // 2.825 × 1,30 = 3.672,5
        }
    );
});

test('siempre: todo en pesos enteros y subtotal + IVA = total', () => {
    const azar = azarConSemilla(2026);

    for (let i = 0; i < 5000; i += 1) {
        const linea = comprasCalculo.calcularLinea({
            cantidad: (azar(200000) + 1) / 1000,
            costo_unitario: azar(800000) + 1,
            descuento_porcentaje: azar(3001) / 100,
            porcentaje_iva: [0, 5, 19][azar(3)],
            ganancia_sobre_costo_porcentaje: azar(10001) / 100,
        });

        for (const campo of CAMPOS_EN_PESOS) {
            assert.ok(Number.isSafeInteger(linea[campo]) && linea[campo] >= 0, `${campo} = ${linea[campo]}`);
        }

        assert.equal(linea.totalLinea, linea.subtotalLinea + linea.ivaLinea);
        assert.equal(linea.costoUnitarioFinal, linea.costoUnitarioNeto + linea.ivaUnitario);
    }
});

test('el IVA que llega como fracción (0,19) se toma como 19 %', () => {
    const linea = comprasCalculo.calcularLinea({ cantidad: 1, costo_unitario: 10000, porcentaje_iva: '0.19' });
    assert.equal(linea.porcentajeIva, 19);
    assert.equal(linea.ivaLinea, 1900);
});

test('el formulario (navegador) calcula exactamente igual que el servidor', () => {
    const contexto = vm.createContext({ window: {} });

    for (const archivo of ['dinero-exacto.js', 'compras-calculo.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'public', 'js', archivo), 'utf8'), contexto);
    }

    const navegador = contexto.window.PrismiaCompras;
    assert.ok(navegador, 'window.PrismiaCompras existe en el navegador');

    const azar = azarConSemilla(77);

    for (let i = 0; i < 500; i += 1) {
        const datos = {
            cantidad: (azar(50000) + 1) / 1000,
            costo_unitario: azar(300000) + 1,
            descuento_porcentaje: azar(2001) / 100,
            porcentaje_iva: [0, 5, 19][azar(3)],
            ganancia_sobre_costo_porcentaje: azar(5001) / 100,
        };

        assert.deepEqual(
            JSON.parse(JSON.stringify(navegador.calcularLinea(datos))),
            JSON.parse(JSON.stringify(comprasCalculo.calcularLinea(datos)))
        );
    }
});
