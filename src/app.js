const express = require('express');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');

const env = require('./config/env');
const empresa = require('./config/empresa');
const localsMiddleware = require('./middlewares/locals.middleware');
const errorMiddleware = require('./middlewares/error.middleware');

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

const app = express();

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

app.use(morgan('dev'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
    session({
        name: 'prismia.sid',
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
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Variables disponibles en todas las vistas
 */
app.use(localsMiddleware);

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