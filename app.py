from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
from datetime import datetime
import os
from dotenv import load_dotenv
from supabase import Client, create_client

# Cargar variables de entorno
load_dotenv()

app = Flask(__name__)
app.secret_key = 'tu_clave_secreta_super_segura_12345'

DATABASE = 'ecologics.db'
MAPBOX_TOKEN = os.getenv('MAPBOX_TOKEN', 'pk.eyJ1Ijoic3dldGllYWxpZW4iLCJhIjoiY21qMjN5dGZ6MGVqZTNkcHh5cjJrY3BhcCJ9.Tx1s_wXzp4O4kJmoJYgXhw')
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_ANON_KEY')
supabase_client: Client | None = None

if SUPABASE_URL and SUPABASE_KEY:
    supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)

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


def get_supabase():
    if not supabase_client:
        raise RuntimeError('Supabase no está configurado. Añade SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY al entorno.')
    return supabase_client


def split_full_name(full_name: str):
    parts = (full_name or '').strip().split()
    if not parts:
        return '', '-'
    nombre = parts[0]
    apellidos = ' '.join(parts[1:]) or '-'
    return nombre, apellidos


def derive_username(email: str, fallback_name: str):
    if email and '@' in email:
        return email.split('@')[0]
    if fallback_name:
        return fallback_name.replace(' ', '').lower()
    return f'user{int(datetime.utcnow().timestamp())}'

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
        data = request.get_json() or {}
        identifier = data.get('email') or data.get('username')
        password = data.get('password')

        if not identifier or not password:
            return jsonify({'success': False, 'message': 'Correo y contraseña son requeridos'}), 400

        user = None

        if supabase_client:
            try:
                response = supabase_client.table('usuarios') \
                    .select('*') \
                    .or_(f"correo.eq.{identifier},username.eq.{identifier}") \
                    .limit(1) \
                    .execute()
                rows = response.data or []
                if rows:
                    candidate = rows[0]
                    if check_password_hash(candidate['contrasena'], password):
                        user = candidate
            except Exception as exc:  # pragma: no cover - logging only
                print(f"Error consultando Supabase: {exc}")
                return jsonify({'success': False, 'message': 'No se pudo validar al usuario en Supabase'}), 500
        else:
            conn = get_db_connection()
            db_user = conn.execute(
                'SELECT * FROM usuarios WHERE correo = ? OR username = ?',
                (identifier, identifier)
            ).fetchone()
            conn.close()

            if db_user and check_password_hash(db_user['contrasena'], password):
                user = db_user

        if not user:
            return jsonify({'success': False, 'message': 'Usuario o contraseña incorrectos'}), 401

        session['user_id'] = user['id_usuario']
        session['username'] = user['username']
        session['rol'] = user['rol']
        session['nombre'] = user['nombre']
        return jsonify({'success': True, 'rol': user['rol']})

    return render_template('inicio_sesion.html')


@app.route('/registro', methods=['GET', 'POST'])
def registro():
    """Página de registro de usuarios."""
    if request.method == 'GET':
        return render_template('registro.html')

    if not supabase_client:
        return jsonify({'success': False, 'message': 'Supabase no está configurado en el servidor.'}), 500

    data = request.get_json() or {}
    full_name = data.get('fullName', '').strip()
    email = (data.get('email') or '').strip().lower()
    phone = data.get('phone', '').strip()
    address = data.get('address', '').strip()
    password = data.get('password', '')

    if not all([full_name, email, phone, address, password]):
        return jsonify({'success': False, 'message': 'Todos los campos son obligatorios.'}), 400

    nombre, apellidos = split_full_name(full_name)
    username = derive_username(email, full_name)

    try:
        supabase = get_supabase()
        existing = supabase.table('usuarios') \
            .select('id_usuario') \
            .or_(f"correo.eq.{email},username.eq.{username}") \
            .limit(1) \
            .execute()

        if existing.data:
            return jsonify({'success': False, 'message': 'El correo o usuario ya está registrado.'}), 409

        payload = {
            'rol': 'usuario',
            'username': username,
            'correo': email,
            'nombre': nombre,
            'apellidos': apellidos,
            'telefono': phone,
            'direccion': address,
            'contrasena': generate_password_hash(password)
        }

        inserted = supabase.table('usuarios').insert(payload).execute()
        created = inserted.data[0] if inserted.data else None

        if not created:
            # Si la librería no devolvió la fila, la consultamos
            fetched = supabase.table('usuarios') \
                .select('*') \
                .or_(f"correo.eq.{email},username.eq.{username}") \
                .limit(1) \
                .execute()
            created = fetched.data[0] if fetched.data else None

        if not created:
            return jsonify({'success': False, 'message': 'No se pudo registrar el usuario.'}), 500

        return jsonify({
            'success': True,
            'id_usuario': created.get('id_usuario') if created else None,
            'rol': created.get('rol', 'usuario') if created else 'usuario'
        })
    except Exception as exc:  # pragma: no cover - logging only
        print(f"Error al registrar en Supabase: {exc}")
        return jsonify({'success': False, 'message': 'Ocurrió un problema al registrar el usuario.'}), 500

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
    
    # Intentar con Supabase primero
    if supabase_client:
        try:
            response = supabase_client.table('usuarios').select('*').eq('id_usuario', session['user_id']).execute()
            if response.data and len(response.data) > 0:
                user = response.data[0]
                return jsonify({
                    'nombre': user.get('nombre', ''),
                    'apellidos': user.get('apellidos', ''),
                    'email': user.get('correo', ''),
                    'telefono': user.get('telefono', ''),
                    'direccion': user.get('direccion', ''),
                    'username': user.get('username', '')
                })
        except Exception as e:
            print(f'Error consultando perfil en Supabase: {e}')
    
    # Fallback a SQLite
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
    
    # Intentar con Supabase primero
    if supabase_client:
        try:
            query = supabase_client.table('solicitudes_recoleccion').select('*')
            
            if filtro != 'todas':
                query = query.eq('estado', filtro)
            
            response = query.order('fecha_solicitud', desc=True).execute()
            return jsonify(response.data if response.data else [])
        except Exception as e:
            print(f'Error consultando Supabase: {e}')
    
    # Fallback a SQLite
    conn = get_db_connection()
    if filtro == 'todas':
        solicitudes = conn.execute('''
            SELECT * FROM solicitudes_recoleccion 
            ORDER BY fecha_solicitud DESC
        ''').fetchall()
    else:
        solicitudes = conn.execute('''
            SELECT * FROM solicitudes_recoleccion 
            WHERE estado = ?
            ORDER BY fecha_solicitud DESC
        ''', (filtro,)).fetchall()
    conn.close()
    
    return jsonify([dict(row) for row in solicitudes])

# Crear nueva solicitud
@app.route('/api/usuario/solicitudes', methods=['POST'])
def crear_solicitud():
    if 'user_id' not in session:
        session['user_id'] = 1  # Usuario demo
    
    data = request.get_json()
    
    payload = {
        'id_usuario': session['user_id'],
        'direccion': data.get('direccion', ''),
        'kilos': data.get('kilos', 0),
        'tipo_residuo': data.get('tipoResiduo', ''),
        'info_extra': data.get('informacion', ''),
        'telefono': data.get('telefono', ''),
        'lat': data.get('lat'),
        'lng': data.get('lng'),
        'estado': 'pendiente'
    }
    
    # Intentar con Supabase primero
    if supabase_client:
        try:
            response = supabase_client.table('solicitudes_recoleccion').insert(payload).execute()
            if response.data:
                return jsonify({'success': True, 'id_solicitud': response.data[0].get('id_solicitud')})
        except Exception as e:
            print(f'Error insertando en Supabase: {e}')
    
    # Fallback a SQLite
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO solicitudes_recoleccion 
        (id_usuario, direccion, kilos, tipo_residuo, info_extra, telefono, lat, lng, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')
    ''', (
        session['user_id'],
        payload['direccion'],
        payload['kilos'],
        payload['tipo_residuo'],
        payload['info_extra'],
        payload['telefono'],
        payload['lat'],
        payload['lng']
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
    
    # Intentar con Supabase primero
    if supabase_client:
        try:
            # Total de solicitudes
            total_resp = supabase_client.table('solicitudes_recoleccion').select('id_solicitud', count='exact').execute()
            total = total_resp.count if hasattr(total_resp, 'count') else len(total_resp.data)
            
            # Pendientes
            pend_resp = supabase_client.table('solicitudes_recoleccion').select('id_solicitud', count='exact').eq('estado', 'pendiente').execute()
            pendientes = pend_resp.count if hasattr(pend_resp, 'count') else len(pend_resp.data)
            
            # En proceso
            proc_resp = supabase_client.table('solicitudes_recoleccion').select('id_solicitud', count='exact').eq('estado', 'en-proceso').execute()
            en_proceso = proc_resp.count if hasattr(proc_resp, 'count') else len(proc_resp.data)
            
            # Completadas
            comp_resp = supabase_client.table('solicitudes_recoleccion').select('id_solicitud', count='exact').eq('estado', 'completada').execute()
            completadas = comp_resp.count if hasattr(comp_resp, 'count') else len(comp_resp.data)
            
            # Total de kilos
            kilos_resp = supabase_client.table('solicitudes_recoleccion').select('kilos').eq('estado', 'completada').execute()
            total_kilos = sum(row.get('kilos', 0) for row in kilos_resp.data) if kilos_resp.data else 0
            
            # Actividad reciente
            actividad_resp = supabase_client.table('solicitudes_recoleccion').select('*').order('fecha_solicitud', desc=True).limit(4).execute()
            actividad = actividad_resp.data if actividad_resp.data else []
            
            return jsonify({
                'total': total,
                'pendientes': pendientes,
                'en_proceso': en_proceso,
                'completadas': completadas,
                'total_kilos': round(total_kilos, 2),
                'actividad': actividad
            })
        except Exception as e:
            print(f'Error consultando estadísticas en Supabase: {e}')
    
    # Fallback a SQLite
    conn = get_db_connection()
    
    total = conn.execute('SELECT COUNT(*) as count FROM solicitudes_recoleccion').fetchone()['count']
    pendientes = conn.execute("SELECT COUNT(*) as count FROM solicitudes_recoleccion WHERE estado = 'pendiente'").fetchone()['count']
    en_proceso = conn.execute("SELECT COUNT(*) as count FROM solicitudes_recoleccion WHERE estado = 'en-proceso'").fetchone()['count']
    completadas = conn.execute("SELECT COUNT(*) as count FROM solicitudes_recoleccion WHERE estado = 'completada'").fetchone()['count']
    total_kilos = conn.execute("SELECT SUM(kilos) as total FROM solicitudes_recoleccion WHERE estado = 'completada'").fetchone()['total'] or 0
    actividad = conn.execute('SELECT id_solicitud, fecha_solicitud, estado, tipo_residuo FROM solicitudes_recoleccion ORDER BY fecha_solicitud DESC LIMIT 4').fetchall()
    
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
    
    # Intentar con Supabase primero
    if supabase_client:
        try:
            response = supabase_client.table('quejas').insert({
                'id_usuario': session['user_id'],
                'id_solicitud': data.get('numeroSolicitud'),
                'rol_reporta': 'usuario',
                'motivo': data['motivo'],
                'detalles': data['descripcion'],
                'estado': 'pendiente'
            }).execute()
            
            return jsonify({'success': True})
        except Exception as e:
            print(f'Error creando queja en Supabase: {e}')
    
    # Fallback a SQLite
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
    
    # Intentar con Supabase primero
    if supabase_client:
        try:
            # Insertar la sugerencia
            response = supabase_client.table('rutas_sugeridas').insert({
                'id_usuario': session['user_id'],
                'descripcion': data.get('descripcion', '')
            }).execute()
            
            if response.data and len(response.data) > 0:
                id_sugerencia = response.data[0]['id_sugerencia']
                
                # Insertar los puntos de la ruta
                puntos = []
                for i, punto in enumerate(data['puntos']):
                    puntos.append({
                        'id_sugerencia': id_sugerencia,
                        'lat': punto['lat'],
                        'lng': punto['lng'],
                        'orden': i
                    })
                
                if puntos:
                    supabase_client.table('puntos_ruta_sugerida').insert(puntos).execute()
                
                return jsonify({'success': True, 'id_sugerencia': id_sugerencia})
        except Exception as e:
            print(f'Error creando ruta sugerida en Supabase: {e}')
    
    # Fallback a SQLite
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
    
    lat, lng = 19.4326, -99.1332  # Valores por defecto
    
    # Intentar obtener ubicación desde Supabase
    if supabase_client:
        try:
            # Obtener última ubicación del recolector asignado a esta solicitud
            asig_resp = supabase_client.table('asignaciones').select('id_recolector').eq('id_solicitud', id_solicitud).execute()
            
            if asig_resp.data and len(asig_resp.data) > 0:
                id_recolector = asig_resp.data[0]['id_recolector']
                
                ubic_resp = supabase_client.table('ubicaciones_recolectores').select('lat, lng').eq('id_recolector', id_recolector).order('timestamp', desc=True).limit(1).execute()
                
                if ubic_resp.data and len(ubic_resp.data) > 0:
                    lat = ubic_resp.data[0]['lat']
                    lng = ubic_resp.data[0]['lng']
        except Exception as e:
            print(f'Error obteniendo seguimiento: {e}')
    
    # Fallback a SQLite si Supabase falla
    if lat == 19.4326 and lng == -99.1332:
        try:
            conn = get_db_connection()
            ubicacion = conn.execute('''
                SELECT lat, lng FROM ubicaciones_recolectores 
                WHERE id_recolector = 2 
                ORDER BY timestamp DESC LIMIT 1
            ''').fetchone()
            
            if ubicacion:
                lat, lng = ubicacion['lat'], ubicacion['lng']
            
            conn.close()
        except:
            pass
    
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
    
    # Intentar con Supabase primero
    if supabase_client:
        try:
            supabase_client.table('ubicaciones_recolectores').insert({
                'id_recolector': session['user_id'],
                'lat': data['lat'],
                'lng': data['lng']
            }).execute()
            
            return jsonify({'success': True})
        except Exception as e:
            print(f'Error guardando ubicación en Supabase: {e}')
    
    # Fallback a SQLite
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

# Obtener quejas
@app.route('/api/admin/quejas')
def get_quejas():
    if supabase_client:
        try:
            response = supabase_client.table('quejas').select('*, usuarios(nombre, apellidos, correo)').order('fecha_queja', desc=True).execute()
            return jsonify(response.data if response.data else [])
        except Exception as e:
            print(f'Error consultando quejas: {e}')
    
    conn = get_db_connection()
    quejas = conn.execute('''
        SELECT q.*, u.nombre, u.apellidos, u.correo
        FROM quejas q
        JOIN usuarios u ON q.id_usuario = u.id_usuario
        ORDER BY q.fecha_queja DESC
    ''').fetchall()
    conn.close()
    return jsonify([dict(row) for row in quejas])

# Obtener recolectores
@app.route('/api/admin/recolectores')
def get_recolectores():
    if supabase_client:
        try:
            response = supabase_client.table('recolectores').select('*').execute()
            if response.data:
                result = []
                for rec in response.data:
                    # Contar asignaciones si existe la tabla
                    try:
                        asig_resp = supabase_client.table('asignaciones').select('id_asignacion', count='exact').eq('id_recolector', rec['id_recolector']).execute()
                        comp_resp = supabase_client.table('asignaciones').select('id_asignacion', count='exact').eq('id_recolector', rec['id_recolector']).not_.is_('fecha_finalizacion', 'null').execute()
                        
                        rec['asignaciones_totales'] = asig_resp.count if hasattr(asig_resp, 'count') else len(asig_resp.data) if asig_resp.data else 0
                        rec['completadas'] = comp_resp.count if hasattr(comp_resp, 'count') else len(comp_resp.data) if comp_resp.data else 0
                    except:
                        rec['asignaciones_totales'] = 0
                        rec['completadas'] = 0
                    
                    result.append(rec)
                return jsonify(result)
        except Exception as e:
            print(f'Error consultando recolectores: {e}')
    
    # Fallback a SQLite
    conn = get_db_connection()
    recolectores = conn.execute("SELECT * FROM usuarios WHERE rol = 'recolector'").fetchall()
    result = []
    for rec in recolectores:
        asig = conn.execute('SELECT COUNT(*) as count FROM asignaciones WHERE id_recolector = ?', (rec['id_usuario'],)).fetchone()
        comp = conn.execute('SELECT COUNT(*) as count FROM asignaciones WHERE id_recolector = ? AND fecha_finalizacion IS NOT NULL', (rec['id_usuario'],)).fetchone()
        rec_dict = dict(rec)
        rec_dict['asignaciones_totales'] = asig['count']
        rec_dict['completadas'] = comp['count']
        result.append(rec_dict)
    conn.close()
    return jsonify(result)

# Obtener vehículos
@app.route('/api/admin/vehiculos')
def get_vehiculos():
    if supabase_client:
        try:
            response = supabase_client.table('vehiculos').select('*, usuarios(nombre, apellidos)').execute()
            return jsonify(response.data if response.data else [])
        except Exception as e:
            print(f'Error consultando vehículos: {e}')
    
    conn = get_db_connection()
    vehiculos = conn.execute('''
        SELECT v.*, u.nombre, u.apellidos
        FROM vehiculos v
        JOIN usuarios u ON v.supervisor = u.id_usuario
    ''').fetchall()
    conn.close()
    return jsonify([dict(row) for row in vehiculos])

# Obtener rutas generales
@app.route('/api/admin/rutas')
def get_rutas_generales():
    if supabase_client:
        try:
            response = supabase_client.table('rutas_generales').select('*, vehiculos(matricula, tipo)').execute()
            if response.data:
                result = []
                for ruta in response.data:
                    puntos_resp = supabase_client.table('puntos_ruta').select('*').eq('id_ruta', ruta['id_ruta']).order('orden').execute()
                    ruta['puntos'] = puntos_resp.data if puntos_resp.data else []
                    result.append(ruta)
                return jsonify(result)
        except Exception as e:
            print(f'Error consultando rutas: {e}')
    
    conn = get_db_connection()
    rutas = conn.execute('''
        SELECT rg.*, v.matricula, v.tipo
        FROM rutas_generales rg
        JOIN vehiculos v ON rg.id_vehiculo = v.id_vehiculo
    ''').fetchall()
    
    result = []
    for ruta in rutas:
        puntos = conn.execute('SELECT * FROM puntos_ruta WHERE id_ruta = ? ORDER BY orden', (ruta['id_ruta'],)).fetchall()
        ruta_dict = dict(ruta)
        ruta_dict['puntos'] = [dict(p) for p in puntos]
        result.append(ruta_dict)
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
