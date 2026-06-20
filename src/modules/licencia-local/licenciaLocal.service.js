const licenciaRepository = require('./licenciaLocal.repository');
const huellaEquipoService = require('./huellaEquipo.service');

const ESTADOS_OPERATIVOS = {
    PRUEBA: 'prueba',
    ACTIVA: 'activa',
    GRACIA: 'gracia',
    VENCIDA: 'vencida',
    BLOQUEADA: 'bloqueada',
    RELOJ_MANIPULADO: 'reloj_manipulado',
    SIN_REGISTRO: 'sin_registro',
};

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

function calcularDiasEntreFechas(fechaInicio, fechaFin) {
    if (!fechaInicio || !fechaFin) {
        return null;
    }

    const milisegundosPorDia = 1000 * 60 * 60 * 24;
    const diferencia = fechaFin.getTime() - fechaInicio.getTime();

    return Math.max(0, Math.ceil(diferencia / milisegundosPorDia));
}

function fechaEstaVencida(fechaFinTexto) {
    const fechaFin = convertirFechaLocal(fechaFinTexto);

    if (!fechaFin) {
        return false;
    }

    return fechaFin.getTime() < new Date().getTime();
}

function obtenerFechaFinOperativa(licencia) {
    if (!licencia) {
        return null;
    }

    if (licencia.fecha_fin_periodo) {
        return licencia.fecha_fin_periodo;
    }

    return licencia.fecha_fin_prueba;
}

function detectarManipulacionFecha(licencia, fechaActual) {
    const fechaUltimoUso = convertirFechaLocal(licencia?.fecha_ultimo_uso);

    if (!fechaUltimoUso) {
        return false;
    }

    const toleranciaHoras = 6;
    const toleranciaMs = toleranciaHoras * 60 * 60 * 1000;

    return fechaActual.getTime() + toleranciaMs < fechaUltimoUso.getTime();
}

function construirMensajeEstado({
    estadoOperativo,
    diasRestantes,
    diasGraciaRestantes,
    licencia,
}) {
    if (estadoOperativo === ESTADOS_OPERATIVOS.SIN_REGISTRO) {
        return 'No existe registro de licencia local.';
    }

    if (estadoOperativo === ESTADOS_OPERATIVOS.RELOJ_MANIPULADO) {
        return 'Se detectó un cambio irregular en la fecha del sistema. Contacta soporte para revisar la licencia.';
    }

    if (estadoOperativo === ESTADOS_OPERATIVOS.BLOQUEADA) {
        return 'La licencia local está bloqueada. Contacta soporte para reactivarla.';
    }

    if (estadoOperativo === ESTADOS_OPERATIVOS.ACTIVA) {
        return `Licencia activa. Quedan ${diasRestantes} día(s) de servicio.`;
    }

    if (estadoOperativo === ESTADOS_OPERATIVOS.GRACIA) {
        return `Licencia en periodo de gracia. Quedan ${diasGraciaRestantes} día(s) para renovar.`;
    }

    if (estadoOperativo === ESTADOS_OPERATIVOS.VENCIDA) {
        return 'La licencia está vencida. Debes renovar para continuar operando.';
    }

    if (estadoOperativo === ESTADOS_OPERATIVOS.PRUEBA) {
        return licencia?.fecha_fin_prueba
            ? `Prueba local activa. Quedan ${diasRestantes} día(s).`
            : 'La prueba local todavía no ha iniciado.';
    }

    return 'Estado de licencia no reconocido.';
}

function calcularEstadoOperativo(licencia) {
    if (!licencia) {
        return {
            estadoOperativo: ESTADOS_OPERATIVOS.SIN_REGISTRO,
            diasRestantes: null,
            diasGraciaRestantes: null,
            fechaFinOperativa: null,
            fechaFinGracia: null,
            pruebaIniciada: false,
            pruebaVencida: false,
            bloqueaOperacion: true,
            permiteOperar: false,
            requiereActivacion: true,
        };
    }

    const ahora = new Date();
    const estadoBase = licencia.estado || ESTADOS_OPERATIVOS.PRUEBA;
    const diasGracia = Number(licencia.dias_gracia || 0);

    const pruebaIniciada = Boolean(
        licencia.fecha_inicio_prueba && licencia.fecha_fin_prueba
    );

    const fechaFinOperativaTexto = obtenerFechaFinOperativa(licencia);
    const fechaFinOperativa = convertirFechaLocal(fechaFinOperativaTexto);
    const fechaFinGracia = fechaFinOperativa
        ? sumarDias(fechaFinOperativa, diasGracia)
        : null;

    const diasRestantes = calcularDiasRestantes(fechaFinOperativaTexto);
    const diasGraciaRestantes = fechaFinGracia
        ? calcularDiasEntreFechas(ahora, fechaFinGracia)
        : null;

    const pruebaVencida = pruebaIniciada && fechaEstaVencida(licencia.fecha_fin_prueba);
    const periodoVencido = fechaFinOperativa
        ? fechaFinOperativa.getTime() < ahora.getTime()
        : false;

    const graciaVencida = fechaFinGracia
        ? fechaFinGracia.getTime() < ahora.getTime()
        : false;

    if (detectarManipulacionFecha(licencia, ahora)) {
        return {
            estadoOperativo: ESTADOS_OPERATIVOS.RELOJ_MANIPULADO,
            diasRestantes,
            diasGraciaRestantes,
            fechaFinOperativa: fechaFinOperativaTexto,
            fechaFinGracia: fechaFinGracia ? formatearFechaSQLite(fechaFinGracia) : null,
            pruebaIniciada,
            pruebaVencida,
            bloqueaOperacion: true,
            permiteOperar: false,
            requiereActivacion: true,
        };
    }

    if (estadoBase === ESTADOS_OPERATIVOS.BLOQUEADA) {
        return {
            estadoOperativo: ESTADOS_OPERATIVOS.BLOQUEADA,
            diasRestantes,
            diasGraciaRestantes,
            fechaFinOperativa: fechaFinOperativaTexto,
            fechaFinGracia: fechaFinGracia ? formatearFechaSQLite(fechaFinGracia) : null,
            pruebaIniciada,
            pruebaVencida,
            bloqueaOperacion: true,
            permiteOperar: false,
            requiereActivacion: true,
        };
    }

    if (estadoBase === ESTADOS_OPERATIVOS.ACTIVA) {
        if (!fechaFinOperativa) {
            return {
                estadoOperativo: ESTADOS_OPERATIVOS.VENCIDA,
                diasRestantes: 0,
                diasGraciaRestantes: 0,
                fechaFinOperativa: null,
                fechaFinGracia: null,
                pruebaIniciada,
                pruebaVencida,
                bloqueaOperacion: true,
                permiteOperar: false,
                requiereActivacion: true,
            };
        }

        if (!periodoVencido) {
            return {
                estadoOperativo: ESTADOS_OPERATIVOS.ACTIVA,
                diasRestantes,
                diasGraciaRestantes,
                fechaFinOperativa: fechaFinOperativaTexto,
                fechaFinGracia: fechaFinGracia ? formatearFechaSQLite(fechaFinGracia) : null,
                pruebaIniciada,
                pruebaVencida,
                bloqueaOperacion: false,
                permiteOperar: true,
                requiereActivacion: false,
            };
        }

        if (diasGracia > 0 && !graciaVencida) {
            return {
                estadoOperativo: ESTADOS_OPERATIVOS.GRACIA,
                diasRestantes: 0,
                diasGraciaRestantes,
                fechaFinOperativa: fechaFinOperativaTexto,
                fechaFinGracia: fechaFinGracia ? formatearFechaSQLite(fechaFinGracia) : null,
                pruebaIniciada,
                pruebaVencida,
                bloqueaOperacion: false,
                permiteOperar: true,
                requiereActivacion: true,
            };
        }

        return {
            estadoOperativo: ESTADOS_OPERATIVOS.VENCIDA,
            diasRestantes: 0,
            diasGraciaRestantes: 0,
            fechaFinOperativa: fechaFinOperativaTexto,
            fechaFinGracia: fechaFinGracia ? formatearFechaSQLite(fechaFinGracia) : null,
            pruebaIniciada,
            pruebaVencida,
            bloqueaOperacion: true,
            permiteOperar: false,
            requiereActivacion: true,
        };
    }

    if (!pruebaIniciada) {
        return {
            estadoOperativo: ESTADOS_OPERATIVOS.PRUEBA,
            diasRestantes: null,
            diasGraciaRestantes: null,
            fechaFinOperativa: null,
            fechaFinGracia: null,
            pruebaIniciada,
            pruebaVencida: false,
            bloqueaOperacion: false,
            permiteOperar: true,
            requiereActivacion: false,
        };
    }

    if (!pruebaVencida) {
        return {
            estadoOperativo: ESTADOS_OPERATIVOS.PRUEBA,
            diasRestantes,
            diasGraciaRestantes,
            fechaFinOperativa: licencia.fecha_fin_prueba,
            fechaFinGracia: fechaFinGracia ? formatearFechaSQLite(fechaFinGracia) : null,
            pruebaIniciada,
            pruebaVencida: false,
            bloqueaOperacion: false,
            permiteOperar: true,
            requiereActivacion: false,
        };
    }

    if (diasGracia > 0 && !graciaVencida) {
        return {
            estadoOperativo: ESTADOS_OPERATIVOS.GRACIA,
            diasRestantes: 0,
            diasGraciaRestantes,
            fechaFinOperativa: licencia.fecha_fin_prueba,
            fechaFinGracia: fechaFinGracia ? formatearFechaSQLite(fechaFinGracia) : null,
            pruebaIniciada,
            pruebaVencida: true,
            bloqueaOperacion: false,
            permiteOperar: true,
            requiereActivacion: true,
        };
    }

    return {
        estadoOperativo: ESTADOS_OPERATIVOS.VENCIDA,
        diasRestantes: 0,
        diasGraciaRestantes: 0,
        fechaFinOperativa: licencia.fecha_fin_prueba,
        fechaFinGracia: fechaFinGracia ? formatearFechaSQLite(fechaFinGracia) : null,
        pruebaIniciada,
        pruebaVencida: true,
        bloqueaOperacion: true,
        permiteOperar: false,
        requiereActivacion: true,
    };
}

function iniciarPruebaLocalSiHaceFalta() {
    const licencia = licenciaRepository.obtenerLicenciaLocal();

    if (!licencia) {
        return {
            ok: false,
            estado: ESTADOS_OPERATIVOS.SIN_REGISTRO,
            estado_operativo: ESTADOS_OPERATIVOS.SIN_REGISTRO,
            prueba_iniciada: false,
            prueba_vencida: false,
            dias_restantes: null,
            dias_gracia_restantes: null,
            bloquea_operacion: true,
            permite_operar: false,
            requiere_activacion: true,
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

function registrarUltimoUsoSeguro(licencia, resumen) {
    if (!licencia || !resumen?.permite_operar) {
        return;
    }

    const ahoraTexto = formatearFechaSQLite(new Date());

    licenciaRepository.actualizarUltimoUso({
        fechaUltimoUso: ahoraTexto,
    });
}

function obtenerResumenLicenciaLocal() {
    const licencia = licenciaRepository.obtenerLicenciaLocal();

    if (!licencia) {
        return {
            ok: false,
            estado: ESTADOS_OPERATIVOS.SIN_REGISTRO,
            estado_operativo: ESTADOS_OPERATIVOS.SIN_REGISTRO,
            prueba_iniciada: false,
            prueba_vencida: false,
            dias_prueba: null,
            dias_gracia: null,
            dias_restantes: null,
            dias_gracia_restantes: null,
            fecha_inicio_prueba: null,
            fecha_fin_prueba: null,
            fecha_inicio_periodo: null,
            fecha_fin_periodo: null,
            fecha_fin_operativa: null,
            fecha_fin_gracia: null,
            bloquea_operacion: true,
            permite_operar: false,
            requiere_activacion: true,
            motivo_bloqueo: 'sin_registro',
            mensaje: 'No existe registro de licencia local.',
            licencia: null,
        };
    }

    const calculo = calcularEstadoOperativo(licencia);
    const huellaEquipoActual = huellaEquipoService.obtenerHuellaEquipo();

    if (calculo.estadoOperativo === ESTADOS_OPERATIVOS.RELOJ_MANIPULADO) {
        licenciaRepository.bloquearPorManipulacionFecha({
            fechaActual: formatearFechaSQLite(new Date()),
            fechaUltimoUso: licencia.fecha_ultimo_uso,
        });
    }

    const resumen = {
        ok: true,
        estado: licencia.estado,
        estado_operativo: calculo.estadoOperativo,
        prueba_iniciada: calculo.pruebaIniciada,
        prueba_vencida: calculo.pruebaVencida,
        dias_prueba: licencia.dias_prueba,
        dias_gracia: licencia.dias_gracia,
        dias_restantes: calculo.diasRestantes,
        dias_gracia_restantes: calculo.diasGraciaRestantes,
        fecha_inicio_prueba: licencia.fecha_inicio_prueba,
        fecha_fin_prueba: licencia.fecha_fin_prueba,
        fecha_inicio_periodo: licencia.fecha_inicio_periodo,
        fecha_fin_periodo: licencia.fecha_fin_periodo,
        fecha_fin_operativa: calculo.fechaFinOperativa,
        fecha_fin_gracia: calculo.fechaFinGracia,
        bloquea_operacion: calculo.bloqueaOperacion,
        permite_operar: calculo.permiteOperar,
        requiere_activacion: calculo.requiereActivacion,
        motivo_bloqueo:
            calculo.estadoOperativo === ESTADOS_OPERATIVOS.RELOJ_MANIPULADO
                ? 'reloj_manipulado'
                : licencia.motivo_bloqueo,
        plan: licencia.plan,
        huella_equipo_actual: huellaEquipoActual.huella,
        huella_equipo_actual_corta: huellaEquipoActual.huella_corta,
        huella_equipo_fuente: huellaEquipoActual.fuente,
        origen_activacion: licencia.origen_activacion,
        ultima_validacion_online: licencia.ultima_validacion_online,
        ultimo_intento_online: licencia.ultimo_intento_online,
        mensaje: construirMensajeEstado({
            estadoOperativo: calculo.estadoOperativo,
            diasRestantes: calculo.diasRestantes,
            diasGraciaRestantes: calculo.diasGraciaRestantes,
            licencia,
        }),
        licencia,
    };

    registrarUltimoUsoSeguro(licencia, resumen);

    return resumen;
}

module.exports = {
    ESTADOS_OPERATIVOS,
    obtenerResumenLicenciaLocal,
    iniciarPruebaLocalSiHaceFalta,
    calcularDiasRestantes,
    fechaEstaVencida,
    formatearFechaSQLite,
    sumarDias,
};