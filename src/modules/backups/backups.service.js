const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const SQLite = require('better-sqlite3');

const db = require('../../config/db');
const env = require('../../config/env');
const empresa = require('../../config/empresa');
const runtimePaths = require('../../config/runtime-paths');

const raizProyecto = process.cwd();

const rutaBaseDatosPrincipal = runtimePaths.obtenerRutaBaseDatos();

const carpetaBackupsBase = runtimePaths.obtenerCarpetaBackupsBase();

const rutaLogBackups = path.join(carpetaBackupsBase, 'backup-log.jsonl');

const carpetaBackupsManuales = path.join(carpetaBackupsBase, 'manuales');
const carpetaBackupsAutomaticos = path.join(carpetaBackupsBase, 'automaticos');
const carpetaBackupsProgramados = path.join(carpetaBackupsBase, 'programados');
const carpetaBackupsEmergencia = path.join(carpetaBackupsBase, 'emergencia');
const carpetaBackupsTemporales = path.join(carpetaBackupsBase, 'tmp');
const carpetaRestauracionesTemporales = path.join(carpetaBackupsBase, 'restore-tmp');

const carpetaUploadsProductos = runtimePaths.obtenerCarpetaUploadsProductos();
const nombreBaseDatos = path.basename(rutaBaseDatosPrincipal);

function asegurarCarpeta(ruta) {
    if (!fs.existsSync(ruta)) {
        fs.mkdirSync(ruta, { recursive: true });
    }
}

function asegurarGitkeep(carpeta) {
    asegurarCarpeta(carpeta);

    const rutaGitkeep = path.join(carpeta, '.gitkeep');

    if (!fs.existsSync(rutaGitkeep)) {
        fs.writeFileSync(rutaGitkeep, '', 'utf8');
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

function leerEnteroConfig(valor, defecto, minimo = 1) {
    const numero = Number(valor);

    if (!Number.isFinite(numero) || numero < minimo) {
        return defecto;
    }

    return Math.floor(numero);
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

function copiarDirectorio(origen, destino, opciones = {}) {
    const omitirGitkeep = opciones.omitirGitkeep !== false;

    if (!fs.existsSync(origen)) {
        asegurarCarpeta(destino);
        return;
    }

    asegurarCarpeta(destino);

    const entradas = fs.readdirSync(origen, { withFileTypes: true });

    entradas.forEach((entrada) => {
        if (omitirGitkeep && entrada.name === '.gitkeep') {
            return;
        }

        const rutaOrigen = path.join(origen, entrada.name);
        const rutaDestino = path.join(destino, entrada.name);

        if (entrada.isDirectory()) {
            copiarDirectorio(rutaOrigen, rutaDestino, opciones);
            return;
        }

        if (entrada.isFile()) {
            fs.copyFileSync(rutaOrigen, rutaDestino);
        }
    });
}

function limpiarDirectorioExceptoGitkeep(carpeta) {
    asegurarCarpeta(carpeta);

    const entradas = fs.readdirSync(carpeta, { withFileTypes: true });

    entradas.forEach((entrada) => {
        if (entrada.name === '.gitkeep') {
            return;
        }

        const rutaEntrada = path.join(carpeta, entrada.name);

        fs.rmSync(rutaEntrada, {
            recursive: true,
            force: true,
        });
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

function eliminarArchivoSeguro(rutaArchivo) {
    if (!rutaArchivo || !fs.existsSync(rutaArchivo)) {
        return;
    }

    try {
        fs.rmSync(rutaArchivo, {
            force: true,
        });
    } catch (error) {
        console.warn('No se pudo eliminar archivo temporal:', error.message);
    }
}

function registrarEventoBackup(evento = {}) {
    try {
        asegurarCarpeta(carpetaBackupsBase);

        const registro = {
            fecha: new Date().toISOString(),
            ...evento,
        };

        fs.appendFileSync(
            rutaLogBackups,
            `${JSON.stringify(registro)}\n`,
            'utf8'
        );
    } catch (error) {
        console.warn('No se pudo escribir el log técnico de backups:', error.message);
    }
}

function validarBackupGenerado(rutaZip, idBackup) {
    const carpetaVerificacion = path.join(
        carpetaBackupsTemporales,
        `verificacion-${idBackup}`
    );

    try {
        validarYExtraerBackup(rutaZip, carpetaVerificacion);
    } finally {
        eliminarDirectorioSeguro(carpetaVerificacion);
    }
}

function obtenerConfiguracionRetencion() {
    return {
        automaticos: leerEnteroConfig(env.backups?.retentionAutomaticos, 30, 1),
        programados: leerEnteroConfig(env.backups?.retentionProgramados, 8, 1),
        emergencia: leerEnteroConfig(env.backups?.retentionEmergencia, 10, 1),
    };
}

function eliminarBackupsExcedentes(carpeta, maximoConservar) {
    asegurarCarpeta(carpeta);

    const backups = fs
        .readdirSync(carpeta, { withFileTypes: true })
        .filter((entrada) => entrada.isFile() && entrada.name.endsWith('.zip'))
        .map((entrada) => {
            const ruta = path.join(carpeta, entrada.name);
            const stats = fs.statSync(ruta);

            return {
                archivo: entrada.name,
                ruta,
                fecha: stats.mtime,
            };
        })
        .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

    backups.slice(maximoConservar).forEach((backup) => {
        eliminarArchivoSeguro(backup.ruta);
    });
}

function aplicarRetencionBackups() {
    const retencion = obtenerConfiguracionRetencion();

    eliminarBackupsExcedentes(carpetaBackupsAutomaticos, retencion.automaticos);
    eliminarBackupsExcedentes(carpetaBackupsProgramados, retencion.programados);
    eliminarBackupsExcedentes(carpetaBackupsEmergencia, retencion.emergencia);
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

async function crearBackupCompleto({
    tipo = 'manual',
    prefijo = 'prismia-backup-manual',
    carpetaDestino = carpetaBackupsManuales,
    copiarExterno = true,
    mensajeOk = 'Backup creado correctamente.',
} = {}) {
    asegurarCarpeta(carpetaDestino);
    asegurarCarpeta(carpetaBackupsTemporales);

    const fecha = new Date();
    const marcaTiempo = formatearFechaArchivo(fecha);
    const idBackup = `${prefijo}-${marcaTiempo}`;
    const nombreArchivo = `${idBackup}.zip`;
    const carpetaTrabajo = path.join(carpetaBackupsTemporales, idBackup);
    const rutaZipFinal = path.join(carpetaDestino, nombreArchivo);

    try {
        eliminarDirectorioSeguro(carpetaTrabajo);

        asegurarCarpeta(path.join(carpetaTrabajo, 'database'));
        asegurarCarpeta(path.join(carpetaTrabajo, 'uploads/productos'));

        const rutaBackupSqlite = path.join(carpetaTrabajo, 'database', nombreBaseDatos);

        await db.backup(rutaBackupSqlite);

        copiarDirectorio(
            carpetaUploadsProductos,
            path.join(carpetaTrabajo, 'uploads/productos'),
            { omitirGitkeep: true }
        );

        const metadata = {
            app: empresa.software.nombre,
            version: empresa.software.version,
            desarrollador: empresa.software.desarrollador,
            tipo,
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

        validarBackupGenerado(rutaZipFinal, idBackup);

        const stats = fs.statSync(rutaZipFinal);
        const copiaExterna = copiarExterno
            ? await copiarBackupExterno(rutaZipFinal, nombreArchivo)
            : {
                habilitada: false,
                ok: false,
                ruta: '',
                mensaje: 'Copia externa omitida para este tipo de backup.',
            };

        eliminarDirectorioSeguro(carpetaTrabajo);
        aplicarRetencionBackups();

        registrarEventoBackup({
            tipo,
            ok: true,
            mensaje: mensajeOk,
            archivo: nombreArchivo,
            ruta: rutaZipFinal,
            bytes: stats.size,
            total_archivos: manifest.total_archivos,
            copia_externa: {
                habilitada: copiaExterna.habilitada,
                ok: copiaExterna.ok,
                ruta: copiaExterna.ruta || '',
                mensaje: copiaExterna.mensaje || '',
            },
        });

        return {
            ok: true,
            mensaje: mensajeOk,
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
        eliminarArchivoSeguro(rutaZipFinal);

        registrarEventoBackup({
            tipo,
            ok: false,
            mensaje: `No se pudo crear el backup: ${error.message}`,
            archivo: nombreArchivo,
            ruta: rutaZipFinal,
        });

        return {
            ok: false,
            mensaje: `No se pudo crear el backup: ${error.message}`,
        };
    }
}

async function crearBackupManual() {
    return crearBackupCompleto({
        tipo: 'manual',
        prefijo: 'prismia-backup-manual',
        carpetaDestino: carpetaBackupsManuales,
        copiarExterno: true,
        mensajeOk: 'Backup manual creado correctamente.',
    });
}

async function crearBackupAutomaticoCierreTurno(turno = {}) {
    const idTurno = Number(turno.id_turno_caja || turno.idTurnoCaja || 0);
    const prefijoTurno = idTurno > 0
        ? `prismia-backup-auto-cierre-turno-${idTurno}`
        : 'prismia-backup-auto-cierre-turno';

    return crearBackupCompleto({
        tipo: 'automatico_cierre_turno',
        prefijo: prefijoTurno,
        carpetaDestino: carpetaBackupsAutomaticos,
        copiarExterno: true,
        mensajeOk: 'Backup automático por cierre de caja creado correctamente.',
    });
}

function obtenerUltimoBackupProgramado() {
    return listarBackupsEnCarpeta(carpetaBackupsProgramados, 'Programado')
        .sort((a, b) => b.fecha.getTime() - a.fecha.getTime())[0] || null;
}

function debeCrearBackupProgramado() {
    const intervaloDias = leerEnteroConfig(env.backups?.scheduledIntervalDays, 7, 1);
    const ultimoProgramado = obtenerUltimoBackupProgramado();

    if (!ultimoProgramado) {
        return {
            debeCrear: true,
            intervaloDias,
            motivo: 'No existe backup programado previo.',
        };
    }

    const milisegundosIntervalo = intervaloDias * 24 * 60 * 60 * 1000;
    const tiempoTranscurrido = Date.now() - ultimoProgramado.fecha.getTime();

    return {
        debeCrear: tiempoTranscurrido >= milisegundosIntervalo,
        intervaloDias,
        motivo: tiempoTranscurrido >= milisegundosIntervalo
            ? `Ya pasaron ${intervaloDias} días desde el último backup programado.`
            : 'Aún no corresponde crear backup programado.',
    };
}

async function crearBackupProgramadoSiCorresponde() {
    const decision = debeCrearBackupProgramado();

    if (!decision.debeCrear) {
        return {
            ok: true,
            creado: false,
            mensaje: decision.motivo,
        };
    }

    const resultado = await crearBackupCompleto({
        tipo: 'programado_periodico',
        prefijo: `prismia-backup-programado-${decision.intervaloDias}d`,
        carpetaDestino: carpetaBackupsProgramados,
        copiarExterno: true,
        mensajeOk: 'Backup programado creado correctamente.',
    });

    return {
        ...resultado,
        creado: resultado.ok,
    };
}

async function crearBackupEmergenciaRestauracion() {
    return crearBackupCompleto({
        tipo: 'emergencia_restauracion',
        prefijo: 'prismia-backup-emergencia-restauracion',
        carpetaDestino: carpetaBackupsEmergencia,
        copiarExterno: false,
        mensajeOk: 'Backup de emergencia creado correctamente.',
    });
}

function listarBackupsEnCarpeta(carpeta, tipoVisible) {
    asegurarCarpeta(carpeta);

    return fs
        .readdirSync(carpeta, { withFileTypes: true })
        .filter((entrada) => entrada.isFile() && entrada.name.endsWith('.zip'))
        .map((entrada) => {
            const ruta = path.join(carpeta, entrada.name);
            const stats = fs.statSync(ruta);

            return {
                archivo: entrada.name,
                tipo: tipoVisible,
                fecha: stats.mtime,
                fecha_legible: formatearFechaHumana(stats.mtime),
                bytes: stats.size,
                tamano: formatearBytes(stats.size),
                ruta,
            };
        });
}

function listarBackupsGenerados() {
    return [
        ...listarBackupsEnCarpeta(carpetaBackupsManuales, 'Manual'),
        ...listarBackupsEnCarpeta(carpetaBackupsAutomaticos, 'Automático'),
        ...listarBackupsEnCarpeta(carpetaBackupsProgramados, 'Programado'),
        ...listarBackupsEnCarpeta(carpetaBackupsEmergencia, 'Emergencia'),
    ].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
}

function obtenerEstadoBackups() {
    const backups = listarBackupsGenerados();
    const rutaExterna = obtenerRutaExternaConfigurada();

    return {
        backups,
        total: backups.length,
        ultimo: backups[0] || null,
        rutas: {
            internos: carpetaBackupsBase,
            manuales: carpetaBackupsManuales,
            automaticos: carpetaBackupsAutomaticos,
            programados: carpetaBackupsProgramados,
            emergencias: carpetaBackupsEmergencia,
            externa_configurada: rutaExterna,
            externa_activa: Boolean(rutaExterna),
        },
    };
}

function abrirRutaEnSistema(ruta) {
    try {
        asegurarCarpeta(ruta);

        let comando;
        let argumentos;

        if (process.platform === 'win32') {
            comando = 'explorer';
            argumentos = [ruta];
        } else if (process.platform === 'darwin') {
            comando = 'open';
            argumentos = [ruta];
        } else {
            comando = 'xdg-open';
            argumentos = [ruta];
        }

        const proceso = spawn(comando, argumentos, {
            detached: true,
            stdio: 'ignore',
        });

        proceso.unref();

        return {
            ok: true,
            mensaje: 'Carpeta de backups abierta correctamente.',
        };
    } catch (error) {
        return {
            ok: false,
            mensaje: `No se pudo abrir la carpeta: ${error.message}`,
        };
    }
}

function abrirCarpetaBackups() {
    return abrirRutaEnSistema(carpetaBackupsBase);
}

function obtenerRutaBackupDescarga(nombreArchivo) {
    const archivoSeguro = path.basename(String(nombreArchivo || ''));

    if (!archivoSeguro.endsWith('.zip')) {
        return null;
    }

    const carpetasPermitidas = [
        carpetaBackupsManuales,
        carpetaBackupsAutomaticos,
        carpetaBackupsProgramados,
        carpetaBackupsEmergencia,
    ];

    for (const carpeta of carpetasPermitidas) {
        const carpetaSegura = path.resolve(carpeta);
        const ruta = path.resolve(carpetaSegura, archivoSeguro);

        if (!ruta.startsWith(`${carpetaSegura}${path.sep}`)) {
            continue;
        }

        if (fs.existsSync(ruta)) {
            return ruta;
        }
    }

    return null;
}

function normalizarRutaZip(rutaEntrada) {
    const valor = String(rutaEntrada || '')
        .replace(/\\/g, '/')
        .trim();

    if (!valor || valor.includes('\0') || valor.startsWith('/')) {
        return null;
    }

    const normalizada = path.posix.normalize(valor);

    if (
        !normalizada ||
        normalizada === '.' ||
        normalizada.startsWith('../') ||
        normalizada.includes('/../') ||
        path.posix.isAbsolute(normalizada)
    ) {
        return null;
    }

    return normalizada;
}

function obtenerRutaSeguraDentroDe(carpetaBase, rutaRelativa) {
    const rutaNormalizada = normalizarRutaZip(rutaRelativa);

    if (!rutaNormalizada) {
        throw new Error(`Ruta inválida dentro del backup: ${rutaRelativa}`);
    }

    const carpetaSegura = path.resolve(carpetaBase);
    const rutaFinal = path.resolve(
        carpetaSegura,
        rutaNormalizada.split('/').join(path.sep)
    );

    if (!rutaFinal.startsWith(`${carpetaSegura}${path.sep}`)) {
        throw new Error(`Ruta no permitida dentro del backup: ${rutaRelativa}`);
    }

    return rutaFinal;
}

function extraerZipSeguro(rutaZip, carpetaDestino) {
    if (!fs.existsSync(rutaZip)) {
        throw new Error('El archivo de backup no existe.');
    }

    const archivoSeguro = path.basename(rutaZip);

    if (!archivoSeguro.endsWith('.zip')) {
        throw new Error('El archivo seleccionado no es un ZIP válido.');
    }

    const zip = new AdmZip(rutaZip);
    const entradas = zip.getEntries();

    if (!entradas.length) {
        throw new Error('El ZIP está vacío.');
    }

    asegurarCarpeta(carpetaDestino);

    entradas.forEach((entrada) => {
        const rutaRelativa = normalizarRutaZip(entrada.entryName);

        if (!rutaRelativa) {
            throw new Error(`El backup contiene una ruta no segura: ${entrada.entryName}`);
        }

        const rutaDestino = obtenerRutaSeguraDentroDe(carpetaDestino, rutaRelativa);

        if (entrada.isDirectory) {
            asegurarCarpeta(rutaDestino);
            return;
        }

        asegurarCarpeta(path.dirname(rutaDestino));
        fs.writeFileSync(rutaDestino, entrada.getData());
    });
}

function leerJsonBackup(carpetaTrabajo, rutaRelativa) {
    const rutaArchivo = obtenerRutaSeguraDentroDe(carpetaTrabajo, rutaRelativa);

    if (!fs.existsSync(rutaArchivo)) {
        throw new Error(`No se encontró ${rutaRelativa} dentro del backup.`);
    }

    try {
        return JSON.parse(fs.readFileSync(rutaArchivo, 'utf8'));
    } catch (error) {
        throw new Error(`${rutaRelativa} no tiene un JSON válido.`);
    }
}

function validarManifestBackup(carpetaTrabajo, manifest) {
    if (!manifest || !Array.isArray(manifest.archivos)) {
        throw new Error('manifest.json no tiene la estructura esperada.');
    }

    manifest.archivos.forEach((archivo) => {
        const rutaRelativa = archivo.ruta;
        const hashEsperado = archivo.sha256;

        if (!rutaRelativa || !hashEsperado) {
            throw new Error('manifest.json contiene una entrada incompleta.');
        }

        const rutaArchivo = obtenerRutaSeguraDentroDe(carpetaTrabajo, rutaRelativa);

        if (!fs.existsSync(rutaArchivo)) {
            throw new Error(`Falta archivo declarado en manifest: ${rutaRelativa}`);
        }

        const hashActual = calcularSha256Archivo(rutaArchivo);

        if (hashActual !== hashEsperado) {
            throw new Error(`El archivo ${rutaRelativa} no coincide con el hash del manifest.`);
        }
    });
}

function validarBaseSQLite(rutaSQLite) {
    if (!fs.existsSync(rutaSQLite)) {
        throw new Error('No se encontró la base SQLite dentro del backup.');
    }

    let dbTemporal;

    try {
        dbTemporal = new SQLite(rutaSQLite, {
            readonly: true,
            fileMustExist: true,
        });

        const resultado = dbTemporal.pragma('integrity_check', {
            simple: true,
        });

        if (resultado !== 'ok') {
            throw new Error(`SQLite integrity_check respondió: ${resultado}`);
        }
    } finally {
        if (dbTemporal) {
            dbTemporal.close();
        }
    }
}

function validarYExtraerBackup(rutaZip, carpetaTrabajo) {
    eliminarDirectorioSeguro(carpetaTrabajo);
    asegurarCarpeta(carpetaTrabajo);

    extraerZipSeguro(rutaZip, carpetaTrabajo);

    const metadata = leerJsonBackup(carpetaTrabajo, 'metadata.json');
    const manifest = leerJsonBackup(carpetaTrabajo, 'manifest.json');

    if (!metadata.app || !String(metadata.app).toLowerCase().includes('prismia')) {
        throw new Error('El backup no parece pertenecer a Prismia POS Local.');
    }

    if (!metadata.base_datos?.archivo) {
        throw new Error('metadata.json no declara el archivo de base de datos.');
    }

    validarManifestBackup(carpetaTrabajo, manifest);

    const rutaDbRelativa = metadata.base_datos.archivo;
    const rutaDbRestaurada = obtenerRutaSeguraDentroDe(carpetaTrabajo, rutaDbRelativa);

    if (!rutaDbRestaurada.endsWith('.sqlite') && !rutaDbRestaurada.endsWith('.db')) {
        throw new Error('El archivo de base de datos del backup no tiene una extensión válida.');
    }

    validarBaseSQLite(rutaDbRestaurada);

    const rutaUploadsProductos = obtenerRutaSeguraDentroDe(
        carpetaTrabajo,
        metadata.uploads?.productos || 'uploads/productos'
    );

    asegurarCarpeta(rutaUploadsProductos);

    return {
        metadata,
        manifest,
        rutaDbRestaurada,
        rutaUploadsProductos,
    };
}

function cerrarConexionBaseDatos() {
    try {
        db.close();
    } catch (error) {
        const mensaje = String(error.message || '').toLowerCase();

        if (
            mensaje.includes('not open') ||
            mensaje.includes('closed') ||
            mensaje.includes('database is not open')
        ) {
            return;
        }

        throw error;
    }
}

function restaurarUploadsProductosDesde(carpetaOrigen) {
    asegurarCarpeta(carpetaUploadsProductos);
    limpiarDirectorioExceptoGitkeep(carpetaUploadsProductos);

    copiarDirectorio(carpetaOrigen, carpetaUploadsProductos, {
        omitirGitkeep: true,
    });

    asegurarGitkeep(carpetaUploadsProductos);
}

function limpiarSesionesHttpRestauradas(rutaBaseDatos) {
    let dbRestaurada;

    try {
        dbRestaurada = new SQLite(rutaBaseDatos);

        const tablaSesiones = dbRestaurada.prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name = 'sesiones_http'
            LIMIT 1
        `).get();

        if (!tablaSesiones) {
            return;
        }

        dbRestaurada.prepare(`
            DELETE FROM sesiones_http
        `).run();

        dbRestaurada.pragma('wal_checkpoint(TRUNCATE)');
    } catch (error) {
        console.warn('No se pudieron limpiar sesiones HTTP restauradas:', error.message);
    } finally {
        if (dbRestaurada) {
            dbRestaurada.close();
        }
    }
}

async function restaurarBackupDesdeArchivo(rutaZip) {
    const marcaTiempo = formatearFechaArchivo(new Date());
    const carpetaTrabajo = path.join(carpetaRestauracionesTemporales, `restore-${marcaTiempo}`);

    try {
        const validacion = validarYExtraerBackup(rutaZip, carpetaTrabajo);

        const backupEmergencia = await crearBackupEmergenciaRestauracion();

        if (!backupEmergencia.ok) {
            throw new Error(`No se pudo crear backup de emergencia: ${backupEmergencia.mensaje}`);
        }

        cerrarConexionBaseDatos();

        asegurarCarpeta(path.dirname(rutaBaseDatosPrincipal));
        fs.copyFileSync(validacion.rutaDbRestaurada, rutaBaseDatosPrincipal);

        limpiarSesionesHttpRestauradas(rutaBaseDatosPrincipal);

        restaurarUploadsProductosDesde(validacion.rutaUploadsProductos);

        asegurarCarpeta(carpetaBackupsBase);

        fs.writeFileSync(
            path.join(carpetaBackupsBase, 'ultima-restauracion.json'),
            JSON.stringify({
                restaurado_en: new Date().toISOString(),
                backup_origen: path.basename(rutaZip),
                metadata_backup_restaurado: validacion.metadata,
                backup_emergencia: backupEmergencia.backup,
            }, null, 2),
            'utf8'
        );

        eliminarDirectorioSeguro(carpetaTrabajo);
        eliminarArchivoSeguro(rutaZip);

        return {
            ok: true,
            mensaje: 'Backup restaurado correctamente.',
            backup_emergencia: backupEmergencia.backup,
            metadata: validacion.metadata,
        };
    } catch (error) {
        eliminarDirectorioSeguro(carpetaTrabajo);
        eliminarArchivoSeguro(rutaZip);

        return {
            ok: false,
            mensaje: `No se pudo restaurar el backup: ${error.message}`,
        };
    }
}

module.exports = {
    crearBackupManual,
    crearBackupAutomaticoCierreTurno,
    crearBackupProgramadoSiCorresponde,
    obtenerEstadoBackups,
    obtenerRutaBackupDescarga,
    abrirCarpetaBackups,
    restaurarBackupDesdeArchivo,
};