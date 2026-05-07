const express = require('express');

const backupsController = require('./backups.controller');
const { requiereAutenticacion } = require('../../middlewares/auth.middleware');
const { requiereRol } = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(requiereAutenticacion);
router.use(requiereRol('administrador'));

router.get('/', backupsController.mostrarBackups);
router.post('/crear', backupsController.crearBackupManual);
router.post('/abrir-carpeta', backupsController.abrirCarpetaBackups);
router.get('/descargar/:archivo', backupsController.descargarBackup);

module.exports = router;