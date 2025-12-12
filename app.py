from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
from datetime import datetime
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

app = Flask(__name__)
app.secret_key = 'tu_clave_secreta_super_segura_12345'

DATABASE = 'ecologics.db'
MAPBOX_TOKEN = os.getenv('MAPBOX_TOKEN', 'pk.eyJ1Ijoic3dldGllYWxpZW4iLCJhIjoiY21qMjN5dGZ6MGVqZTNkcHh5cjJrY3BhcCJ9.Tx1s_wXzp4O4kJmoJYgXhw')

# ==================== RUTAS DE LA APLICACIÓN ====================
# GET  /                           -> index.html (Página de inicio)
# GET  /login                      -> inicio_sesion.html (Iniciar sesión)
# POST /login                      -> JSON autenticación
# GET  /registro                   -> registro.html (Registro de usuarios)
# POST /registro                   -> JSON registro
# GET  /logout                     -> Cerrar sesión
# GET  /panel-usuario              -> indexusuario.html (Panel del usuario)
# GET  /panel-admin                -> admin.html (Panel de administrador)
# GET  /panel-recolector           -> panel_recolector.html (Panel del recolector)
# GET  /panel-usuario-mejorado     -> usuario_mejorado.html (Panel mejorado del usuario)
# GET  /test-mapa                  -> test_mapa.html (Página de test)
# GET  /api/config/mapbox-token    -> JSON token Mapbox
# GET  /api/usuario/perfil         -> JSON perfil del usuario
# GET  /api/usuario/solicitudes    -> JSON listado de solicitudes
# POST /api/usuario/solicitudes    -> JSON crear solicitud
# GET  /api/usuario/estadisticas   -> JSON estadísticas
# POST /api/usuario/quejas         -> JSON reportar queja
# POST /api/usuario/rutas-sugeridas -> JSON rutas sugeridas
# GET  /api/usuario/rutas-sugeridas -> JSON obtener rutas sugeridas
# GET  /api/usuario/seguimiento/<id_solicitud> -> JSON seguimiento en tiempo real
# POST /api/ubicacion              -> JSON enviar ubicación
# ==================== FIN DE RUTAS ====================

# ==================== FUNCIONES DE BASE DE DATOS ====================
def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Inicializa la base de datos si no existe"""
    if not os.path.exists(DATABASE):
        conn = sqlite3.connect(DATABASE)
        with open('base_de_datos.sql', 'r', encoding='utf-8') as f:
            conn.executescript(f.read())
        
        # Insertar datos de prueba
        cursor = conn.cursor()
        
        # Usuario de prueba
        cursor.execute("""
            INSERT INTO usuarios (rol, username, correo, nombre, apellidos, telefono, direccion, contrasena)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, ('usuario', 'juan', 'juan.perez@email.com', 'Juan', 'Pérez', '+52 55 1234 5678', 
              'Av. Reforma 123, Col. Centro, CDMX', generate_password_hash('123456')))
        
        # Recolector de prueba
        cursor.execute("""
            INSERT INTO usuarios (rol, username, correo, nombre, apellidos, telefono, contrasena)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, ('recolector', 'carlos', 'carlos.martinez@email.com', 'Carlos', 'Martínez', 
              '+52 55 9876 5432', generate_password_hash('123456')))
        
        # Solicitudes de prueba
        solicitudes = [
            (1, 'Av. Reforma 123, Col. Centro', 25, 'Plástico', 'Botellas y envases', '+52 55 1234 5678', 19.4326, -99.1332, 'completada', '2025-12-10'),
            (1, 'Calle Juárez 456, Col. Juárez', 15, 'Papel y Cartón', 'Cajas de cartón', '+52 55 1234 5678', 19.4340, -99.1410, 'en-proceso', '2025-12-08'),
            (1, 'Av. Insurgentes 789, Col. Roma', 30, 'Vidrio', 'Botellas de vidrio', '+52 55 1234 5678', 19.4200, -99.1580, 'completada', '2025-12-05'),
            (1, 'Calle Madero 321, Col. Centro', 20, 'Mixto', 'Residuos mixtos', '+52 55 1234 5678', 19.4350, -99.1380, 'pendiente', '2025-12-03'),
            (1, 'Av. Chapultepec 654, Col. Condesa', 40, 'Metal', 'Latas y aluminio', '+52 55 1234 5678', 19.4115, -99.1714, 'completada', '2025-12-01'),
        ]
        
        for sol in solicitudes:
            cursor.execute("""
                INSERT INTO solicitudes_recoleccion 
                (id_usuario, direccion, kilos, tipo_residuo, info_extra, telefono, lat, lng, estado, fecha_solicitud)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, sol)
        
        conn.commit()
        conn.close()
        print("Base de datos inicializada con datos de prueba")

# ==================== RUTAS DE AUTENTICACIÓN ====================
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        conn = get_db_connection()
        user = conn.execute('SELECT * FROM usuarios WHERE username = ?', (username,)).fetchone()
        conn.close()
        
        if user and check_password_hash(user['contrasena'], password):
            session['user_id'] = user['id_usuario']
            session['username'] = user['username']
            session['rol'] = user['rol']
            session['nombre'] = user['nombre']
            return jsonify({'success': True, 'rol': user['rol']})
        
        return jsonify({'success': False, 'message': 'Usuario o contraseña incorrectos'}), 401
    
    return render_template('inicio_sesion.html')


@app.route('/registro', methods=['GET'])
def registro():
    """Página de registro de usuarios."""
    return render_template('registro.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# ==================== RUTAS PRINCIPALES ====================
@app.route('/')
def index():
    """Página de inicio principal"""
    return render_template('index.html')


@app.route('/assets/<path:filename>')
def assets_static(filename):
    """Servir archivos de la carpeta assets (css/js)."""
    return send_from_directory('assets', filename)

@app.route('/panel-usuario')
def panel_usuario():
    # Modo demo: crear sesión si no existe
    if 'user_id' not in session:
        session['user_id'] = 1
        session['username'] = 'juan'
        session['rol'] = 'usuario'
        session['nombre'] = 'Juan'
    
    return render_template('indexusuario.html')

@app.route('/panel-admin')
def panel_admin():
    # Sesión demo para el panel administrativo
    if 'user_id' not in session:
        session['user_id'] = 1
        session['username'] = 'admin'
        session['rol'] = 'admin'
        session['nombre'] = 'Administrador'

    return render_template('admin.html')

@app.route('/panel-recolector')
def panel_recolector():
    # Sesión demo para el panel del recolector
    if 'user_id' not in session:
        session['user_id'] = 2
        session['username'] = 'carlos'
        session['rol'] = 'recolector'
        session['nombre'] = 'Carlos'
    
    return render_template('panel_recolector.html')

@app.route('/panel-usuario-mejorado')
def panel_usuario_mejorado():
    # Sesión demo para el panel mejorado del usuario
    if 'user_id' not in session:
        session['user_id'] = 1
        session['username'] = 'juan'
        session['rol'] = 'usuario'
        session['nombre'] = 'Juan'
    
    return render_template('usuario_mejorado.html')

@app.route('/test-mapa')
def test_mapa():
    return render_template('test_mapa.html')

# ==================== API ENDPOINTS ====================

# Obtener API Key de Mapbox
@app.route('/api/config/mapbox-token')
def get_mapbox_token():
    return jsonify({'token': MAPBOX_TOKEN})

# Obtener datos del usuario
@app.route('/api/usuario/perfil')
def get_perfil():
    if 'user_id' not in session:
        session['user_id'] = 1  # Usuario demo
    
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM usuarios WHERE id_usuario = ?', (session['user_id'],)).fetchone()
    conn.close()
    
    return jsonify({
        'nombre': user['nombre'],
        'apellidos': user['apellidos'],
        'email': user['correo'],
        'telefono': user['telefono'],
        'direccion': user['direccion'],
        'username': user['username']
    })

# Obtener solicitudes del usuario
@app.route('/api/usuario/solicitudes')
def get_solicitudes():
    if 'user_id' not in session:
        session['user_id'] = 1  # Usuario demo
    
    filtro = request.args.get('estado', 'todas')
    
    conn = get_db_connection()
    if filtro == 'todas':
        solicitudes = conn.execute('''
            SELECT * FROM solicitudes_recoleccion 
            WHERE id_usuario = ? 
            ORDER BY fecha_solicitud DESC
        ''', (session['user_id'],)).fetchall()
    else:
        solicitudes = conn.execute('''
            SELECT * FROM solicitudes_recoleccion 
            WHERE id_usuario = ? AND estado = ?
            ORDER BY fecha_solicitud DESC
        ''', (session['user_id'], filtro)).fetchall()
    conn.close()
    
    return jsonify([dict(row) for row in solicitudes])

# Crear nueva solicitud
@app.route('/api/usuario/solicitudes', methods=['POST'])
def crear_solicitud():
    if 'user_id' not in session:
        session['user_id'] = 1  # Usuario demo
    
    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO solicitudes_recoleccion 
        (id_usuario, direccion, kilos, tipo_residuo, info_extra, telefono, lat, lng, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')
    ''', (
        session['user_id'],
        data['direccion'],
        data['kilos'],
        data['tipoResiduo'],
        data.get('informacion', ''),
        data.get('telefono', ''),
        data.get('lat'),
        data.get('lng')
    ))
    
    id_solicitud = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'id_solicitud': id_solicitud})

# Obtener estadísticas del dashboard
@app.route('/api/usuario/estadisticas')
def get_estadisticas():
    if 'user_id' not in session:
        session['user_id'] = 1  # Usuario demo
    
    conn = get_db_connection()
    
    # Total de solicitudes
    total = conn.execute('''
        SELECT COUNT(*) as count FROM solicitudes_recoleccion 
        WHERE id_usuario = ?
    ''', (session['user_id'],)).fetchone()['count']
    
    # Pendientes
    pendientes = conn.execute('''
        SELECT COUNT(*) as count FROM solicitudes_recoleccion 
        WHERE id_usuario = ? AND estado = 'pendiente'
    ''', (session['user_id'],)).fetchone()['count']
    
    # En proceso
    en_proceso = conn.execute('''
        SELECT COUNT(*) as count FROM solicitudes_recoleccion 
        WHERE id_usuario = ? AND estado = 'en-proceso'
    ''', (session['user_id'],)).fetchone()['count']
    
    # Completadas
    completadas = conn.execute('''
        SELECT COUNT(*) as count FROM solicitudes_recoleccion 
        WHERE id_usuario = ? AND estado = 'completada'
    ''', (session['user_id'],)).fetchone()['count']
    
    # Total de kilos
    total_kilos = conn.execute('''
        SELECT SUM(kilos) as total FROM solicitudes_recoleccion 
        WHERE id_usuario = ? AND estado = 'completada'
    ''', (session['user_id'],)).fetchone()['total'] or 0
    
    # Actividad reciente
    actividad = conn.execute('''
        SELECT id_solicitud, fecha_solicitud, estado, tipo_residuo 
        FROM solicitudes_recoleccion 
        WHERE id_usuario = ?
        ORDER BY fecha_solicitud DESC
        LIMIT 4
    ''', (session['user_id'],)).fetchall()
    
    conn.close()
    
    return jsonify({
        'total': total,
        'pendientes': pendientes,
        'en_proceso': en_proceso,
        'completadas': completadas,
        'total_kilos': round(total_kilos, 2),
        'actividad': [dict(row) for row in actividad]
    })

# Enviar queja/soporte
@app.route('/api/usuario/quejas', methods=['POST'])
def crear_queja():
    if 'user_id' not in session:
        session['user_id'] = 1  # Usuario demo
    
    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO quejas 
        (id_usuario, id_solicitud, rol_reporta, motivo, detalles, estado)
        VALUES (?, ?, 'usuario', ?, ?, 'pendiente')
    ''', (
        session['user_id'],
        data.get('numeroSolicitud'),
        data['motivo'],
        data['descripcion']
    ))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

# Sugerir ruta
@app.route('/api/usuario/rutas-sugeridas', methods=['POST'])
def sugerir_ruta():
    if 'user_id' not in session:
        session['user_id'] = 1  # Usuario demo
    
    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Insertar la sugerencia
    cursor.execute('''
        INSERT INTO rutas_sugeridas (id_usuario, descripcion)
        VALUES (?, ?)
    ''', (session['user_id'], data.get('descripcion', '')))
    
    id_sugerencia = cursor.lastrowid
    
    # Insertar los puntos de la ruta
    for i, punto in enumerate(data['puntos']):
        cursor.execute('''
            INSERT INTO puntos_ruta_sugerida (id_sugerencia, lat, lng, orden)
            VALUES (?, ?, ?, ?)
        ''', (id_sugerencia, punto['lat'], punto['lng'], i))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'id_sugerencia': id_sugerencia})

# Obtener ubicación del recolector (simulada)
@app.route('/api/usuario/seguimiento/<int:id_solicitud>')
def get_seguimiento(id_solicitud):
    if 'user_id' not in session:
        session['user_id'] = 1  # Usuario demo
    
    # En producción, aquí obtendrías la ubicación real del recolector
    # Obtener última ubicación del recolector
    conn = get_db_connection()
    ubicacion = conn.execute('''
        SELECT lat, lng FROM ubicaciones_recolectores 
        WHERE id_recolector = 2 
        ORDER BY timestamp DESC LIMIT 1
    ''').fetchone()
    
    if ubicacion:
        lat, lng = ubicacion['lat'], ubicacion['lng']
    else:
        lat, lng = 19.4326, -99.1332
    
    conn.close()
    
    return jsonify({
        'recolector': {
            'nombre': 'Carlos Martínez',
            'telefono': '+52 55 9876 5432',
            'vehiculo': 'Unidad 42',
            'placas': 'ABC-123-D'
        },
        'ubicacion': {
            'lat': lat,
            'lng': lng
        },
        'distancia': 2.5,
        'tiempo_estimado': 12,
        'estado': 'en-camino'
    })

# Guardar ubicación del usuario/recolector
@app.route('/api/ubicacion', methods=['POST'])
def guardar_ubicacion():
    if 'user_id' not in session:
        session['user_id'] = 1
    
    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO ubicaciones_recolectores (id_recolector, lat, lng)
        VALUES (?, ?, ?)
    ''', (session['user_id'], data['lat'], data['lng']))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

# Obtener todas las rutas sugeridas
@app.route('/api/usuario/rutas-sugeridas')
def get_rutas_sugeridas():
    if 'user_id' not in session:
        session['user_id'] = 1
    
    conn = get_db_connection()
    rutas = conn.execute('''
        SELECT rs.*, u.nombre, u.apellidos
        FROM rutas_sugeridas rs
        JOIN usuarios u ON rs.id_usuario = u.id_usuario
        ORDER BY rs.fecha_envio DESC
    ''').fetchall()
    
    result = []
    for ruta in rutas:
        puntos = conn.execute('''
            SELECT lat, lng, orden 
            FROM puntos_ruta_sugerida 
            WHERE id_sugerencia = ?
            ORDER BY orden
        ''', (ruta['id_sugerencia'],)).fetchall()
        
        result.append({
            'id': ruta['id_sugerencia'],
            'descripcion': ruta['descripcion'],
            'fecha': ruta['fecha_envio'],
            'usuario': f"{ruta['nombre']} {ruta['apellidos']}",
            'puntos': [{'lat': p['lat'], 'lng': p['lng']} for p in puntos]
        })
    
    conn.close()
    return jsonify(result)

# ==================== INICIAR APLICACIÓN ====================
if __name__ == '__main__':
    import sys
    init_db()
    
    # Obtener puerto de argumentos o variables de entorno, default 8080
    port = 8080
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            port = 8080
    else:
        port = int(os.getenv('PORT', 8080))
    
    print(f"\n🚀 Iniciando EcoRecolección en puerto {port}...")
    print(f"📍 Accede a: http://localhost:{port}/panel-recolector")
    print(f"📍 Usuario: http://localhost:{port}/panel-usuario")
    print(f"⚠️  Presiona Ctrl+C para detener la aplicación\n")
    
    app.run(debug=True, host='0.0.0.0', port=port)
