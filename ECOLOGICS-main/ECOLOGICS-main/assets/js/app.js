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
    const demoBtn = document.getElementById('demoBtn');
    const featuresBtn = document.getElementById('featuresBtn');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    
    if (demoBtn) {
        demoBtn.addEventListener('click', () => {
            document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
        });
    }
    
    if (featuresBtn) {
        featuresBtn.addEventListener('click', () => {
            document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
        });
    }
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            alert('Funcionalidad de inicio de sesión en desarrollo. En el prototipo completo esto permitiría acceso a diferentes perfiles (cliente, recolector, administrador).');
        });
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            alert('Funcionalidad de registro en desarrollo. Permitiría registrar nuevos clientes para el servicio de recolección.');
        });
    }
}
