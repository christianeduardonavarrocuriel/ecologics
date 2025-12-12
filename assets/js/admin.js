// Estado global
let currentView = 'panel';
let selectedVehiculo = null;
let selectedSolicitud = null;
let animationInterval = null;

// Variables globales para almacenar datos desde la base de datos
let vehiculos = [];
let solicitudes = [];
let rutasData = [];
let recolectores = [];
let quejas = [];

// Cargar datos desde el backend
async function cargarDatos() {
    try {
        console.log('📥 Iniciando carga de datos...');
        
        // Cargar solo lo esencial primero
        const recolectoresUbicRes = await fetch('/api/admin/recolectores-ubicacion');
        const recolectoresUbic = await recolectoresUbicRes.json();
        
        console.log('✅ Recolectores recibidos:', recolectoresUbic);
        
        // Transformar directamente a vehiculos para el mapa
        vehiculos = recolectoresUbic.map(r => ({
            id: r.id,
            matricula: r.nombre,  // Nombre del recolector
            conductor: r.correo || r.telefono || 'N/A',
            estado: r.estado || 'operativo',
            x: 50 + (Math.random() - 0.5) * 50,
            y: 50 + (Math.random() - 0.5) * 50,
            ruta: r.vehiculo || 'Recolector',
            solicitud: null,
            lat: r.lat,
            lng: r.lng,
            id_recolector: r.id,
            telefono: r.telefono,
            correo: r.correo,
            placa: r.placa
        }));
        
        console.log('🚗 Vehículos transformados:', vehiculos);
        
        // Cargar resto de datos en background
        try {
            const [solicitudesRes, recolectoresRes, quejasRes] = await Promise.all([
                fetch('/api/usuario/solicitudes'),
                fetch('/api/admin/recolectores'),
                fetch('/api/admin/quejas')
            ]);
            
            solicitudes = await solicitudesRes.json();
            recolectores = await recolectoresRes.json();
            quejas = await quejasRes.json();
            
            console.log('📊 Datos secundarios cargados');
        } catch (e) {
            console.warn('⚠️ No se pudieron cargar datos secundarios:', e);
        }
        
        console.log('✅ Carga de datos completada');
        return true;
    } catch (error) {
        console.error('❌ Error cargando datos:', error);
        vehiculos = [];
        solicitudes = [];
        recolectores = [];
        quejas = [];
        return false;
    }
}



let vistaRutasActual = 'sugeridas';
let pointsRuta = [];
let isDrawingRuta = false;

// Datos de camiones para Hidalgo
let camionesHidalgo = [
    {
        id: 1,
        placa: 'ABC-123-D',
        conductor: 'Carlos Martínez',
        estado: 'en-ruta',
        lat: 20.0871,
        lng: -98.7612,
        ciudad: 'Pachuca',
        recolecciones: 8
    },
    {
        id: 2,
        placa: 'DEF-456-G',
        conductor: 'Luis García',
        estado: 'en-ruta',
        lat: 20.1234,
        lng: -98.6789,
        ciudad: 'Mineral de la Reforma',
        recolecciones: 6
    },
    {
        id: 3,
        placa: 'GHI-789-J',
        conductor: 'Ana Rodríguez',
        estado: 'pausa',
        lat: 20.0567,
        lng: -98.8234,
        ciudad: 'San Agustín Tlaxiaca',
        recolecciones: 5
    },
    {
        id: 4,
        placa: 'JKL-012-M',
        conductor: 'Miguel Torres',
        estado: 'en-ruta',
        lat: 20.1945,
        lng: -98.7456,
        ciudad: 'Ixmiquilpan',
        recolecciones: 7
    },
    {
        id: 5,
        placa: 'NOP-345-Q',
        conductor: 'Roberto Díaz',
        estado: 'pausa',
        lat: 20.0234,
        lng: -98.6234,
        ciudad: 'Tizayuca',
        recolecciones: 4
    },
    {
        id: 6,
        placa: 'RST-678-U',
        conductor: 'Fernando López',
        estado: 'en-ruta',
        lat: 20.2345,
        lng: -98.8567,
        ciudad: 'Apan',
        recolecciones: 9
    }
];

let mapaHidalgo = null;
let markersHidalgo = {};

// Títulos de páginas
const pageTitles = {
    panel: 'Panel General',
    solicitudes: 'Solicitudes',
    recolectores: 'Recolectores',
    rutas: 'Rutas',
    seguimiento: 'Seguimiento de Vehículos',
    reportes: 'Reportes y Quejas'
};

// Inicialización
document.addEventListener('DOMContentLoaded', async function() {
    // Cargar datos de la base de datos primero
    await cargarDatos();
    
    changeView('panel');
    renderSolicitudes();
});

// Cambiar vista
function changeView(view) {
    // Limpiar animación anterior
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }

    currentView = view;
    
    // Actualizar sidebar
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-view') === view) {
            item.classList.add('active');
        }
    });

    // Actualizar título
    document.getElementById('pageTitle').textContent = pageTitles[view] || 'Panel General';

    // Mostrar/ocultar vistas
    document.querySelectorAll('[id$="View"]').forEach(viewEl => {
        viewEl.classList.add('hidden');
    });

    const viewElement = document.getElementById(view + 'View');
    if (viewElement) {
        viewElement.classList.remove('hidden');
    }

    // Inicializar vista específica
    if (view === 'seguimiento') {
        setTimeout(() => initSeguimiento(), 100);
    } else if (view === 'solicitudes') {
        renderSolicitudes();
    } else if (view === 'rutas') {
        renderRutas();
    } else if (view === 'recolectores') {
        renderRecolectores();
    } else if (view === 'reportes') {
        renderReportes();
    }
}

// ========== SEGUIMIENTO DE VEHÍCULOS ==========

function initSeguimiento() {
    console.log('🗺️ Inicializando seguimiento de vehículos...');
    const mapContainer = document.getElementById('mapContainer');
    console.log('mapContainer:', mapContainer);
    
    if (!mapContainer) {
        console.error('❌ mapContainer no encontrado');
        return;
    }

    console.log('📍 Llamando renderVehicles()...');
    renderVehicles();
    renderVehicleList();
    startVehicleAnimation();
    console.log('✅ Seguimiento inicializado');
}

function renderVehicles() {
    const mapContainer = document.getElementById('mapContainer');
    if (!mapContainer) {
        console.log('❌ mapContainer no encontrado');
        return;
    }

    console.log('🚗 Renderizando vehículos. Total:', vehiculos.length);
    console.log('Vehículos:', vehiculos);

    // Limpiar vehículos anteriores
    const existingVehicles = mapContainer.querySelectorAll('.vehicle-marker');
    existingVehicles.forEach(v => v.remove());

    // Renderizar vehículos
    vehiculos.forEach(vehiculo => {
        const marker = createVehicleMarker(vehiculo);
        mapContainer.appendChild(marker);
    });
    
    console.log('✅ Vehículos renderizados');
}

function createVehicleMarker(vehiculo) {
    const container = document.createElement('div');
    container.className = 'vehicle-marker';
    container.style.left = `${vehiculo.x}%`;
    container.style.top = `${vehiculo.y}%`;
    container.dataset.vehiculoId = vehiculo.id;

    const colors = getEstadoColor(vehiculo.estado);
    const isSelected = selectedVehiculo?.id === vehiculo.id;

    let html = '<div class="relative">';
    
    // Efecto pulse para vehículos operativos
    if (vehiculo.estado === 'operativo') {
        html += `<div class="absolute inset-0 w-12 h-12 rounded-full ${colors.bg} opacity-30 animate-pulse"></div>`;
    }
    
    // Marcador principal
    html += `<div class="relative w-12 h-12 ${colors.bg} rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 cursor-pointer border-2 border-white">
        <i class="fas fa-truck text-white text-lg"></i>
    </div>`;
    
    // Badge con matricula cuando está seleccionado
    if (isSelected) {
        html += `<div class="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-gradient-to-r ${
            colors.gradient || 'from-gray-900 to-gray-800'
        } text-white px-4 py-2 rounded-lg shadow-xl text-sm z-20 border-2 border-white font-semibold">
            <div>${vehiculo.matricula}</div>
            <div class="text-xs opacity-90 mt-1">${vehiculo.conductor}</div>
        </div>`;
        
        // Línea conectora
        html += `<div class="absolute left-1/2 top-12 w-0.5 h-6 bg-gradient-to-b ${colors.gradient || 'from-gray-900 to-gray-800'} transform -translate-x-1/2 z-10"></div>`;
    }

    html += '</div>';
    container.innerHTML = html;

    container.addEventListener('click', () => {
        selectedVehiculo = vehiculo;
        renderVehicles();
        renderVehicleList();
    });

    return container;
}

function renderVehicleList() {
    const listContainer = document.getElementById('vehicleList');
    if (!listContainer) return;

    listContainer.innerHTML = vehiculos.map((vehiculo, index) => {
        const colors = getEstadoColor(vehiculo.estado);
        const isSelected = selectedVehiculo?.id === vehiculo.id;

        return `
            <div class="group bg-white rounded-xl border-2 p-4 cursor-pointer transition-all duration-200 ${
                isSelected ? `border-blue-500 shadow-xl bg-gradient-to-br ${colors.bgGradient || 'from-blue-50 to-white'}` : 'border-gray-200 hover:border-blue-300 hover:shadow-lg'
            }" onclick="selectVehiculo(${vehiculo.id})">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
                        <i class="fas fa-truck text-white text-lg"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-gray-900">${vehiculo.matricula}</p>
                        <p class="text-xs text-gray-600">${vehiculo.conductor}</p>
                    </div>
                    <div class="flex-shrink-0">
                        <div class="w-3 h-3 rounded-full ${colors.bg} shadow-md"></div>
                    </div>
                </div>

                <div class="mb-3 space-y-2">
                    <div class="inline-block">
                        <span class="px-3 py-1 ${colors.bgLight} ${colors.text} rounded-full text-xs font-semibold border ${colors.border} shadow-sm">
                            ${vehiculo.estado.charAt(0).toUpperCase() + vehiculo.estado.slice(1)}
                        </span>
                    </div>
                </div>

                <div class="space-y-2 text-sm border-t border-gray-100 pt-3">
                    <div class="flex items-center gap-2 text-gray-700">
                        <i class="fas fa-map-pin text-${colors.text.split('-')[1]}-600 w-4"></i>
                        <span class="text-xs truncate">${vehiculo.ruta}</span>
                    </div>
                    ${vehiculo.solicitud ? `
                        <div class="flex items-center gap-2 text-gray-700">
                            <i class="fas fa-tasks text-blue-600 w-4"></i>
                            <span class="text-xs font-semibold">#${vehiculo.solicitud}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function selectVehiculo(vehiculoId) {
    selectedVehiculo = vehiculos.find(v => v.id === vehiculoId);
    renderVehicles();
    renderVehicleList();
}

function startVehicleAnimation() {
    // Limpiar intervalo anterior si existe
    if (animationInterval) clearInterval(animationInterval);

    animationInterval = setInterval(() => {
        vehiculos.forEach(vehiculo => {
            if (vehiculo.estado === 'operativo') {
                const moveX = (Math.random() - 0.5) * 4;
                const moveY = (Math.random() - 0.5) * 4;
                vehiculo.x = Math.min(Math.max(vehiculo.x + moveX, 5), 95);
                vehiculo.y = Math.min(Math.max(vehiculo.y + moveY, 5), 95);
            }
        });
        renderVehicles();
    }, 2500);
}

function getEstadoColor(estado) {
    const colors = {
        'operativo': {
            bg: 'bg-green-500',
            text: 'text-green-700',
            border: 'border-green-300',
            bgLight: 'bg-green-100',
            gradient: 'from-green-600 to-emerald-600',
            bgGradient: 'from-green-50 to-white'
        },
        'mantenimiento': {
            bg: 'bg-amber-500',
            text: 'text-amber-700',
            border: 'border-amber-300',
            bgLight: 'bg-amber-100',
            gradient: 'from-amber-600 to-yellow-600',
            bgGradient: 'from-amber-50 to-white'
        },
        'parado': {
            bg: 'bg-gray-500',
            text: 'text-gray-700',
            border: 'border-gray-300',
            bgLight: 'bg-gray-100',
            gradient: 'from-gray-700 to-gray-600',
            bgGradient: 'from-gray-50 to-white'
        }
    };
    return colors[estado] || colors['parado'];
}

// ========== SOLICITUDES ==========

function renderSolicitudes() {
    const listContainer = document.getElementById('solicitudesList');
    if (!listContainer) return;

    const filtro = document.getElementById('filtroEstado')?.value || 'todas';
    const solicitudesFiltradas = filtro === 'todas' ? solicitudes : solicitudes.filter(s => s.estado === filtro);

    listContainer.innerHTML = solicitudesFiltradas.map(solicitud => {
        const estadoBadge = getEstadoBadge(solicitud.estado);
        const estadoColor = getEstadoColorSolicitud(solicitud.estado);
        
        return `
            <div class="group bg-white rounded-xl border-2 border-gray-200 p-5 hover:border-blue-400 hover:shadow-xl transition-all duration-200 overflow-hidden">
                <div class="absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${estadoColor}"></div>
                
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <p class="font-bold text-gray-900 text-lg">#${solicitud.id}</p>
                        <p class="text-sm text-gray-600 font-medium">${solicitud.usuario}</p>
                    </div>
                    ${estadoBadge}
                </div>

                <div class="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100">
                    <div>
                        <p class="text-xs text-gray-600 uppercase tracking-wide font-semibold">Dirección</p>
                        <p class="text-sm text-gray-800 line-clamp-2">${solicitud.direccion}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-600 uppercase tracking-wide font-semibold">Residuo</p>
                        <p class="text-sm text-gray-800 font-medium">${solicitud.tipoResiduo}</p>
                        <p class="text-xs text-gray-500">${solicitud.kilos} kg</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <p class="text-xs text-gray-600 uppercase tracking-wide font-semibold">Recolector</p>
                        <p class="text-sm text-gray-900 font-semibold">${solicitud.recolector}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-600 uppercase tracking-wide font-semibold">Fecha</p>
                        <p class="text-sm text-gray-900 font-semibold">${solicitud.fecha}</p>
                    </div>
                </div>

                <button onclick="viewSolicitud(${solicitud.id})" class="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg font-semibold text-sm transition-all duration-200">
                    <i class="fas fa-eye mr-2"></i>Ver Detalles
                </button>
            </div>
        `;
    }).join('');
}

function getEstadoColorSolicitud(estado) {
    const colors = {
        'completada': 'from-green-500 to-emerald-500',
        'en-proceso': 'from-blue-500 to-cyan-500',
        'pendiente': 'from-amber-500 to-orange-500',
        'cancelada': 'from-red-500 to-rose-500',
    };
    return colors[estado] || colors['pendiente'];
}

function filterSolicitudes() {
    renderSolicitudes();
}

function viewSolicitud(solicitudId) {
    selectedSolicitud = solicitudes.find(s => s.id === solicitudId);
    const modalContent = document.getElementById('modalContent');
    const estadoColor = getEstadoColorSolicitud(selectedSolicitud.estado);

    modalContent.innerHTML = `
        <div class="space-y-4">
            <div class="bg-gradient-to-br ${estadoColor} rounded-lg p-4 text-white">
                <p class="text-xs opacity-90">SOLICITUD ID</p>
                <p class="text-3xl font-bold">#${selectedSolicitud.id}</p>
            </div>

            <div class="border-l-4 border-blue-500 pl-4 py-2">
                <p class="text-xs text-gray-600 uppercase tracking-wide font-semibold">Cliente</p>
                <p class="text-lg font-bold text-gray-900">${selectedSolicitud.usuario}</p>
            </div>

            <div class="border-l-4 border-green-500 pl-4 py-2">
                <p class="text-xs text-gray-600 uppercase tracking-wide font-semibold">Teléfono</p>
                <p class="text-sm text-gray-800 font-medium">${selectedSolicitud.telefono}</p>
            </div>

            <div class="border-l-4 border-orange-500 pl-4 py-2">
                <p class="text-xs text-gray-600 uppercase tracking-wide font-semibold">Dirección</p>
                <p class="text-sm text-gray-800">${selectedSolicitud.direccion}</p>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div class="border-l-4 border-purple-500 pl-3 py-2">
                    <p class="text-xs text-gray-600 uppercase tracking-wide font-semibold">Tipo</p>
                    <p class="text-sm font-semibold text-gray-900">${selectedSolicitud.tipoResiduo}</p>
                </div>
                <div class="border-l-4 border-cyan-500 pl-3 py-2">
                    <p class="text-xs text-gray-600 uppercase tracking-wide font-semibold">Cantidad</p>
                    <p class="text-sm font-semibold text-gray-900">${selectedSolicitud.kilos} kg</p>
                </div>
            </div>

            <div class="bg-gray-50 rounded-lg p-3">
                <p class="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-2">Recolector</p>
                <p class="text-sm font-semibold text-gray-900">${selectedSolicitud.recolector}</p>
            </div>

            <div class="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div>
                    <p class="text-xs text-gray-600 uppercase tracking-wide font-semibold">Estado</p>
                    <p class="text-sm font-semibold text-gray-900">${getEstadoLabel(selectedSolicitud.estado)}</p>
                </div>
                ${getEstadoBadge(selectedSolicitud.estado)}
            </div>

            <div class="bg-gray-50 rounded-lg p-3">
                <p class="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-2">Fecha</p>
                <p class="text-sm font-semibold text-gray-900">${selectedSolicitud.fecha}</p>
            </div>
        </div>
    `;

    document.getElementById('solicitudModal').classList.remove('hidden');
}

function closeSolicitudModal() {
    document.getElementById('solicitudModal').classList.add('hidden');
}

function getEstadoBadge(estado) {
    const styles = {
        'completada': 'bg-green-100 text-green-700 border-green-300',
        'en-proceso': 'bg-blue-100 text-blue-700 border-blue-300',
        'pendiente': 'bg-orange-100 text-orange-700 border-orange-300',
        'cancelada': 'bg-red-100 text-red-700 border-red-300',
    };

    const label = getEstadoLabel(estado);
    return `<span class="px-3 py-1 rounded-full text-xs border ${styles[estado] || styles['pendiente']}">${label}</span>`;
}

function getEstadoLabel(estado) {
    const labels = {
        'completada': 'Completada',
        'en-proceso': 'En Proceso',
        'pendiente': 'Pendiente',
        'cancelada': 'Cancelada',
    };
    return labels[estado] || 'Desconocido';
}

// ========== RECOLECTORES ==========

function renderRecolectores() {
    const recolectoresView = document.getElementById('recolectoresView');
    if (!recolectoresView) return;

    recolectoresView.innerHTML = `
        <div class="space-y-6">
            <!-- Header -->
            <div class="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-8 text-white shadow-lg">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-3xl font-bold mb-2">Equipo de Recolectores</h1>
                        <p class="text-green-100">Gestión y monitoreo del personal de recolección</p>
                    </div>
                    <div class="text-5xl opacity-20">
                        <i class="fas fa-people-carry"></i>
                    </div>
                </div>
            </div>

            <!-- Controles -->
            <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-md">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-lg font-bold text-gray-900">Personal Activo</h3>
                        <p class="text-sm text-gray-600">Total de recolectores: ${recolectores.length}</p>
                    </div>
                    <button onclick="abrirModalAgregarRecolector()" class="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2">
                        <i class="fas fa-plus"></i>Agregar Recolector
                    </button>
                </div>
            </div>

            <!-- Grid de Recolectores -->
            <div id="recolectoresGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                ${recolectores.map(recolector => `
                    <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-xl transition-all hover:border-green-300">
                        <!-- Header -->
                        <div class="flex items-start justify-between mb-4">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md">
                                    ${recolector.nombre.charAt(0)}
                                </div>
                                <div>
                                    <h3 class="text-lg font-bold text-gray-900">${recolector.nombre}</h3>
                                    <p class="text-xs text-gray-600">Supervisor: ${recolector.supervisor}</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="flex items-center gap-1 bg-gradient-to-r from-yellow-100 to-yellow-50 px-3 py-1 rounded-full border border-yellow-200">
                                    <i class="fas fa-star text-yellow-500"></i>
                                    <span class="text-sm font-bold text-gray-900">${recolector.rating}</span>
                                </div>
                                <span class="text-xs mt-2 px-2 py-1 rounded-full ${recolector.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}">
                                    ${recolector.estado === 'activo' ? '<i class="fas fa-circle text-green-500 mr-1"></i>Activo' : 'Inactivo'}
                                </span>
                            </div>
                        </div>

                        <!-- Estadísticas -->
                        <div class="grid grid-cols-2 gap-3 mb-4">
                            <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                                <p class="text-xs font-semibold text-gray-600 uppercase">Asignadas</p>
                                <p class="text-2xl font-bold text-blue-600">${recolector.asignaciones}</p>
                            </div>
                            <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                                <p class="text-xs font-semibold text-gray-600 uppercase">Completadas</p>
                                <p class="text-2xl font-bold text-green-600">${recolector.completadas}</p>
                            </div>
                        </div>

                        <!-- Información -->
                        <div class="space-y-2 mb-4">
                            <div class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <i class="fas fa-car text-gray-600 w-4"></i>
                                <div class="flex-1">
                                    <p class="text-xs text-gray-600">Vehículo</p>
                                    <p class="text-sm font-semibold text-gray-900">${recolector.vehiculo}</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <i class="fas fa-phone text-gray-600 w-4"></i>
                                <div class="flex-1">
                                    <p class="text-xs text-gray-600">Teléfono</p>
                                    <p class="text-sm font-semibold text-gray-900">${recolector.telefono}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Barra de progreso -->
                        <div class="mb-4">
                            <div class="flex justify-between items-center mb-1">
                                <p class="text-xs font-semibold text-gray-600">Eficiencia</p>
                                <p class="text-xs font-bold text-gray-900">${Math.round((recolector.completadas / recolector.asignaciones) * 100)}%</p>
                            </div>
                            <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div class="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full" style="width: ${(recolector.completadas / recolector.asignaciones) * 100}%"></div>
                            </div>
                        </div>

                        <!-- Acciones -->
                        <div class="flex gap-2 pt-4 border-t border-gray-200">
                            <button onclick="verHistorialRecolector(${recolector.id})" class="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-2 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1">
                                <i class="fas fa-history"></i>Historial
                            </button>
                            <button onclick="editarRecolector(${recolector.id})" class="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-2 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1">
                                <i class="fas fa-edit"></i>Editar
                            </button>
                            <button onclick="eliminarRecolector(${recolector.id})" class="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-2 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1">
                                <i class="fas fa-trash"></i>Eliminar
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function verHistorialRecolector(id) {
    const recolector = recolectores.find(r => r.id === id);
    if (!recolector) return;

    let contenido = `<div class="space-y-3">
        <div class="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
            <p class="text-sm font-semibold text-gray-900">${recolector.nombre}</p>
            <p class="text-xs text-gray-600">Email: ${recolector.email}</p>
            <p class="text-xs text-gray-600">Teléfono: ${recolector.telefono}</p>
        </div>

        <div class="border-t border-gray-200 pt-3">
            <p class="text-sm font-semibold text-gray-900 mb-2">Últimas Recolecciones:</p>
            ${recolector.historial.map(h => `
                <div class="bg-white p-2 rounded border border-gray-200 mb-2">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-semibold text-gray-900">${h.residuo} - ${h.kilos}kg</p>
                            <p class="text-xs text-gray-600">${h.fecha}</p>
                        </div>
                        <span class="px-2 py-1 text-xs bg-green-100 text-green-700 rounded font-semibold">Completada</span>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>`;

    const modal = document.getElementById('solicitudModal');
    if (modal) {
        document.getElementById('modalContent').innerHTML = contenido;
        modal.classList.remove('hidden');
    }
}

function editarRecolector(id) {
    alert(`Editar recolector #${id}`);
}

function eliminarRecolector(id) {
    if (confirm('¿Estás seguro de que deseas eliminar este recolector?')) {
        alert(`Recolector #${id} eliminado`);
    }
}

function abrirModalAgregarRecolector() {
    alert('Agregar nuevo recolector');
}

// ========== RUTAS ==========

function renderRutas() {
    const rutasView = document.getElementById('rutasView');
    if (!rutasView) return;

    rutasView.innerHTML = `
        <div class="space-y-6">
            <!-- Header -->
            <div class="bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl p-8 text-white shadow-lg">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-3xl font-bold mb-2">Gestión de Rutas</h1>
                        <p class="text-amber-100">Crea, gestiona y monitorea las rutas de recolección</p>
                    </div>
                    <div class="text-5xl opacity-20">
                        <i class="fas fa-route"></i>
                    </div>
                </div>
            </div>

            <!-- Tabs -->
            <div class="bg-white rounded-xl border border-gray-200 p-1 shadow-md flex gap-1">
                <button onclick="cambiarVistaRutas('sugeridas')" class="vista-ruta-btn flex-1 ${vistaRutasActual === 'sugeridas' ? 'active' : ''}" data-vista="sugeridas">
                    <i class="fas fa-lightbulb mr-2"></i>Rutas Sugeridas
                </button>
                <button onclick="cambiarVistaRutas('crear')" class="vista-ruta-btn flex-1 ${vistaRutasActual === 'crear' ? 'active' : ''}" data-vista="crear">
                    <i class="fas fa-plus mr-2"></i>Crear Ruta
                </button>
                <button onclick="cambiarVistaRutas('activas')" class="vista-ruta-btn flex-1 ${vistaRutasActual === 'activas' ? 'active' : ''}" data-vista="activas">
                    <i class="fas fa-road mr-2"></i>Rutas Activas
                </button>
            </div>

            <!-- Contenido según vista -->
            <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-md">
                ${vistaRutasActual === 'sugeridas' ? renderRutasSugeridas() : ''}
                ${vistaRutasActual === 'crear' ? renderCrearRuta() : ''}
                ${vistaRutasActual === 'activas' ? renderRutasActivas() : ''}
            </div>
        </div>
    `;

    // Agregar estilos para tabs mejorados
    const style = document.createElement('style');
    style.textContent = `
        .vista-ruta-btn {
            padding: 14px 20px;
            font-weight: 600;
            color: #666;
            border: none;
            transition: all 0.3s ease;
            cursor: pointer;
            background: none;
            font-size: 14px;
            border-radius: 8px;
            margin: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            white-space: nowrap;
        }
        
        .vista-ruta-btn:hover {
            color: #333;
            background: rgba(99, 102, 241, 0.1);
        }
        
        .vista-ruta-btn.active {
            color: #fff;
            background: linear-gradient(135deg, #f59e0b, #f97316);
            box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
        }
    `;
    if (!document.querySelector('style[data-admin-tabs]')) {
        style.setAttribute('data-admin-tabs', 'true');
        document.head.appendChild(style);
    }
}

function cambiarVistaRutas(vista) {
    vistaRutasActual = vista;
    pointsRuta = [];
    isDrawingRuta = false;
    renderRutas();
    
    // Inicializar mapa si es la vista de crear
    if (vista === 'crear') {
        setTimeout(() => initMapaHidalgo(), 100);
    }
}

function renderRutasSugeridas() {
    return `
        <div class="space-y-4">
            ${rutasData.sugeridas.map(ruta => `
                <div class="bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-lg p-6 border-2 border-blue-200 hover:border-blue-400 hover:shadow-xl transition-all">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-start gap-4">
                            <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white shadow-md">
                                <i class="fas fa-lightbulb text-lg"></i>
                            </div>
                            <div>
                                <h3 class="text-xl font-bold text-gray-900">${ruta.nombre}</h3>
                                <p class="text-sm text-gray-600 mt-1">${ruta.descripcion}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-xs font-semibold text-gray-600 uppercase">Sugerida por</p>
                            <p class="text-sm font-bold text-gray-900">${ruta.usuario}</p>
                            <p class="text-xs text-gray-500 mt-1">${ruta.fecha}</p>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-3 gap-3 mb-4">
                        <div class="bg-white rounded-lg p-3 border border-blue-200 text-center hover:bg-blue-50 transition-colors">
                            <p class="text-xs font-semibold text-gray-600 uppercase">Puntos</p>
                            <p class="text-2xl font-bold text-blue-600 mt-1">${ruta.puntos}</p>
                        </div>
                        <div class="bg-white rounded-lg p-3 border border-blue-200 text-center hover:bg-blue-50 transition-colors">
                            <p class="text-xs font-semibold text-gray-600 uppercase">ID Ruta</p>
                            <p class="text-2xl font-bold text-gray-900 mt-1">#${ruta.id}</p>
                        </div>
                        <div class="bg-white rounded-lg p-3 border border-blue-200 text-center hover:bg-blue-50 transition-colors">
                            <p class="text-xs font-semibold text-gray-600 uppercase">Distancia Est.</p>
                            <p class="text-2xl font-bold text-amber-600 mt-1">${ruta.puntos * 0.5}km</p>
                        </div>
                    </div>
                    
                    <div class="flex gap-2">
                        <button onclick="aceptarRutaSugerida(${ruta.id})" class="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg">
                            <i class="fas fa-check-circle"></i>Aceptar
                        </button>
                        <button onclick="rechazarRutaSugerida(${ruta.id})" class="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg">
                            <i class="fas fa-times-circle"></i>Rechazar
                        </button>
                        <button onclick="verDetallesRuta(${ruta.id})" class="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg">
                            <i class="fas fa-eye"></i>Ver
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function initMapaHidalgo() {
    const mapContainer = document.getElementById('mapContainer');
    if (!mapContainer) return;

    // Si el mapa ya existe, destruirlo
    if (mapaHidalgo) {
        mapaHidalgo.remove();
        mapaHidalgo = null;
        markersHidalgo = {};
    }

    // Crear mapa centrado en Pachuca, Hidalgo
    mapaHidalgo = L.map('mapContainer').setView([20.0871, -98.7612], 9);

    // Agregar capa de mapa
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
    }).addTo(mapaHidalgo);

    // Agregar camiones al mapa
    camionesHidalgo.forEach(camion => {
        const color = camion.estado === 'en-ruta' ? '#10b981' : camion.estado === 'pausa' ? '#f59e0b' : '#ef4444';
        const icono = L.divIcon({
            html: `
                <div class="relative">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg" style="background-color: ${color}; border: 3px solid white;">
                        <i class="fas fa-truck"></i>
                    </div>
                </div>
            `,
            iconSize: [40, 40],
            className: 'custom-marker'
        });

        const marker = L.marker([camion.lat, camion.lng], { icon: icono }).addTo(mapaHidalgo);
        
        const popupContent = `
            <div class="p-3 min-w-48">
                <h4 class="font-bold text-gray-900 mb-2">${camion.placa}</h4>
                <p class="text-xs text-gray-600"><strong>Conductor:</strong> ${camion.conductor}</p>
                <p class="text-xs text-gray-600"><strong>Ciudad:</strong> ${camion.ciudad}</p>
                <p class="text-xs text-gray-600"><strong>Recolecciones:</strong> ${camion.recolecciones}</p>
                <div class="mt-2 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full" style="background-color: ${color};"></span>
                    <span class="text-xs font-semibold text-gray-900">${camion.estado === 'en-ruta' ? 'En Ruta' : camion.estado === 'pausa' ? 'En Pausa' : 'Detenido'}</span>
                </div>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        markersHidalgo[camion.id] = marker;
    });

    // Renderizar lista de camiones
    renderCamionesListado();
}

function renderCamionesListado() {
    const listado = document.getElementById('camionesListado');
    if (!listado) return;

    listado.innerHTML = camionesHidalgo.map(camion => {
        const color = camion.estado === 'en-ruta' ? 'text-green-600' : camion.estado === 'pausa' ? 'text-yellow-600' : 'text-red-600';
        const bgColor = camion.estado === 'en-ruta' ? 'bg-green-50 border-green-200' : camion.estado === 'pausa' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
        const estadoLabel = camion.estado === 'en-ruta' ? 'En Ruta' : camion.estado === 'pausa' ? 'Pausa' : 'Detenido';

        return `
            <div class="p-3 border-2 rounded-lg ${bgColor} hover:shadow-md transition-shadow cursor-pointer" onclick="focusMarker(${camion.id})">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="font-bold text-sm text-gray-900">${camion.placa}</p>
                        <p class="text-xs text-gray-600">${camion.conductor}</p>
                        <p class="text-xs text-gray-600">${camion.ciudad}</p>
                    </div>
                    <div class="text-right">
                        <span class="inline-block w-3 h-3 rounded-full ${color}" style="background-color: ${camion.estado === 'en-ruta' ? '#10b981' : camion.estado === 'pausa' ? '#f59e0b' : '#ef4444'};"></span>
                        <p class="text-xs font-semibold ${color}">${estadoLabel}</p>
                        <p class="text-xs text-gray-600 mt-1">${camion.recolecciones} recolecciones</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function focusMarker(camionId) {
    const camion = camionesHidalgo.find(c => c.id === camionId);
    if (camion && mapaHidalgo) {
        mapaHidalgo.setView([camion.lat, camion.lng], 13);
        markersHidalgo[camionId]?.openPopup();
    }
}

function renderCrearRuta() {
    return `
        <div class="grid grid-cols-3 gap-6">
            <!-- Mapa de Hidalgo -->
            <div class="col-span-2">
                <div class="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border-2 border-gray-200 shadow-md">
                    <h3 class="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                        <i class="fas fa-map text-blue-600"></i>Mapa de Hidalgo - Vehículos Activos
                    </h3>
                    <p class="text-sm text-gray-600 mb-4">6 camiones de recolección en servicio</p>
                    
                    <div id="mapContainer" class="w-full h-96 rounded-lg border-2 border-gray-300 shadow-lg overflow-hidden bg-gray-100"></div>
                    
                    <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p class="text-xs text-blue-800 font-semibold">
                            <i class="fas fa-circle text-green-500 mr-2"></i>Verde = En ruta
                            <i class="fas fa-circle text-yellow-500 ml-4 mr-2"></i>Amarillo = Pausa
                            <i class="fas fa-circle text-red-500 ml-4 mr-2"></i>Rojo = Detenido
                        </p>
                    </div>
                </div>
            </div>

            <!-- Controles y camiones -->
            <div class="space-y-4">
                <div class="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-md">
                    <h3 class="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                        <i class="fas fa-truck text-orange-500"></i>Camiones Activos
                    </h3>
                    <p class="text-xs text-gray-600 mb-4">Estado de vehículos en tiempo real</p>
                    
                    <div id="camionesListado" class="space-y-2 max-h-96 overflow-y-auto">
                        <!-- Camiones se cargarán dinámicamente -->
                    </div>
                </div>

                <div class="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border-2 border-amber-300 shadow-md">
                    <p class="text-sm font-semibold text-amber-900 flex items-center gap-2">
                        <i class="fas fa-exclamation-triangle"></i>Información
                    </p>
                    <p class="text-xs text-amber-800 mt-2">Los camiones mostrados son de prueba. Haz clic en uno para ver detalles</p>
                </div>
            </div>
        </div>
    `;
}

function renderRutasActivas() {
    return `
        <div class="space-y-4">
            ${rutasData.activas.map((ruta, index) => `
                <div class="bg-gradient-to-br from-green-50 via-white to-green-50 rounded-lg p-6 border-2 border-green-200 hover:border-green-400 hover:shadow-xl transition-all">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-start gap-4">
                            <div class="relative">
                                <div class="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white shadow-md">
                                    <i class="fas fa-road text-lg"></i>
                                </div>
                                <div class="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                            </div>
                            <div>
                                <h3 class="text-xl font-bold text-gray-900">${ruta.nombre}</h3>
                                <p class="text-sm text-gray-600 mt-1">Estado: <span class="font-semibold text-green-600">Activa</span></p>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="inline-flex items-center gap-2 bg-green-100 px-4 py-2 rounded-full border border-green-300">
                                <span class="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                                <span class="text-sm font-bold text-green-700">En Servicio</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-4 gap-3 mb-4">
                        <div class="bg-white rounded-lg p-3 border border-green-200 text-center hover:bg-green-50 transition-colors">
                            <p class="text-xs font-semibold text-gray-600 uppercase">Ruta #</p>
                            <p class="text-2xl font-bold text-gray-900 mt-1">${ruta.id}</p>
                        </div>
                        <div class="bg-white rounded-lg p-3 border border-green-200 text-center hover:bg-green-50 transition-colors">
                            <p class="text-xs font-semibold text-gray-600 uppercase">Vehículo</p>
                            <p class="text-sm font-bold text-gray-900 mt-1">${ruta.vehiculo}</p>
                        </div>
                        <div class="bg-white rounded-lg p-3 border border-green-200 text-center hover:bg-green-50 transition-colors">
                            <p class="text-xs font-semibold text-gray-600 uppercase">Puntos</p>
                            <p class="text-2xl font-bold text-green-600 mt-1">${ruta.puntos}</p>
                        </div>
                        <div class="bg-white rounded-lg p-3 border border-green-200 text-center hover:bg-green-50 transition-colors">
                            <p class="text-xs font-semibold text-gray-600 uppercase">Progreso</p>
                            <p class="text-2xl font-bold text-blue-600 mt-1">${Math.round((index + 1) * 25)}%</p>
                        </div>
                    </div>

                    <!-- Barra de progreso -->
                    <div class="mb-4">
                        <div class="flex justify-between items-center mb-2">
                            <p class="text-xs font-semibold text-gray-600">Avance de la ruta</p>
                            <p class="text-xs font-bold text-gray-900">${Math.round((index + 1) * 25)}% completado</p>
                        </div>
                        <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div class="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all" style="width: ${(index + 1) * 25}%"></div>
                        </div>
                    </div>
                    
                    <div class="flex gap-2">
                        <button onclick="verDetallesRutaActiva(${ruta.id})" class="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg">
                            <i class="fas fa-map-marked-alt"></i>Ver en Mapa
                        </button>
                        <button onclick="pausarRuta(${ruta.id})" class="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg">
                            <i class="fas fa-pause-circle"></i>Pausar
                        </button>
                        <button onclick="detenerRuta(${ruta.id})" class="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg">
                            <i class="fas fa-stop-circle"></i>Detener
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Funciones del mapa de rutas
function iniciarDibujoRuta(event) {
    if (event.button !== 0) return; // Solo botón izquierdo
    isDrawingRuta = true;
    agregarPuntoRuta(event);
}

function dibujarRuta(event) {
    if (!isDrawingRuta) return;
    
    const svg = document.getElementById('svgRuta');
    if (!svg) return;
    
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    // Actualizar vista previa de línea
    let points = pointsRuta.map(p => `${(p.x / 100) * rect.width},${(p.y / 100) * rect.height}`).join(' ');
    if (points) points += ` ${event.clientX - rect.left},${event.clientY - rect.top}`;
    document.getElementById('rutaPolyline').setAttribute('points', points);
}

function terminarDibujoRuta() {
    isDrawingRuta = false;
}

function agregarPuntoRuta(event) {
    const rect = document.getElementById('mapaRuta').getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    pointsRuta.push({ x, y });
    renderRutas();
}

function desahcerUltimoPuntoRuta() {
    if (pointsRuta.length > 0) {
        pointsRuta.pop();
        renderRutas();
    }
}

function limpiarDibujoRuta() {
    pointsRuta = [];
    renderRutas();
}

function agregarEncargadoRuta() {
    const lista = document.getElementById('encargadosList');
    const id = 'encargado_' + Date.now();
    
    const html = `
        <div class="flex gap-2" id="${id}">
            <input type="text" placeholder="Nombre del encargado" class="flex-1 px-2 py-2 border border-gray-300 rounded text-sm">
            <button onclick="document.getElementById('${id}').remove()" class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    lista.insertAdjacentHTML('beforeend', html);
}

function guardarRuta() {
    if (pointsRuta.length < 2) {
        alert('Debes agregar al menos 2 puntos a la ruta');
        return;
    }
    
    const numero = document.getElementById('numeroRuta').value;
    const vehiculo = document.getElementById('vehiculoRuta').value;
    const matricula = document.getElementById('matriculaRuta').value;
    
    if (!numero || !vehiculo || !matricula) {
        alert('Completa todos los campos requeridos');
        return;
    }
    
    const nuevaRuta = {
        id: rutasData.activas.length + 101,
        nombre: `Ruta ${numero}`,
        vehiculo: vehiculo,
        estado: 'activa',
        puntos: pointsRuta.length
    };
    
    rutasData.activas.push(nuevaRuta);
    pointsRuta = [];
    vistaRutasActual = 'activas';
    renderRutas();
    alert('¡Ruta guardada exitosamente!');
}

function aceptarRutaSugerida(id) {
    const ruta = rutasData.sugeridas.find(r => r.id === id);
    if (ruta) {
        rutasData.activas.push({
            id: rutasData.activas.length + 101,
            nombre: ruta.nombre,
            vehiculo: 'Por asignar',
            estado: 'activa',
            puntos: ruta.puntos
        });
        rutasData.sugeridas = rutasData.sugeridas.filter(r => r.id !== id);
        vistaRutasActual = 'activas';
        renderRutas();
        alert('Ruta aceptada y activada');
    }
}

function rechazarRutaSugerida(id) {
    rutasData.sugeridas = rutasData.sugeridas.filter(r => r.id !== id);
    renderRutas();
    alert('Ruta rechazada');
}

function verDetallesRuta(id) {
    alert(`Ver detalles de ruta sugerida #${id}`);
}

function verDetallesRutaActiva(id) {
    alert(`Ver detalles de ruta activa #${id}`);
}

function pausarRuta(id) {
    alert(`Ruta #${id} pausada`);
}

function detenerRuta(id) {
    alert(`Ruta #${id} detenida`);
}

// ========== CONFIGURACIÓN ==========

function renderConfiguracion() {
    const configuracionView = document.getElementById('configuracionView');
    if (!configuracionView) return;

    configuracionView.innerHTML = `
        <div class="space-y-6">
            <!-- Header -->
            <div class="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-8 text-white shadow-lg">
                <h1 class="text-3xl font-bold mb-2">Configuración del Sistema</h1>
                <p class="text-blue-100">Ajusta los parámetros y opciones de EcoRecolección</p>
            </div>

            <!-- Configuración General -->
            <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-lg transition-shadow">
                <div class="flex items-center gap-4 mb-6">
                    <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white shadow-md">
                        <i class="fas fa-cog text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-gray-900">Configuración General</h3>
                        <p class="text-sm text-gray-600">Parámetros principales del sistema</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">
                            <i class="fas fa-tag mr-2 text-blue-500"></i>Nombre del Sistema
                        </label>
                        <input 
                            type="text" 
                            id="nombreSistema"
                            value="EcoRecolección" 
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">
                            <i class="fas fa-clock mr-2 text-blue-500"></i>Tiempo de Respuesta (horas)
                        </label>
                        <input 
                            type="number" 
                            id="tiempoRespuesta"
                            value="24" 
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                </div>
            </div>

            <!-- Información de Contacto -->
            <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-lg transition-shadow">
                <div class="flex items-center gap-4 mb-6">
                    <div class="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white shadow-md">
                        <i class="fas fa-envelope text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-gray-900">Información de Contacto</h3>
                        <p class="text-sm text-gray-600">Datos para atención al cliente</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">
                            <i class="fas fa-at mr-2 text-green-500"></i>Email de Soporte
                        </label>
                        <input 
                            type="email" 
                            id="emailSoporte"
                            value="soporte@ecorecoleccion.com" 
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">
                            <i class="fas fa-phone mr-2 text-green-500"></i>Teléfono de Soporte
                        </label>
                        <input 
                            type="text" 
                            id="telefonoSoporte"
                            value="01-800-RESIDUOS" 
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        />
                    </div>
                </div>
            </div>

            <!-- Notificaciones -->
            <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-lg transition-shadow">
                <div class="flex items-center gap-4 mb-6">
                    <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-md">
                        <i class="fas fa-bell text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-gray-900">Notificaciones</h3>
                        <p class="text-sm text-gray-600">Configurar alertas del sistema</p>
                    </div>
                </div>

                <div class="space-y-3">
                    <label class="flex items-center gap-4 p-4 hover:bg-purple-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-purple-200">
                        <div class="relative">
                            <input 
                                type="checkbox" 
                                id="notificacionesEmail"
                                checked 
                                class="w-5 h-5 text-purple-600 rounded cursor-pointer"
                            />
                            <span class="absolute inset-0 rounded ring-2 ring-purple-300 opacity-0 transition-opacity"></span>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-semibold text-gray-900">Notificaciones por Email</p>
                            <p class="text-xs text-gray-600">Enviar actualizaciones importantes por correo electrónico</p>
                        </div>
                        <div class="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                            <i class="fas fa-check text-green-600 text-xs"></i>
                        </div>
                    </label>
                    <label class="flex items-center gap-4 p-4 hover:bg-purple-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-purple-200">
                        <div class="relative">
                            <input 
                                type="checkbox" 
                                id="notificacionesPush"
                                checked 
                                class="w-5 h-5 text-purple-600 rounded cursor-pointer"
                            />
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-semibold text-gray-900">Notificaciones Push</p>
                            <p class="text-xs text-gray-600">Alertas en tiempo real para eventos críticos</p>
                        </div>
                        <div class="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                            <i class="fas fa-check text-green-600 text-xs"></i>
                        </div>
                    </label>
                </div>
            </div>

            <!-- Sistema -->
            <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-lg transition-shadow">
                <div class="flex items-center gap-4 mb-6">
                    <div class="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-white shadow-md">
                        <i class="fas fa-shield-alt text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-gray-900">Sistema</h3>
                        <p class="text-sm text-gray-600">Opciones de procesamiento automático</p>
                    </div>
                </div>

                <div class="space-y-3">
                    <label class="flex items-center gap-4 p-4 hover:bg-orange-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-orange-200">
                        <div class="relative">
                            <input 
                                type="checkbox" 
                                id="autoAsignacion"
                                checked 
                                class="w-5 h-5 text-orange-600 rounded cursor-pointer"
                            />
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-semibold text-gray-900">Auto-asignación de Recolectores</p>
                            <p class="text-xs text-gray-600">Asignar automáticamente recolectores a nuevas solicitudes</p>
                        </div>
                        <div class="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                            <i class="fas fa-check text-green-600 text-xs"></i>
                        </div>
                    </label>
                </div>
            </div>

            <!-- Base de Datos -->
            <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-lg transition-shadow">
                <div class="flex items-center gap-4 mb-6">
                    <div class="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center text-white shadow-md">
                        <i class="fas fa-database text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-gray-900">Base de Datos</h3>
                        <p class="text-sm text-gray-600">Gestión de copias de seguridad</p>
                    </div>
                </div>

                <div class="space-y-4">
                    <label class="flex items-center gap-4 p-4 hover:bg-cyan-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-cyan-200">
                        <input 
                            type="checkbox" 
                            id="backupAutomatico"
                            checked 
                            class="w-5 h-5 text-cyan-600 rounded cursor-pointer"
                        />
                        <div class="flex-1">
                            <p class="text-sm font-semibold text-gray-900">Backup Automático</p>
                            <p class="text-xs text-gray-600">Realizar copias de seguridad periódicas</p>
                        </div>
                        <div class="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                            <i class="fas fa-check text-green-600 text-xs"></i>
                        </div>
                    </label>

                    <div class="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                        <label class="block text-sm font-semibold text-gray-900 mb-3">
                            <i class="fas fa-calendar mr-2 text-cyan-600"></i>Frecuencia de Backup
                        </label>
                        <select 
                            id="frecuenciaBackup"
                            class="w-full px-4 py-3 border border-cyan-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all bg-white"
                        >
                            <option value="diaria">📅 Diaria</option>
                            <option value="semanal">📆 Semanal</option>
                            <option value="mensual">📋 Mensual</option>
                        </select>
                    </div>

                    <button 
                        type="button" 
                        onclick="crearBackupAhora()"
                        class="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg hover:from-cyan-600 hover:to-cyan-700 transition-all font-semibold shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                        <i class="fas fa-download"></i>Crear Backup Ahora
                    </button>
                </div>
            </div>

            <!-- Usuarios y Permisos -->
            <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-lg transition-shadow">
                <div class="flex items-center gap-4 mb-6">
                    <div class="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
                        <i class="fas fa-users text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-gray-900">Usuarios y Permisos</h3>
                        <p class="text-sm text-gray-600">Estadísticas de acceso al sistema</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-5 border border-indigo-200 hover:shadow-md transition-shadow">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-semibold text-gray-900">Administradores</p>
                                <p class="text-xs text-gray-600 mt-1">Con acceso total</p>
                            </div>
                            <div class="text-right">
                                <p class="text-3xl font-bold text-indigo-600">3</p>
                            </div>
                        </div>
                        <div class="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div class="h-full bg-indigo-500 rounded-full" style="width: 100%"></div>
                        </div>
                    </div>

                    <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5 border border-green-200 hover:shadow-md transition-shadow">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-semibold text-gray-900">Recolectores</p>
                                <p class="text-xs text-gray-600 mt-1">Personal activo</p>
                            </div>
                            <div class="text-right">
                                <p class="text-3xl font-bold text-green-600">12</p>
                            </div>
                        </div>
                        <div class="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div class="h-full bg-green-500 rounded-full" style="width: 70%"></div>
                        </div>
                    </div>

                    <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 border border-blue-200 hover:shadow-md transition-shadow">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-semibold text-gray-900">Ciudadanos</p>
                                <p class="text-xs text-gray-600 mt-1">Registrados</p>
                            </div>
                            <div class="text-right">
                                <p class="text-3xl font-bold text-blue-600">1.2K</p>
                            </div>
                        </div>
                        <div class="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div class="h-full bg-blue-500 rounded-full" style="width: 85%"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Botones de Acción -->
            <div class="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button 
                    type="button" 
                    onclick="changeView('panel')"
                    class="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold flex items-center gap-2"
                >
                    <i class="fas fa-times"></i>Cancelar
                </button>
                <button 
                    type="button" 
                    onclick="guardarConfiguracion()"
                    class="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
                >
                    <i class="fas fa-save"></i>Guardar Cambios
                </button>
            </div>
        </div>
    `;
}

function guardarConfiguracion(event) {
    event.preventDefault();
    alert('¡Configuración guardada exitosamente!');
}

function guardarConfiguracion() {
    // Crear notificación de éxito con efecto visual
    const nombreSistema = document.getElementById('nombreSistema')?.value || 'EcoRecolección';
    const emailSoporte = document.getElementById('emailSoporte')?.value || 'soporte@ecorecoleccion.com';
    
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.innerHTML = `
        <div class="fixed bottom-4 right-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg shadow-xl p-4 flex items-center gap-3 z-50 animate-pulse">
            <i class="fas fa-check-circle text-2xl"></i>
            <div>
                <p class="font-bold">¡Guardado con éxito!</p>
                <p class="text-sm opacity-90">Los cambios se han aplicado correctamente</p>
            </div>
            <button onclick="this.parentElement.remove()" class="ml-4 text-white opacity-70 hover:opacity-100">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    document.body.appendChild(notification.firstElementChild);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        document.querySelector('.animate-pulse')?.remove();
    }, 3000);
}

function crearBackupAhora() {
    const btn = event.target;
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creando backup...';
    btn.disabled = true;
    
    setTimeout(() => {
        const notification = document.createElement('div');
        notification.innerHTML = `
            <div class="fixed bottom-4 right-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-xl p-4 flex items-center gap-3 z-50">
                <i class="fas fa-database text-2xl"></i>
                <div>
                    <p class="font-bold">Backup completado</p>
                    <p class="text-sm opacity-90">Base de datos respaldada correctamente</p>
                </div>
            </div>
        `;
        document.body.appendChild(notification.firstElementChild);
        
        btn.innerHTML = originalText;
        btn.disabled = false;
        
        setTimeout(() => {
            document.querySelector('[data-backup-notification]')?.remove();
        }, 3000);
    }, 2000);
}

// ========== REPORTES Y QUEJAS ==========

// Estado para quejas
let filtroQuejasEstado = 'todas';
let quejaSeleccionada = null;



function renderReportes() {
    const reportesView = document.getElementById('reportesView');
    if (!reportesView) return;

    reportesView.innerHTML = `
        <div class="space-y-6">
            <!-- Header -->
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h1 class="text-gray-800 mb-1 text-2xl font-bold">Reportes y Quejas</h1>
                    <p class="text-sm text-gray-500">Gestión de incidencias del sistema</p>
                </div>
                <div class="flex items-center gap-3">
                    <i class="fas fa-filter text-gray-500"></i>
                    <select
                        id="filtroQuejas"
                        onchange="filtrarQuejas()"
                        class="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                        <option value="todas">Todas</option>
                        <option value="pendiente">Pendientes</option>
                        <option value="en-revision">En Revisión</option>
                        <option value="resuelta">Resueltas</option>
                        <option value="cerrada">Cerradas</option>
                    </select>
                </div>
            </div>

            <!-- Tabla de Quejas -->
            <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th class="text-left px-6 py-4 text-sm text-gray-700 font-semibold">ID</th>
                                <th class="text-left px-6 py-4 text-sm text-gray-700 font-semibold">Usuario</th>
                                <th class="text-left px-6 py-4 text-sm text-gray-700 font-semibold">Motivo</th>
                                <th class="text-left px-6 py-4 text-sm text-gray-700 font-semibold">Fecha</th>
                                <th class="text-left px-6 py-4 text-sm text-gray-700 font-semibold">Prioridad</th>
                                <th class="text-left px-6 py-4 text-sm text-gray-700 font-semibold">Estado</th>
                                <th class="text-left px-6 py-4 text-sm text-gray-700 font-semibold">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="tablaCuerpoQuejas">
                            ${renderFilasQuejas()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderFilasQuejas() {
    const filtro = document.getElementById('filtroQuejas')?.value || filtroQuejasEstado || 'todas';
    const quejasFiltradas = filtro === 'todas' ? quejas : quejas.filter(q => q.estado === filtro);

    return quejasFiltradas.map(queja => `
        <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4 text-sm text-gray-800 font-semibold">#${queja.id}</td>
            <td class="px-6 py-4 text-sm text-gray-700">${queja.usuario}</td>
            <td class="px-6 py-4 text-sm text-gray-700">${queja.motivo}</td>
            <td class="px-6 py-4 text-sm text-gray-600">${queja.fecha}</td>
            <td class="px-6 py-4">${getPrioridadBadgeQuejas(queja.prioridad)}</td>
            <td class="px-6 py-4">${getEstadoBadgeQuejas(queja.estado)}</td>
            <td class="px-6 py-4">
                <button
                    onclick="verDetalleQueja(${queja.id})"
                    class="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                    <i class="fas fa-eye"></i>Ver
                </button>
            </td>
        </tr>
    `).join('');
}

function getEstadoBadgeQuejas(estado) {
    const styles = {
        pendiente: 'bg-orange-100 text-orange-700 border-orange-300',
        'en-revision': 'bg-blue-100 text-blue-700 border-blue-300',
        resuelta: 'bg-green-100 text-green-700 border-green-300',
        cerrada: 'bg-gray-100 text-gray-700 border-gray-300',
    };
    const labels = {
        pendiente: 'Pendiente',
        'en-revision': 'En Revisión',
        resuelta: 'Resuelta',
        cerrada: 'Cerrada',
    };
    return `<span class="px-3 py-1 rounded-full text-xs border ${styles[estado] || styles['pendiente']}">${labels[estado] || estado}</span>`;
}

function getPrioridadBadgeQuejas(prioridad) {
    const styles = {
        alta: 'bg-red-100 text-red-700 border-red-300',
        media: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        baja: 'bg-gray-100 text-gray-700 border-gray-300',
    };
    const labels = {
        alta: 'Alta',
        media: 'Media',
        baja: 'Baja',
    };
    return `<span class="px-3 py-1 rounded-full text-xs border ${styles[prioridad] || styles['baja']}">${labels[prioridad] || prioridad}</span>`;
}

function filtrarQuejas() {
    filtroQuejasEstado = document.getElementById('filtroQuejas').value;
    const tablaCuerpo = document.getElementById('tablaCuerpoQuejas');
    if (tablaCuerpo) {
        tablaCuerpo.innerHTML = renderFilasQuejas();
    }
}

function verDetalleQueja(quejaId) {
    quejaSeleccionada = quejas.find(q => q.id === quejaId);
    if (!quejaSeleccionada) return;

    const modal = document.getElementById('quejaModal');
    if (!modal) return;

    const estadoColor = {
        'pendiente': 'from-orange-500 to-orange-600',
        'en-revision': 'from-blue-500 to-blue-600',
        'resuelta': 'from-green-500 to-green-600',
        'cerrada': 'from-gray-500 to-gray-600',
    };

    document.getElementById('quejaModalContent').innerHTML = `
        <div class="space-y-6">
            <!-- Encabezado con ID y Fecha -->
            <div class="bg-gradient-to-r ${estadoColor[quejaSeleccionada.estado] || estadoColor['pendiente']} rounded-lg p-6 text-white">
                <div class="flex items-start justify-between">
                    <div>
                        <p class="text-sm opacity-90">QUEJA ID</p>
                        <h2 class="text-3xl font-bold">#${quejaSeleccionada.id}</h2>
                    </div>
                    <div class="text-right">
                        <p class="text-sm opacity-90">${quejaSeleccionada.fecha}</p>
                    </div>
                </div>
            </div>

            <!-- Información General -->
            <div>
                <h3 class="text-gray-800 font-bold mb-4">Información General</h3>
                <div class="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-xs text-gray-500 mb-1 font-semibold">Usuario</p>
                            <p class="text-sm text-gray-800 font-medium">${quejaSeleccionada.usuario}</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 mb-1 font-semibold">Motivo</p>
                            <p class="text-sm text-gray-800 font-medium">${quejaSeleccionada.motivo}</p>
                        </div>
                        ${quejaSeleccionada.solicitud ? `
                            <div>
                                <p class="text-xs text-gray-500 mb-1 font-semibold">Solicitud Relacionada</p>
                                <p class="text-sm text-gray-800 font-medium">#${quejaSeleccionada.solicitud}</p>
                            </div>
                        ` : ''}
                        ${quejaSeleccionada.recolector ? `
                            <div>
                                <p class="text-xs text-gray-500 mb-1 font-semibold">Recolector Involucrado</p>
                                <p class="text-sm text-gray-800 font-medium">${quejaSeleccionada.recolector}</p>
                            </div>
                        ` : ''}
                    </div>
                    <div class="pt-3 border-t border-gray-200">
                        <p class="text-xs text-gray-500 mb-1 font-semibold">Descripción</p>
                        <p class="text-sm text-gray-800">${quejaSeleccionada.descripcion}</p>
                    </div>
                </div>
            </div>

            <!-- Badges de Estado y Prioridad -->
            <div class="flex gap-3 flex-wrap">
                <div>
                    <p class="text-xs text-gray-500 mb-2 font-semibold">Prioridad</p>
                    ${getPrioridadBadgeQuejas(quejaSeleccionada.prioridad)}
                </div>
                <div>
                    <p class="text-xs text-gray-500 mb-2 font-semibold">Estado</p>
                    ${getEstadoBadgeQuejas(quejaSeleccionada.estado)}
                </div>
            </div>

            <!-- Acciones -->
            <div>
                <h3 class="text-gray-800 font-bold mb-4">Asignar Solución</h3>
                <div class="space-y-2">
                    <button
                        onclick="asignarSolucion('marcar-resuelta')"
                        class="w-full flex items-center gap-3 px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors border border-green-200 font-semibold"
                    >
                        <i class="fas fa-check-circle"></i>
                        Marcar como Resuelta
                    </button>
                    ${quejaSeleccionada.recolector ? `
                        <button
                            onclick="asignarSolucion('cambiar-recolector')"
                            class="w-full flex items-center gap-3 px-4 py-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors border border-orange-200 font-semibold"
                        >
                            <i class="fas fa-sync"></i>
                            Reasignar Recolector
                        </button>
                    ` : ''}
                    <button
                        onclick="asignarSolucion('en-revision')"
                        class="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200 font-semibold"
                    >
                        <i class="fas fa-user"></i>
                        Poner en Revisión
                    </button>
                    <button
                        onclick="asignarSolucion('cerrar')"
                        class="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 font-semibold"
                    >
                        <i class="fas fa-times-circle"></i>
                        Cerrar Queja
                    </button>
                </div>
            </div>

            <!-- Nota informativa -->
            <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p class="text-sm text-blue-800">
                    <strong>Nota:</strong> Al asignar una solución, se notificará automáticamente al usuario sobre las acciones tomadas.
                </p>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

function cerrarQuejaModal() {
    const modal = document.getElementById('quejaModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function asignarSolucion(tipo) {
    const acciones = {
        'marcar-resuelta': { label: 'Marcada como Resuelta', icon: 'check-circle', bg: 'bg-green-500 to-green-600' },
        'cambiar-recolector': { label: 'Recolector Reasignado', icon: 'sync', bg: 'bg-orange-500 to-orange-600' },
        'en-revision': { label: 'Puesta en Revisión', icon: 'user', bg: 'bg-blue-500 to-blue-600' },
        'cerrar': { label: 'Queja Cerrada', icon: 'times-circle', bg: 'bg-gray-500 to-gray-600' },
    };

    const accion = acciones[tipo];
    if (!accion) return;

    // Mostrar notificación con estilos inline
    const notification = document.createElement('div');
    const styles = {
        'marcar-resuelta': 'background: linear-gradient(135deg, #10b981, #059669);',
        'cambiar-recolector': 'background: linear-gradient(135deg, #f97316, #ea580c);',
        'en-revision': 'background: linear-gradient(135deg, #3b82f6, #1d4ed8);',
        'cerrar': 'background: linear-gradient(135deg, #6b7280, #4b5563);',
    };

    notification.innerHTML = `
        <div class="fixed top-4 right-4 text-white rounded-lg shadow-xl p-4 flex items-center gap-3 z-50 animate-slide-in" style="${styles[tipo]}">
            <i class="fas fa-${accion.icon} text-2xl"></i>
            <div>
                <p class="font-bold">¡Éxito!</p>
                <p class="text-sm opacity-90">Queja #${quejaSeleccionada.id} - ${accion.label}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white opacity-70 hover:opacity-100">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    document.body.appendChild(notification.firstElementChild);

    // Determinar nuevo estado
    let nuevoEstado = quejaSeleccionada.estado;
    if (tipo === 'marcar-resuelta') {
        nuevoEstado = 'resuelta';
    } else if (tipo === 'en-revision') {
        nuevoEstado = 'en-revision';
    } else if (tipo === 'cerrar') {
        nuevoEstado = 'cerrada';
    }

    // Persistir en backend
    (async () => {
        try {
            const res = await fetch(`/api/admin/quejas/${quejaSeleccionada.id}/estado`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevoEstado, prioridad: quejaSeleccionada.prioridad || 'baja' })
            });
            const resp = await res.json();
            if (resp && resp.success) {
                const estadoConfirmado = resp.estado || nuevoEstado;
                quejaSeleccionada.estado = estadoConfirmado;
                const idx = quejas.findIndex(q => q.id === quejaSeleccionada.id);
                if (idx !== -1) quejas[idx].estado = estadoConfirmado;
                // Refrescar tabla de inmediato
                renderReportes();
            } else {
                console.warn('No se pudo actualizar la queja en el backend:', resp);
            }
        } catch (e) {
            console.error('Error persistiendo estado de queja:', e);
        }
    })();

    // Cerrar modal
    setTimeout(() => {
        cerrarQuejaModal();
        renderReportes();
    }, 1500);

    // Remover notificación
    setTimeout(() => {
        document.querySelector('.animate-slide-in')?.remove();
    }, 4000);
}

// Función para cerrar sesión
async function cerrarSesion() {
    try {
        // Llamar al endpoint de logout para cerrar sesión en el servidor
        await fetch('/logout', {
            method: 'GET',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
    
    // Limpiar datos de sesión local
    sessionStorage.clear();
    localStorage.clear();
    
    // Redirigir a la página de inicio
    window.location.href = '/';
}
