const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const runtimePaths = require('./runtime-paths');

const dbPath = runtimePaths.obtenerRutaBaseDatos();
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

if (runtimePaths.estaEnProduccion()) {
    console.log('Base de datos SQLite conectada correctamente.');
} else {
    console.log(`Base de datos SQLite conectada: ${dbPath}`);
}

module.exports = db;