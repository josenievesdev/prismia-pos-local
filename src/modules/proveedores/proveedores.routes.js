const express = require('express');

const proveedoresController = require('./proveedores.controller');
const { requiereAutenticacion } = require('../../middlewares/auth.middleware');
const { requiereRol } = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(requiereAutenticacion);
router.use(requiereRol('administrador'));

router.get('/', proveedoresController.listarProveedores);

router.get('/nuevo', proveedoresController.mostrarFormularioCrear);
router.post('/nuevo', proveedoresController.crearProveedor);

router.get('/:id/editar', proveedoresController.mostrarFormularioEditar);
router.post('/:id/editar', proveedoresController.actualizarProveedor);

router.post('/:id/activar', proveedoresController.activarProveedor);
router.post('/:id/desactivar', proveedoresController.desactivarProveedor);

module.exports = router;