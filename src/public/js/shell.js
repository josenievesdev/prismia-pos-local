/**
 * Shell de la app: menú lateral.
 *
 * data-menu-estado en <html>:
 * - "movil"    (< 768 px): panel deslizable que se abre con el botón de menú.
 * - "riel"     solo íconos (preferencia guardada, POS o pantalla < 1280 px).
 * - "completo" íconos y textos.
 * La misma regla corre en línea en layouts/app.ejs antes de pintar.
 */
(function () {
    const raiz = document.documentElement;
    const fondo = document.querySelector('[data-shell-close]');

    function leerPreferencia() {
        try {
            return localStorage.getItem('prismia.menu');
        } catch (error) {
            return null;
        }
    }

    function guardarPreferencia(valor) {
        try {
            localStorage.setItem('prismia.menu', valor);
        } catch (error) {
            /* sin almacenamiento: la preferencia dura solo esta página */
        }
    }

    function calcularEstado() {
        const preferencia = leerPreferencia();
        const ancho = window.innerWidth;

        if (ancho < 768) return 'movil';
        if (preferencia === 'compacto') return 'riel';
        if (preferencia === 'expandido') return 'completo';
        if (raiz.classList.contains('ruta-pos') || ancho < 1280) return 'riel';

        return 'completo';
    }

    function aplicarEstado() {
        raiz.setAttribute('data-menu-estado', calcularEstado());

        if (raiz.getAttribute('data-menu-estado') !== 'movil') {
            abrirPanelMovil(false);
        }
    }

    function abrirPanelMovil(abrir) {
        raiz.classList.toggle('menu-abierto', abrir);

        if (fondo) {
            fondo.hidden = !abrir;
        }
    }

    document.addEventListener('click', function (evento) {
        if (evento.target.closest('[data-shell-toggle]')) {
            if (raiz.getAttribute('data-menu-estado') === 'movil') {
                abrirPanelMovil(!raiz.classList.contains('menu-abierto'));
                return;
            }

            const esRiel = raiz.getAttribute('data-menu-estado') === 'riel';
            guardarPreferencia(esRiel ? 'expandido' : 'compacto');
            aplicarEstado();
            return;
        }

        if (evento.target.closest('[data-shell-close]')) {
            abrirPanelMovil(false);
        }
    });

    document.addEventListener('keydown', function (evento) {
        if (evento.key === 'Escape' && raiz.classList.contains('menu-abierto')) {
            abrirPanelMovil(false);
        }
    });

    let temporizador = null;
    window.addEventListener('resize', function () {
        clearTimeout(temporizador);
        temporizador = setTimeout(aplicarEstado, 120);
    });

    aplicarEstado();
})();
