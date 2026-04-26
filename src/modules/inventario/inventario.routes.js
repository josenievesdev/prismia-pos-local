const express = require('express');
const multer = require('multer');

const inventarioController = require('./inventario.controller');
const { requiereAutenticacion } = require('../../middlewares/auth.middleware');
const { requiereRol } = require('../../middlewares/role.middleware');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, callback) => {
        const nombre = String(file.originalname || '').toLowerCase();

        if (!nombre.endsWith('.xlsx')) {
            return callback(null, false);
        }

        return callback(null, true);
    },
});

router.use(requiereAutenticacion);
router.use(requiereRol('administrador', 'inventario'));

router.get('/', inventarioController.mostrarInventario);
router.get('/historial', inventarioController.mostrarHistorial);

router.get('/conteos', inventarioController.listarConteos);
router.get('/conteos/nuevo', inventarioController.mostrarFormularioNuevoConteo);
router.post('/conteos/nuevo', inventarioController.crearConteo);

router.get(
    '/conteos/:id/exportar-diferencias',
    inventarioController.exportarDiferenciasConteo
);

router.get(
    '/conteos/:id/exportar-plantilla',
    inventarioController.exportarPlantillaConteo
);

router.post(
    '/conteos/:id/importar-plantilla',
    upload.single('archivo_conteo'),
    inventarioController.importarPlantillaConteo
);

router.get('/conteos/:id/diferencias', inventarioController.verDiferenciasConteo);
router.get('/conteos/:id', inventarioController.verConteo);

router.post('/conteos/:id/guardar', inventarioController.guardarCantidadesConteo);
router.post('/conteos/:id/aplicar', inventarioController.aplicarConteo);

router.get('/:id/ajuste', inventarioController.mostrarFormularioAjuste);
router.post('/:id/ajuste', inventarioController.procesarAjuste);

module.exports = router;