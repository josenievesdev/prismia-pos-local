const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');

const backupsController = require('./backups.controller');
const runtimePaths = require('../../config/runtime-paths');
const { requiereAutenticacion } = require('../../middlewares/auth.middleware');
const { requiereRol } = require('../../middlewares/role.middleware');

const router = express.Router();

const carpetaUploadsRestauracion = path.join(
    runtimePaths.obtenerCarpetaBackupsBase(),
    'tmp',
    'uploads-restauracion'
);

function asegurarCarpeta(ruta) {
    if (!fs.existsSync(ruta)) {
        fs.mkdirSync(ruta, { recursive: true });
    }
}

function requiereSoporteBackups(req, res, next) {
    if (req.session?.soporteBackupsAutorizado) {
        return next();
    }

    return res.redirect(
        `/backups/soporte?error=${encodeURIComponent('Debes desbloquear el modo soporte para usar esta acción.')}`
    );
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

router.get('/soporte', backupsController.mostrarBackupsSoporte);
router.post('/soporte/desbloquear', backupsController.desbloquearSoporteBackups);
router.post('/soporte/cerrar', backupsController.cerrarSoporteBackups);

router.post('/soporte/crear', requiereSoporteBackups, backupsController.crearBackupManual);
router.post('/soporte/abrir-carpeta', requiereSoporteBackups, backupsController.abrirCarpetaBackups);
router.post(
    '/soporte/restaurar',
    requiereSoporteBackups,
    uploadRestauracion.single('archivo_backup'),
    backupsController.restaurarBackup
);
router.get('/soporte/descargar/:archivo', requiereSoporteBackups, backupsController.descargarBackup);

module.exports = router;