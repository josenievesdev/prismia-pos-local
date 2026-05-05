const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const productosController = require('./productos.controller');
const { requiereAutenticacion } = require('../../middlewares/auth.middleware');
const { requiereRol } = require('../../middlewares/role.middleware');

const router = express.Router();

const carpetaUploadsProductos = path.join(
    __dirname,
    '../../public/uploads/productos'
);

if (!fs.existsSync(carpetaUploadsProductos)) {
    fs.mkdirSync(carpetaUploadsProductos, { recursive: true });
}

const almacenamientoImagenProducto = multer.diskStorage({
    destination: function (_req, _file, callback) {
        callback(null, carpetaUploadsProductos);
    },
    filename: function (_req, file, callback) {
        const extension = path.extname(file.originalname || '').toLowerCase();
        const nombreSeguro = `producto-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

        callback(null, nombreSeguro);
    },
});

const uploadImagenProducto = multer({
    storage: almacenamientoImagenProducto,
    limits: {
        fileSize: 2 * 1024 * 1024,
    },
    fileFilter: function (_req, file, callback) {
        const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

        if (!tiposPermitidos.includes(file.mimetype)) {
            return callback(
                new Error('La imagen del producto debe ser JPG, PNG o WEBP.')
            );
        }

        return callback(null, true);
    },
});

router.use(requiereAutenticacion);
router.use(requiereRol('administrador', 'inventario'));

router.get('/', productosController.listarProductos);

router.get('/nuevo', productosController.mostrarFormularioCrear);
router.post(
    '/nuevo',
    uploadImagenProducto.single('imagen_producto'),
    productosController.crearProducto
);

router.get('/:id/editar', productosController.mostrarFormularioEditar);
router.post(
    '/:id/editar',
    uploadImagenProducto.single('imagen_producto'),
    productosController.actualizarProducto
);

router.post('/:id/activar', productosController.activarProducto);
router.post('/:id/desactivar', productosController.desactivarProducto);

module.exports = router;