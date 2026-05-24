const fs = require('fs');

const backupsService = require('./backups.service');
const env = require('../../config/env');

const estilosBackups = ['/css/modules/backups.css'];

function obtenerContactoSoporte() {
    return {
        nombre: env.backups.supportContactName || 'Nieves Systems',
        correo: env.backups.supportContactEmail || 'soporte@tudominio.com',
        telefono: env.backups.supportContactPhone || '',
    };
}

function usuarioTieneSoporteBackups(req) {
    return Boolean(req.session?.soporteBackupsAutorizado);
}

function renderBackupsPublico(res, opciones = {}) {
    const estado = backupsService.obtenerEstadoBackups();

    return res.render('backups/index', {
        titulo: 'Backups',
        backups: estado.backups,
        totalBackups: estado.total,
        ultimoBackup: estado.ultimo,
        rutasBackups: estado.rutas,
        contactoSoporte: obtenerContactoSoporte(),
        exito: opciones.exito || '',
        alerta: opciones.alerta || '',
        error: opciones.error || '',
        estilosModulo: estilosBackups,
    });
}

function renderBackupsSoporte(req, res, opciones = {}) {
    const estado = backupsService.obtenerEstadoBackups();

    return res.render('backups/soporte', {
        titulo: 'Backups · Soporte',
        backups: estado.backups,
        totalBackups: estado.total,
        ultimoBackup: estado.ultimo,
        rutasBackups: estado.rutas,
        contactoSoporte: obtenerContactoSoporte(),
        soporteAutorizado: usuarioTieneSoporteBackups(req),
        exito: opciones.exito || '',
        alerta: opciones.alerta || '',
        error: opciones.error || '',
        estilosModulo: estilosBackups,
    });
}

function mostrarBackups(req, res) {
    return res.redirect('/dashboard');
}

function mostrarBackupsSoporte(req, res) {
    return renderBackupsSoporte(req, res, {
        exito: req.query.exito || '',
        alerta: req.query.alerta || '',
        error: req.query.error || '',
    });
}

function desbloquearSoporteBackups(req, res) {
    const claveIngresada = String(req.body.clave_soporte || '').trim();
    const claveConfigurada = String(env.backups.supportKey || '').trim();

    if (!claveConfigurada) {
        return res.redirect(
            `/backups/soporte?error=${encodeURIComponent('No hay clave técnica de soporte configurada.')}`
        );
    }

    if (!claveIngresada || claveIngresada !== claveConfigurada) {
        return res.redirect(
            `/backups/soporte?error=${encodeURIComponent('Clave técnica incorrecta.')}`
        );
    }

    req.session.soporteBackupsAutorizado = true;

    return res.redirect(
        `/backups/soporte?exito=${encodeURIComponent('Modo soporte desbloqueado correctamente.')}`
    );
}

function cerrarSoporteBackups(req, res) {
    if (req.session) {
        req.session.soporteBackupsAutorizado = false;
    }

    return res.redirect('/dashboard');
}

async function crearBackupManual(req, res) {
    const resultado = await backupsService.crearBackupManual();

    if (!resultado.ok) {
        return res.redirect(`/backups/soporte?error=${encodeURIComponent(resultado.mensaje)}`);
    }

    const copiaExterna = resultado.backup.copia_externa;
    const mensajeExito = `${resultado.mensaje} Archivo: ${resultado.backup.archivo}`;

    if (copiaExterna.habilitada && !copiaExterna.ok) {
        return res.redirect(
            `/backups/soporte?exito=${encodeURIComponent(mensajeExito)}&alerta=${encodeURIComponent(`No se pudo crear la copia externa: ${copiaExterna.mensaje}`)}`
        );
    }

    if (copiaExterna.habilitada && copiaExterna.ok) {
        return res.redirect(
            `/backups/soporte?exito=${encodeURIComponent(`${mensajeExito}. Copia externa creada.`)}`
        );
    }

    return res.redirect(`/backups/soporte?exito=${encodeURIComponent(mensajeExito)}`);
}

function abrirCarpetaBackups(req, res) {
    const resultado = backupsService.abrirCarpetaBackups();

    if (!resultado.ok) {
        return res.redirect(`/backups/soporte?error=${encodeURIComponent(resultado.mensaje)}`);
    }

    return res.redirect(`/backups/soporte?exito=${encodeURIComponent(resultado.mensaje)}`);
}

function renderRestauracionCompletada(res, resultado) {
    return res.status(200).send(`
        <!doctype html>
        <html lang="es">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Restauración completada · Prismia POS Local</title>
            <style>
                :root {
                    color-scheme: light;
                    font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    background: #f8fafc;
                    color: #0f172a;
                }

                * {
                    box-sizing: border-box;
                }

                body {
                    min-height: 100vh;
                    margin: 0;
                    display: grid;
                    place-items: center;
                    padding: 24px;
                    background:
                        radial-gradient(circle at top left, rgba(79, 70, 229, 0.12), transparent 34%),
                        linear-gradient(135deg, #f8fafc, #eef2ff);
                }

                .card {
                    width: min(620px, 100%);
                    padding: 30px;
                    border: 1px solid rgba(226, 232, 240, 0.95);
                    border-radius: 24px;
                    background: rgba(255, 255, 255, 0.96);
                    box-shadow: 0 24px 80px rgba(15, 23, 42, 0.16);
                }

                .badge {
                    width: 46px;
                    height: 46px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 999px;
                    background: rgba(34, 197, 94, 0.12);
                    color: #15803d;
                    font-size: 24px;
                    font-weight: 900;
                    margin-bottom: 16px;
                }

                h1 {
                    margin: 0 0 10px;
                    font-size: 26px;
                    letter-spacing: -0.03em;
                }

                p {
                    margin: 0 0 14px;
                    color: #475569;
                    line-height: 1.6;
                    font-size: 15px;
                }

                .warning {
                    margin-top: 18px;
                    padding: 14px 16px;
                    border: 1px solid rgba(245, 158, 11, 0.26);
                    border-radius: 16px;
                    background: rgba(255, 251, 235, 0.92);
                    color: #78350f;
                    font-size: 14px;
                    line-height: 1.55;
                }

                .meta {
                    margin-top: 18px;
                    display: grid;
                    gap: 8px;
                    padding: 14px 16px;
                    border-radius: 16px;
                    background: #f8fafc;
                    border: 1px solid rgba(226, 232, 240, 0.9);
                    font-size: 13px;
                    color: #334155;
                }

                .meta strong {
                    color: #0f172a;
                }

                code {
                    padding: 2px 6px;
                    border-radius: 8px;
                    background: rgba(15, 23, 42, 0.06);
                    color: #334155;
                }
            </style>
        </head>
        <body>
            <main class="card">
                <div class="badge">✓</div>

                <h1>Restauración completada</h1>

                <p>
                    El backup fue validado, se creó un respaldo de emergencia y los datos fueron restaurados correctamente.
                </p>

                <div class="warning">
                    <strong>Prismia está aplicando la restauración.</strong><br>
                    La conexión SQLite fue cerrada para restaurar la base de datos. No sigas usando esta ventana.
                    En desarrollo, el servidor intentará reiniciarse automáticamente.
                </div>

                <div class="meta">
                    <div>
                        <strong>Backup de emergencia:</strong>
                        <code>${resultado.backup_emergencia.archivo}</code>
                    </div>

                    <div>
                        <strong>En desarrollo:</strong>
                        espera unos segundos. Si nodemon queda en espera, escribe <code>rs</code> en la terminal.
                    </div>

                    <div>
                        <strong>En Electron:</strong>
                        más adelante este paso será un botón de reinicio de la app.
                    </div>
                </div>
            </main>

            <script>
                setTimeout(function () {
                    fetch('/__restauracion-finalizada').catch(function () {});
                }, 600);
            </script>
        </body>
        </html>
    `);
}

async function restaurarBackup(req, res) {
    if (!req.file) {
        return res.redirect('/backups/soporte?error=Selecciona un archivo ZIP de backup.');
    }

    if (req.body.confirmar_restauracion !== '1') {
        try {
            fs.rmSync(req.file.path, { force: true });
        } catch (error) {
            console.warn('No se pudo eliminar ZIP temporal:', error.message);
        }

        return res.redirect(
            '/backups/soporte?error=Debes confirmar que entiendes que la restauración reemplazará los datos actuales.'
        );
    }

    const resultado = await backupsService.restaurarBackupDesdeArchivo(req.file.path);

    if (!resultado.ok) {
        return res.redirect(`/backups/soporte?error=${encodeURIComponent(resultado.mensaje)}`);
    }

    return renderRestauracionCompletada(res, resultado);
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
                    <a href="/backups/soporte" class="btn-primary">Volver a soporte</a>
                </section>
            `,
        });
    }

    return res.download(rutaBackup);
}

module.exports = {
    mostrarBackups,
    mostrarBackupsSoporte,
    desbloquearSoporteBackups,
    cerrarSoporteBackups,
    crearBackupManual,
    abrirCarpetaBackups,
    restaurarBackup,
    descargarBackup,
};