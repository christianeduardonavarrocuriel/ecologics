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

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    loadUserProfile();
    changeView('inicio');
});

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
            button.className = 'sidebar-menu-item w-full flex items-center gap-3 px-3 py-3 rounded-lg mb-1 bg-white text-blue-700 shadow-lg';
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
        case 'rutas':
            mainContent.innerHTML = renderRutas();
            initRutas();
            break;
        case 'sugerir-ruta':
            mainContent.innerHTML = renderSugerirRuta();
            initSugerirRuta();
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
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between mb-4">
                        <div class="p-3 bg-blue-50 rounded-lg">
                            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                            </svg>
                        </div>
                    </div>
                    <h3 class="text-gray-500 text-sm mb-1">Solicitudes Totales</h3>
                    <p id="stat-total" class="text-3xl font-bold text-blue-600">...</p>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between mb-4">
                        <div class="p-3 bg-orange-50 rounded-lg">
                            <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                    </div>
                    <h3 class="text-gray-500 text-sm mb-1">Solicitudes Pendientes</h3>
                    <p id="stat-pendientes" class="text-3xl font-bold text-orange-600">...</p>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between mb-4">
                        <div class="p-3 bg-green-50 rounded-lg">
                            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                    </div>
                    <h3 class="text-gray-500 text-sm mb-1">Solicitudes Completadas</h3>
                    <p id="stat-completadas" class="text-3xl font-bold text-green-600">...</p>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between mb-4">
                        <div class="p-3 bg-teal-50 rounded-lg">
                            <svg class="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                            </svg>
                        </div>
                    </div>
                    <h3 class="text-gray-500 text-sm mb-1">Total de Residuos</h3>
                    <p id="stat-kilos" class="text-3xl font-bold text-teal-600">...</p>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 class="text-xl font-semibold text-gray-800 mb-4">Actividad Reciente</h3>
                    <div id="actividadReciente" class="space-y-4">
                        <p class="text-sm text-gray-500">Cargando...</p>
                    </div>
                </div>

                <div class="bg-gradient-to-br from-green-500 to-teal-600 rounded-xl shadow-sm p-6 text-white">
                    <h3 class="text-xl font-semibold mb-4">Impacto Ambiental</h3>
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
                            ¡Gracias por contribuir a un planeta más limpio!
                        </p>
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
            
            // Renderizar actividad reciente
            const actividadDiv = document.getElementById('actividadReciente');
            if (data.actividad && data.actividad.length > 0) {
                actividadDiv.innerHTML = data.actividad.map(act => {
                    const color = act.estado === 'completada' ? 'green' : act.estado === 'en-proceso' ? 'orange' : 'blue';
                    const fecha = new Date(act.fecha_solicitud).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
                    return `
                        <div class="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0">
                            <div class="w-2 h-2 rounded-full mt-2 flex-shrink-0 bg-${color}-500"></div>
                            <div class="flex-1">
                                <p class="text-sm text-gray-700">Solicitud #${act.id_solicitud} - ${act.tipo_residuo}</p>
                                <p class="text-xs text-gray-500 mt-1">${fecha}</p>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                actividadDiv.innerHTML = '<p class="text-sm text-gray-500">No hay actividad reciente</p>';
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
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Dirección</label>
                            <input type="text" id="direccion" placeholder="Calle, número, colonia" 
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" required>
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
                // Crear el mapa centrado en Hidalgo, México
                // Coordenadas centrales de Hidalgo: 20.0911, -98.7624
                currentMap = L.map('mapaSolicitud', {
                    center: [20.0911, -98.7624],
                    zoom: 9,
                    minZoom: 3,
                    maxZoom: 18
                });
                console.log('Mapa creado centrado en Hidalgo, México', currentMap);
                
                // Agregar capa de tiles
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 18
                }).addTo(currentMap);
                
                // Agregar marcador draggable temporal (centro de Pachuca, Hidalgo)
                currentMarker = L.marker([20.1011, -98.7591], {
                    draggable: true,
                    title: 'Arrastra para cambiar ubicación'
                }).addTo(currentMap);
                currentMarker.bindPopup('Pachuca, Hidalgo - Arrastra para ajustar').openPopup();
                
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
                            
                            msg.innerHTML = `<p class="text-sm text-red-800">✗ ${errorMsg}<br><small>Usando ubicación predeterminada: Pachuca, Hidalgo<br>Arrastra el marcador para ajustar o click "Obtener Ubicación Actual"</small></p>`;
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
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const position = currentMarker ? currentMarker.getLatLng() : {lat: null, lng: null};
            
            const data = {
                direccion: document.getElementById('direccion').value,
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
                    alert('Solicitud enviada exitosamente. ID de solicitud: #' + result.id_solicitud);
                    form.reset();
                    if (currentMarker) {
                        currentMarker.setLatLng([19.4326, -99.1332]);
                    }
                    document.getElementById('ubicacionMsg').classList.add('hidden');
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
        'pendiente': 'bg-blue-100 text-blue-700 border-blue-200'
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
                            <button onclick='verDetalleSolicitud(${JSON.stringify(sol).replace(/'/g, "&apos;")})' class="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
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
                <p class="text-gray-700">${sol.direccion}</p>
            </div>
            ${sol.info_extra ? `
            <div>
                <p class="text-sm text-gray-500 mb-1">Información Adicional</p>
                <p class="text-gray-700">${sol.info_extra}</p>
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
    return `
        <div>
            <h1 class="text-3xl font-bold text-gray-800 mb-6">Seguimiento en Tiempo Real</h1>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-2">
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-xl font-semibold text-gray-800">Ubicación del Recolector</h3>
                            <div class="flex items-center gap-2">
                                <button onclick="obtenerMiUbicacionSeguimiento()" class="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm flex items-center gap-1">
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
                            <div class="bg-blue-50 rounded-lg p-3 text-center">
                                <svg class="w-5 h-5 text-blue-600 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                                </svg>
                                <p class="text-sm text-gray-600">Distancia</p>
                                <p class="font-bold text-blue-600">2.5 km</p>
                            </div>
                            <div class="bg-green-50 rounded-lg p-3 text-center">
                                <svg class="w-5 h-5 text-green-600 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                </svg>
                                <p class="text-sm text-gray-600">Tiempo estimado</p>
                                <p class="font-bold text-green-600">12 min</p>
                            </div>
                            <div class="bg-orange-50 rounded-lg p-3 text-center">
                                <svg class="w-5 h-5 text-orange-600 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/>
                                </svg>
                                <p class="text-sm text-gray-600">Vehículo</p>
                                <p class="font-bold text-orange-600">Unidad 42</p>
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
                                    <p class="font-semibold text-gray-800">Carlos Martínez</p>
                                    <p class="text-sm text-gray-500">Recolector certificado</p>
                                </div>
                            </div>
                            <div class="pt-3 border-t border-gray-200">
                                <div class="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                                    </svg>
                                    <span>+52 55 1234 5678</span>
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

function initSeguimiento() {
    // Inicializar mapa de seguimiento
    setTimeout(() => {
        const mapElement = document.getElementById('mapaSeguimiento');
        console.log('Inicializando mapa de seguimiento...', mapElement);
        
        if (mapElement && !currentMap) {
            try {
                // Crear el mapa centrado en Pachuca, Hidalgo
                currentMap = L.map('mapaSeguimiento', {
                    center: [20.1011, -98.7591],
                    zoom: 13,
                    minZoom: 8,
                    maxZoom: 18,
                    maxBounds: [
                        [19.5, -99.5],  // Suroeste
                        [21.5, -97.5]   // Noreste
                    ],
                    maxBoundsViscosity: 1.0
                });
                
                // Agregar capa de tiles
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 18
                }).addTo(currentMap);
                
                // Marcador del usuario (tu ubicación) - SE OBTENDRÁ POR GPS
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
                
                // Posición temporal del usuario (Pachuca, Hidalgo)
                let userLat = 20.1011, userLng = -98.7591;
                const userMarker = L.marker([userLat, userLng], {icon: userIcon}).addTo(currentMap);
                userMarker.bindPopup("<b>Tu ubicación</b><br><small>Obteniendo GPS exacto...</small>").openPopup();
                
                // Obtener ubicación GPS real del usuario
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        function(position) {
                            userLat = position.coords.latitude;
                            userLng = position.coords.longitude;
                            
                            console.log('=== SEGUIMIENTO: Ubicación GPS ===');
                            console.log('Tu ubicación:', userLat, userLng);
                            console.log('Precisión:', position.coords.accuracy, 'metros');
                            
                            // Actualizar marcador del usuario
                            userMarker.setLatLng([userLat, userLng]);
                            userMarker.bindPopup(`<b>Tu ubicación exacta en Hidalgo</b><br>Lat: ${userLat.toFixed(6)}<br>Lng: ${userLng.toFixed(6)}`);
                            
                            // Actualizar la línea de ruta con la ubicación real
                            const recolectorPos = recolectorMarker.getLatLng();
                            routeLine.setLatLngs([[recolectorPos.lat, recolectorPos.lng], [userLat, userLng]]);
                            
                            // Recalcular distancia con ubicación real
                            const distancia = calcularDistancia(recolectorPos.lat, recolectorPos.lng, userLat, userLng);
                            const distanciaEl = document.querySelector('.bg-blue-50 .font-bold.text-blue-600');
                            if (distanciaEl) {
                                distanciaEl.textContent = distancia.toFixed(1) + ' km';
                            }
                            
                            const tiempoMin = Math.ceil((distancia / 30) * 60);
                            const tiempoEl = document.querySelector('.bg-green-50 .font-bold.text-green-600');
                            if (tiempoEl) {
                                tiempoEl.textContent = tiempoMin + ' min';
                            }
                            
                            // Centrar mapa para mostrar ambos puntos
                            const bounds = L.latLngBounds([
                                [userLat, userLng],
                                [recolectorPos.lat, recolectorPos.lng]
                            ]);
                            currentMap.fitBounds(bounds, {padding: [80, 80]});
                        },
                        function(error) {
                            console.log('No se pudo obtener ubicación GPS en seguimiento:', error.message);
                            userMarker.bindPopup(`<b>Ubicación predeterminada</b><br>Pachuca, Hidalgo<br><small>Click "Mi ubicación" para actualizar</small>`);
                        },
                        {
                            enableHighAccuracy: true,
                            timeout: 10000,
                            maximumAge: 0
                        }
                    );
                }
                
                // Marcador del recolector en Hidalgo (zona norte de Pachuca) - DRAGGABLE
                const recolectorIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style="background-color: #10B981; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.2); cursor: move;">
                            <svg style="width: 24px; height: 24px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/>
                            </svg>
                          </div>`,
                    iconSize: [40, 40],
                    iconAnchor: [20, 20]
                });
                
                // Posición inicial del recolector (5km al norte de Pachuca)
                const recolectorMarker = L.marker([20.1511, -98.7591], {
                    icon: recolectorIcon,
                    draggable: true,
                    title: 'Arrastra para mover el recolector'
                }).addTo(currentMap);
                recolectorMarker.bindPopup("<b>Recolector Carlos</b><br>Unidad 42<br><small>Arrastra para simular movimiento</small>");
                
                // Línea de ruta entre usuario y recolector
                const routeLine = L.polyline([
                    [20.1511, -98.7591],
                    [20.1011, -98.7591]
                ], {
                    color: '#3B82F6',
                    weight: 3,
                    opacity: 0.6,
                    dashArray: '10, 10'
                }).addTo(currentMap);
                
                // Ajustar vista para mostrar ambos marcadores
                const bounds = L.latLngBounds([
                    [20.1011, -98.7591],
                    [20.1511, -98.7591]
                ]);
                currentMap.fitBounds(bounds, {padding: [80, 80]});
                
                // Forzar actualización del tamaño del mapa
                setTimeout(() => {
                    currentMap.invalidateSize();
                }, 100);
                
                // Función para calcular distancia entre dos puntos
                function calcularDistancia(lat1, lng1, lat2, lng2) {
                    const R = 6371; // Radio de la Tierra en km
                    const dLat = (lat2 - lat1) * Math.PI / 180;
                    const dLng = (lng2 - lng1) * Math.PI / 180;
                    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                            Math.sin(dLng/2) * Math.sin(dLng/2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                    return R * c;
                }
                
                // Actualizar cuando se mueva el marcador del recolector
                recolectorMarker.on('drag', function(event) {
                    const pos = event.target.getLatLng();
                    const userPos = userMarker.getLatLng();
                    routeLine.setLatLngs([[pos.lat, pos.lng], [userPos.lat, userPos.lng]]);
                });
                
                recolectorMarker.on('dragend', function(event) {
                    const pos = event.target.getLatLng();
                    const userPos = userMarker.getLatLng();
                    routeLine.setLatLngs([[pos.lat, pos.lng], [userPos.lat, userPos.lng]]);
                    
                    // Calcular distancia real usando la ubicación exacta del usuario
                    const distancia = calcularDistancia(pos.lat, pos.lng, userPos.lat, userPos.lng);
                    const distanciaEl = document.querySelector('.bg-blue-50 .font-bold.text-blue-600');
                    if (distanciaEl) {
                        distanciaEl.textContent = distancia.toFixed(1) + ' km';
                    }
                    
                    // Calcular tiempo estimado (asumiendo 30 km/h en ciudad)
                    const tiempoMin = Math.ceil((distancia / 30) * 60);
                    const tiempoEl = document.querySelector('.bg-green-50 .font-bold.text-green-600');
                    if (tiempoEl) {
                        tiempoEl.textContent = tiempoMin + ' min';
                    }
                });
                
                console.log('Mapa de seguimiento inicializado correctamente');
            } catch (error) {
                console.error('Error al inicializar el mapa de seguimiento:', error);
            }
        }
    }, 300);
}

// RUTAS GENERALES
function renderRutas() {
    return `
        <div>
            <h1 class="text-3xl font-bold text-gray-800 mb-6">Rutas Generales</h1>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-4">Mapa de Rutas</h3>
                <div class="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg" style="height: 600px;">
                    <div class="absolute inset-0 flex items-center justify-center">
                        <p class="text-gray-600">Mapa de rutas generales</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function initRutas() {
    // Inicialización de rutas
}

// SUGERIR RUTA
function renderSugerirRuta() {
    return `
        <div>
            <h1 class="text-3xl font-bold text-gray-800 mb-6">Sugerir Ruta</h1>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-4">Traza tu ruta sugerida</h3>
                <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg" style="height: 600px;">
                    <div class="h-full flex items-center justify-center">
                        <p class="text-gray-600">Mapa interactivo para sugerir rutas</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function initSugerirRuta() {
    // Inicialización
}

// QUEJAS Y SOPORTE
function renderQuejas() {
    return `
        <div>
            <h1 class="text-3xl font-bold text-gray-800 mb-6">Quejas y Soporte</h1>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div class="flex items-center gap-3 mb-6">
                        <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
                        <h3 class="text-xl font-semibold mb-4">Información de Contacto</h3>
                        <div class="space-y-3 text-sm">
                            <div>
                                <p class="text-blue-100 mb-1">Teléfono de Soporte</p>
                                <p class="text-lg font-bold">01-800-RESIDUOS</p>
                                <p class="text-blue-100 text-xs">Lunes a Viernes: 8:00 AM - 6:00 PM</p>
                            </div>
                            <div class="pt-3 border-t border-blue-400">
                                <p class="text-blue-100 mb-1">Email</p>
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
    loadPerfilData();
    
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

                        <div class="pt-4 border-t border-gray-200">
                            <div class="flex items-center justify-between mb-3">
                                <span class="text-sm text-gray-500">Miembro desde</span>
                                <span class="text-sm text-gray-700 font-medium">2024-01-15</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-sm text-gray-500">Solicitudes totales</span>
                                <span class="text-sm text-gray-700 font-medium">24</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-xl font-semibold text-gray-800">Información Personal</h3>
                        <button onclick="editarPerfil()" class="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
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
    
    if (userProfile) {
        document.getElementById('perfilNombre').textContent = `${userProfile.nombre} ${userProfile.apellidos}`;
        
        const perfilInfo = document.getElementById('perfilInfo');
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
}

function initPerfil() {
    // Inicialización
}

function editarPerfil() {
    alert('Función de editar perfil próximamente');
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
                        if (Math.abs(pos.lat - 19.4326) < 0.01 && Math.abs(pos.lng + 99.1332) < 0.01) {
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
