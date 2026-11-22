/**
 * Limitador de intentos fallidos en memoria (sin dependencias).
 *
 * Pensado para un POS local de un solo proceso: protege el login y la clave
 * de soporte contra fuerza bruta desde la red local. Si el proceso se
 * reinicia, los contadores se pierden (aceptable para este caso de uso).
 */

function crearLimitador({
    maxIntentos = 5,
    ventanaMs = 15 * 60 * 1000,
    bloqueoMs = 15 * 60 * 1000,
    maxRegistros = 5000,
} = {}) {
    const registros = new Map();

    function obtenerRegistro(clave, ahora) {
        const registro = registros.get(clave);

        if (!registro) {
            return null;
        }

        const ventanaVencida = ahora - registro.primerFallo > ventanaMs;
        const bloqueoVencido = !registro.bloqueadoHasta || ahora >= registro.bloqueadoHasta;

        if (ventanaVencida && bloqueoVencido) {
            registros.delete(clave);
            return null;
        }

        return registro;
    }

    function limpiarVencidos(ahora) {
        for (const clave of registros.keys()) {
            obtenerRegistro(clave, ahora);
        }
    }

    return {
        /** @returns {{ bloqueado: boolean, segundosRestantes: number }} */
        consultar(clave, ahora = Date.now()) {
            const registro = obtenerRegistro(clave, ahora);

            if (!registro || !registro.bloqueadoHasta || ahora >= registro.bloqueadoHasta) {
                return { bloqueado: false, segundosRestantes: 0 };
            }

            return {
                bloqueado: true,
                segundosRestantes: Math.ceil((registro.bloqueadoHasta - ahora) / 1000),
            };
        },

        registrarFallo(clave, ahora = Date.now()) {
            if (registros.size >= maxRegistros) {
                limpiarVencidos(ahora);
            }

            const registro = obtenerRegistro(clave, ahora) || { fallos: 0, primerFallo: ahora, bloqueadoHasta: null };

            registro.fallos += 1;

            if (registro.fallos >= maxIntentos) {
                registro.bloqueadoHasta = ahora + bloqueoMs;
            }

            registros.set(clave, registro);

            return registro.fallos;
        },

        reiniciar(clave) {
            registros.delete(clave);
        },
    };
}

function describirEspera(segundos) {
    const minutos = Math.ceil(segundos / 60);

    return minutos <= 1 ? 'un minuto' : `${minutos} minutos`;
}

module.exports = {
    crearLimitador,
    describirEspera,
};
