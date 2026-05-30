const { app, BrowserWindow, dialog } = require('electron');
const http = require('http');

const appEvents = require('../src/config/app-events');

const PUERTO_ELECTRON = Number(process.env.PRISMIA_ELECTRON_PORT || 3210);
const URL_LOCAL = `http://localhost:${PUERTO_ELECTRON}`;

let ventanaPrincipal = null;
let servidorBackend = null;
let reinicioElectronEnCurso = false;

function configurarEntornoPrismia() {
    process.env.NODE_ENV = 'production';
    process.env.APP_PORT = String(PUERTO_ELECTRON);
    process.env.PRISMIA_ELECTRON = 'true';

    if (!process.env.APP_NAME) {
        process.env.APP_NAME = 'Prismia POS Local';
    }
}

function esperarServidorDisponible(url, intentosMaximos = 80) {
    return new Promise((resolve, reject) => {
        let intentos = 0;

        function intentar() {
            intentos += 1;

            const solicitud = http.get(url, (respuesta) => {
                respuesta.resume();
                resolve();
            });

            solicitud.on('error', () => {
                if (intentos >= intentosMaximos) {
                    reject(new Error(`No se pudo conectar con Prismia en ${url}`));
                    return;
                }

                setTimeout(intentar, 250);
            });

            solicitud.setTimeout(1000, () => {
                solicitud.destroy();
            });
        }

        intentar();
    });
}

async function iniciarBackendPrismia() {
    configurarEntornoPrismia();

    try {
        const servidor = require('../src/server');

        if (servidor && typeof servidor.close === 'function') {
            servidorBackend = servidor;
        }
    } catch (error) {
        dialog.showErrorBox(
            'No se pudo iniciar Prismia',
            error && error.stack ? error.stack : String(error)
        );

        app.quit();
        throw error;
    }
}

async function crearVentanaPrincipal() {
    ventanaPrincipal = new BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 1100,
        minHeight: 720,
        show: false,
        title: 'Prismia POS Local',
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    ventanaPrincipal.once('ready-to-show', () => {
        ventanaPrincipal.show();
    });

    ventanaPrincipal.on('closed', () => {
        ventanaPrincipal = null;
    });

    await ventanaPrincipal.loadURL(URL_LOCAL);
}

function cerrarBackendAntesDeRelanzar(callback) {
    let finalizado = false;

    function continuar() {
        if (finalizado) {
            return;
        }

        finalizado = true;
        callback();
    }

    if (!servidorBackend || typeof servidorBackend.close !== 'function') {
        continuar();
        return;
    }

    try {
        servidorBackend.close(() => {
            servidorBackend = null;
            continuar();
        });

        setTimeout(continuar, 1200);
    } catch (error) {
        console.warn('No se pudo cerrar el backend antes de relanzar:', error.message);
        continuar();
    }
}

function relanzarAplicacionPorRestauracion(payload = {}) {
    if (reinicioElectronEnCurso) {
        return;
    }

    reinicioElectronEnCurso = true;

    console.log('Restauración aplicada dentro de Electron.');
    console.log(`Motivo: ${payload.motivo || 'reinicio_solicitado'}`);
    console.log('Relanzando Prismia POS Local...');

    setTimeout(() => {
        cerrarBackendAntesDeRelanzar(() => {
            app.relaunch();
            app.exit(0);
        });
    }, 1200);
}

async function iniciarAplicacion() {
    appEvents.on('prismia:reinicio-solicitado', relanzarAplicacionPorRestauracion);

    await iniciarBackendPrismia();
    await esperarServidorDisponible(URL_LOCAL);
    await crearVentanaPrincipal();
}

app.whenReady().then(iniciarAplicacion);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0 && !reinicioElectronEnCurso) {
        await crearVentanaPrincipal();
    }
});

app.on('before-quit', () => {
    if (reinicioElectronEnCurso) {
        return;
    }

    if (servidorBackend && typeof servidorBackend.close === 'function') {
        servidorBackend.close();
    }
});