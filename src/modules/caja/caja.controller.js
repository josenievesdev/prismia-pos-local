const cajaService = require('./caja.service');
const backupsService = require('../backups/backups.service');
const configuracionService = require('../configuracion/configuracion.service');

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
        alertaBackup: req.query.alertaBackup || null,
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

function mostrarFormularioCerrar(req, res) {
    const datosFormulario = cajaService.obtenerDatosFormularioCierre();

    if (!datosFormulario.turnoAbierto) {
        return res.redirect(
            `/caja?error=${encodeURIComponent(
                'No hay una caja abierta para cerrar.'
            )}`
        );
    }

    return res.render('caja/cerrar', {
        titulo: 'Cerrar caja',
        turnoAbierto: datosFormulario.turnoAbierto,
        movimientos: datosFormulario.movimientos,
        resumenMediosPago: datosFormulario.resumenMediosPago,
        resumenMediosPagoAgrupado: datosFormulario.resumenMediosPagoAgrupado,
        totalesResumenMediosPago: datosFormulario.totalesResumenMediosPago,
        valores: datosFormulario.valores,
        error: null,
        estilosModulo: estilosCaja,
    });
}

async function cerrarCaja(req, res) {
    const resultado = cajaService.cerrarCaja({
        datosFormulario: req.body,
        usuario: req.session?.usuario,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });

    if (!resultado.ok) {
        const datosFormulario = cajaService.obtenerDatosFormularioCierre();

        return res.status(400).render('caja/cerrar', {
            titulo: 'Cerrar caja',
            turnoAbierto: datosFormulario.turnoAbierto,
            movimientos: datosFormulario.movimientos,
            resumenMediosPago: datosFormulario.resumenMediosPago,
            resumenMediosPagoAgrupado: datosFormulario.resumenMediosPagoAgrupado,
            totalesResumenMediosPago: datosFormulario.totalesResumenMediosPago,
            valores: resultado.valores,
            error: resultado.mensaje,
            estilosModulo: estilosCaja,
        });
    }

    try {
        const mensajesBackup = [];

        const backup = await backupsService.crearBackupAutomaticoCierreTurno(
            resultado.turnoCerrado
        );

        if (!backup.ok) {
            mensajesBackup.push(backup.mensaje);
        } else {
            const copiaExterna = backup.backup?.copia_externa;

            let mensajeBackup = `Backup automático creado: ${backup.backup.archivo}`;

            if (copiaExterna?.habilitada && copiaExterna.ok) {
                mensajeBackup += '. Copia externa creada.';
            }

            if (copiaExterna?.habilitada && !copiaExterna.ok) {
                mensajeBackup += `. No se pudo crear copia externa: ${copiaExterna.mensaje}`;
            }

            mensajesBackup.push(mensajeBackup);
        }

        const backupProgramado = await backupsService.crearBackupProgramadoSiCorresponde();

        if (!backupProgramado.ok) {
            mensajesBackup.push(`No se pudo crear backup programado: ${backupProgramado.mensaje}`);
        } else if (backupProgramado.creado) {
            const copiaExternaProgramada = backupProgramado.backup?.copia_externa;

            let mensajeProgramado = `Backup programado creado: ${backupProgramado.backup.archivo}`;

            if (copiaExternaProgramada?.habilitada && copiaExternaProgramada.ok) {
                mensajeProgramado += '. Copia externa creada.';
            }

            if (copiaExternaProgramada?.habilitada && !copiaExternaProgramada.ok) {
                mensajeProgramado += `. No se pudo crear copia externa: ${copiaExternaProgramada.mensaje}`;
            }

            mensajesBackup.push(mensajeProgramado);
        }

        return res.redirect(
            `/caja?exito=${encodeURIComponent(resultado.mensaje)}&alertaBackup=${encodeURIComponent(mensajesBackup.join(' '))}`
        );
    } catch (error) {
        console.error('Error creando backup automático al cerrar caja:', error);

        return res.redirect(
            `/caja?exito=${encodeURIComponent(resultado.mensaje)}&alertaBackup=${encodeURIComponent('La caja se cerró, pero no se pudo crear el backup automático.')}`
        );
    }
}

function mostrarDetalleTurno(req, res) {
    const resultado = cajaService.obtenerDetalleArqueoTurno(req.params.id);

    if (!resultado.ok) {
        return res.redirect(
            `/caja?error=${encodeURIComponent(resultado.mensaje)}`
        );
    }

    const { arqueo } = resultado;

    return res.render('caja/turno-detalle', {
        titulo: `Arqueo caja #${arqueo.turno.id_turno_caja}`,
        arqueo,
        turno: arqueo.turno,
        movimientos: arqueo.movimientos,
        resumenMediosPago: arqueo.resumenMediosPago,
        resumenMediosPagoAgrupado: arqueo.resumenMediosPagoAgrupado,
        totalesResumenMediosPago: arqueo.totalesResumenMediosPago,
        gastos: arqueo.gastos,
        totalesGastos: arqueo.totalesGastos,
        facturas: arqueo.facturas,
        facturasPendientesDeIntegracion: arqueo.facturasPendientesDeIntegracion,
        mensajeFacturas: arqueo.mensajeFacturas,
        error: null,
        estilosModulo: estilosCaja,
    });
}

function mostrarArqueoImprimible(req, res) {
    const resultado = cajaService.obtenerDetalleArqueoTurno(req.params.id);

    if (!resultado.ok) {
        return res.redirect(
            `/caja?error=${encodeURIComponent(resultado.mensaje)}`
        );
    }

    const { arqueo } = resultado;

    return res.render('caja/turno-imprimir', {
        layout: false,
        titulo: `Arqueo caja #${arqueo.turno.id_turno_caja}`,
        configuracionNegocio: configuracionService.obtenerConfiguracionNegocio(),
        arqueo,
        turno: arqueo.turno,
        movimientos: arqueo.movimientos,
        resumenMediosPago: arqueo.resumenMediosPago,
        resumenMediosPagoAgrupado: arqueo.resumenMediosPagoAgrupado,
        totalesResumenMediosPago: arqueo.totalesResumenMediosPago,
        gastos: arqueo.gastos,
        totalesGastos: arqueo.totalesGastos,
        facturas: arqueo.facturas,
        facturasPendientesDeIntegracion: arqueo.facturasPendientesDeIntegracion,
        mensajeFacturas: arqueo.mensajeFacturas,
    });
}

function descargarExcelArqueoTurno(req, res) {
    const resultado = cajaService.generarExcelArqueoTurno(req.params.id);

    if (!resultado.ok) {
        return res.redirect(
            `/caja?error=${encodeURIComponent(resultado.mensaje)}`
        );
    }

    res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.setHeader(
        'Content-Disposition',
        `attachment; filename="${resultado.nombreArchivo}"`
    );

    res.setHeader('Content-Length', resultado.buffer.length);

    return res.send(resultado.buffer);
}

module.exports = {
    mostrarCaja,
    mostrarFormularioAbrir,
    abrirCaja,
    mostrarFormularioMovimiento,
    registrarMovimientoManual,
    mostrarFormularioGasto,
    registrarGastoDesdeCaja,
    mostrarFormularioCerrar,
    cerrarCaja,
    mostrarDetalleTurno,
    mostrarArqueoImprimible,
    descargarExcelArqueoTurno,
};