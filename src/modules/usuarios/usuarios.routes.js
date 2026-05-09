const express = require('express');

const usuariosController = require('./usuarios.controller');
const { requiereAutenticacion } = require('../../middlewares/auth.middleware');
const { requiereRol } = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(requiereAutenticacion);
router.use(requiereRol('administrador'));

router.get('/', usuariosController.listarUsuarios);

router.get('/nuevo', usuariosController.mostrarFormularioCrear);
router.post('/nuevo', usuariosController.crearUsuario);

router.get('/:id/editar', usuariosController.mostrarFormularioEditar);
router.post('/:id/editar', usuariosController.actualizarUsuario);

router.post('/:id/activar', usuariosController.activarUsuario);
router.post('/:id/desactivar', usuariosController.desactivarUsuario);

module.exports = router;