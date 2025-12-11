-- ===========================================
-- TABLA: usuarios
-- Roles: usuario, recolector, admin
-- ===========================================
CREATE TABLE usuarios (
    id_usuario       INTEGER PRIMARY KEY AUTOINCREMENT,
    rol              TEXT NOT NULL,            -- usuario | recolector | admin
    username         TEXT NOT NULL UNIQUE,
    correo           TEXT NOT NULL UNIQUE,
    nombre           TEXT NOT NULL,
    apellidos        TEXT NOT NULL,
    telefono         TEXT,
    direccion        TEXT,
    contrasena       TEXT NOT NULL             -- hash
);

-- ===========================================
-- TABLA: solicitudes_recoleccion
-- solicitudes generadas por el usuario
-- ===========================================
CREATE TABLE solicitudes_recoleccion (
    id_solicitud     INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario       INTEGER NOT NULL,
    direccion        TEXT NOT NULL,
    kilos            REAL NOT NULL,
    tipo_residuo     TEXT NOT NULL,
    info_extra       TEXT,
    telefono         TEXT,
    lat              REAL,
    lng              REAL,
    estado           TEXT NOT NULL DEFAULT 'pendiente',
    fecha_solicitud  DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

-- ===========================================
-- TABLA: asignaciones
-- un recolector toma una solicitud
-- ===========================================
CREATE TABLE asignaciones (
    id_asignacion       INTEGER PRIMARY KEY AUTOINCREMENT,
    id_recolector       INTEGER NOT NULL,
    id_solicitud        INTEGER NOT NULL,
    fecha_asignacion    DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_finalizacion  DATETIME,
    evidencia           TEXT,      -- foto o archivo subido
    lat_final           REAL,
    lng_final           REAL,

    FOREIGN KEY (id_recolector) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes_recoleccion(id_solicitud)
);

-- ===========================================
-- TABLA: vehiculos
-- Camiones, tráilers, pickups, etc
-- ===========================================
CREATE TABLE vehiculos (
    id_vehiculo INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo        TEXT NOT NULL,
    matricula   TEXT NOT NULL UNIQUE,
    supervisor  INTEGER NOT NULL,       -- FK al supervisor (admin o encargado)

    FOREIGN KEY (supervisor) REFERENCES usuarios(id_usuario)
);

-- ===========================================
-- TABLA: rutas_generales
-- Rutas que ven los usuarios (rutas fijas de camiones)
-- ===========================================
CREATE TABLE rutas_generales (
    id_ruta      INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_ruta  INTEGER NOT NULL,
    id_vehiculo  INTEGER NOT NULL,
    descripcion  TEXT,

    FOREIGN KEY (id_vehiculo) REFERENCES vehiculos(id_vehiculo)
);

-- ===========================================
-- TABLA: puntos_ruta
-- para trazar la ruta del camión (como Google Maps polyline)
-- ===========================================
CREATE TABLE puntos_ruta (
    id_punto   INTEGER PRIMARY KEY AUTOINCREMENT,
    id_ruta    INTEGER NOT NULL,
    lat        REAL NOT NULL,
    lng        REAL NOT NULL,
    orden      INTEGER NOT NULL,      -- punto 1, punto 2, punto 3...

    FOREIGN KEY (id_ruta) REFERENCES rutas_generales(id_ruta)
);

-- ===========================================
-- TABLA: rutas_sugeridas
-- rutas que el usuario propone en el mapa
-- ===========================================
CREATE TABLE rutas_sugeridas (
    id_sugerencia  INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario     INTEGER NOT NULL,
    descripcion    TEXT,
    fecha_envio    DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

-- ===========================================
-- TABLA: puntos_ruta_sugerida
-- puntos geográficos de la ruta sugerida por el usuario
-- ===========================================
CREATE TABLE puntos_ruta_sugerida (
    id_punto        INTEGER PRIMARY KEY AUTOINCREMENT,
    id_sugerencia   INTEGER NOT NULL,
    lat             REAL NOT NULL,
    lng             REAL NOT NULL,
    orden           INTEGER NOT NULL,

    FOREIGN KEY (id_sugerencia) REFERENCES rutas_sugeridas(id_sugerencia)
);

-- ===========================================
-- TABLA: quejas
-- quejas del usuario o del recolector
-- ===========================================
CREATE TABLE quejas (
    id_queja        INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario      INTEGER NOT NULL,
    id_solicitud    INTEGER,
    id_asignacion   INTEGER,
    rol_reporta     TEXT NOT NULL,       -- usuario / recolector
    motivo          TEXT NOT NULL,
    detalles        TEXT,
    fecha_queja     DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado          TEXT DEFAULT 'pendiente',   -- pendiente, revisando, resuelta

    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes_recoleccion(id_solicitud),
    FOREIGN KEY (id_asignacion) REFERENCES asignaciones(id_asignacion)
);

-- ===========================================
-- TABLA: chat
-- mensajes entre usuario y recolector
-- ===========================================
CREATE TABLE chat (
    id_mensaje     INTEGER PRIMARY KEY AUTOINCREMENT,
    id_asignacion  INTEGER NOT NULL,
    id_emisor      INTEGER NOT NULL,     -- FK usuario o recolector
    mensaje        TEXT NOT NULL,
    fecha_envio    DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_asignacion) REFERENCES asignaciones(id_asignacion),
    FOREIGN KEY (id_emisor) REFERENCES usuarios(id_usuario)
);


CREATE TABLE ubicaciones_recolectores (
    id_ubicacion   INTEGER PRIMARY KEY AUTOINCREMENT,
    id_recolector  INTEGER NOT NULL,
    lat            REAL NOT NULL,
    lng            REAL NOT NULL,
    timestamp      DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_recolector) REFERENCES usuarios(id_usuario)
);
