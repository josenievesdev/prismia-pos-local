const licenciaRepository = require('./licenciaLocal.repository');

function convertirFechaLocal(fechaTexto) {
    if (!fechaTexto) {
        return null;
    }

    const fecha = new Date(String(fechaTexto).replace(' ', 'T'));

    if (Number.isNaN(fecha.getTime())) {
        return null;
    }

    return fecha;
}

function calcularDiasRestantes(fechaFinTexto) {
    const fechaFin = convertirFechaLocal(fechaFinTexto);

    if (!fechaFin) {
        return null;
    }

    const ahora = new Date();
    const milisegundosPorDia = 1000 * 60 * 60 * 24;
    const diferencia = fechaFin.getTime() - ahora.getTime();

    return Math.max(0, Math.ceil(diferencia / milisegundosPorDia));
}

function formatearFechaSQLite(fecha) {
    const pad = (numero) => String(numero).padStart(2, '0');

    const anio = fecha.getFullYear();
    const mes = pad(fecha.getMonth() + 1);
    const dia = pad(fecha.getDate());
    const hora = pad(fecha.getHours());
    const minuto = pad(fecha.getMinutes());
    const segundo = pad(fecha.getSeconds());

    return `${anio}-${mes}-${dia} ${hora}:${minuto}:${segundo}`;
}

function sumarDias(fechaBase, dias) {
    const fecha = new Date(fechaBase);
    fecha.setDate(fecha.getDate() + Number(dias || 0));
    return fecha;
}

function fechaEstaVencida(fechaFinTexto) {
    const fechaFin = convertirFechaLocal(fechaFinTexto);

    if (!fechaFin) {
        return false;
    }

    return fechaFin.getTime() < new Date().getTime();
}

function iniciarPruebaLocalSiHaceFalta() {
    const licencia = licenciaRepository.obtenerLicenciaLocal();

    if (!licencia) {
        return {
            ok: false,
            estado: 'sin_registro',
            prueba_iniciada: false,
            dias_restantes: null,
            mensaje: 'No existe registro de licencia local para iniciar prueba.',
            licencia: null,
        };
    }

    const pruebaYaIniciada = Boolean(
        licencia.fecha_inicio_prueba && licencia.fecha_fin_prueba
    );

    if (pruebaYaIniciada) {
        return obtenerResumenLicenciaLocal();
    }

    const fechaInicio = new Date();
    const diasPrueba = Number(licencia.dias_prueba || 30);
    const fechaFin = sumarDias(fechaInicio, diasPrueba);

    licenciaRepository.actualizarInicioPrueba({
        fechaInicioPrueba: formatearFechaSQLite(fechaInicio),
        fechaFinPrueba: formatearFechaSQLite(fechaFin),
    });

    return obtenerResumenLicenciaLocal();
}

function obtenerResumenLicenciaLocal() {
    const licencia = licenciaRepository.obtenerLicenciaLocal();

    if (!licencia) {
        return {
            ok: false,
            estado: 'sin_registro',
            prueba_iniciada: false,
            dias_restantes: null,
            mensaje: 'No existe registro de licencia local.',
            licencia: null,
        };
    }

    const pruebaIniciada = Boolean(
        licencia.fecha_inicio_prueba && licencia.fecha_fin_prueba
    );

    const diasRestantes = calcularDiasRestantes(licencia.fecha_fin_prueba);
    const pruebaVencida = pruebaIniciada && fechaEstaVencida(licencia.fecha_fin_prueba);
    const estadoOperativo = pruebaVencida ? 'vencida' : licencia.estado;

    return {
        ok: true,
        estado: licencia.estado,
        estado_operativo: estadoOperativo,
        prueba_iniciada: pruebaIniciada,
        prueba_vencida: pruebaVencida,
        dias_prueba: licencia.dias_prueba,
        dias_restantes: diasRestantes,
        fecha_inicio_prueba: licencia.fecha_inicio_prueba,
        fecha_fin_prueba: licencia.fecha_fin_prueba,
        mensaje: pruebaIniciada
            ? pruebaVencida
                ? 'La prueba local está vencida.'
                : `Prueba local activa. Quedan ${diasRestantes} día(s).`
            : 'La prueba local todavía no ha iniciado.',
        licencia,
    };
}

module.exports = {
    obtenerResumenLicenciaLocal,
    iniciarPruebaLocalSiHaceFalta,
    calcularDiasRestantes,
    fechaEstaVencida,
};