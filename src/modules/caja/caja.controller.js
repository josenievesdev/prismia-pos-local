const cajaService = require('./caja.service');

const estilosCaja = ['/css/modules/caja.css'];

function mostrarCaja(req, res) {
    const estadoCaja = cajaService.obtenerEstadoCaja();

    return res.render('caja/index', {
        titulo: 'Caja',
        turnoAbierto: estadoCaja.turnoAbierto,
        movimientos: estadoCaja.movimientos,
        resumenMediosPago: estadoCaja.resumenMediosPago,
        resumenMediosPagoAgrupado: estadoCaja.resumenMediosPagoAgrupado,
        totalesResumenMediosPago: estadoCaja.totalesResumenMediosPago,
        turnosRecientes: estadoCaja.turnosRecientes,
        mediosPago: estadoCaja.mediosPago,
        mediosPagoAgrupados: estadoCaja.mediosPagoAgrupados,
        mensajeExito: req.query.exito || null,
        error: req.query.error || null,
        estilosModulo: estilosCaja,
    });
}

function mostrarFormularioAbrir(req, res) {
    const estadoCaja = cajaService.obtenerEstadoCaja();

    if (estadoCaja.turnoAbierto) {
        return res.redirect(
            `/caja?error=${encodeURIComponent(
                'Ya existe una caja abierta. No puedes abrir otra caja encima.'
            )}`
        );
    }

    return res.render('caja/abrir', {
        titulo: 'Abrir caja',
        valores: {
            monto_inicial: 0,
            observaciones_apertura: '',
        },
        error: null,
        estilosModulo: estilosCaja,
    });
}

function abrirCaja(req, res) {
    const resultado = cajaService.abrirCaja({
        datosFormulario: req.body,
        usuario: req.session?.usuario,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });

    if (!resultado.ok) {
        return res.status(400).render('caja/abrir', {
            titulo: 'Abrir caja',
            valores: {
                monto_inicial: req.body.monto_inicial || 0,
                observaciones_apertura: req.body.observaciones_apertura || '',
            },
            error: resultado.mensaje,
            estilosModulo: estilosCaja,
        });
    }

    return res.redirect(`/caja?exito=${encodeURIComponent(resultado.mensaje)}`);
}

function mostrarFormularioMovimiento(req, res) {
    const datosFormulario = cajaService.obtenerDatosFormularioMovimiento();

    if (!datosFormulario.turnoAbierto) {
        return res.redirect(
            `/caja?error=${encodeURIComponent(
                'Debes abrir caja antes de registrar movimientos.'
            )}`
        );
    }

    return res.render('caja/movimiento', {
        titulo: 'Registrar movimiento',
        turnoAbierto: datosFormulario.turnoAbierto,
        mediosPago: datosFormulario.mediosPago,
        mediosPagoAgrupados: datosFormulario.mediosPagoAgrupados,
        valores: datosFormulario.valores,
        error: null,
        estilosModulo: estilosCaja,
    });
}

function registrarMovimientoManual(req, res) {
    const resultado = cajaService.registrarMovimientoManual({
        datosFormulario: req.body,
        usuario: req.session?.usuario,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });

    if (!resultado.ok) {
        const datosFormulario = cajaService.obtenerDatosFormularioMovimiento();

        return res.status(400).render('caja/movimiento', {
            titulo: 'Registrar movimiento',
            turnoAbierto: datosFormulario.turnoAbierto,
            mediosPago: datosFormulario.mediosPago,
            mediosPagoAgrupados: datosFormulario.mediosPagoAgrupados,
            valores: resultado.valores,
            error: resultado.mensaje,
            estilosModulo: estilosCaja,
        });
    }

    return res.redirect(`/caja?exito=${encodeURIComponent(resultado.mensaje)}`);
}

function mostrarFormularioGasto(req, res) {
    const datosFormulario = cajaService.obtenerDatosFormularioGasto();

    if (!datosFormulario.turnoAbierto) {
        return res.redirect(
            `/caja?error=${encodeURIComponent(
                'Debes abrir caja antes de registrar gastos.'
            )}`
        );
    }

    return res.render('caja/gasto', {
        titulo: 'Registrar gasto',
        turnoAbierto: datosFormulario.turnoAbierto,
        mediosPago: datosFormulario.mediosPago,
        mediosPagoAgrupados: datosFormulario.mediosPagoAgrupados,
        categoriasGasto: datosFormulario.categoriasGasto,
        valores: datosFormulario.valores,
        error: null,
        estilosModulo: estilosCaja,
    });
}

function registrarGastoDesdeCaja(req, res) {
    const resultado = cajaService.registrarGastoDesdeCaja({
        datosFormulario: req.body,
        usuario: req.session?.usuario,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });

    if (!resultado.ok) {
        const datosFormulario = cajaService.obtenerDatosFormularioGasto();

        return res.status(400).render('caja/gasto', {
            titulo: 'Registrar gasto',
            turnoAbierto: datosFormulario.turnoAbierto,
            mediosPago: datosFormulario.mediosPago,
            mediosPagoAgrupados: datosFormulario.mediosPagoAgrupados,
            categoriasGasto: datosFormulario.categoriasGasto,
            valores: resultado.valores,
            error: resultado.mensaje,
            estilosModulo: estilosCaja,
        });
    }

    return res.redirect(`/caja?exito=${encodeURIComponent(resultado.mensaje)}`);
}

module.exports = {
    mostrarCaja,
    mostrarFormularioAbrir,
    abrirCaja,
    mostrarFormularioMovimiento,
    registrarMovimientoManual,
    mostrarFormularioGasto,
    registrarGastoDesdeCaja,
};