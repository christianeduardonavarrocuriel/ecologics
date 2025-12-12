// Mapas Mapbox para EcoRecolección
// Este archivo maneja todos los mapas de la aplicación

let MAPBOX_TOKEN = '';

// Inicializar token de Mapbox desde la API
async function initMapboxToken() {
  try {
    const response = await fetch('/api/config/mapbox-token');
    const data = await response.json();
    MAPBOX_TOKEN = data.token;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    return MAPBOX_TOKEN;
  } catch (error) {
    console.error('Error cargando token de Mapbox:', error);
    return null;
  }
}

// Mapa de Solicitudes Disponibles
async function initSolicitudesMap(containerId = 'mapaSolicitud') {
  try {
    await initMapboxToken();
    const map = new mapboxgl.Map({
      container: containerId,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [0, 20],
      zoom: 3,
    });

    // Agregar controles de navegación
    map.addControl(new mapboxgl.NavigationControl());
    map.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    }));

    // Cargar solicitudes de la API
    fetch('/api/usuario/solicitudes')
      .then(res => res.json())
      .then(solicitudes => {
        solicitudes.forEach((solicitud, index) => {
          // Crear marcador
          const el = document.createElement('div');
          el.className = 'marker';
          el.style.cssText = `
            width: 40px;
            height: 40px;
            background-color: #22c55e;
            border-radius: 50%;
            border: 3px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          `;
          el.textContent = index + 1;

          // Crear popup
          const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="padding: 8px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold;">${solicitud.tipo_residuo}</h3>
              <p style="margin: 4px 0; font-size: 12px; color: #666;">${solicitud.direccion}</p>
              <p style="margin: 4px 0; font-weight: bold;">${solicitud.kilos} kg</p>
            </div>
          `);

          // Agregar marcador al mapa
          new mapboxgl.Marker(el)
            .setLngLat([solicitud.lng, solicitud.lat])
            .setPopup(popup)
            .addTo(map);
        });
      })
      .catch(error => console.error('Error cargando solicitudes:', error));

    return map;
  } catch (error) {
    console.error('Error inicializando mapa de solicitudes:', error);
  }
}

// Mapa de Seguimiento en Tiempo Real
async function initSeguimientoMap(containerId = 'mapaSeguimiento', idSolicitud = 1) {
  try {
    await initMapboxToken();
    const map = new mapboxgl.Map({
      container: containerId,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [0, 20],
      zoom: 3,
    });

    // Agregar controles
    map.addControl(new mapboxgl.NavigationControl());
    map.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    }));

    // Cargar datos de seguimiento
    function updateUbicacion() {
      fetch(`/api/usuario/seguimiento/${idSolicitud}`)
        .then(res => res.json())
        .then(data => {
          // Limpiar marcadores anteriores
          const markers = document.querySelectorAll('.marker-recolector, .marker-usuario');
          markers.forEach(m => m.remove());

          // Marcador del recolector (verde)
          const markerRecolector = document.createElement('div');
          markerRecolector.className = 'marker-recolector';
          markerRecolector.style.cssText = `
            width: 44px;
            height: 44px;
            background-color: #22c55e;
            border-radius: 50%;
            border: 4px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            animation: pulse 2s infinite;
          `;
          markerRecolector.innerHTML = '🚛';

          const popupRecolector = new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="padding: 10px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold;">${data.recolector.nombre}</h3>
              <p style="margin: 4px 0; font-size: 12px;">${data.recolector.vehiculo}</p>
              <p style="margin: 4px 0; font-size: 12px;">Placa: ${data.recolector.placas}</p>
              <hr style="margin: 8px 0; border: none; border-top: 1px solid #ddd;">
              <p style="margin: 4px 0; font-size: 12px; color: #22c55e;"><strong>✓ ${data.estado}</strong></p>
              <p style="margin: 4px 0; font-size: 12px;">Distancia: ${data.distancia} km</p>
              <p style="margin: 4px 0; font-size: 12px;">ETA: ${data.tiempo_estimado} min</p>
            </div>
          `);

          new mapboxgl.Marker(markerRecolector)
            .setLngLat([data.ubicacion.lng, data.ubicacion.lat])
            .setPopup(popupRecolector)
            .addTo(map);

          // Marcador del usuario (azul)
          const markerUsuario = document.createElement('div');
          markerUsuario.className = 'marker-usuario';
          markerUsuario.style.cssText = `
            width: 44px;
            height: 44px;
            background-color: #3b82f6;
            border-radius: 50%;
            border: 4px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          `;
          markerUsuario.innerHTML = '📍';

          new mapboxgl.Marker(markerUsuario)
            .setLngLat([data.ubicacion.lng - 0.01, data.ubicacion.lat - 0.01])
            .addTo(map);

          // Dibujar línea de ruta
          if (map.getSource('route')) {
            map.removeLayer('route');
            map.removeSource('route');
          }

          map.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [
                  [data.ubicacion.lng, data.ubicacion.lat],
                  [data.ubicacion.lng - 0.01, data.ubicacion.lat - 0.01],
                ],
              },
            },
          });

          map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            paint: {
              'line-color': '#3b82f6',
              'line-width': 3,
              'line-dasharray': [5, 5],
            },
          });

          // Centrar mapa en el recolector
          map.flyTo({
            center: [data.ubicacion.lng, data.ubicacion.lat],
            zoom: 14,
            duration: 1000,
          });
        })
        .catch(error => console.error('Error cargando seguimiento:', error));
    }

    // Actualizar ubicación cada 5 segundos
    updateUbicacion();
    setInterval(updateUbicacion, 5000);

    return map;
  } catch (error) {
    console.error('Error inicializando mapa de seguimiento:', error);
  }
}

// Mapa de Rutas Generales en Tulancingo de Bravo
async function initRutasMap(containerId = 'mapaRutas') {
  try {
    console.log(`[RUTAS] Iniciando mapa de rutas en contenedor: ${containerId}`);
    
    // Verificar que el contenedor existe
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`[RUTAS] ERROR: Contenedor ${containerId} no encontrado`);
      return;
    }
    console.log(`[RUTAS] Contenedor encontrado. Altura: ${container.offsetHeight}px`);
    
    // Cargar token
    console.log(`[RUTAS] Cargando token de Mapbox...`);
    const token = await initMapboxToken();
    if (!token) {
      console.error('[RUTAS] ERROR: No se pudo cargar el token de Mapbox');
      container.innerHTML = '<div style="padding: 20px; color: red; text-align: center;">Error: No se pudo cargar el token de Mapbox</div>';
      return;
    }
    console.log(`[RUTAS] Token cargado exitosamente`);
    
    // Coordenadas de Tulancingo de Bravo
    const tulancingoCords = [-98.3639, 20.0833];
    console.log(`[RUTAS] Creando mapa en Tulancingo de Bravo: ${tulancingoCords}`);
    
    const map = new mapboxgl.Map({
      container: containerId,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: tulancingoCords,
      zoom: 12,
    });

    console.log('[RUTAS] Mapa creado. Esperando que cargue...');
    
    // Esperar a que el mapa esté listo
    map.on('load', () => {
      console.log('[RUTAS] Mapa cargado correctamente');
    });
    
    map.on('error', (error) => {
      console.error('[RUTAS] Error en el mapa de Mapbox:', error);
    });

    // Agregar controles
    map.addControl(new mapboxgl.NavigationControl());
    map.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    }));

    // Rutas de prueba en Tulancingo de Bravo
    const rutasPrueba = [
      {
        id: 1,
        nombre: 'Ruta Norte - Centro Histórico',
        color: '#ef4444',
        camion: '🚛 T-001',
        conductor: 'Carlos Martínez',
        estado: 'en-ruta',
        puntos: [
          { lat: 20.0850, lng: -98.3650, nombre: 'Centro' },
          { lat: 20.0880, lng: -98.3620, nombre: 'Plaza Principal' },
          { lat: 20.0920, lng: -98.3590, nombre: 'Mercado' },
          { lat: 20.0950, lng: -98.3560, nombre: 'Hospital' },
        ]
      },
      {
        id: 2,
        nombre: 'Ruta Sur - Av. Principal',
        color: '#f97316',
        camion: '🚛 T-002',
        conductor: 'Juan García',
        estado: 'en-ruta',
        puntos: [
          { lat: 20.0800, lng: -98.3650, nombre: 'Inicio Sur' },
          { lat: 20.0760, lng: -98.3680, nombre: 'Colonia Norte' },
          { lat: 20.0720, lng: -98.3710, nombre: 'Escuela' },
          { lat: 20.0680, lng: -98.3740, nombre: 'Parque' },
        ]
      },
      {
        id: 3,
        nombre: 'Ruta Este - Zona Residencial',
        color: '#eab308',
        camion: '🚛 T-003',
        conductor: 'Pedro López',
        estado: 'en-ruta',
        puntos: [
          { lat: 20.0833, lng: -98.3550, nombre: 'Inicio Este' },
          { lat: 20.0850, lng: -98.3500, nombre: 'Residencial A' },
          { lat: 20.0870, lng: -98.3450, nombre: 'Residencial B' },
          { lat: 20.0890, lng: -98.3400, nombre: 'Zona Verde' },
        ]
      },
      {
        id: 4,
        nombre: 'Ruta Oeste - Comercial',
        color: '#22c55e',
        camion: '🚛 T-004',
        conductor: 'Miguel Sánchez',
        estado: 'en-ruta',
        puntos: [
          { lat: 20.0833, lng: -98.3750, nombre: 'Centro Comercial' },
          { lat: 20.0820, lng: -98.3800, nombre: 'Zona Industrial' },
          { lat: 20.0810, lng: -98.3850, nombre: 'Almacenes' },
          { lat: 20.0800, lng: -98.3900, nombre: 'Depósito' },
        ]
      },
      {
        id: 5,
        nombre: 'Ruta Central - Mixta',
        color: '#06b6d4',
        camion: '🚛 T-005',
        conductor: 'Andrés Rivera',
        estado: 'completada',
        puntos: [
          { lat: 20.0850, lng: -98.3600, nombre: 'Punto A' },
          { lat: 20.0840, lng: -98.3630, nombre: 'Punto B' },
          { lat: 20.0830, lng: -98.3660, nombre: 'Punto C' },
          { lat: 20.0820, lng: -98.3690, nombre: 'Punto D' },
        ]
      },
      {
        id: 6,
        nombre: 'Ruta Periférica - Zona Baja',
        color: '#3b82f6',
        camion: '🚛 T-006',
        conductor: 'Roberto Díaz',
        estado: 'pausa',
        puntos: [
          { lat: 20.0700, lng: -98.3650, nombre: 'Zona Baja 1' },
          { lat: 20.0730, lng: -98.3620, nombre: 'Zona Baja 2' },
          { lat: 20.0760, lng: -98.3590, nombre: 'Zona Baja 3' },
          { lat: 20.0790, lng: -98.3560, nombre: 'Zona Baja 4' },
        ]
      },
      {
        id: 7,
        nombre: 'Ruta Alta - Zona Elevada',
        color: '#8b5cf6',
        camion: '🚛 T-007',
        conductor: 'Fernando Méndez',
        estado: 'en-ruta',
        puntos: [
          { lat: 20.0950, lng: -98.3650, nombre: 'Zona Alta 1' },
          { lat: 20.0970, lng: -98.3620, nombre: 'Zona Alta 2' },
          { lat: 20.0990, lng: -98.3590, nombre: 'Zona Alta 3' },
          { lat: 20.1010, lng: -98.3560, nombre: 'Zona Alta 4' },
        ]
      },
    ];

    // Agregar rutas al mapa
    rutasPrueba.forEach((ruta) => {
      const coordinates = ruta.puntos.map(p => [p.lng, p.lat]);

      // Agregar fuente de la ruta
      map.addSource(`route-${ruta.id}`, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: coordinates,
          },
        },
      });

      // Agregar capa de la ruta con efecto visual
      map.addLayer({
        id: `route-${ruta.id}`,
        type: 'line',
        source: `route-${ruta.id}`,
        paint: {
          'line-color': ruta.color,
          'line-width': 3,
          'line-opacity': 0.8,
        },
      });

      // Agregar sombra a la ruta
      map.addLayer({
        id: `route-${ruta.id}-shadow`,
        type: 'line',
        source: `route-${ruta.id}`,
        paint: {
          'line-color': ruta.color,
          'line-width': 6,
          'line-opacity': 0.2,
        },
      });

      // Marcador del camión (inicio de ruta)
      const primerPunto = ruta.puntos[0];
      const elCamion = document.createElement('div');
      elCamion.style.cssText = `
        width: 40px;
        height: 40px;
        background-color: ${ruta.color};
        border-radius: 50%;
        border: 3px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        cursor: pointer;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        font-weight: bold;
      `;
      elCamion.innerHTML = '🚛';

      const popupCamion = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 12px; font-family: Arial, sans-serif;">
          <h3 style="margin: 0 0 10px 0; font-weight: bold; color: ${ruta.color};">
            ${ruta.camion} - ${ruta.nombre}
          </h3>
          <p style="margin: 5px 0; font-size: 12px;">
            <strong>Conductor:</strong> ${ruta.conductor}
          </p>
          <p style="margin: 5px 0; font-size: 12px;">
            <strong>Estado:</strong> <span style="background: ${ruta.color}; color: white; padding: 2px 6px; border-radius: 3px;">
              ${ruta.estado}
            </span>
          </p>
          <p style="margin: 5px 0; font-size: 12px;">
            <strong>Puntos:</strong> ${ruta.puntos.length}
          </p>
        </div>
      `);

      new mapboxgl.Marker(elCamion)
        .setLngLat([primerPunto.lng, primerPunto.lat])
        .setPopup(popupCamion)
        .addTo(map);

      // Agregar marcadores de puntos de parada
      ruta.puntos.forEach((punto, puntIndex) => {
        const el = document.createElement('div');
        el.style.cssText = `
          width: 32px;
          height: 32px;
          background-color: white;
          border: 3px solid ${ruta.color};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${ruta.color};
          font-weight: bold;
          font-size: 12px;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        `;
        el.textContent = puntIndex + 1;

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 10px; font-family: Arial, sans-serif;">
            <h4 style="margin: 0 0 8px 0; color: ${ruta.color};">${punto.nombre}</h4>
            <p style="margin: 4px 0; font-size: 11px; color: #666;">
              Ruta: ${ruta.nombre}
            </p>
            <p style="margin: 4px 0; font-size: 11px; color: #666;">
              Parada: ${puntIndex + 1} de ${ruta.puntos.length}
            </p>
          </div>
        `);

        new mapboxgl.Marker(el)
          .setLngLat([punto.lng, punto.lat])
          .setPopup(popup)
          .addTo(map);
      });
    });

    console.log(`[RUTAS] Se agregaron ${rutasPrueba.length} rutas al mapa`);

    // Centrar mapa en Tulancingo
    map.flyTo({
      center: tulancingoCords,
      zoom: 12,
      duration: 1500,
    });

    console.log('[RUTAS] Mapa de rutas inicializado correctamente ✅');
    return map;
  } catch (error) {
    console.error('[RUTAS] Error inicializando mapa de rutas:', error);
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `<div style="padding: 20px; color: red; text-align: center;">Error: ${error.message}</div>`;
    }
  }
}

// Inicializar mapa para crear nueva ruta
async function initCrearRutaMap(containerId = 'mapaSugerir') {
  try {
    await initMapboxToken();
    const map = new mapboxgl.Map({
      container: containerId,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [0, 20],
      zoom: 3,
    });

    // Agregar controles
    map.addControl(new mapboxgl.NavigationControl());
    map.addControl(new mapboxgl.GeolocateControl());

    // Array de puntos
    let puntos = [];

    // Manejar clic en el mapa
    map.on('click', (e) => {
      const nuevoPunto = {
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
        orden: puntos.length,
      };
      puntos.push(nuevoPunto);

      // Crear marcador
      const el = document.createElement('div');
      el.style.cssText = `
        width: 32px;
        height: 32px;
        background-color: #3b82f6;
        border-radius: 50%;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      `;
      el.textContent = puntos.length;

      new mapboxgl.Marker(el)
        .setLngLat([nuevoPunto.lng, nuevoPunto.lat])
        .addTo(map);

      // Actualizar UI si existe
      if (window.actualizarPuntosUI) {
        window.actualizarPuntosUI(puntos);
      }
    });

    // Hacer el array de puntos global
    window.puntosRuta = puntos;

    return map;
  } catch (error) {
    console.error('Error inicializando mapa de creación de ruta:', error);
  }
}

// Estilos CSS para animaciones
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  
  .mapboxgl-popup-content {
    padding: 10px !important;
    border-radius: 6px !important;
  }
`;
document.head.appendChild(style);
