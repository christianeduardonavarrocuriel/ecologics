# ECOLOGICS - Sistema de Gestión Inteligente de Residuos

Sistema integral web y móvil para optimizar rutas de recolección, mejorar comunicación con clientes y analizar la eficiencia del servicio de gestión de residuos.

## 🚀 Características Principales

- **Optimización de Rutas**: Algoritmos eficientes para generar rutas óptimas que reduzcan tiempo y combustible
- **Seguimiento en Tiempo Real**: Visualización de ubicación de unidades y estado de solicitudes
- **Gestión de Residuos**: Clasificación por tipo de residuo y registro de cantidades
- **Reportes y Análisis**: Informes detallados sobre recolección, eficiencia y métricas del servicio

## 📁 Estructura del Proyecto

```
ECOLOGICS/
├── index.html              # Página principal
├── assets/
│   ├── css/
│   │   └── styles.css      # Estilos de la aplicación
│   ├── js/
│   │   └── app.js          # Lógica de la aplicación
│   └── images/             # Recursos gráficos
├── src/                    # Código fuente adicional
├── README.md
└── LICENSE
```

## 🛠️ Instalación y Ejecución

### Opción 1: Servidor Python (Recomendado)

```bash
# Navegar al directorio del proyecto
cd /workspaces/ECOLOGICS

# Iniciar servidor HTTP
python3 -m http.server 8000

# Abrir en el navegador
# http://localhost:8000
```

### Opción 2: Live Server (VS Code)

1. Instalar la extensión "Live Server" en VS Code
2. Hacer clic derecho en `index.html`
3. Seleccionar "Open with Live Server"

### Opción 3: Abrir directamente

Simplemente abrir el archivo `index.html` en tu navegador preferido.

## 🎯 Funcionalidades Implementadas

### Dashboard Administrativo
- Vista general de estadísticas
- Gestión de solicitudes de recolección
- Visualización de rutas optimizadas
- Generación de reportes

### Módulos Principales
1. **Dashboard**: Estadísticas y métricas del sistema
2. **Solicitudes**: Gestión completa de solicitudes de recolección
3. **Rutas**: Optimización y visualización de rutas
4. **Vehículos**: Control de flota
5. **Clientes**: Gestión de base de datos de clientes
6. **Reportes**: Análisis y reportes detallados
7. **Configuración**: Ajustes del sistema

## 🔧 Tecnologías Utilizadas

- **HTML5**: Estructura semántica
- **CSS3**: Diseño responsive con CSS Grid y Flexbox
- **JavaScript**: Lógica del cliente (Vanilla JS)
- **Font Awesome**: Iconografía
- **Google Fonts**: Tipografía (Poppins, Roboto)

## 📱 Responsive Design

La aplicación está optimizada para:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (< 768px)

## 🚧 Próximas Funcionalidades

- [ ] Integración con API de mapas (Google Maps/OpenStreetMap)
- [ ] Sistema de autenticación y roles de usuario
- [ ] Base de datos para persistencia de datos
- [ ] Aplicación móvil nativa
- [ ] Notificaciones push
- [ ] Algoritmos avanzados de optimización de rutas (TSP, Dijkstra)
- [ ] Panel de análisis con gráficos interactivos

## 👥 Contribuir

Este es un proyecto de demostración. Para contribuir:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Ver archivo `LICENSE` para más detalles.

## 📞 Contacto

ECOLOGICS Team - Gestión Inteligente de Residuos

---

**Nota**: Este es un prototipo funcional para demostración. Para implementación en producción, se requiere backend robusto, base de datos, y medidas de seguridad adicionales.