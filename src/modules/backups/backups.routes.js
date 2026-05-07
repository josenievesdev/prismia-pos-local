const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');

const backupsController = require('./backups.controller');
const { requiereAutenticacion } = require('../../middlewares/auth.middleware');
const { requiereRol } = require('../../middlewares/role.middleware');

const router = express.Router();

const carpetaUploadsRestauracion = path.resolve(
    process.cwd(),
    'storage/backups/tmp/uploads-restauracion'
);

function asegurarCarpeta(ruta) {
    if (!fs.existsSync(ruta)) {
        fs.mkdirSync(ruta, { recursive: true });
    }
}

const storageRestauracion = multer.diskStorage({
    destination: function (req, file, cb) {
        asegurarCarpeta(carpetaUploadsRestauracion);
        cb(null, carpetaUploadsRestauracion);
    },
    filename: function (req, file, cb) {
        const nombreSeguro = path.basename(file.originalname || 'backup.zip');
        const marcaTiempo = Date.now();

        cb(null, `${marcaTiempo}-${nombreSeguro}`);
    },
});

const uploadRestauracion = multer({
    storage: storageRestauracion,
    limits: {
        fileSize: 1024 * 1024 * 1024,
    },
});

router.use(requiereAutenticacion);
router.use(requiereRol('administrador'));

router.get('/', backupsController.mostrarBackups);
router.post('/crear', backupsController.crearBackupManual);
router.post('/abrir-carpeta', backupsController.abrirCarpetaBackups);
router.post('/restaurar', uploadRestauracion.single('archivo_backup'), backupsController.restaurarBackup);
router.get('/descargar/:archivo', backupsController.descargarBackup);

module.exports = router;