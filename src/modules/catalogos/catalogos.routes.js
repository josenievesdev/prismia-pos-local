const express = require('express');

const catalogosController = require('./catalogos.controller');
const { requiereAutenticacion } = require('../../middlewares/auth.middleware');
const { requiereRol } = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(requiereAutenticacion);
router.use(requiereRol('administrador', 'cajero'));

router.get('/departamentos/buscar', catalogosController.buscarDepartamentos);

router.get('/municipios/buscar', catalogosController.buscarMunicipios);
router.get('/municipios/:codigo', catalogosController.obtenerMunicipio);

module.exports = router;