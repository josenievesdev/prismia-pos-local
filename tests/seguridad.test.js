/**
 * Pruebas de seguridad HTTP sobre la app real (Express) con base temporal.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { crearEntornoPrueba, iniciarServidor } = require('./helpers/entorno');

const entorno = crearEntornoPrueba('seguridad');
const { db, credencialesAdmin } = entorno;

let servidor;

before(async () => {
    servidor = await iniciarServidor();
});

after(async () => {
    await servidor.cerrar();
});

function cliente() {
    let cookie = '';

    return {
        get cookie() {
            return cookie;
        },
        async pedir(ruta, opciones = {}) {
            const respuesta = await fetch(servidor.url + ruta, {
                redirect: 'manual',
                ...opciones,
                headers: { ...(cookie ? { cookie } : {}), ...(opciones.headers || {}) },
            });

            const nueva = respuesta.headers.get('set-cookie');

            if (nueva) {
                cookie = nueva.split(';')[0];
            }

            return respuesta;
        },
        login(correo, contrasena, encabezados = {}) {
            return this.pedir('/auth/login', {
                method: 'POST',
                headers: { 'content-type': 'application/x-www-form-urlencoded', ...encabezados },
                body: new URLSearchParams({ correo, contrasena }).toString(),
            });
        },
    };
}

test('la ruta /__restauracion-finalizada ya no existe y no bloquea la app', async () => {
    const anonimo = cliente();

    const respuesta = await anonimo.pedir('/__restauracion-finalizada');
    assert.equal(respuesta.status, 404);

    const login = await anonimo.pedir('/auth/login');
    assert.equal(login.status, 200);
});

test('el servidor escucha solo en este equipo por defecto', () => {
    const env = entorno.requerir('src/config/env');
    assert.equal(env.app.host, '127.0.0.1');
});

test('el login regenera el identificador de sesión', async () => {
    const usuario = cliente();

    const primero = await usuario.login(credencialesAdmin.correo, credencialesAdmin.contrasena);
    assert.equal(primero.status, 302);
    const cookieInicial = usuario.cookie;
    assert.ok(cookieInicial);

    const segundo = await usuario.login(credencialesAdmin.correo, credencialesAdmin.contrasena);
    assert.equal(segundo.status, 302);
    assert.notEqual(usuario.cookie, cookieInicial);

    // La sesión anterior quedó invalidada.
    const conCookieVieja = await fetch(`${servidor.url}/dashboard`, { redirect: 'manual', headers: { cookie: cookieInicial } });
    assert.equal(conCookieVieja.status, 302);
});

test('bloquea el login tras 5 intentos fallidos aunque luego la clave sea correcta', async () => {
    const atacante = cliente();
    const correo = 'objetivo@pruebas.local';

    for (let intento = 1; intento <= 5; intento += 1) {
        const respuesta = await atacante.login(correo, `incorrecta-${intento}`);
        assert.equal(respuesta.status, 401);
    }

    const bloqueado = await atacante.login(correo, 'cualquiera');
    assert.equal(bloqueado.status, 429);
    assert.match(await bloqueado.text(), /Demasiados intentos/);
});

test('rechaza peticiones que modifican datos desde otro sitio (CSRF)', async () => {
    const usuario = cliente();
    await usuario.login(credencialesAdmin.correo, credencialesAdmin.contrasena);

    const turnosAntes = db.prepare('SELECT COUNT(*) AS total FROM turnos_caja').get().total;

    const ataque = await usuario.pedir('/caja/abrir', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'http://sitio-malicioso.example' },
        body: 'monto_inicial=1000',
    });
    assert.equal(ataque.status, 403);
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM turnos_caja').get().total, turnosAntes);

    const legitima = await usuario.pedir('/caja/abrir', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', origin: servidor.url },
        body: 'monto_inicial=1000',
    });
    assert.equal(legitima.status, 302);
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM turnos_caja').get().total, turnosAntes + 1);
});

test('la política de referrer permite verificar el origen de los formularios', async () => {
    // Con 'no-referrer' (valor por defecto de helmet) los navegadores envían
    // "Origin: null" en los POST de formularios y el login quedaba bloqueado.
    const respuesta = await cliente().pedir('/auth/login');
    assert.equal(respuesta.headers.get('referrer-policy'), 'same-origin');
});

test('Origin: null solo se acepta si el Referer es de la misma app', async () => {
    const usuario = cliente();
    const cuerpo = new URLSearchParams({ correo: 'nadie@pruebas.local', contrasena: 'x' }).toString();
    const tipo = { 'content-type': 'application/x-www-form-urlencoded' };

    const sinReferer = await usuario.pedir('/auth/login', { method: 'POST', headers: { ...tipo, origin: 'null' }, body: cuerpo });
    assert.equal(sinReferer.status, 403);

    const conRefererPropio = await usuario.pedir('/auth/login', {
        method: 'POST',
        headers: { ...tipo, origin: 'null', referer: `${servidor.url}/auth/login` },
        body: cuerpo,
    });
    assert.equal(conRefererPropio.status, 401);
});

test('una imagen de producto nunca se guarda con extensión ejecutable', async () => {
    const usuario = cliente();
    await usuario.login(credencialesAdmin.correo, credencialesAdmin.contrasena);

    const categoria = db.prepare('SELECT id_categoria_producto FROM categorias_productos LIMIT 1').get();
    const unidad = db.prepare(`SELECT id_unidad_medida FROM unidades_medida WHERE abreviatura = 'und'`).get();

    const formulario = new FormData();
    formulario.append('nombre', 'Producto con imagen');
    formulario.append('codigo_interno', 'IMG-0001');
    formulario.append('id_categoria_producto', String(categoria.id_categoria_producto));
    formulario.append('id_unidad_medida', String(unidad.id_unidad_medida));
    formulario.append('precio_costo', '1000');
    formulario.append('precio_venta', '2000');
    formulario.append(
        'imagen_producto',
        new Blob(['<script>alert(1)</script>'], { type: 'image/png' }),
        'ataque.html'
    );

    const respuesta = await usuario.pedir('/productos/nuevo', { method: 'POST', body: formulario, headers: { origin: servidor.url } });
    assert.equal(respuesta.status, 302);

    // El producto se creó y su imagen quedó con la extensión del tipo validado.
    const producto = db.prepare(`SELECT imagen_url FROM productos WHERE codigo_interno = 'IMG-0001'`).get();
    assert.ok(producto, 'el producto debió crearse');
    assert.match(producto.imagen_url, /\.png$/);

    const carpeta = path.join(process.env.UPLOADS_PUBLIC_DIR, 'productos');
    const archivos = fs.readdirSync(carpeta);

    assert.equal(archivos.some((archivo) => /\.html?$/i.test(archivo)), false, archivos.join(', '));
});
