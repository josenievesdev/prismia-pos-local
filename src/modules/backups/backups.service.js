const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');

const db = require('../../config/db');
const env = require('../../config/env');
const empresa = require('../../config/empresa');

const raizProyecto = process.cwd();
const carpetaBackupsBase = path.resolve(raizProyecto, env.backups?.baseDir || 'storage/backups');
const carpetaBackupsManuales = path.join(carpetaBackupsBase, 'manuales');
const carpetaBackupsTemporales = path.join(carpetaBackupsBase, 'tmp');
const carpetaUploadsProductos = path.resolve(raizProyecto, 'src/public/uploads/productos');
const nombreBaseDatos = path.basename(env.db.path || 'prismia_pos_local.sqlite');

function asegurarCarpeta(ruta) {
    if (!fs.existsSync(ruta)) {
        fs.mkdirSync(ruta, { recursive: true });
    }
}

function formatearFechaArchivo(fecha = new Date()) {
    const pad = (valor) => String(valor).padStart(2, '0');

    return [
        fecha.getFullYear(),
        pad(fecha.getMonth() + 1),
        pad(fecha.getDate()),
    ].join('-') + '-' + [
        pad(fecha.getHours()),
        pad(fecha.getMinutes()),
        pad(fecha.getSeconds()),
    ].join('');
}

function formatearFechaHumana(fecha = new Date()) {
    return new Intl.DateTimeFormat('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(fecha);
}

function formatearBytes(bytes = 0) {
    const valor = Number(bytes || 0);

    if (valor < 1024) {
        return `${valor} B`;
    }

    if (valor < 1024 * 1024) {
        return `${(valor / 1024).toFixed(1)} KB`;
    }

    if (valor < 1024 * 1024 * 1024) {
        return `${(valor / 1024 / 1024).toFixed(1)} MB`;
    }

    return `${(valor / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function copiarDirectorio(origen, destino) {
    if (!fs.existsSync(origen)) {
        asegurarCarpeta(destino);
        return;
    }

    asegurarCarpeta(destino);

    const entradas = fs.readdirSync(origen, { withFileTypes: true });

    entradas.forEach((entrada) => {
        const rutaOrigen = path.join(origen, entrada.name);
        const rutaDestino = path.join(destino, entrada.name);

        if (entrada.isDirectory()) {
            copiarDirectorio(rutaOrigen, rutaDestino);
            return;
        }

        if (entrada.isFile()) {
            fs.copyFileSync(rutaOrigen, rutaDestino);
        }
    });
}

function listarArchivosRecursivo(carpetaBase) {
    if (!fs.existsSync(carpetaBase)) {
        return [];
    }

    const archivos = [];

    function recorrer(carpetaActual) {
        const entradas = fs.readdirSync(carpetaActual, { withFileTypes: true });

        entradas.forEach((entrada) => {
            const rutaCompleta = path.join(carpetaActual, entrada.name);

            if (entrada.isDirectory()) {
                recorrer(rutaCompleta);
                return;
            }

            if (entrada.isFile()) {
                archivos.push(rutaCompleta);
            }
        });
    }

    recorrer(carpetaBase);

    return archivos;
}

function calcularSha256Archivo(rutaArchivo) {
    const hash = crypto.createHash('sha256');
    const contenido = fs.readFileSync(rutaArchivo);

    hash.update(contenido);

    return hash.digest('hex');
}

function construirManifest(carpetaTrabajo) {
    const archivos = listarArchivosRecursivo(carpetaTrabajo)
        .filter((rutaArchivo) => path.basename(rutaArchivo) !== 'manifest.json')
        .map((rutaArchivo) => {
            const rutaRelativa = path
                .relative(carpetaTrabajo, rutaArchivo)
                .split(path.sep)
                .join('/');
            const stats = fs.statSync(rutaArchivo);

            return {
                ruta: rutaRelativa,
                sha256: calcularSha256Archivo(rutaArchivo),
                bytes: stats.size,
            };
        })
        .sort((a, b) => a.ruta.localeCompare(b.ruta));

    return {
        generado_en: new Date().toISOString(),
        total_archivos: archivos.length,
        archivos,
    };
}

function crearZipDesdeCarpeta(carpetaOrigen, rutaDestinoZip) {
    return new Promise((resolve, reject) => {
        const salida = fs.createWriteStream(rutaDestinoZip);
        const archivo = archiver('zip', {
            zlib: { level: 9 },
        });

        salida.on('close', resolve);
        salida.on('error', reject);
        archivo.on('error', reject);

        archivo.pipe(salida);
        archivo.directory(carpetaOrigen, false);
        archivo.finalize();
    });
}

function eliminarDirectorioSeguro(rutaDirectorio) {
    if (!rutaDirectorio || !fs.existsSync(rutaDirectorio)) {
        return;
    }

    fs.rmSync(rutaDirectorio, {
        recursive: true,
        force: true,
    });
}

function obtenerRutaExternaConfigurada() {
    const valor = String(env.backups?.externalPath || '').trim();

    if (!valor) {
        return '';
    }

    return path.resolve(valor);
}

async function copiarBackupExterno(rutaZipLocal, nombreArchivo) {
    const rutaExterna = obtenerRutaExternaConfigurada();

    if (!rutaExterna) {
        return {
            habilitada: false,
            ok: false,
            ruta: '',
            mensaje: 'No hay ruta externa configurada.',
        };
    }

    try {
        asegurarCarpeta(rutaExterna);

        const destino = path.join(rutaExterna, nombreArchivo);
        fs.copyFileSync(rutaZipLocal, destino);

        return {
            habilitada: true,
            ok: true,
            ruta: destino,
            mensaje: 'Copia externa creada correctamente.',
        };
    } catch (error) {
        return {
            habilitada: true,
            ok: false,
            ruta: rutaExterna,
            mensaje: error.message,
        };
    }
}

async function crearBackupManual() {
    asegurarCarpeta(carpetaBackupsManuales);
    asegurarCarpeta(carpetaBackupsTemporales);

    const fecha = new Date();
    const marcaTiempo = formatearFechaArchivo(fecha);
    const idBackup = `prismia-backup-manual-${marcaTiempo}`;
    const nombreArchivo = `${idBackup}.zip`;
    const carpetaTrabajo = path.join(carpetaBackupsTemporales, idBackup);
    const rutaZipFinal = path.join(carpetaBackupsManuales, nombreArchivo);

    try {
        eliminarDirectorioSeguro(carpetaTrabajo);
        asegurarCarpeta(path.join(carpetaTrabajo, 'database'));
        asegurarCarpeta(path.join(carpetaTrabajo, 'uploads/productos'));

        const rutaBackupSqlite = path.join(carpetaTrabajo, 'database', nombreBaseDatos);

        await db.backup(rutaBackupSqlite);

        copiarDirectorio(
            carpetaUploadsProductos,
            path.join(carpetaTrabajo, 'uploads/productos')
        );

        const metadata = {
            app: empresa.software.nombre,
            version: empresa.software.version,
            desarrollador: empresa.software.desarrollador,
            tipo: 'manual',
            fecha_backup: fecha.toISOString(),
            fecha_backup_legible: formatearFechaHumana(fecha),
            incluye: {
                sqlite: true,
                imagenes_productos: true,
            },
            base_datos: {
                archivo: `database/${nombreBaseDatos}`,
            },
            uploads: {
                productos: 'uploads/productos/',
            },
        };

        fs.writeFileSync(
            path.join(carpetaTrabajo, 'metadata.json'),
            JSON.stringify(metadata, null, 2),
            'utf8'
        );

        const manifest = construirManifest(carpetaTrabajo);

        fs.writeFileSync(
            path.join(carpetaTrabajo, 'manifest.json'),
            JSON.stringify(manifest, null, 2),
            'utf8'
        );

        await crearZipDesdeCarpeta(carpetaTrabajo, rutaZipFinal);

        const stats = fs.statSync(rutaZipFinal);
        const copiaExterna = await copiarBackupExterno(rutaZipFinal, nombreArchivo);

        eliminarDirectorioSeguro(carpetaTrabajo);

        return {
            ok: true,
            mensaje: 'Backup manual creado correctamente.',
            backup: {
                archivo: nombreArchivo,
                ruta: rutaZipFinal,
                fecha,
                fecha_legible: formatearFechaHumana(fecha),
                bytes: stats.size,
                tamano: formatearBytes(stats.size),
                total_archivos: manifest.total_archivos,
                copia_externa: copiaExterna,
            },
        };
    } catch (error) {
        eliminarDirectorioSeguro(carpetaTrabajo);

        return {
            ok: false,
            mensaje: `No se pudo crear el backup: ${error.message}`,
        };
    }
}

function listarBackupsManuales() {
    asegurarCarpeta(carpetaBackupsManuales);

    return fs
        .readdirSync(carpetaBackupsManuales, { withFileTypes: true })
        .filter((entrada) => entrada.isFile() && entrada.name.endsWith('.zip'))
        .map((entrada) => {
            const ruta = path.join(carpetaBackupsManuales, entrada.name);
            const stats = fs.statSync(ruta);

            return {
                archivo: entrada.name,
                tipo: entrada.name.includes('-manual-') ? 'Manual' : 'Backup',
                fecha: stats.mtime,
                fecha_legible: formatearFechaHumana(stats.mtime),
                bytes: stats.size,
                tamano: formatearBytes(stats.size),
                ruta,
            };
        })
        .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
}

function obtenerEstadoBackups() {
    const backups = listarBackupsManuales();
    const rutaExterna = obtenerRutaExternaConfigurada();

    return {
        backups,
        total: backups.length,
        ultimo: backups[0] || null,
        rutas: {
            internos: carpetaBackupsManuales,
            externa_configurada: rutaExterna,
            externa_activa: Boolean(rutaExterna),
        },
    };
}

function obtenerRutaBackupDescarga(nombreArchivo) {
    const archivoSeguro = path.basename(String(nombreArchivo || ''));

    if (!archivoSeguro.endsWith('.zip')) {
        return null;
    }

    const ruta = path.resolve(carpetaBackupsManuales, archivoSeguro);
    const carpetaSegura = path.resolve(carpetaBackupsManuales);

    if (!ruta.startsWith(`${carpetaSegura}${path.sep}`)) {
        return null;
    }

    if (!fs.existsSync(ruta)) {
        return null;
    }

    return ruta;
}

module.exports = {
    crearBackupManual,
    obtenerEstadoBackups,
    obtenerRutaBackupDescarga,
};