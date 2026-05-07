const backupsService = require('./backups.service');

const estilosBackups = ['/css/modules/backups.css'];

function mostrarBackups(req, res) {
    const estado = backupsService.obtenerEstadoBackups();

    return res.render('backups/index', {
        titulo: 'Backups',
        backups: estado.backups,
        totalBackups: estado.total,
        ultimoBackup: estado.ultimo,
        rutasBackups: estado.rutas,
        exito: req.query.exito || '',
        alerta: req.query.alerta || '',
        error: req.query.error || '',
        estilosModulo: estilosBackups,
    });
}

async function crearBackupManual(req, res) {
    const resultado = await backupsService.crearBackupManual();

    if (!resultado.ok) {
        return res.redirect(`/backups?error=${encodeURIComponent(resultado.mensaje)}`);
    }

    const copiaExterna = resultado.backup.copia_externa;
    const mensajeExito = `${resultado.mensaje} Archivo: ${resultado.backup.archivo}`;

    if (copiaExterna.habilitada && !copiaExterna.ok) {
        return res.redirect(
            `/backups?exito=${encodeURIComponent(mensajeExito)}&alerta=${encodeURIComponent(`No se pudo crear la copia externa: ${copiaExterna.mensaje}`)}`
        );
    }

    if (copiaExterna.habilitada && copiaExterna.ok) {
        return res.redirect(
            `/backups?exito=${encodeURIComponent(`${mensajeExito}. Copia externa creada.`)}`
        );
    }

    return res.redirect(`/backups?exito=${encodeURIComponent(mensajeExito)}`);
}

function abrirCarpetaBackups(req, res) {
    const resultado = backupsService.abrirCarpetaBackups();

    if (!resultado.ok) {
        return res.redirect(`/backups?error=${encodeURIComponent(resultado.mensaje)}`);
    }

    return res.redirect(`/backups?exito=${encodeURIComponent(resultado.mensaje)}`);
}

function descargarBackup(req, res) {
    const rutaBackup = backupsService.obtenerRutaBackupDescarga(req.params.archivo);

    if (!rutaBackup) {
        return res.status(404).render('layouts/main', {
            layout: false,
            titulo: 'Backup no encontrado',
            contenido: `
                <section class="page-card">
                    <h1>Backup no encontrado</h1>
                    <p>El archivo solicitado no existe o no es válido.</p>
                    <a href="/backups" class="btn-primary">Volver a backups</a>
                </section>
            `,
        });
    }

    return res.download(rutaBackup);
}

module.exports = {
    mostrarBackups,
    crearBackupManual,
    abrirCarpetaBackups,
    descargarBackup,
};