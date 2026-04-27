const cajaService = require('./caja.service');

const estilosCaja = ['/css/modules/caja.css'];

function mostrarCaja(req, res) {
    const estadoCaja = cajaService.obtenerEstadoCaja();

    return res.render('caja/index', {
        titulo: 'Caja',
        turnoAbierto: estadoCaja.turnoAbierto,
        movimientos: estadoCaja.movimientos,
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

module.exports = {
    mostrarCaja,
    mostrarFormularioAbrir,
    abrirCaja,
};