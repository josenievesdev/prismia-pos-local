const express = require('express');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');

const EXTENSIONES_IMAGEN = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
};

const productosController = require('./productos.controller');
const runtimePaths = require('../../config/runtime-paths');
const { requiereAutenticacion } = require('../../middlewares/auth.middleware');
const { requiereRol } = require('../../middlewares/role.middleware');

const router = express.Router();

const carpetaUploadsProductos = runtimePaths.obtenerCarpetaUploadsProductos();

if (!fs.existsSync(carpetaUploadsProductos)) {
    fs.mkdirSync(carpetaUploadsProductos, { recursive: true });
}

const almacenamientoImagenProducto = multer.diskStorage({
    destination: function (_req, _file, callback) {
        callback(null, carpetaUploadsProductos);
    },
    filename: function (_req, file, callback) {
        // La extensión sale del tipo validado, nunca del nombre que envía el
        // cliente: así no se puede subir un .html disfrazado de imagen.
        const extension = EXTENSIONES_IMAGEN[file.mimetype] || '.img';
        const nombreSeguro = `producto-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`;

        callback(null, nombreSeguro);
    },
});

const uploadImagenProducto = multer({
    storage: almacenamientoImagenProducto,
    limits: {
        fileSize: 2 * 1024 * 1024,
    },
    fileFilter: function (_req, file, callback) {
        if (!EXTENSIONES_IMAGEN[file.mimetype]) {
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