const dotenv = require('dotenv');

dotenv.config();

const runtimeSecrets = require('./runtime-secrets');

const nodeEnv = process.env.NODE_ENV || 'development';
const esProduccion = nodeEnv === 'production';

function limpiarValor(valor) {
    return String(valor || '').trim();
}

function obtenerValor(nombreVariable, valorDesarrollo = '') {
    const valor = limpiarValor(process.env[nombreVariable]);

    if (valor) {
        return valor;
    }

    return esProduccion ? '' : valorDesarrollo;
}

function obtenerValorSeguro(nombreVariable, obtenerValorRuntime, valorDesarrollo = '') {
    const valor = limpiarValor(process.env[nombreVariable]);

    if (valor) {
        return valor;
    }

    if (typeof obtenerValorRuntime === 'function') {
        return limpiarValor(obtenerValorRuntime());
    }

    return valorDesarrollo;
}

function valorEsPlaceholder(valor) {
    const valorNormalizado = limpiarValor(valor).toLowerCase();

    if (!valorNormalizado) {
        return true;
    }

    const placeholders = new Set([
        'admin12345',
        'prismia_pos_local_dev_secret',
        'cambia_este_valor_en_produccion',
        'cambia_esta_contrasena',
        'cambia-esta-clave-tecnica',
    ]);

    return placeholders.has(valorNormalizado)
        || valorNormalizado.includes('cambia_')
        || valorNormalizado.includes('cambia-')
        || valorNormalizado.includes('change_me')
        || valorNormalizado.includes('changeme');
}

const env = {
    app: {
        name: process.env.APP_NAME || 'Prismia POS Local',
        port: Number(process.env.APP_PORT) || 3000,
        nodeEnv,
        isProduction: esProduccion,
    },

    db: {
        client: process.env.DB_CLIENT || 'sqlite',
        name: process.env.DB_NAME || 'prismia_pos_local',
        path: process.env.DB_PATH || 'src/database/data/prismia_pos_local.sqlite',
    },

    session: {
        secret: obtenerValorSeguro(
            'SESSION_SECRET',
            runtimeSecrets.obtenerSessionSecret,
            'prismia_pos_local_dev_secret'
        ),
    },

    backups: {
        baseDir: process.env.BACKUP_BASE_DIR || 'storage/backups',
        externalPath: process.env.BACKUP_EXTERNAL_PATH || '',
        supportKey: obtenerValorSeguro(
            'SUPPORT_BACKUP_KEY',
            runtimeSecrets.obtenerSupportBackupKey,
            ''
        ),
        supportContactName: process.env.SUPPORT_CONTACT_NAME || 'Nieves Systems',
        supportContactEmail: process.env.SUPPORT_CONTACT_EMAIL || 'soporte@tudominio.com',
        supportContactPhone: process.env.SUPPORT_CONTACT_PHONE || '',
        scheduledIntervalDays: Number(process.env.BACKUP_SCHEDULED_INTERVAL_DAYS || 7),
        retentionAutomaticos: Number(process.env.BACKUP_RETENTION_AUTOMATICOS || 30),
        retentionProgramados: Number(process.env.BACKUP_RETENTION_PROGRAMADOS || 8),
        retentionEmergencia: Number(process.env.BACKUP_RETENTION_EMERGENCIA || 10),
    },

    admin: {
        name: process.env.ADMIN_NAME || 'Administrador',
        email: process.env.ADMIN_EMAIL || 'admin@prismia.local',
        password: obtenerValor('ADMIN_PASSWORD', 'Admin12345'),
    },
};

function validarConfigProduccion() {
    if (!esProduccion) {
        return;
    }

    const errores = [];

    if (valorEsPlaceholder(env.session.secret) || env.session.secret.length < 24) {
        errores.push('SESSION_SECRET debe existir y tener un valor seguro de mínimo 24 caracteres.');
    }

    if (valorEsPlaceholder(env.admin.password) || env.admin.password.length < 10) {
        errores.push('ADMIN_PASSWORD debe estar configurado con una contraseña inicial única de mínimo 10 caracteres.');
    }

    if (valorEsPlaceholder(env.backups.supportKey) || env.backups.supportKey.length < 12) {
        errores.push('SUPPORT_BACKUP_KEY debe existir y tener una clave técnica única de mínimo 12 caracteres.');
    }

    if (errores.length > 0) {
        throw new Error([
            'Configuración insegura para producción.',
            ...errores,
            'Corrige las variables de entorno o los secretos runtime antes de iniciar Prismia en producción.',
        ].join('\n'));
    }
}

env.seguridad = {
    validarConfigProduccion,
};

module.exports = env;