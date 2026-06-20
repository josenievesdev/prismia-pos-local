const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const huellaEquipoService = require('../../src/modules/licencia-local/huellaEquipo.service');

const rutaPrivateKeyDefault = path.join(
    __dirname,
    'private',
    'prismia-license-private.pem'
);

function leerArgumentos() {
    const args = process.argv.slice(2);
    const resultado = {};

    for (let i = 0; i < args.length; i += 1) {
        const actual = args[i];

        if (!actual.startsWith('--')) {
            continue;
        }

        const nombre = actual.replace(/^--/, '');
        const valor = args[i + 1];

        if (!valor || valor.startsWith('--')) {
            resultado[nombre] = true;
            continue;
        }

        resultado[nombre] = valor;
        i += 1;
    }

    return resultado;
}

function base64Url(buffer) {
    return Buffer.from(buffer)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function sumarDias(fechaBase, dias) {
    const fecha = new Date(fechaBase);
    fecha.setDate(fecha.getDate() + Number(dias || 0));
    return fecha;
}

function leerClavePrivada(rutaClave) {
    if (!fs.existsSync(rutaClave)) {
        throw new Error(`No existe la clave privada: ${rutaClave}`);
    }

    return fs.readFileSync(rutaClave, 'utf8');
}

function validarFecha(fecha, nombreCampo) {
    if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
        throw new Error(`Fecha inválida en ${nombreCampo}.`);
    }
}

function generarCodigo() {
    const args = leerArgumentos();

    const cliente = String(args.cliente || 'Cliente Prismia').trim();
    const plan = String(args.plan || 'mensual').trim().toLowerCase();
    const dias = Number(args.dias || 30);
    const diasGracia = Number(args.gracia || 3);

    if (!Number.isInteger(dias) || dias <= 0) {
        throw new Error('El parámetro --dias debe ser un entero mayor a 0.');
    }

    if (!Number.isInteger(diasGracia) || diasGracia < 0) {
        throw new Error('El parámetro --gracia debe ser un entero mayor o igual a 0.');
    }

    const huella = String(
        args.huella || huellaEquipoService.obtenerHuellaEquipo().huella
    ).trim();

    if (!huella || huella.length < 32) {
        throw new Error('Debes indicar una huella válida con --huella.');
    }

    const fechaInicio = args.inicio
        ? new Date(args.inicio)
        : new Date();

    const fechaFin = args.fin
        ? new Date(args.fin)
        : sumarDias(fechaInicio, dias);

    validarFecha(fechaInicio, 'fecha_inicio');
    validarFecha(fechaFin, 'fecha_fin');

    if (fechaFin.getTime() <= fechaInicio.getTime()) {
        throw new Error('La fecha fin debe ser mayor a la fecha de inicio.');
    }

    const privateKeyPem = leerClavePrivada(
        args.privateKey || rutaPrivateKeyDefault
    );

    const payload = {
        v: 1,
        producto: 'prismia-pos-local',
        cliente,
        plan,
        dias,
        dias_gracia: diasGracia,
        fecha_inicio: fechaInicio.toISOString(),
        fecha_fin: fechaFin.toISOString(),
        huella_equipo: huella,
        origen_activacion: 'local_firmada',
        emitido_en: new Date().toISOString(),
        nonce: crypto.randomUUID(),
    };

    const payloadJson = JSON.stringify(payload);
    const payloadBase64 = base64Url(Buffer.from(payloadJson, 'utf8'));

    const datosFirmados = `PRM1.${payloadBase64}`;

    const firma = crypto.sign(
        null,
        Buffer.from(datosFirmados, 'utf8'),
        privateKeyPem
    );

    const firmaBase64 = base64Url(firma);
    const codigo = `${datosFirmados}.${firmaBase64}`;

    console.log('');
    console.log('Código de activación generado:');
    console.log('');
    console.log(codigo);
    console.log('');
    console.log('Resumen:');
    console.log(JSON.stringify(payload, null, 2));
}

generarCodigo();