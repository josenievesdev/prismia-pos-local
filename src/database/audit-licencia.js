const fs = require('fs');
const path = require('path');

const licenciaLocalService = require('../modules/licencia-local/licenciaLocal.service');
const licenciaComercial = require('../config/licencia-comercial');
const { PUBLIC_KEY_PEM } = require('../config/licencia-public-key');

const errores = [];
const advertencias = [];
const oks = [];

function ok(mensaje) {
    oks.push(mensaje);
    console.log(`[OK] ${mensaje}`);
}

function advertencia(mensaje) {
    advertencias.push(mensaje);
    console.warn(`[ADVERTENCIA] ${mensaje}`);
}

function error(mensaje) {
    errores.push(mensaje);
    console.error(`[ERROR] ${mensaje}`);
}

function valorPresente(valor) {
    return valor !== null && valor !== undefined && String(valor).trim() !== '';
}

function validarClavePublica() {
    if (!PUBLIC_KEY_PEM || !PUBLIC_KEY_PEM.includes('BEGIN PUBLIC KEY')) {
        error('La clave pública de licenciamiento no está configurada.');
        return;
    }

    ok('Clave pública de licenciamiento configurada');
}

function validarClavePrivadaIgnorada() {
    const rutaPrivateDir = path.resolve(
        __dirname,
        '..',
        '..',
        'tools',
        'licencias',
        'private'
    );

    if (!fs.existsSync(rutaPrivateDir)) {
        advertencia('No existe carpeta local de clave privada. Es normal si este entorno no genera licencias.');
        return;
    }

    const archivosPrivados = fs
        .readdirSync(rutaPrivateDir)
        .filter((archivo) => archivo.endsWith('.pem'));

    if (archivosPrivados.length === 0) {
        advertencia('La carpeta privada existe, pero no contiene archivos .pem.');
        return;
    }

    ok('Existe clave privada local para generar códigos. Verifica que siga ignorada por Git.');
}

function validarWhatsapp(resumen) {
    const url = licenciaComercial.obtenerUrlWhatsappPago(resumen);

    if (!url.startsWith('https://wa.me/573215394234')) {
        error('La URL de WhatsApp no usa el número real de activación Prismia.');
        return;
    }

    if (!url.includes('Huella')) {
        advertencia('La URL de WhatsApp no parece incluir la huella del equipo.');
    }

    ok('WhatsApp de activación usa el número real de Prismia');
}

function validarResumenBasico(resumen) {
    if (!resumen || !resumen.ok) {
        error('No fue posible obtener resumen válido de licencia local.');
        return;
    }

    ok('Resumen de licencia local disponible');

    if (!valorPresente(resumen.estado_operativo)) {
        error('La licencia no tiene estado_operativo.');
    } else {
        ok(`Estado operativo calculado: ${resumen.estado_operativo}`);
    }

    if (!valorPresente(resumen.nombre_negocio_local)) {
        advertencia('No se encontró nombre de negocio local conectado a la licencia.');
    } else {
        ok(`Negocio local conectado: ${resumen.nombre_negocio_local}`);
    }

    if (!valorPresente(resumen.cliente_licencia_resuelto)) {
        advertencia('No se encontró cliente de licencia resuelto.');
    } else {
        ok(`Cliente de licencia resuelto: ${resumen.cliente_licencia_resuelto}`);
    }

    if (!valorPresente(resumen.huella_equipo_actual)) {
        error('No se pudo calcular huella actual del equipo.');
    } else {
        ok('Huella actual del equipo disponible');
    }

    if (!valorPresente(resumen.fecha_fin_operativa)) {
        advertencia('No hay fecha fin operativa registrada.');
    } else {
        ok(`Fecha fin operativa: ${resumen.fecha_fin_operativa}`);
    }
}

function validarLicenciaActiva(resumen) {
    if (resumen.estado_operativo !== 'activa') {
        advertencia(`La licencia no está activa. Estado actual: ${resumen.estado_operativo}`);
        return;
    }

    if (Number(resumen.firma_valida || 0) !== 1) {
        error('La licencia está activa, pero no tiene firma válida registrada.');
    } else {
        ok('Licencia activa con firma válida');
    }

    if (!valorPresente(resumen.fecha_activacion)) {
        advertencia('La licencia activa no tiene fecha_activacion registrada.');
    } else {
        ok(`Fecha de activación registrada: ${resumen.fecha_activacion}`);
    }

    if (
        valorPresente(resumen.huella_equipo_licencia)
        && valorPresente(resumen.huella_equipo_actual)
        && resumen.huella_equipo_licencia !== resumen.huella_equipo_actual
    ) {
        error('La huella guardada en la licencia no coincide con la huella actual del equipo.');
    } else if (valorPresente(resumen.huella_equipo_licencia)) {
        ok('Huella de licencia coincide con el equipo actual');
    }

    if (typeof resumen.dias_restantes === 'number' && resumen.dias_restantes <= 0) {
        advertencia('La licencia activa no tiene días restantes positivos.');
    } else {
        ok(`Días restantes: ${resumen.dias_restantes}`);
    }
}

function imprimirResumenFinal() {
    console.log('');
    console.log('====================================');
    console.log('Resumen auditoría de licencia');
    console.log('====================================');
    console.log(`OK: ${oks.length}`);
    console.log(`Advertencias: ${advertencias.length}`);
    console.log(`Errores críticos: ${errores.length}`);
    console.log('');

    if (errores.length > 0) {
        console.log('La auditoría de licencia encontró errores críticos.');
        process.exit(1);
    }

    if (advertencias.length > 0) {
        console.log('Auditoría de licencia finalizada con advertencias.');
        return;
    }

    console.log('Auditoría de licencia correcta. El módulo está listo para piloto controlado.');
}

function ejecutarAuditoriaLicencia() {
    console.log('====================================');
    console.log('Auditoría de licenciamiento Prismia');
    console.log('====================================');

    const resumen = licenciaLocalService.obtenerResumenLicenciaLocal();

    validarClavePublica();
    validarClavePrivadaIgnorada();
    validarResumenBasico(resumen);
    validarLicenciaActiva(resumen);
    validarWhatsapp(resumen);

    imprimirResumenFinal();
}

ejecutarAuditoriaLicencia();