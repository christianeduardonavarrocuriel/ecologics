// Navigation between dashboard sections
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboardNavigation();
    initializeModals();
    initializeButtons();
});

function initializeDashboardNavigation() {
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            document.querySelectorAll('.sidebar-menu a').forEach(item => {
                item.classList.remove('active');
            });
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Get content type
            const contentType = this.getAttribute('data-content');
            const contentTitle = this.querySelector('i').parentElement.textContent.trim();
            
            // Update content title
            document.getElementById('content-title').textContent = contentTitle;
            
            // Load content based on type
            loadContent(contentType);
        });
    });
}

function loadContent(type) {
    const contentDiv = document.getElementById('dynamic-content');
    
    // Clear existing content
    contentDiv.innerHTML = '';
    
    switch(type) {
        case 'dashboard':
            loadDashboardContent(contentDiv);
            break;
            
        case 'requests':
            loadRequestsContent(contentDiv);
            break;
            
        case 'routes':
            loadRoutesContent(contentDiv);
            break;
            
        case 'reports':
            loadReportsContent(contentDiv);
            break;
            
        default:
            loadDefaultContent(contentDiv);
    }
}

function loadDashboardContent(contentDiv) {
    contentDiv.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon green">
                    <i class="fas fa-clipboard-check"></i>
                </div>
                <div class="stat-info">
                    <h4>42</h4>
                    <p>Solicitudes Hoy</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon blue">
                    <i class="fas fa-truck"></i>
                </div>
                <div class="stat-info">
                    <h4>8</h4>
                    <p>Vehículos Activos</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon orange">
                    <i class="fas fa-recycle"></i>
                </div>
                <div class="stat-info">
                    <h4>1,250 kg</h4>
                    <p>Residuos Recolectados</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon red">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-info">
                    <h4>92%</h4>
                    <p>Eficiencia del Servicio</p>
                </div>
            </div>
        </div>
        
        <h3 style="margin-top: 30px;">Rutas de Recolección en Tiempo Real</h3>
        <div class="map-container">
            <div class="map-placeholder">
                <i class="fas fa-map-marked-alt" style="font-size: 3rem; margin-bottom: 15px;"></i>
                <p>Visualización de rutas optimizadas y vehículos en movimiento</p>
                <div style="display: flex; justify-content: center; gap: 20px; margin-top: 20px;">
                    <div class="vehicle-marker" style="top: 30%; left: 20%;">Vehículo #1</div>
                    <div class="vehicle-marker" style="top: 60%; left: 40%;">Vehículo #2</div>
                    <div class="vehicle-marker" style="top: 40%; left: 70%;">Vehículo #3</div>
                </div>
            </div>
        </div>
        
        <h3 style="margin-top: 40px;">Solicitudes Recientes</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Cliente</th>
                        <th>Dirección</th>
                        <th>Tipo Residuo</th>
                        <th>Cantidad (kg)</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>#00125</td>
                        <td>Juan Pérez</td>
                        <td>Calle Principal 123</td>
                        <td>Plástico</td>
                        <td>15</td>
                        <td><span class="badge badge-success">Completado</span></td>
                    </tr>
                    <tr>
                        <td>#00126</td>
                        <td>María González</td>
                        <td>Avenida Central 456</td>
                        <td>Vidrio</td>
                        <td>8</td>
                        <td><span class="badge badge-warning">En Proceso</span></td>
                    </tr>
                    <tr>
                        <td>#00127</td>
                        <td>Empresa Verde S.A.</td>
                        <td>Zona Industrial 789</td>
                        <td>Cartón</td>
                        <td>45</td>
                        <td><span class="badge badge-warning">En Proceso</span></td>
                    </tr>
                    <tr>
                        <td>#00128</td>
                        <td>Luis Rodríguez</td>
                        <td>Residencial Las Flores 321</td>
                        <td>Orgánico</td>
                        <td>12</td>
                        <td><span class="badge badge-danger">Pendiente</span></td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
}

function loadRequestsContent(contentDiv) {
    contentDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div>
                <button class="btn btn-primary" id="filterRequestsBtn">
                    <i class="fas fa-filter"></i> Filtrar
                </button>
                <button class="btn btn-outline" style="margin-left: 10px;">
                    <i class="fas fa-download"></i> Exportar
                </button>
            </div>
            <div>
                <input type="text" class="form-control" placeholder="Buscar solicitud..." style="width: 250px;">
            </div>
        </div>
        
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th>Tipo Residuo</th>
                        <th>Cantidad</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>#00125</td>
                        <td>15/10/2023</td>
                        <td>Juan Pérez</td>
                        <td>Plástico</td>
                        <td>15 kg</td>
                        <td><span class="badge badge-success">Completado</span></td>
                        <td>
                            <button class="btn btn-outline" style="padding: 5px 10px; font-size: 0.8rem;">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                    <tr>
                        <td>#00126</td>
                        <td>16/10/2023</td>
                        <td>María González</td>
                        <td>Vidrio</td>
                        <td>8 kg</td>
                        <td><span class="badge badge-warning">En Proceso</span></td>
                        <td>
                            <button class="btn btn-outline" style="padding: 5px 10px; font-size: 0.8rem;">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                    <tr>
                        <td>#00127</td>
                        <td>16/10/2023</td>
                        <td>Empresa Verde S.A.</td>
                        <td>Cartón</td>
                        <td>45 kg</td>
                        <td><span class="badge badge-warning">En Proceso</span></td>
                        <td>
                            <button class="btn btn-outline" style="padding: 5px 10px; font-size: 0.8rem;">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                    <tr>
                        <td>#00128</td>
                        <td>17/10/2023</td>
                        <td>Luis Rodríguez</td>
                        <td>Orgánico</td>
                        <td>12 kg</td>
                        <td><span class="badge badge-danger">Pendiente</span></td>
                        <td>
                            <button class="btn btn-outline" style="padding: 5px 10px; font-size: 0.8rem;">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                    <tr>
                        <td>#00129</td>
                        <td>17/10/2023</td>
                        <td>Ana Martínez</td>
                        <td>Metal</td>
                        <td>22 kg</td>
                        <td><span class="badge badge-danger">Pendiente</span></td>
                        <td>
                            <button class="btn btn-outline" style="padding: 5px 10px; font-size: 0.8rem;">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div style="display: flex; justify-content: center; margin-top: 30px;">
            <button class="btn btn-outline" style="margin-right: 10px;">Anterior</button>
            <button class="btn btn-primary" style="margin-right: 10px;">1</button>
            <button class="btn btn-outline" style="margin-right: 10px;">2</button>
            <button class="btn btn-outline" style="margin-right: 10px;">3</button>
            <button class="btn btn-outline">Siguiente</button>
        </div>
    `;
}

function loadRoutesContent(contentDiv) {
    contentDiv.innerHTML = `
        <div style="margin-bottom: 30px;">
            <h3>Optimizador de Rutas</h3>
            <p>Generación automática de rutas óptimas utilizando algoritmos de grafos y TSP (Problema del Viajante).</p>
            <button class="btn btn-primary" style="margin-top: 15px;">
                <i class="fas fa-cogs"></i> Generar Rutas Optimizadas
            </button>
        </div>
        
        <div class="map-container" style="height: 350px;">
            <div class="map-placeholder">
                <i class="fas fa-route" style="font-size: 3rem; margin-bottom: 15px;"></i>
                <p>Visualización de rutas optimizadas para la recolección</p>
                <p style="margin-top: 10px; font-size: 0.9rem;">Algoritmo implementado: TSP con heurística de vecino más cercano</p>
            </div>
        </div>
        
        <h3 style="margin-top: 40px;">Rutas Programadas para Hoy</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Ruta ID</th>
                        <th>Vehículo</th>
                        <th>Conductor</th>
                        <th>Puntos de Recolección</th>
                        <th>Distancia Estimada</th>
                        <th>Tiempo Estimado</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>R-2023-001</td>
                        <td>Vehículo #1 (Camión pequeño)</td>
                        <td>Carlos Ramírez</td>
                        <td>12</td>
                        <td>18.5 km</td>
                        <td>3h 20m</td>
                    </tr>
                    <tr>
                        <td>R-2023-002</td>
                        <td>Vehículo #2 (Camión mediano)</td>
                        <td>María López</td>
                        <td>15</td>
                        <td>22.3 km</td>
                        <td>4h 10m</td>
                    </tr>
                    <tr>
                        <td>R-2023-003</td>
                        <td>Vehículo #3 (Camión grande)</td>
                        <td>Pedro Sánchez</td>
                        <td>8</td>
                        <td>15.7 km</td>
                        <td>2h 45m</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
}

function loadReportsContent(contentDiv) {
    contentDiv.innerHTML = `
        <div style="margin-bottom: 30px;">
            <h3>Reportes de Recolección</h3>
            <p>Genere informes detallados sobre la operación de recolección de residuos.</p>
            
            <div class="form-row" style="margin-top: 20px;">
                <div class="form-group">
                    <label for="reportType">Tipo de Reporte</label>
                    <select id="reportType" class="form-control">
                        <option value="daily">Diario</option>
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensual</option>
                        <option value="custom">Personalizado</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="reportDate">Fecha</label>
                    <input type="date" id="reportDate" class="form-control" value="2023-10-17">
                </div>
                <div class="form-group">
                    <label style="visibility: hidden;">Generar</label>
                    <button class="btn btn-primary" style="width: 100%;">
                        <i class="fas fa-chart-bar"></i> Generar Reporte
                    </button>
                </div>
            </div>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 25px; border-radius: var(--border-radius); margin-bottom: 30px;">
            <h4>Resumen del Día: 17/10/2023</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">
                <div>
                    <h5 style="color: var(--gray-color); font-size: 0.9rem;">Total Recolectado</h5>
                    <p style="font-size: 1.5rem; font-weight: 600;">1,250 kg</p>
                </div>
                <div>
                    <h5 style="color: var(--gray-color); font-size: 0.9rem;">Clientes Atendidos</h5>
                    <p style="font-size: 1.5rem; font-weight: 600;">42</p>
                </div>
                <div>
                    <h5 style="color: var(--gray-color); font-size: 0.9rem;">Vehículos Utilizados</h5>
                    <p style="font-size: 1.5rem; font-weight: 600;">8</p>
                </div>
                <div>
                    <h5 style="color: var(--gray-color); font-size: 0.9rem;">Eficiencia</h5>
                    <p style="font-size: 1.5rem; font-weight: 600;">92%</p>
                </div>
            </div>
        </div>
        
        <h4>Distribución por Tipo de Residuo</h4>
        <div class="table-container" style="margin-top: 20px;">
            <table>
                <thead>
                    <tr>
                        <th>Tipo de Residuo</th>
                        <th>Cantidad (kg)</th>
                        <th>Porcentaje</th>
                        <th>Clientes</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Plástico</td>
                        <td>420 kg</td>
                        <td>33.6%</td>
                        <td>18</td>
                    </tr>
                    <tr>
                        <td>Cartón/Papel</td>
                        <td>380 kg</td>
                        <td>30.4%</td>
                        <td>12</td>
                    </tr>
                    <tr>
                        <td>Vidrio</td>
                        <td>210 kg</td>
                        <td>16.8%</td>
                        <td>6</td>
                    </tr>
                    <tr>
                        <td>Orgánico</td>
                        <td>150 kg</td>
                        <td>12.0%</td>
                        <td>4</td>
                    </tr>
                    <tr>
                        <td>Metal</td>
                        <td>90 kg</td>
                        <td>7.2%</td>
                        <td>2</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
}

function loadDefaultContent(contentDiv) {
    contentDiv.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <i class="fas fa-cog fa-spin" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 20px;"></i>
            <h3>Módulo en Desarrollo</h3>
            <p>Esta funcionalidad está actualmente en desarrollo como parte del prototipo funcional.</p>
        </div>
    `;
}

function initializeModals() {
    const requestModal = document.getElementById('requestModal');
    const newRequestBtn = document.getElementById('newRequestBtn');
    const cancelRequestBtn = document.getElementById('cancelRequestBtn');
    const requestForm = document.getElementById('requestForm');
    
    if (newRequestBtn) {
        newRequestBtn.addEventListener('click', () => {
            requestModal.style.display = 'block';
        });
    }
    
    if (cancelRequestBtn) {
        cancelRequestBtn.addEventListener('click', () => {
            requestModal.style.display = 'none';
        });
    }
    
    if (requestForm) {
        requestForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Solicitud de recolección creada exitosamente. Será asignada a una ruta optimizada.');
            requestModal.style.display = 'none';
            requestForm.reset();
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === requestModal) {
            requestModal.style.display = 'none';
        }
    });
}

function initializeButtons() {
    const featuresBtn = document.getElementById('featuresBtn');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    
    if (featuresBtn) {
        featuresBtn.addEventListener('click', () => {
            const featuresSection = document.getElementById('features');
            const headerOffset = 80;
            const elementPosition = featuresSection.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        });
    }
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.location.href = '/login';
        });
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            window.location.href = '/registro';
        });
    }
}

// Animación de scroll suave y progresiva
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('.scroll-fade');
    const windowHeight = window.innerHeight;
    const scrollY = window.scrollY;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionBottom = sectionTop + sectionHeight;
        
        // Calcular el porcentaje de visibilidad de la sección
        let visibility = 0;
        
        if (scrollY + windowHeight > sectionTop && scrollY < sectionBottom) {
            const visibleHeight = Math.min(scrollY + windowHeight, sectionBottom) - Math.max(scrollY, sectionTop);
            visibility = visibleHeight / Math.min(sectionHeight, windowHeight);
            visibility = Math.max(0, Math.min(1, visibility));
        }
        
        // Aplicar la animación basada en el porcentaje de visibilidad
        section.style.opacity = visibility;
        section.style.transform = `translateY(${(1 - visibility) * 100}px)`;
    });
});

// Inicializar el estado de las secciones
document.querySelectorAll('.scroll-fade').forEach(section => {
    section.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
    section.style.opacity = '0';
    section.style.transform = 'translateY(100px)';
});

// Ejecutar la animación al cargar la página
window.dispatchEvent(new Event('scroll'));

// Scroll suave al hacer clic en enlaces de navegación
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#home') {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        } else {
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// Inicializar mapa con Leaflet (OpenStreetMap - Gratis)
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que Leaflet esté cargado
    if (typeof L !== 'undefined') {
        initLeafletMap();
    }
    
    // Inicializar botón scroll to top
    initScrollToTop();
});

function initLeafletMap() {
    const mapElement = document.getElementById('google-map');
    if (!mapElement) return;
    
    // Crear mapa centrado en Tulancingo de Bravo, Hidalgo
    const map = L.map('google-map').setView([20.0833, -98.3667], 14);
    
    // Añadir capa de OpenStreetMap (completamente gratis)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Icono personalizado para vehículos de basura
    const truckIcon = L.divIcon({
        className: 'custom-vehicle-marker',
        html: '<div style="background-color: #27ae60; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 12px;">🚛</div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
    
    // Icono para casas/puntos de recolección
    const houseIcon = L.divIcon({
        className: 'custom-house-marker',
        html: '<div style="background-color: #3498db; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 10px;">🏠</div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });
    
    // Punto de inicio (centro de recolección)
    const depot = L.divIcon({
        className: 'custom-depot-marker',
        html: '<div style="background-color: #e74c3c; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 14px;">🏢</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });
    
    // Centro de recolección en Tulancingo de Bravo
    const depotLocation = [20.0833, -98.3667];
    L.marker(depotLocation, { icon: depot })
        .addTo(map)
        .bindPopup('<b>Centro de Operaciones ECOLOGICS</b><br>Tulancingo de Bravo, Hidalgo<br>Punto de inicio y fin de rutas');
    
    // Definir rutas con casas y vehículos en Tulancingo de Bravo
    const routes = [
        {
            truck: { lat: 20.0900, lng: -98.3700, name: 'Vehículo #1 - Zona Centro' },
            houses: [
                { lat: 20.0850, lng: -98.3680 },
                { lat: 20.0870, lng: -98.3690 },
                { lat: 20.0885, lng: -98.3695 },
                { lat: 20.0900, lng: -98.3700 }
            ],
            color: '#27ae60'
        },
        {
            truck: { lat: 20.0780, lng: -98.3620, name: 'Vehículo #2 - Zona Norte' },
            houses: [
                { lat: 20.0820, lng: -98.3650 },
                { lat: 20.0805, lng: -98.3640 },
                { lat: 20.0790, lng: -98.3630 },
                { lat: 20.0780, lng: -98.3620 }
            ],
            color: '#2ecc71'
        },
        {
            truck: { lat: 20.0760, lng: -98.3730, name: 'Vehículo #3 - Zona Sur' },
            houses: [
                { lat: 20.0810, lng: -98.3690 },
                { lat: 20.0795, lng: -98.3705 },
                { lat: 20.0775, lng: -98.3720 },
                { lat: 20.0760, lng: -98.3730 }
            ],
            color: '#16a085'
        },
        {
            truck: { lat: 20.0920, lng: -98.3600, name: 'Vehículo #4 - Zona Oriente' },
            houses: [
                { lat: 20.0860, lng: -98.3640 },
                { lat: 20.0880, lng: -98.3625 },
                { lat: 20.0900, lng: -98.3610 },
                { lat: 20.0920, lng: -98.3600 }
            ],
            color: '#1abc9c'
        },
        {
            truck: { lat: 20.0800, lng: -98.3750, name: 'Vehículo #5 - Zona Poniente' },
            houses: [
                { lat: 20.0840, lng: -98.3710 },
                { lat: 20.0825, lng: -98.3725 },
                { lat: 20.0810, lng: -98.3740 },
                { lat: 20.0800, lng: -98.3750 }
            ],
            color: '#27ae60'
        }
    ];
    
    // Dibujar rutas, casas y vehículos
    routes.forEach(route => {
        // Crear array de coordenadas para la ruta completa (desde depósito)
        const routeCoordinates = [
            depotLocation,
            ...route.houses.map(h => [h.lat, h.lng]),
            [route.truck.lat, route.truck.lng]
        ];
        
        // Dibujar línea de ruta
        L.polyline(routeCoordinates, {
            color: route.color,
            weight: 4,
            opacity: 0.7,
            dashArray: '10, 10',
            lineJoin: 'round'
        }).addTo(map).bindPopup(`<b>${route.truck.name}</b><br>Ruta de recolección`);
        
        // Añadir marcadores de casas
        route.houses.forEach((house, index) => {
            L.marker([house.lat, house.lng], { icon: houseIcon })
                .addTo(map)
                .bindPopup(`<b>Punto de recolección ${index + 1}</b><br>Ruta: ${route.truck.name}`);
        });
        
        // Añadir marcador del vehículo
        L.marker([route.truck.lat, route.truck.lng], { icon: truckIcon })
            .addTo(map)
            .bindPopup(`<b>${route.truck.name}</b><br>En servicio<br>Puntos restantes: 2`);
    });
    
    // Ajustar vista para mostrar todas las rutas
    const allPoints = routes.flatMap(r => [
        ...r.houses.map(h => [h.lat, h.lng]),
        [r.truck.lat, r.truck.lng]
    ]);
    allPoints.push(depotLocation);
    
    const bounds = L.latLngBounds(allPoints);
    map.fitBounds(bounds, { padding: [30, 30] });
}

// Scroll to Top Button
function initScrollToTop() {
    const scrollBtn = document.getElementById('scrollToTopBtn');
    
    if (scrollBtn) {
        // Mostrar/ocultar botón según scroll
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                scrollBtn.classList.add('show');
            } else {
                scrollBtn.classList.remove('show');
            }
        });
        
        // Scroll suave al inicio
        scrollBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

// ==================== FUNCIONES PARA INICIO_SESION.HTML ====================
function initLoginPage() {
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const usernameInput = document.getElementById('username');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const loginForm = document.getElementById('loginForm');
    const loginButton = document.getElementById('loginButton');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');

    if (!loginForm) return; // No estamos en la página de login

    // Toggle password visibility
    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            const nextType = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', nextType);
            togglePassword.innerHTML = nextType === 'password'
                ? '<i class="fas fa-eye"></i>'
                : '<i class="fas fa-eye-slash"></i>';
        });
    }

    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();

            if (!username || !password) {
                showLoginError('Por favor ingresa usuario y contraseña.');
                return;
            }

            hideLoginFeedbackMessages();
            loginButton.disabled = true;
            const originalText = loginButton.innerHTML;
            loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';

            setTimeout(() => {
                // Simulación de autenticación - en producción conectar con backend
                if (username === 'admin' && password === 'admin123') {
                    showLoginSuccess('Inicio de sesión exitoso. Redirigiendo...');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 800);
                } else {
                    showLoginError('Usuario o contraseña incorrectos. Por favor intenta nuevamente.');
                    loginButton.innerHTML = originalText;
                    loginButton.disabled = false;
                }
            }, 700);
        });
    }

    // Forgot password link
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (event) => {
            event.preventDefault();
            if (!usernameInput.value.trim()) {
                showLoginError('Por favor ingresa tu nombre de usuario para recuperar tu contraseña.');
                usernameInput.focus();
                return;
            }
            alert(`Solicitud de recuperación de contraseña enviada para el usuario: ${usernameInput.value.trim()}\n\nRevisa tu bandeja de entrada para continuar con el proceso.`);
        });
    }

    // Clear errors on input
    if (usernameInput) usernameInput.addEventListener('input', hideLoginFeedbackMessages);
    if (passwordInput) passwordInput.addEventListener('input', hideLoginFeedbackMessages);

    // Keyboard shortcut for login
    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.key === 'Enter' && loginForm) {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });

    if (usernameInput) usernameInput.focus();
}

function hideLoginFeedbackMessages() {
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    if (errorMessage) errorMessage.classList.remove('show');
    if (successMessage) successMessage.classList.remove('show');
}

function showLoginError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        errorMessage.classList.add('show');
        setTimeout(() => {
            errorMessage.classList.remove('show');
        }, 5000);
    }
}

function showLoginSuccess(message) {
    const successMessage = document.getElementById('successMessage');
    if (successMessage) {
        successMessage.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        successMessage.classList.add('show');
        setTimeout(() => {
            successMessage.classList.remove('show');
        }, 4000);
    }
}

// ==================== FUNCIONES PARA REGISTRO.HTML ====================
function initRegisterPage() {
    const successMessage = document.getElementById("success-message");
    const successText = document.getElementById("success-text");

    if (!successMessage) return; // No estamos en la página de registro

    // Toggle password visibility
    document.querySelectorAll(".toggle-password").forEach((button) => {
        button.addEventListener("click", () => {
            const targetId = button.getAttribute("data-target");
            const input = document.getElementById(targetId);
            const icon = button.querySelector("i");

            if (input && input.type === "password") {
                input.type = "text";
                if (icon) icon.classList.replace("fa-eye", "fa-eye-slash");
            } else if (input) {
                input.type = "password";
                if (icon) icon.classList.replace("fa-eye-slash", "fa-eye");
            }
        });
    });

    // Form validation configuration
    const formConfigs = [
        {
            id: "client-form",
            profile: "cliente",
            requiredFields: [
                { id: "client-name", errorId: "client-name-error", message: "Ingresa tu nombre." },
                { id: "client-lastname", errorId: "client-lastname-error", message: "Ingresa tu apellido." },
                { id: "client-email", errorId: "client-email-error", message: "Escribe un correo válido.", type: "email" },
                { id: "client-phone", errorId: "client-phone-error", message: "Coloca un teléfono válido.", type: "phone" },
                { id: "client-address", errorId: "client-address-error", message: "Indica tu dirección." }
            ],
            password: {
                id: "client-password",
                confirmId: "client-confirm-password",
                errorId: "client-password-error",
                confirmErrorId: "client-confirm-password-error"
            },
            terms: { id: "client-terms", errorId: "client-terms-error" }
        }
    ];

    function clearRegisterError(element, errorId) {
        if (!element) return;
        element.classList.remove("error");
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            errorElement.textContent = "";
            errorElement.classList.remove("show");
        }
    }

    function setRegisterError(element, errorId, message) {
        if (!element) return;
        element.classList.add("error");
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add("show");
        }
    }

    function validateRegisterField(config) {
        const element = document.getElementById(config.id);
        if (!element) return true;

        const value = (element.value || "").trim();
        let isValid = value.length > 0;

        if (config.type === "email" && isValid) {
            isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        }

        if (config.type === "phone" && isValid) {
            const digits = value.replace(/\D/g, "");
            isValid = digits.length >= 10;
        }

        if (!isValid) {
            setRegisterError(element, config.errorId, config.message);
        } else {
            clearRegisterError(element, config.errorId);
        }

        return isValid;
    }

    function validateRegisterPasswords(passwordConfig) {
        const passwordInput = document.getElementById(passwordConfig.id);
        const confirmInput = document.getElementById(passwordConfig.confirmId);

        if (!passwordInput || !confirmInput) return true;

        const passwordValid = passwordInput.value.trim().length >= 8;
        if (!passwordValid) {
            setRegisterError(passwordInput, passwordConfig.errorId, "La contraseña debe tener al menos 8 caracteres.");
        } else {
            clearRegisterError(passwordInput, passwordConfig.errorId);
        }

        const passwordsMatch = passwordInput.value === confirmInput.value && confirmInput.value.trim().length > 0;
        if (!passwordsMatch) {
            setRegisterError(confirmInput, passwordConfig.confirmErrorId, "Las contraseñas no coinciden.");
        } else {
            clearRegisterError(confirmInput, passwordConfig.confirmErrorId);
        }

        return passwordValid && passwordsMatch;
    }

    function validateRegisterTerms(termsConfig) {
        if (!termsConfig) return true;
        const checkbox = document.getElementById(termsConfig.id);
        if (!checkbox) return true;

        if (!checkbox.checked) {
            setRegisterError(checkbox, termsConfig.errorId, "Debes aceptar los términos para continuar.");
            return false;
        }

        clearRegisterError(checkbox, termsConfig.errorId);
        return true;
    }

    function setupRegisterForm(config) {
        const form = document.getElementById(config.id);
        if (!form) return;

        form.addEventListener("submit", (event) => {
            event.preventDefault();

            let isValid = true;

            config.requiredFields.forEach((field) => {
                if (!validateRegisterField(field)) {
                    isValid = false;
                }
            });

            if (!validateRegisterPasswords(config.password)) {
                isValid = false;
            }

            if (!validateRegisterTerms(config.terms)) {
                isValid = false;
            }

            if (isValid) {
                successText.textContent = `El perfil de ${config.profile} se registró correctamente.`;
                successMessage.classList.add("show");
                form.reset();
            }
        });

        // Real-time validation
        form.querySelectorAll("input, select").forEach((element) => {
            element.addEventListener("input", () => {
                const fieldConfig = config.requiredFields.find((field) => field.id === element.id);
                if (fieldConfig) {
                    validateRegisterField(fieldConfig);
                }
                if (element.id === config.password.id || element.id === config.password.confirmId) {
                    validateRegisterPasswords(config.password);
                }
            });

            if (element.type === "checkbox") {
                element.addEventListener("change", () => validateRegisterTerms(config.terms));
            }
        });
    }

    formConfigs.forEach(setupRegisterForm);
}

// ==================== INICIALIZACIÓN GLOBAL ====================
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar funciones de index.html
    if (typeof L !== 'undefined') {
        initLeafletMap();
    }
    initScrollToTop();
    
    // Inicializar funciones de inicio_sesion.html
    initLoginPage();
    
    // Inicializar funciones de registro.html
    initRegisterPage();
});
