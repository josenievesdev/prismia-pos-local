const fs = require('fs');
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const SQLiteSessionStore = require('./config/sqlite-session-store');

const env = require('./config/env');
const empresa = require('./config/empresa');
const runtimePaths = require('./config/runtime-paths');
const localsMiddleware = require('./middlewares/locals.middleware');
const errorMiddleware = require('./middlewares/error.middleware');

const setupRoutes = require('./modules/setup/setup.routes');
const setupService = require('./modules/setup/setup.service');
const authRoutes = require('./modules/auth/auth.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const configuracionRoutes = require('./modules/configuracion/configuracion.routes');
const categoriasRoutes = require('./modules/categorias-productos/categorias.routes');
const productosRoutes = require('./modules/productos/productos.routes');
const inventarioRoutes = require('./modules/inventario/inventario.routes');
const cajaRoutes = require('./modules/caja/caja.routes');
const ventasRoutes = require('./modules/ventas/ventas.routes');
const clientesRoutes = require('./modules/clientes/clientes.routes');
const cotizacionesRoutes = require('./modules/cotizaciones/cotizaciones.routes');
const remisionesRoutes = require('./modules/remisiones/remisiones.routes');
const notasCreditoRoutes = require('./modules/notasCredito/notasCredito.routes');
const reportesRoutes = require('./modules/reportes/reportes.routes');
const catalogosRoutes = require('./modules/catalogos/catalogos.routes');
const backupsRoutes = require('./modules/backups/backups.routes');
const usuariosRoutes = require('./modules/usuarios/usuarios.routes');
const proveedoresRoutes = require('./modules/proveedores/proveedores.routes');
const comprasRoutes = require('./modules/compras/compras.routes');

const app = express();

app.locals.restauracionPendiente = false;

/**
 * Configuración del motor de vistas
 */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(expressLayouts);
app.set('layout', 'layouts/app');

/**
 * Middlewares globales
 */
app.use(
    helmet({
        contentSecurityPolicy: false,
    })
);

if (!env.app.isProduction) {
    app.use(morgan('dev'));
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
    session({
        name: 'prismia.sid',
        store: new SQLiteSessionStore({
            ttlMs: 1000 * 60 * 60 * 8,
        }),
        secret: env.session.secret,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: 'lax',
            secure: false,
            maxAge: 1000 * 60 * 60 * 8,
        },
    })
);

/**
 * Archivos públicos
 */
runtimePaths.asegurarCarpetasRuntime();

app.use('/uploads', express.static(runtimePaths.obtenerCarpetaUploadsPublicos()));
app.use(express.static(path.join(__dirname, 'public')));

function renderPantallaReinicioPendiente(res) {
    return res.status(503).send(`
        <!doctype html>
        <html lang="es">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Reinicio requerido · Prismia POS Local</title>
            <style>
                :root {
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
                    background: rgba(245, 158, 11, 0.13);
                    color: #b45309;
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
                <div class="badge">!</div>

                <h1>Reinicio requerido</h1>

                <p>
                    La restauración ya fue aplicada y la conexión SQLite fue cerrada para proteger la base de datos.
                </p>

                <div class="warning">
                    <strong>No sigas usando esta ventana.</strong><br>
                    Prismia necesita reiniciarse para abrir nuevamente la base restaurada.
                </div>

                <div class="meta">
                    <div>
                        <strong>En desarrollo:</strong>
                        si nodemon no reinicia solo, escribe <code>rs</code> en la terminal.
                    </div>
                    <div>
                        <strong>Alternativa:</strong>
                        presiona <code>Ctrl + C</code> y ejecuta <code>npm run dev:https</code>.
                    </div>
                </div>
            </main>
        </body>
        </html>
    `);
}

/**
 * Bloqueo seguro después de restaurar.
 * Evita errores 500 cuando la base ya fue cerrada y el proceso aún no reinicia.
 */
app.use((req, res, next) => {
    if (!app.locals.restauracionPendiente) {
        return next();
    }

    const rutasPermitidas = [
        '/__restauracion-finalizada',
        '/favicon.ico',
    ];

    if (rutasPermitidas.includes(req.path)) {
        return next();
    }

    if (
        req.path.startsWith('/css/') ||
        req.path.startsWith('/js/') ||
        req.path.startsWith('/img/') ||
        req.path.startsWith('/uploads/')
    ) {
        return next();
    }

    return renderPantallaReinicioPendiente(res);
});

/**
 * Variables disponibles en todas las vistas
 */
app.use(localsMiddleware);

/**
 * Configuración inicial del primer administrador.
 */
app.use('/setup', setupRoutes);

app.use((req, res, next) => {
    const rutasPermitidas = [
        '/setup',
        '/setup/',
        '/salud',
        '/favicon.ico',
    ];

    if (rutasPermitidas.includes(req.path)) {
        return next();
    }

    if (
        req.path.startsWith('/css/') ||
        req.path.startsWith('/js/') ||
        req.path.startsWith('/img/') ||
        req.path.startsWith('/uploads/')
    ) {
        return next();
    }

    if (setupService.requiereConfiguracionInicial()) {
        return res.redirect('/setup');
    }

    return next();
});

/**
 * Ruta técnica para finalizar restauración.
 * En desarrollo escribe un archivo dentro de src para que nodemon reinicie.
 */
app.get('/__restauracion-finalizada', (req, res) => {
    app.locals.restauracionPendiente = true;

    res.status(204).end();

    setTimeout(() => {
        try {
            fs.writeFileSync(
                path.resolve(process.cwd(), 'src/restart-dev-trigger.json'),
                JSON.stringify({
                    motivo: 'restauracion_backup',
                    fecha: new Date().toISOString(),
                }, null, 2),
                'utf8'
            );
        } catch (error) {
            console.warn('No se pudo marcar reinicio técnico:', error.message);
        }
    }, 300);
});

/**
 * Ruta de salud del sistema
 */
app.get('/salud', (req, res) => {
    res.status(200).json({
        ok: true,
        app: empresa.software.nombre,
        version: empresa.software.version,
        desarrollador: empresa.software.desarrollador,
        entorno: env.app.nodeEnv,
        mensaje: 'Servidor funcionando correctamente',
    });
});

/**
 * Ruta principal
 */
app.get('/', (req, res) => {
    res.redirect('/dashboard');
});

/**
 * Rutas de módulos
 */
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/configuracion', configuracionRoutes);
app.use('/categorias-productos', categoriasRoutes);
app.use('/productos', productosRoutes);
app.use('/inventario', inventarioRoutes);
app.use('/caja', cajaRoutes);
app.use('/ventas', ventasRoutes);
app.use('/clientes', clientesRoutes);
app.use('/cotizaciones', cotizacionesRoutes);
app.use('/remisiones', remisionesRoutes);
app.use('/notas-credito', notasCreditoRoutes);
app.use('/reportes', reportesRoutes);
app.use('/catalogos', catalogosRoutes);
app.use('/backups', backupsRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/proveedores', proveedoresRoutes);
app.use('/compras', comprasRoutes);

/**
 * Ruta 404
 */
app.use((req, res) => {
    res.status(404).render('layouts/main', {
        layout: false,
        titulo: 'Página no encontrada',
        contenido: `
      <section class="page-card">
        <h1>404</h1>
        <p>La página que intentas abrir no existe.</p>
        <a href="/dashboard" class="btn-primary">Volver al dashboard</a>
      </section>
    `,
    });
});

/**
 * Manejador global de errores
 */
app.use(errorMiddleware);

module.exports = app;