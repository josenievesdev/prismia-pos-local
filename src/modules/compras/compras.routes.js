const express = require('express');

const comprasController = require('./compras.controller');
const { requiereAutenticacion } = require('../../middlewares/auth.middleware');
const { requiereRol } = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(requiereAutenticacion);
router.use(requiereRol('administrador'));

router.get('/', comprasController.listarCompras);

module.exports = router;