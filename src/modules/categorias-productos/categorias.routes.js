const express = require('express');
const categoriasController = require('./categorias.controller');
const { requiereAutenticacion } = require('../../middlewares/auth.middleware');
const { requiereRol } = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(requiereAutenticacion);
router.use(requiereRol('administrador', 'inventario'));

router.get('/', categoriasController.listarCategorias);

router.get('/nueva', categoriasController.mostrarFormularioCrear);
router.post('/nueva', categoriasController.crearCategoria);

router.get('/:id/editar', categoriasController.mostrarFormularioEditar);
router.post('/:id/editar', categoriasController.actualizarCategoria);

router.post('/:id/activar', categoriasController.activarCategoria);
router.post('/:id/desactivar', categoriasController.desactivarCategoria);

module.exports = router;