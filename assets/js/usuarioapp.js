// Estado global de la aplicación
let currentView = 'inicio';
let notifications = [
    'Tu solicitud #1234 ha sido completada',
    'Nueva ruta disponible en tu zona',
    'Recordatorio: Recolección programada mañana'
];
let userProfile = null;
let currentMap = null;
let currentMarker = null;
let mapboxToken = null;

// Inicialización
document.addEventListener('DOMContentLoaded', async function() {
    // Cargar token de Mapbox desde backend
    await loadMapboxToken();
    // Cargar perfil y vista inicial
    loadUserProfile();
    changeView('inicio');
});

async function cerrarSesion() {
    try {
        await fetch('/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
        console.warn('No se pudo llamar /logout, redirigiendo de todas formas');
    } finally {
        window.location.href = '/';
    }
}

// Cargar token Mapbox y configurar capa base
async function loadMapboxToken() {
    try {
        const res = await fetch('/api/config/mapbox-token');
        if (res.ok) {
            const data = await res.json();
            mapboxToken = data.token || null;
            console.log('Token Mapbox cargado:', !!mapboxToken);
        }
    } catch (e) {
        console.warn('No se pudo cargar el token Mapbox:', e);
    }
}

function addBaseTileLayer(map) {
    if (mapboxToken) {
        L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=' + mapboxToken, {
            id: 'mapbox/streets-v12',
            tileSize: 512,
            zoomOffset: -1,
            attribution: '© Mapbox © OpenStreetMap',
            maxZoom: 18
        }).addTo(map);
    } else {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(map);
    }
}

// Cargar perfil del usuario
async function loadUserProfile() {
    try {
        const response = await fetch('/api/usuario/perfil');
        if (response.ok) {
            userProfile = await response.json();
            document.getElementById('headerUserName').textContent = `${userProfile.nombre} ${userProfile.apellidos}`;
        }
    } catch (error) {
        console.error('Error al cargar perfil:', error);
    }
}

// Cambiar entre vistas
function changeView(view) {
    currentView = view;
    updateSidebar();
    renderView();
}

// Actualizar estado del sidebar
function updateSidebar() {
    const buttons = document.querySelectorAll('.sidebar-menu-item');
    buttons.forEach(button => {
        const viewName = button.getAttribute('data-view');
        if (viewName === currentView) {
            button.className = 'sidebar-menu-item w-full flex items-center gap-3 px-3 py-3 rounded-lg mb-1 bg-white text-black shadow-lg';
        } else {
            button.className = 'sidebar-menu-item w-full flex items-center gap-3 px-3 py-3 rounded-lg mb-1 text-blue-50 hover:bg-blue-500/30';
        }
    });
}

// Renderizar la vista actual
function renderView() {
    const mainContent = document.getElementById('mainContent');
    
    // Limpiar mapa si existe
    if (currentMap) {
        currentMap.remove();
        currentMap = null;
        currentMarker = null;
    }
    
    switch(currentView) {
        case 'inicio':
            mainContent.innerHTML = renderDashboard();
            break;
        case 'solicitar':
            mainContent.innerHTML = renderSolicitarRecoleccion();
            initSolicitarForm();
            break;
        case 'mis-solicitudes':
            mainContent.innerHTML = renderMisSolicitudes();
            initMisSolicitudes();
            break;
        case 'seguimiento':
            mainContent.innerHTML = renderSeguimiento();
            initSeguimiento();
            break;
        case 'quejas':
            mainContent.innerHTML = renderQuejas();
            initQuejas();
            break;
        case 'perfil':
            mainContent.innerHTML = renderPerfil();
            initPerfil();
            break;
        default:
            mainContent.innerHTML = renderDashboard();
    }
}

// Toggle notificaciones
function toggleNotifications() {
    const panel = document.getElementById('notificationsPanel');
    panel.classList.toggle('hidden');
}

// DASHBOARD
function renderDashboard() {
    loadEstadisticas();
    
    return `
        <div>
            <h1 class="text-3xl font-bold text-gray-800 mb-6">Inicio</h1>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-xl shadow-sm border border-green-200 p-6 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between mb-4">
                        <div class="p-3 border border-green-300 bg-white rounded-lg shadow-sm">
                            <svg class="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                            </svg>
                        </div>
                    </div>
                    <h3 class="text-gray-500 text-sm mb-1">Solicitudes Totales</h3>
                    <p id="stat-total" class="text-3xl font-bold text-green-700">...</p>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-green-200 p-6 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between mb-4">
                        <div class="p-3 border border-green-300 bg-white rounded-lg shadow-sm">
                            <svg class="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                    </div>
                    <h3 class="text-gray-500 text-sm mb-1">Solicitudes Pendientes</h3>
                    <p id="stat-pendientes" class="text-3xl font-bold text-green-700">...</p>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-green-200 p-6 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between mb-4">
                        <div class="p-3 border border-green-300 bg-white rounded-lg shadow-sm">
                            <svg class="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                    </div>
                    <h3 class="text-gray-500 text-sm mb-1">Solicitudes Completadas</h3>
                    <p id="stat-completadas" class="text-3xl font-bold text-green-700">...
                    </p>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-green-200 p-6 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between mb-4">
                        <div class="p-3 border border-green-300 bg-white rounded-lg shadow-sm">
                            <svg class="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                            </svg>
                        </div>
                    </div>
                    <h3 class="text-gray-500 text-sm mb-1">Total de Residuos</h3>
                    <p id="stat-kilos" class="text-3xl font-bold text-green-700">...</p>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 class="text-xl font-semibold text-gray-800 mb-4">🎯 Actividad Reciente</h3>
                    <div id="actividadReciente" class="space-y-4">
                        <p class="text-sm text-gray-500">Cargando...</p>
                    </div>
                </div>

                <div class="bg-gradient-to-br from-green-500 to-teal-600 rounded-xl shadow-sm p-6 text-white">
                    <h3 class="text-xl font-semibold mb-4">♻️ Impacto Ambiental</h3>
                    <div class="space-y-4">
                        <div class="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                            <p class="text-sm text-green-50 mb-1">CO₂ Reducido</p>
                            <p class="text-2xl font-bold">156 kg</p>
                        </div>
                        <div class="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                            <p class="text-sm text-green-50 mb-1">Árboles Equivalentes</p>
                            <p class="text-2xl font-bold">8 árboles</p>
                        </div>
                        <p class="text-sm text-green-50 mt-4">
                            ¡Gracias por contribuir a un planeta más limpio! 🌍
                        </p>
                    </div>
                </div>
            </div>

            <div class="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-4">📊 Residuos por Tipo</h3>
                <div id="residuosPorTipo" class="space-y-3">
                    <p class="text-sm text-gray-500">Cargando estadísticas...</p>
                </div>
            </div>

            <div class="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-3">💡 Consejos para Reciclar</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="flex gap-3">
                        <span class="text-2xl">♻️</span>
                        <div>
                            <p class="text-sm font-medium text-gray-700">Separa tus residuos</p>
                            <p class="text-xs text-gray-600">Orgánicos, plástico, vidrio y papel</p>
                        </div>
                    </div>
                    <div class="flex gap-3">
                        <span class="text-2xl">🧹</span>
                        <div>
                            <p class="text-sm font-medium text-gray-700">Limpia antes de reciclar</p>
                            <p class="text-xs text-gray-600">Evita contaminación cruzada</p>
                        </div>
                    </div>
                    <div class="flex gap-3">
                        <span class="text-2xl">📦</span>
                        <div>
                            <p class="text-sm font-medium text-gray-700">Compacta los residuos</p>
                            <p class="text-xs text-gray-600">Ahorra espacio y facilita el transporte</p>
                        </div>
                    </div>
                    <div class="flex gap-3">
                        <span class="text-2xl">🎯</span>
                        <div>
                            <p class="text-sm font-medium text-gray-700">Planifica tus solicitudes</p>
                            <p class="text-xs text-gray-600">Agrupa residuos similares</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Cargar estadísticas desde el backend
async function loadEstadisticas() {
    try {
        const response = await fetch('/api/usuario/estadisticas');
        if (response.ok) {
            const data = await response.json();
            
            document.getElementById('stat-total').textContent = data.total;
            document.getElementById('stat-pendientes').textContent = data.pendientes;
            document.getElementById('stat-completadas').textContent = data.completadas;
            document.getElementById('stat-kilos').textContent = data.total_kilos + ' kg';
            
            // Renderizar actividad reciente con detalles de recolecciones completadas
            const actividadDiv = document.getElementById('actividadReciente');
            if (data.actividad && data.actividad.length > 0) {
                actividadDiv.innerHTML = data.actividad.map(act => {
                    const fecha = new Date(act.fecha_finalizacion).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
                    const hora = new Date(act.fecha_finalizacion).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                    const kilos = act.kilos_recolectados ? act.kilos_recolectados.toFixed(2) : '0.00';
                    const duracion = act.duracion_horas ? act.duracion_horas.toFixed(1) : '--';
                    
                    // Mapear tipo_evidencia a un icono y color
                    let iconoTipo = '✅';
                    if (act.tipo_evidencia === 'completada') iconoTipo = '✅ Completada';
                    else if (act.tipo_evidencia === 'completada-usuario') iconoTipo = '👤 Con Usuario';
                    else if (act.tipo_evidencia === 'no-encontrada') iconoTipo = '🔍 No Encontrada';
                    else if (act.tipo_evidencia === 'no-completada') iconoTipo = '❌ No Completada';
                    
                    return `
                        <div class="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0">
                            <div class="w-8 h-8 rounded-full flex-shrink-0 bg-green-100 flex items-center justify-center">
                                <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                                </svg>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-start justify-between gap-2">
                                    <div>
                                        <p class="text-sm font-medium text-gray-900">Solicitud #${act.id_solicitud}</p>
                                        <p class="text-xs text-gray-500 mt-0.5">${act.tipo_residuo} • ${kilos} kg</p>
                                        <p class="text-xs text-gray-400 mt-1">📍 ${fecha} a las ${hora}</p>
                                    </div>
                                    <span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full whitespace-nowrap">✅ Completada</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                actividadDiv.innerHTML = '<p class="text-sm text-gray-500">No hay recolecciones completadas aún</p>';
            }
            
            // Renderizar estadísticas por tipo de residuo si existen
            if (data.residuos_stats && Object.keys(data.residuos_stats).length > 0) {
                const residuosDiv = document.getElementById('residuosPorTipo');
                if (residuosDiv) {
                    residuosDiv.innerHTML = Object.entries(data.residuos_stats).map(([tipo, stats]) => `
                        <div class="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                            <div>
                                <p class="text-sm font-medium text-gray-700">${tipo}</p>
                                <p class="text-xs text-gray-500">${stats.cantidad} recolecciones</p>
                            </div>
                            <div class="text-right">
                                <p class="text-sm font-semibold text-green-600">${(stats.kilos || 0).toFixed(2)} kg</p>
                            </div>
                        </div>
                    `).join('');
                }
            }
        }
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

// SOLICITAR RECOLECCIÓN
function renderSolicitarRecoleccion() {
    return `
        <div>
            <h1 class="text-3xl font-bold text-gray-800 mb-6">Solicitar Recolección</h1>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 class="text-xl font-semibold text-gray-800 mb-4">Datos de la Solicitud</h3>
                    <form id="solicitudForm" class="space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Calle</label>
                                <input type="text" id="dir_calle" placeholder="Ej: Av. Revolución" 
                                       class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Colonia</label>
                                <input type="text" id="dir_colonia" placeholder="Ej: Centro" 
                                       class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Número exterior <span class="text-gray-400">(opcional)</span></label>
                                <input type="text" id="dir_num_ext" placeholder="Ej: 123" 
                                       class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Código Postal</label>
                                <input type="text" id="dir_cp" placeholder="Ej: 42000" 
                                       class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" required>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Referencias <span class="text-gray-400">(opcional)</span></label>
                            <input type="text" id="direccion" placeholder="Punto de referencia adicional" 
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Kilos de Residuos (aproximado)</label>
                            <input type="number" id="kilos" placeholder="Ej: 15" 
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" required>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Residuo</label>
                            <select id="tipoResiduo" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                                <option value="plastico">Plástico</option>
                                <option value="papel">Papel y Cartón</option>
                                <option value="vidrio">Vidrio</option>
                                <option value="metal">Metal</option>
                                <option value="organico">Orgánico</option>
                                <option value="electronico">Electrónico</option>
                                <option value="mixto">Mixto</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Información Adicional</label>
                            <textarea id="informacion" placeholder="Detalles relevantes sobre la recolección..." rows="4"
                                      class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"></textarea>
                        </div>

                        <div class="pt-2">
                            <button type="submit" class="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2 shadow-md">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                                </svg>
                                Enviar Solicitud
                            </button>
                        </div>
                    </form>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 class="text-xl font-semibold text-gray-800 mb-4">Ubicación</h3>
                    
                    <button type="button" onclick="obtenerUbicacion()" 
                            class="w-full mb-4 bg-green-50 border-2 border-green-500 text-green-700 px-4 py-3 rounded-lg hover:bg-green-100 transition-colors flex items-center justify-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                        </svg>
                        Obtener Ubicación Actual
                    </button>

                    <div id="ubicacionMsg" class="hidden mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p class="text-sm text-green-800">✓ Ubicación obtenida</p>
                    </div>

                    <div id="mapaSolicitud" class="relative bg-gradient-to-br from-green-100 to-blue-100 rounded-lg overflow-hidden" style="height: 400px;">
                    </div>
                </div>
            </div>
        </div>
    `;
}

function initSolicitarForm() {
    // Inicializar mapa Leaflet con timeout más largo
    setTimeout(() => {
        const mapElement = document.getElementById('mapaSolicitud');
        console.log('Inicializando mapa...', mapElement);
        
        if (mapElement && !currentMap) {
            try {
                // Crear el mapa centrado en la ubicación actual
                // Coordenadas de Tulancingo de Bravo, Hidalgo
                currentMap = L.map('mapaSolicitud', {
                    center: [20.082, -98.363],
                    zoom: 12,
                    minZoom: 3,
                    maxZoom: 18
                });
                console.log('Mapa creado centrado en ubicación', currentMap);
                
                // Agregar capa base (Mapbox si hay token, OSM si no)
                addBaseTileLayer(currentMap);
                
                // Agregar marcador draggable temporal (centro de Tulancingo, Hidalgo)
                currentMarker = L.marker([20.082, -98.363], {
                    draggable: true,
                    title: 'Arrastra para cambiar ubicación'
                }).addTo(currentMap);
                currentMarker.bindPopup('Tulancingo de Bravo, Hidalgo - Arrastra para ajustar').openPopup();
                
                // Forzar actualización del tamaño del mapa
                setTimeout(() => {
                    currentMap.invalidateSize();
                }, 100);
                
                // Evento cuando se mueve el marcador
                currentMarker.on('dragend', function(event) {
                    const position = event.target.getLatLng();
                    document.getElementById('ubicacionMsg').classList.remove('hidden');
                    document.getElementById('ubicacionMsg').innerHTML = `<p class="text-sm text-green-800">✓ Ubicación seleccionada: ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}</p>`;
                });
                
                // OBTENER UBICACIÓN GPS AUTOMÁTICAMENTE AL CARGAR
                const msg = document.getElementById('ubicacionMsg');
                msg.classList.remove('hidden');
                msg.innerHTML = `<p class="text-sm text-blue-800">📍 Obteniendo tu ubicación GPS exacta...</p>`;
                
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        function(position) {
                            const lat = position.coords.latitude;
                            const lng = position.coords.longitude;
                            const accuracy = position.coords.accuracy;
                            
                            console.log('=== DATOS GPS OBTENIDOS ===');
                            console.log('Latitud:', lat);
                            console.log('Longitud:', lng);
                            console.log('Precisión:', accuracy, 'metros');
                            console.log('Altitud:', position.coords.altitude);
                            console.log('Velocidad:', position.coords.speed);
                            console.log('Timestamp:', new Date(position.timestamp));
                            
                            // Verificar si está dentro de Hidalgo (aproximadamente)
                            const dentroDeHidalgo = (lat >= 19.5 && lat <= 21.5 && lng >= -99.5 && lng <= -97.5);
                            
                            console.log('¿Dentro de Hidalgo?', dentroDeHidalgo);
                            
                            // SIEMPRE actualizar mapa a ubicación real (esté donde esté)
                            currentMap.setView([lat, lng], 15);
                            currentMarker.setLatLng([lat, lng]);
                            
                            // Agregar círculo de precisión
                            if (window.accuracyCircle) {
                                currentMap.removeLayer(window.accuracyCircle);
                            }
                            window.accuracyCircle = L.circle([lat, lng], {
                                radius: accuracy,
                                color: dentroDeHidalgo ? '#10B981' : '#F59E0B',
                                fillColor: dentroDeHidalgo ? '#10B981' : '#F59E0B',
                                fillOpacity: 0.15,
                                weight: 2
                            }).addTo(currentMap);
                            
                            if (dentroDeHidalgo) {
                                currentMarker.bindPopup(`<b>✓ Tu ubicación en Hidalgo</b><br>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}<br>Precisión: ±${accuracy.toFixed(0)}m`).openPopup();
                                msg.innerHTML = `<p class="text-sm text-green-800">✓ <strong>Ubicación GPS obtenida en Hidalgo</strong><br>
                                    Latitud: <strong>${lat.toFixed(7)}</strong><br>
                                    Longitud: <strong>${lng.toFixed(7)}</strong><br>
                                    Precisión: ±${accuracy.toFixed(0)} metros</p>`;
                                
                                // Guardar en backend
                                fetch('/api/ubicacion', {
                                    method: 'POST',
                                    headers: {'Content-Type': 'application/json'},
                                    body: JSON.stringify({lat: lat, lng: lng})
                                }).then(r => console.log('Ubicación guardada en BD'));
                            } else {
                                console.warn('Ubicación fuera de Hidalgo:', lat, lng);
                                currentMarker.bindPopup(`<b>⚠️ Ubicación fuera de Hidalgo</b><br>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}<br>Precisión: ±${accuracy.toFixed(0)}m`).openPopup();
                                msg.innerHTML = `<p class="text-sm text-yellow-800">⚠️ Tu ubicación GPS está fuera de Hidalgo<br>
                                    Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}<br>
                                    <small>Puedes arrastrar el marcador a tu ubicación correcta en Hidalgo</small></p>`;
                            }
                        },
                        function(error) {
                            console.error('=== ERROR GPS ===');
                            console.error('Código:', error.code);
                            console.error('Mensaje:', error.message);
                            
                            let errorMsg = '';
                            switch(error.code) {
                                case 1: errorMsg = 'Permiso denegado. Por favor permite acceso a ubicación en tu navegador.'; break;
                                case 2: errorMsg = 'Ubicación no disponible. Verifica tu conexión GPS/WiFi.'; break;
                                case 3: errorMsg = 'Tiempo de espera agotado. Intenta nuevamente.'; break;
                                default: errorMsg = 'Error desconocido al obtener ubicación.';
                            }
                            
                            msg.innerHTML = `<p class="text-sm text-red-800">✗ ${errorMsg}<br><small>Usando ubicación predeterminada: Tulancingo de Bravo, Hidalgo<br>Arrastra el marcador para ajustar o click "Obtener Ubicación Actual"</small></p>`;
                        },
                        {
                            enableHighAccuracy: true,
                            timeout: 20000,  // 20 segundos para mejor precisión
                            maximumAge: 0
                        }
                    );
                } else {
                    msg.innerHTML = `<p class="text-sm text-red-800">✗ Tu navegador no soporta geolocalización<br><small>Arrastra el marcador a tu ubicación en Hidalgo</small></p>`;
                }
                
                console.log('Mapa inicializado correctamente');
            } catch (error) {
                console.error('Error al inicializar el mapa:', error);
            }
        }
    }, 300);
    
    const form = document.getElementById('solicitudForm');
    if (form) {
        // Geocodificar al escribir los campos de dirección
        const calle = document.getElementById('dir_calle');
        const colonia = document.getElementById('dir_colonia');
        const numExt = document.getElementById('dir_num_ext');
        const cp = document.getElementById('dir_cp');
        const refs = document.getElementById('direccion');
        let geoDebounceId = null;

        function buildQuery() {
            const parts = [];
            if (calle && calle.value.trim()) parts.push(calle.value.trim());
            if (numExt && numExt.value.trim()) parts.push(numExt.value.trim());
            if (colonia && colonia.value.trim()) parts.push(colonia.value.trim());
            if (cp && cp.value.trim()) parts.push(cp.value.trim());
            // Sugerir ciudad/estado para mejorar precisión
            parts.push('Hidalgo, México');
            return parts.join(', ');
        }

        function scheduleGeocode() {
            const q = buildQuery();
            // Validación mínima: calle y colonia y cp
            if (!(calle.value.trim().length >= 3 && colonia.value.trim().length >= 3 && cp.value.trim().length >= 4)) return;
            if (geoDebounceId) clearTimeout(geoDebounceId);
            geoDebounceId = setTimeout(async () => {
                const coords = await geocodeAddress(q);
                const msg = document.getElementById('ubicacionMsg');
                if (coords && currentMap && currentMarker) {
                    currentMarker.setLatLng([coords.lat, coords.lng]);
                    currentMap.setView([coords.lat, coords.lng], 16);
                    if (msg) {
                        msg.classList.remove('hidden');
                        msg.innerHTML = `<p class="text-sm text-green-800">✓ Dirección localizada: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}</p>`;
                    }
                } else if (msg) {
                    msg.classList.remove('hidden');
                    msg.innerHTML = `<p class="text-sm text-yellow-800">⚠️ No se encontró la dirección. Ajusta los campos o arrastra el marcador.</p>`;
                }
            }, 600);
        }

        [calle, colonia, numExt, cp, refs].forEach(el => {
            if (!el) return;
            el.addEventListener('input', scheduleGeocode);
            el.addEventListener('blur', scheduleGeocode);
        });

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const position = currentMarker ? currentMarker.getLatLng() : {lat: null, lng: null};
            
            const data = {
                direccion: {
                    calle: calle ? calle.value : null,
                    colonia: colonia ? colonia.value : null,
                    num_ext: numExt ? numExt.value : null,
                    cp: cp ? cp.value : null,
                    referencias: refs ? refs.value : null
                },
                kilos: parseFloat(document.getElementById('kilos').value),
                tipoResiduo: document.getElementById('tipoResiduo').value,
                informacion: document.getElementById('informacion').value,
                lat: position.lat,
                lng: position.lng
            };
            
            try {
                const response = await fetch('/api/usuario/solicitudes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    try { alert('Solicitud enviada exitosamente. ID de solicitud: #' + result.id_solicitud); } catch (_) {}
                    // Limpiar formulario y UI
                    form.reset();
                    if (currentMarker) {
                        currentMarker.setLatLng([20.082, -98.363]);
                    }
                    const ubicacionMsg = document.getElementById('ubicacionMsg');
                    if (ubicacionMsg) ubicacionMsg.classList.add('hidden');

                    // Navegar a "Mis Solicitudes"
                    if (typeof changeView === 'function') {
                        changeView('mis-solicitudes');
                        // Opcional: desplazarse al inicio
                        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_) {}
                    }
                } else {
                    alert('Error al enviar la solicitud');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error al enviar la solicitud');
            }
        });
    }
}

// Geocodificación usando Mapbox si hay token, de lo contrario Nominatim (OSM)
async function geocodeAddress(query) {
    try {
        // Intentar con Mapbox si hay token
        if (mapboxToken) {
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&language=es&limit=1&country=mx`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                const feat = data.features && data.features[0];
                if (feat && feat.center && feat.center.length >= 2) {
                    return { lat: feat.center[1], lng: feat.center[0] };
                }
            }
        }
        // Fallback a Nominatim
        const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=1&countrycodes=mx`;
        const res2 = await fetch(nomUrl, { headers: { 'Accept-Language': 'es' } });
        if (res2.ok) {
            const data2 = await res2.json();
            if (Array.isArray(data2) && data2.length > 0) {
                return { lat: parseFloat(data2[0].lat), lng: parseFloat(data2[0].lon) };
            }
        }
    } catch (err) {
        console.error('Error geocodificando dirección:', err);
    }
    return null;
}

function obtenerUbicacion() {
    const msg = document.getElementById('ubicacionMsg');
    
    if (!navigator.geolocation) {
        msg.classList.remove('hidden');
        msg.innerHTML = `<p class="text-sm text-red-800">⚠️ Tu navegador no soporta geolocalización</p>`;
        return;
    }
    
    // Mostrar mensaje de carga
    msg.classList.remove('hidden');
    msg.innerHTML = `<p class="text-sm text-blue-800">📍 Obteniendo ubicación GPS...</p>`;
    
    let watchId = null;
    let bestAccuracy = Infinity;
    let updateCount = 0;
    const maxUpdates = 5;
    
    // Usar watchPosition para mayor precisión
    watchId = navigator.geolocation.watchPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            
            updateCount++;
            console.log(`GPS manual update #${updateCount}: ${lat}, ${lng} (±${accuracy}m)`);
            
            if (currentMap && currentMarker) {
                // Actualizar si es más preciso
                if (accuracy < bestAccuracy || bestAccuracy === Infinity) {
                    bestAccuracy = accuracy;
                    
                    // Centrar mapa en la ubicación obtenida
                    currentMap.setView([lat, lng], 17);
                    currentMarker.setLatLng([lat, lng]);
                    
                    // Agregar círculo de precisión
                    if (window.accuracyCircle) {
                        currentMap.removeLayer(window.accuracyCircle);
                    }
                    window.accuracyCircle = L.circle([lat, lng], {
                        radius: accuracy,
                        color: '#10B981',
                        fillColor: '#10B981',
                        fillOpacity: 0.15,
                        weight: 2
                    }).addTo(currentMap);
                    
                    const dentroDeHidalgo = (lat >= 19.5 && lat <= 21.5 && lng >= -99.5 && lng <= -97.5);
                    const regionMsg = dentroDeHidalgo ? 'en Hidalgo' : '(fuera de Hidalgo)';
                    
                    msg.innerHTML = `<p class="text-sm text-green-800">✓ Ubicación GPS actualizada (${updateCount}/${maxUpdates})<br>Coordenadas: ${lat.toFixed(8)}, ${lng.toFixed(8)}<br>Precisión: ±${accuracy.toFixed(0)}m ${regionMsg}</p>`;
                    
                    // Guardar ubicación en backend SIEMPRE
                    fetch('/api/ubicacion', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({lat: lat, lng: lng})
                    }).then(response => {
                        if (response.ok) {
                            console.log('✓ Ubicación guardada en BD:', lat, lng);
                        }
                    });
                }
                
                // Detener después de 5 actualizaciones
                if (updateCount >= maxUpdates) {
                    navigator.geolocation.clearWatch(watchId);
                    console.log('GPS manual finalizado. Mejor precisión:', bestAccuracy, 'metros');
                    msg.innerHTML = msg.innerHTML.replace(`(${updateCount}/${maxUpdates})`, '✓ Finalizado');
                }
            }
        },
        function(error) {
            if (watchId) navigator.geolocation.clearWatch(watchId);
            
            let errorMsg = '';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMsg = '⚠️ Permiso denegado. Permite el acceso a tu ubicación en el navegador.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMsg = '⚠️ Ubicación no disponible. Verifica tu GPS/WiFi.';
                    break;
                case error.TIMEOUT:
                    errorMsg = '⚠️ Tiempo agotado. Intenta nuevamente.';
                    break;
                default:
                    errorMsg = '⚠️ Error al obtener ubicación. Arrastra el marcador manualmente.';
            }
            msg.innerHTML = `<p class="text-sm text-red-800">${errorMsg}</p>`;
            
            setTimeout(() => {
                msg.classList.add('hidden');
            }, 5000);
        },
        {
            enableHighAccuracy: true,
            timeout: 30000,  // 30 segundos para obtener mejor señal GPS
            maximumAge: 0
        }
    );
}

// MIS SOLICITUDES
function renderMisSolicitudes() {
    loadSolicitudesTable();

    return `
        <div>
            <div class="flex items-center justify-between mb-6">
                <h1 class="text-3xl font-bold text-gray-800">Mis Solicitudes</h1>
                <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
                    </svg>
                    <select id="filtroEstado" onchange="filtrarSolicitudes()" class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                        <option value="todas">Todas</option>
                        <option value="pendiente">Pendientes</option>
                        <option value="en-proceso">En Proceso</option>
                        <option value="completada">Completadas</option>
                    </select>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th class="text-left px-6 py-4 text-sm font-semibold text-gray-700">ID Solicitud</th>
                                <th class="text-left px-6 py-4 text-sm font-semibold text-gray-700">Fecha</th>
                                <th class="text-left px-6 py-4 text-sm font-semibold text-gray-700">Estado</th>
                                <th class="text-left px-6 py-4 text-sm font-semibold text-gray-700">Tipo de Residuo</th>
                                <th class="text-left px-6 py-4 text-sm font-semibold text-gray-700">Kilos</th>
                                <th class="text-left px-6 py-4 text-sm font-semibold text-gray-700">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="tablaSolicitudes">
                            <tr><td colspan="6" class="text-center py-4 text-gray-500">Cargando...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Modal de detalle -->
        <div id="modalDetalle" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6 border-b border-gray-200">
                    <h2 id="modalTitle" class="text-2xl font-bold text-gray-800"></h2>
                </div>
                <div id="modalBody" class="p-6">
                </div>
                <div class="p-6 border-t border-gray-200">
                    <button onclick="cerrarModal()" class="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    `;
}

function getEstadoBadge(estado) {
    const styles = {
        'completada': 'bg-green-100 text-green-700 border-green-200',
        'en-proceso': 'bg-orange-100 text-orange-700 border-orange-200',
        'pendiente': 'bg-green-50 text-green-700 border-green-200'
    };
    const labels = {
        'completada': 'Completada',
        'en-proceso': 'En Proceso',
        'pendiente': 'Pendiente'
    };
    return `<span class="px-3 py-1 rounded-full text-xs font-medium border ${styles[estado]}">${labels[estado]}</span>`;
}

// Cargar solicitudes desde el backend
async function loadSolicitudesTable(filtro = 'todas') {
    try {
        const response = await fetch(`/api/usuario/solicitudes?estado=${filtro}`);
        if (response.ok) {
            const solicitudes = await response.json();
            const tbody = document.getElementById('tablaSolicitudes');
            
            if (solicitudes.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-500">No hay solicitudes</td></tr>';
                return;
            }
            
            tbody.innerHTML = solicitudes.map(sol => {
                const estadoBadge = getEstadoBadge(sol.estado);
                const fecha = new Date(sol.fecha_solicitud).toLocaleDateString('es-MX');
                return `
                    <tr class="border-b border-gray-100 hover:bg-gray-50">
                        <td class="px-6 py-4 text-gray-700 font-medium">#${sol.id_solicitud}</td>
                        <td class="px-6 py-4 text-sm text-gray-600">${fecha}</td>
                        <td class="px-6 py-4">${estadoBadge}</td>
                        <td class="px-6 py-4 text-sm text-gray-700">${sol.tipo_residuo}</td>
                        <td class="px-6 py-4 text-sm text-gray-700">${sol.kilos} kg</td>
                        <td class="px-6 py-4">
                            <button onclick='verDetalleSolicitud(${JSON.stringify(sol).replace(/'/g, "&apos;")})' class="flex items-center gap-2 px-3 py-2 border border-green-300 bg-white text-green-700 rounded-lg hover:bg-green-50 transition-colors">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                </svg>
                                <span class="text-sm">Ver</span>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error al cargar solicitudes:', error);
    }
}

function initMisSolicitudes() {
    // Ya inicializado
}

function filtrarSolicitudes() {
    const filtro = document.getElementById('filtroEstado').value;
    loadSolicitudesTable(filtro);
}

function verDetalleSolicitud(sol) {
    const modal = document.getElementById('modalDetalle');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    
    const fecha = new Date(sol.fecha_solicitud || sol.fecha).toLocaleDateString('es-MX');
    const id = sol.id_solicitud || sol.id;
    const tipo = sol.tipo_residuo || sol.tipoResiduo;
    // Construir dirección desde diferentes posibles esquemas de datos (SQLite vs Supabase)
    const calle = sol.calle || '';
    const numExt = (sol['numero exterior'] !== undefined ? sol['numero exterior'] : (sol.numero_exterior !== undefined ? sol.numero_exterior : ''));
    const colonia = sol.colonia || '';
    const cp = (sol['codigo postal'] !== undefined ? sol['codigo postal'] : (sol.codigo_postal !== undefined ? sol.codigo_postal : ''));
    const direccionText = (sol.direccion && sol.direccion.trim().length > 0)
        ? sol.direccion
        : [
            calle || null,
            (numExt !== '' && numExt !== null && numExt !== undefined) ? `#${numExt}` : null,
            colonia || null,
            (cp !== '' && cp !== null && cp !== undefined) ? `CP ${cp}` : null
          ].filter(Boolean).join(', ');
    const referencias = sol.referencias || sol.info_extra || '';
    const coords = (sol.lat && sol.lng) ? `${parseFloat(sol.lat).toFixed(6)}, ${parseFloat(sol.lng).toFixed(6)}` : null;
    
    title.textContent = `Detalle de Solicitud #${id}`;
    body.innerHTML = `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <p class="text-sm text-gray-500 mb-1">Estado</p>
                    ${getEstadoBadge(sol.estado)}
                </div>
                <div>
                    <p class="text-sm text-gray-500 mb-1">Fecha</p>
                    <p class="text-gray-700">${fecha}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500 mb-1">Tipo de Residuo</p>
                    <p class="text-gray-700">${tipo}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500 mb-1">Cantidad</p>
                    <p class="text-gray-700">${sol.kilos} kg</p>
                </div>
            </div>
            <div>
                <p class="text-sm text-gray-500 mb-1">Dirección</p>
                <p class="text-gray-700">${direccionText || '—'}</p>
            </div>
            ${referencias ? `
            <div>
                <p class="text-sm text-gray-500 mb-1">Información Adicional</p>
                <p class="text-gray-700">${referencias}</p>
            </div>
            ` : ''}
            ${coords ? `
            <div>
                <p class="text-sm text-gray-500 mb-1">Ubicación</p>
                <p class="text-gray-700">${coords}</p>
            </div>
            ` : ''}
        </div>
    `;
    
    modal.classList.remove('hidden');
}

function cerrarModal() {
    const modal = document.getElementById('modalDetalle');
    modal.classList.add('hidden');
}

// SEGUIMIENTO EN TIEMPO REAL
function renderSeguimiento() {
    loadSolicitudesParaSeguimiento();
    
    return `
        <div>
            <h1 class="text-3xl font-bold text-gray-800 mb-6">Seguimiento en Tiempo Real</h1>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">Selecciona una Solicitud</h3>
                <select id="selectSolicitudSeguimiento" onchange="cargarSeguimientoSolicitud()" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                    <option value="">-- Selecciona una solicitud en proceso --</option>
                </select>
            </div>

            <div id="contenidoSeguimiento" class="hidden">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-2">
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-xl font-semibold text-gray-800">Ubicación del Recolector</h3>
                            <div class="flex items-center gap-2">
                                <button onclick="obtenerMiUbicacionSeguimiento()" class="px-3 py-1 border border-green-300 bg-white text-green-700 rounded-lg hover:bg-green-50 transition-colors text-sm flex items-center gap-1">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                    </svg>
                                    Mi ubicación
                                </button>
                                <div class="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                    <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    En camino
                                </div>
                            </div>
                        </div>

                        <div id="mapaSeguimiento" class="relative bg-gradient-to-br from-blue-50 to-green-50 rounded-lg overflow-hidden" style="height: 500px;">
                        </div>

                        <div class="grid grid-cols-3 gap-4 mt-4">
                            <div class="border border-green-300 bg-white rounded-lg p-3 text-center shadow-sm">
                                <svg class="w-5 h-5 text-green-700 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                                </svg>
                                <p class="text-sm text-gray-700">Distancia</p>
                                <p id="distanciaSeguimiento" class="font-bold text-green-700">2.5 km</p>
                            </div>
                            <div class="border border-green-300 bg-white rounded-lg p-3 text-center shadow-sm">
                                <svg class="w-5 h-5 text-green-700 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                </svg>
                                <p class="text-sm text-gray-700">Tiempo estimado</p>
                                <p id="tiempoSeguimiento" class="font-bold text-green-700">12 min</p>
                            </div>
                            <div class="border border-green-300 bg-white rounded-lg p-3 text-center shadow-sm">
                                <svg class="w-5 h-5 text-green-700 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/>
                                </svg>
                                <p class="text-sm text-gray-700">Vehículo</p>
                                <p id="vehiculoSeguimiento" class="font-bold text-green-700">Unidad 42</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="space-y-6">
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 class="text-xl font-semibold text-gray-800 mb-4">Información del Recolector</h3>
                        <div class="space-y-4">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                    </svg>
                                </div>
                                <div>
                                    <p id="nombreRecolectorSeguimiento" class="font-semibold text-gray-800">Carlos Martínez</p>
                                    <p class="text-sm text-gray-500">Recolector certificado</p>
                                </div>
                            </div>
                            <div class="pt-3 border-t border-gray-200">
                                <div class="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                                    </svg>
                                    <span id="telefonoRecolectorSeguimiento">+52 55 1234 5678</span>
                                </div>
                            </div>
                            <button class="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                                </svg>
                                Contactar Recolector
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Cargar solicitudes en proceso para seleccionar
async function loadSolicitudesParaSeguimiento() {
    try {
        console.log('🔍 Cargando solicitudes en proceso...');
        const response = await fetch('/api/usuario/solicitudes?estado=en-proceso');
        if (response.ok) {
            const solicitudes = await response.json();
            console.log('📋 Solicitudes encontradas:', solicitudes);
            const select = document.getElementById('selectSolicitudSeguimiento');
            
            if (solicitudes.length === 0) {
                console.log('⚠️ No hay solicitudes en proceso');
                select.innerHTML = '<option value="">-- No hay solicitudes en proceso --</option>';
                document.getElementById('contenidoSeguimiento').classList.add('hidden');
            } else {
                console.log(`✅ ${solicitudes.length} solicitud(es) en proceso`);
                select.innerHTML = '<option value="">-- Selecciona una solicitud --</option>' + 
                    solicitudes.map(sol => 
                        `<option value="${sol.id_solicitud}">Solicitud #${sol.id_solicitud} - ${sol.tipo_residuo}</option>`
                    ).join('');
            }
        }
    } catch (error) {
        console.error('❌ Error cargando solicitudes:', error);
    }
}

// Cargar seguimiento de una solicitud específica
async function cargarSeguimientoSolicitud() {
    const selectElement = document.getElementById('selectSolicitudSeguimiento');
    const idSolicitud = selectElement.value;
    
    if (!idSolicitud) {
        document.getElementById('contenidoSeguimiento').classList.add('hidden');
        return;
    }
    
    document.getElementById('contenidoSeguimiento').classList.remove('hidden');
    
    // Limpiar mapa si existe
    if (currentMap) {
        currentMap.remove();
        currentMap = null;
    }
    
    // Cargar seguimiento del recolector asignado
    try {
        const response = await fetch(`/api/usuario/seguimiento/${idSolicitud}`);
        if (response.ok) {
            const datos = await response.json();
            
            // Actualizar información del recolector
            document.getElementById('nombreRecolectorSeguimiento').textContent = datos.recolector.nombre || '--';
            document.getElementById('telefonoRecolectorSeguimiento').textContent = datos.recolector.telefono || '--';
            document.getElementById('vehiculoSeguimiento').textContent = datos.recolector.vehiculo || '--';
            document.getElementById('distanciaSeguimiento').textContent = (datos.distancia || 0).toFixed(1) + ' km';
            document.getElementById('tiempoSeguimiento').textContent = (datos.tiempo_estimado || 0) + ' min';
            
            // Inicializar mapa con el recolector específico
            initSeguimientoMapa(datos);
        }
    } catch (error) {
        console.error('Error cargando seguimiento:', error);
    }
}

// Inicializar mapa de seguimiento con solo el recolector asignado
function initSeguimientoMapa(datos) {
    setTimeout(() => {
        const mapElement = document.getElementById('mapaSeguimiento');
        if (!mapElement || currentMap) return;
        
        try {
            // Usar ubicación del usuario desde los datos (solicitud)
            const userLat = datos.ubicacion_usuario?.lat || 20.082;
            const userLng = datos.ubicacion_usuario?.lng || -98.363;
            
            currentMap = L.map('mapaSeguimiento', {
                center: [userLat, userLng],
                zoom: 13,
                minZoom: 8,
                maxZoom: 18
            });
            
            addBaseTileLayer(currentMap);
            
            // Icono del usuario (tu ubicación desde la solicitud)
            const userIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: #3B82F6; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
                        <svg style="width: 24px; height: 24px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                      </div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });
            
            const userMarker = L.marker([userLat, userLng], {icon: userIcon}).addTo(currentMap);
            userMarker.bindPopup(`<b>Tu ubicación (solicitud)</b><br>Lat: ${userLat.toFixed(6)}<br>Lng: ${userLng.toFixed(6)}`);
            
            // Icono del recolector
            const recolectorIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: #10B981; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
                        <svg style="width: 24px; height: 24px; color: white;" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                      </div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });
            
            // Marcador del recolector
            const recolectorMarker = L.marker([datos.ubicacion.lat, datos.ubicacion.lng], {
                icon: recolectorIcon,
                title: datos.recolector.nombre
            }).addTo(currentMap);
            
            recolectorMarker.bindPopup(`
                <div class="text-center">
                    <b>${datos.recolector.nombre}</b><br>
                    <span style="font-size: 12px;">${datos.recolector.vehiculo || 'N/A'}</span><br>
                    <span style="font-size: 12px;">📞 ${datos.recolector.telefono || 'N/A'}</span>
                </div>
            `);
            
            // Línea de ruta
            const routeLine = L.polyline([
                [datos.ubicacion.lat, datos.ubicacion.lng],
                [userLat, userLng]
            ], {
                color: '#10B981',
                weight: 2,
                opacity: 0.6,
                dashArray: '5, 5'
            }).addTo(currentMap);
            
            // Actualizar ubicación del recolector cada 5 segundos
            const idSolicitud = document.getElementById('selectSolicitudSeguimiento').value;
            const updateInterval = setInterval(() => {
                fetch(`/api/usuario/seguimiento/${idSolicitud}`)
                    .then(res => res.json())
                    .then(datos => {
                        recolectorMarker.setLatLng([datos.ubicacion.lat, datos.ubicacion.lng]);
                        routeLine.setLatLngs([
                            [datos.ubicacion.lat, datos.ubicacion.lng],
                            [userLat, userLng]
                        ]);
                        
                        document.getElementById('distanciaSeguimiento').textContent = (datos.distancia || 0).toFixed(1) + ' km';
                        document.getElementById('tiempoSeguimiento').textContent = (datos.tiempo_estimado || 0) + ' min';
                    })
                    .catch(err => {
                        console.error('Error actualizando ubicación:', err);
                        clearInterval(updateInterval);
                    });
            }, 5000);
            
            // Centrar mapa
            const bounds = L.latLngBounds([
                [userLat, userLng],
                [datos.ubicacion.lat, datos.ubicacion.lng]
            ]);
            currentMap.fitBounds(bounds, {padding: [80, 80]});
            
            setTimeout(() => currentMap.invalidateSize(), 100);
        } catch (error) {
            console.error('Error al inicializar el mapa:', error);
        }
    }, 300);
}

function initSeguimiento() {
    // La lógica está en loadSolicitudesParaSeguimiento() y cargarSeguimientoSolicitud()
    loadSolicitudesParaSeguimiento();
}


// (Eliminado: rutas generales)

// (Eliminado: sugerir ruta para usuarios)

// QUEJAS Y SOPORTE
function renderQuejas() {
    return `
        <div>
            <h1 class="text-3xl font-bold text-gray-800 mb-6">Quejas y Soporte</h1>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div class="flex items-center gap-3 mb-6">
                        <div class="w-12 h-12 border border-green-300 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <svg class="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-xl font-semibold text-gray-800">Formulario de Contacto</h3>
                            <p class="text-sm text-gray-500">Cuéntanos cómo podemos ayudarte</p>
                        </div>
                    </div>

                    <form id="quejaForm" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Número de Solicitud <span class="text-gray-400">(Opcional)</span>
                            </label>
                            <input type="text" placeholder="Ej: 1234" 
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Motivo</label>
                            <select class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                                <option value="retraso">Retraso en la recolección</option>
                                <option value="no-recolectado">No se recolectaron los residuos</option>
                                <option value="mal-servicio">Mal servicio del recolector</option>
                                <option value="problema-pago">Problema con el pago</option>
                                <option value="problema-tecnico">Problema técnico con la app</option>
                                <option value="sugerencia">Sugerencia de mejora</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Descripción Detallada</label>
                            <textarea placeholder="Describe tu situación con el mayor detalle posible..." rows="8" required
                                      class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"></textarea>
                        </div>

                        <button type="submit" class="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2 shadow-md">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                            </svg>
                            Enviar Queja/Soporte
                        </button>
                    </form>
                </div>

                <div class="space-y-6">
                    <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-sm p-6 text-white">
                        <h3 class="text-xl font-semibold mb-4">Información de Contacto</h3>
                        <div class="space-y-3 text-sm">
                            <div>
                                <p class="text-green-50 mb-1">Teléfono de Soporte</p>
                                <p class="text-lg font-bold">01-800-RESIDUOS</p>
                                <p class="text-green-50 text-xs">Lunes a Viernes: 8:00 AM - 6:00 PM</p>
                            </div>
                            <div class="pt-3 border-t border-green-200">
                                <p class="text-green-50 mb-1">Email</p>
                                <p class="font-semibold">soporte@ecorecoleccion.com</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function initQuejas() {
    const form = document.getElementById('quejaForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const data = {
                numeroSolicitud: form.querySelector('input[type="text"]').value || null,
                motivo: form.querySelector('select').value,
                descripcion: form.querySelector('textarea').value
            };
            
            try {
                const response = await fetch('/api/usuario/quejas', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    alert('Tu queja/soporte ha sido enviada. Nuestro equipo se pondrá en contacto contigo pronto.');
                    form.reset();
                } else {
                    alert('Error al enviar la queja');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error al enviar la queja');
            }
        });
    }
}

// PERFIL
function renderPerfil() {
    return `
        <div>
            <h1 class="text-3xl font-bold text-gray-800 mb-6">Mi Perfil</h1>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div class="text-center">
                        <div class="relative inline-block mb-4">
                            <div class="w-32 h-32 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center mx-auto">
                                <svg class="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                </svg>
                            </div>
                        </div>
                        <h2 id="perfilNombre" class="text-xl font-bold text-gray-800 mb-1">Cargando...</h2>
                        <p class="text-sm text-gray-500 mb-4">Usuario Verificado</p>
                        
                        <div class="flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm mb-6">
                            <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                            Cuenta Activa
                        </div>
                    </div>
                </div>

                <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-xl font-semibold text-gray-800">Información Personal</h3>
                        <button onclick="editarPerfil()" class="px-4 py-2 border border-green-300 bg-white text-green-700 rounded-lg hover:bg-green-50 transition-colors">
                            Editar Perfil
                        </button>
                    </div>

                    <div id="perfilInfo" class="space-y-4">
                        <p class="text-sm text-gray-500">Cargando...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function loadPerfilData() {
    if (!userProfile) {
        await loadUserProfile();
    }
    
    if (!userProfile) return;

    const nombreEl = document.getElementById('perfilNombre');
    const perfilInfo = document.getElementById('perfilInfo');
    if (!nombreEl || !perfilInfo) return; // vista aún no montada

    nombreEl.textContent = `${userProfile.nombre} ${userProfile.apellidos}`;
    perfilInfo.innerHTML = `
        <div>
            <label class="block text-sm font-medium text-gray-500 mb-1">Nombre Completo</label>
            <p class="text-gray-800">${userProfile.nombre} ${userProfile.apellidos}</p>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-500 mb-1">Email</label>
            <p class="text-gray-800">${userProfile.email}</p>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-500 mb-1">Teléfono</label>
            <p class="text-gray-800">${userProfile.telefono || 'No especificado'}</p>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-500 mb-1">Dirección</label>
            <p class="text-gray-800">${userProfile.direccion || 'No especificada'}</p>
        </div>
    `;
}

function initPerfil() {
    loadPerfilData();
}

function editarPerfil() {
    if (!userProfile) {
        alert('No se pudo cargar la información del perfil');
        return;
    }
    
    const perfilInfo = document.getElementById('perfilInfo');
    perfilInfo.innerHTML = `
        <form id="formEditarPerfil" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                <input type="text" name="nombre" value="${userProfile.nombre}" 
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Apellidos</label>
                <input type="text" name="apellidos" value="${userProfile.apellidos}" 
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input type="email" name="email" value="${userProfile.email}" 
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                <input type="tel" name="telefono" value="${userProfile.telefono || ''}" 
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Dirección</label>
                <input type="text" name="direccion" value="${userProfile.direccion || ''}" 
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div class="flex gap-3 pt-4">
                <button type="submit" class="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Guardar Cambios
                </button>
                <button type="button" onclick="cancelarEdicion()" class="flex-1 bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                    Cancelar
                </button>
            </div>
        </form>
    `;
    
    // Agregar event listener al formulario
    document.getElementById('formEditarPerfil').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            nombre: formData.get('nombre'),
            apellidos: formData.get('apellidos'),
            email: formData.get('email'),
            telefono: formData.get('telefono'),
            direccion: formData.get('direccion')
        };
        
        try {
            const response = await fetch('/api/usuario/perfil', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Actualizar userProfile
                userProfile = { ...userProfile, ...data };
                
                // Mostrar mensaje de éxito
                alert('Perfil actualizado correctamente');
                
                // Recargar la vista del perfil
                loadPerfilData();
            } else {
                alert('Error al actualizar el perfil: ' + (result.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al actualizar el perfil');
        }
    });
}

function cancelarEdicion() {
    loadPerfilData();
}

// Obtener ubicación GPS en el mapa de seguimiento
function obtenerMiUbicacionSeguimiento() {
    if (!navigator.geolocation) {
        alert('Tu navegador no soporta geolocalización');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            if (currentMap) {
                // Actualizar vista del mapa
                currentMap.setView([lat, lng], 15);
                
                // Buscar el marcador del usuario y actualizarlo
                currentMap.eachLayer(function(layer) {
                    if (layer instanceof L.Marker) {
                        const pos = layer.getLatLng();
                        // Si es aproximadamente la ubicación del usuario (azul)
                        // Aproximación: detectar marcador del usuario cerca del centro predeterminado de Tulancingo
                        if (Math.abs(pos.lat - 20.082) < 0.02 && Math.abs(pos.lng + 98.363) < 0.02) {
                            layer.setLatLng([lat, lng]);
                            layer.bindPopup(`<b>Tu ubicación actual</b><br>${lat.toFixed(6)}, ${lng.toFixed(6)}`).openPopup();
                        }
                    }
                });
                
                alert(`Ubicación actualizada:\n${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            }
        },
        function(error) {
            alert('No se pudo obtener la ubicación. Por favor, permite el acceso a la ubicación en tu navegador.');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}
