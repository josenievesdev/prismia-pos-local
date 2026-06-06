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

    return {
        ok: true,
        estado: licencia.estado,
        prueba_iniciada: pruebaIniciada,
        dias_prueba: licencia.dias_prueba,
        dias_restantes: diasRestantes,
        fecha_inicio_prueba: licencia.fecha_inicio_prueba,
        fecha_fin_prueba: licencia.fecha_fin_prueba,
        mensaje: pruebaIniciada
            ? `Prueba local activa. Quedan ${diasRestantes} día(s).`
            : 'La prueba local todavía no ha iniciado.',
        licencia,
    };
}

module.exports = {
    obtenerResumenLicenciaLocal,
    calcularDiasRestantes,
};