/**
 * Navegación: a qué pantalla regresa el botón "volver" de la barra superior.
 *
 * Las pantallas del menú (la raíz de cada módulo) no tienen "volver". Las de
 * adentro (formularios, detalles, informes) regresan a la pantalla principal de
 * su módulo, salvo unos casos con un padre más natural (el detalle de una venta
 * vuelve al historial, un conteo vuelve a la lista de conteos).
 */

const MODULOS = {
    dashboard: 'Inicio',
    ventas: 'POS',
    cotizaciones: 'Cotizaciones',
    remisiones: 'Remisiones',
    'notas-credito': 'Notas crédito',
    productos: 'Productos',
    'categorias-productos': 'Categorías',
    inventario: 'Inventario',
    proveedores: 'Proveedores',
    compras: 'Compras',
    clientes: 'Clientes',
    caja: 'Caja',
    reportes: 'Reportes',
    usuarios: 'Usuarios',
    configuracion: 'Configuración',
    backups: 'Respaldos',
};

// Pantallas que están en el menú aunque no sean la raíz de su módulo
const PANTALLAS_DEL_MENU = new Set(['/caja/gasto']);

function rutaPadre(rutaCompleta) {
    const ruta = String(rutaCompleta || '').split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';

    if (PANTALLAS_DEL_MENU.has(ruta)) {
        return null;
    }

    const partes = ruta.split('/').filter(Boolean);

    if (!partes.length) {
        return null;
    }

    const modulo = partes[0];

    // Meseros se abre desde Configuración
    if (partes.length === 1) {
        return modulo === 'meseros' ? { ruta: '/configuracion', etiqueta: 'Configuración' } : null;
    }

    // El POS de celular es una pantalla propia
    if (modulo === 'ventas' && partes[1] === 'movil') {
        return null;
    }

    if (modulo === 'ventas' && /^\d+$/.test(partes[1])) {
        return { ruta: '/ventas/historial', etiqueta: 'Historial' };
    }

    if (modulo === 'inventario' && partes[1] === 'conteos' && partes.length >= 3) {
        return { ruta: '/inventario/conteos', etiqueta: 'Conteos' };
    }

    if (!MODULOS[modulo]) {
        return null;
    }

    return { ruta: `/${modulo}`, etiqueta: MODULOS[modulo] };
}

module.exports = { rutaPadre };
