from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
from supabase import Client, create_client

# Cargar variables de entorno
load_dotenv()

app = Flask(__name__)
app.secret_key = 'tu_clave_secreta_super_segura_12345'

MAPBOX_TOKEN = os.getenv('MAPBOX_TOKEN', 'pk.eyJ1Ijoic3dldGllYWxpZW4iLCJhIjoiY21qMjN5dGZ6MGVqZTNkcHh5cjJrY3BhcCJ9.Tx1s_wXzp4O4kJmoJYgXhw')
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_ANON_KEY')
supabase_client: Client | None = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print(f"✅ Cliente Supabase inicializado: {SUPABASE_URL}")
    except Exception as e:
        print(f"❌ Error inicializando Supabase: {e}")
        supabase_client = None
else:
    print("⚠️  Supabase no configurado: SUPABASE_URL o SUPABASE_KEY faltantes")
    print("❌ La aplicación NO funcionará sin Supabase")

# ==================== RUTAS DE LA APLICACIÓN ====================
# GET  /                           -> index.html (Página de inicio)
# GET  /login                      -> inicio_sesion.html (Iniciar sesión)
# POST /login                      -> JSON autenticación
# GET  /registro                   -> registro.html (Registro de usuarios)
# POST /registro                   -> JSON registro
# GET  /logout                     -> Cerrar sesión
# GET  /panel-usuario              -> indexusuario.html (Panel del usuario)
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
                # Primero buscar en tabla usuarios
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
                        user['id_usuario'] = candidate.get('id_usuario')
                        user['username'] = candidate.get('username', candidate.get('correo'))
                        
                # Si no se encuentra en usuarios, buscar en recolectores
                if not user:
                    response_rec = supabase_client.table('recolectores') \
                        .select('*') \
                        .eq('correo', identifier) \
                        .limit(1) \
                        .execute()
                    rows_rec = response_rec.data or []
                    if rows_rec:
                        candidate = rows_rec[0]
                        if check_password_hash(candidate['contrasena'], password):
                            # Formatear datos de recolector como usuario
                            user = {
                                'id_usuario': candidate['id_recolector'],
                                'username': candidate['correo'],
                                'correo': candidate['correo'],
                                'nombre': f"{candidate['nombre']} {candidate['apellido']}",
                                'rol': 'recolector',
                                'contrasena': candidate['contrasena']
                            }
                            
            except Exception as exc:
                print(f"Error consultando Supabase: {exc}")
                return jsonify({'success': False, 'message': 'No se pudo validar al usuario'}), 500

        if not user:
            return jsonify({'success': False, 'message': 'Usuario o contraseña incorrectos'}), 401

        # Definir redirección según rol (normalizado)
        raw_rol = user['rol'] if isinstance(user, dict) else user['rol']
        rol_norm = (raw_rol or '').strip().lower()
        # Mapear posibles variantes
        if rol_norm in ('admin', 'administrator', 'administrador'): 
            rol = 'admin'
        elif rol_norm in ('recolector', 'collector'):
            rol = 'recolector'
        else:
            rol = 'usuario'
        # Guardar sesión con el rol normalizado
        session['user_id'] = user['id_usuario']
        session['username'] = user.get('username', user.get('correo'))
        session['rol'] = rol
        session['nombre'] = user['nombre']
        redirect_map = {
            'usuario': url_for('panel_usuario'),
            'admin': url_for('panel_admin'),
            'recolector': url_for('panel_recolector')
        }
        destino = redirect_map.get(rol, url_for('panel_usuario'))

        return jsonify({'success': True, 'rol': rol, 'redirect': destino})

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
    # Sesión demo mínima si no hay sesión
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
        return jsonify({'error': 'No autenticado'}), 401
    
    rol = session.get('rol', 'usuario')
    
    # Intentar con Supabase primero
    if supabase_client:
        try:
            # Si es recolector, buscar en tabla recolectores
            if rol == 'recolector':
                response = supabase_client.table('recolectores').select('*').eq('id_recolector', session['user_id']).execute()
                if response.data and len(response.data) > 0:
                    user = response.data[0]
                    return jsonify({
                        'nombre': user.get('nombre', ''),
                        'apellidos': user.get('apellido', ''),
                        'email': user.get('correo', ''),
                        'telefono': user.get('telefono', ''),
                        'direccion': '',
                        'username': user.get('correo', ''),
                        'vehiculo': user.get('vehiculo', ''),
                        'placa': user.get('placa', '')
                    })
            else:
                # Buscar en tabla usuarios
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
            return jsonify({'error': 'Error al consultar perfil'}), 500
    
    return jsonify({'error': 'Usuario no encontrado'}), 404

# Actualizar perfil del usuario
@app.route('/api/usuario/perfil', methods=['PUT', 'POST'])
def actualizar_perfil():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'No autenticado'}), 401
    
    data = request.get_json()
    rol = session.get('rol', 'usuario')
    
    # Intentar con Supabase primero
    if supabase_client:
        try:
            # Si es recolector, actualizar en tabla recolectores
            if rol == 'recolector':
                update_data = {}
                if 'nombre' in data:
                    update_data['nombre'] = data['nombre']
                if 'apellidos' in data:
                    update_data['apellido'] = data['apellidos']
                if 'telefono' in data:
                    update_data['telefono'] = data['telefono']
                if 'email' in data:
                    update_data['correo'] = data['email']
                if 'vehiculo' in data:
                    update_data['vehiculo'] = data['vehiculo']
                if 'placa' in data:
                    update_data['placa'] = data['placa']
                
                supabase_client.table('recolectores').update(update_data).eq('id_recolector', session['user_id']).execute()
                return jsonify({'success': True, 'message': 'Perfil actualizado correctamente'})
            else:
                # Actualizar en tabla usuarios
                update_data = {}
                if 'nombre' in data:
                    update_data['nombre'] = data['nombre']
                if 'apellidos' in data:
                    update_data['apellidos'] = data['apellidos']
                if 'telefono' in data:
                    update_data['telefono'] = data['telefono']
                if 'email' in data:
                    update_data['correo'] = data['email']
                if 'direccion' in data:
                    update_data['direccion'] = data['direccion']
                if 'username' in data:
                    update_data['username'] = data['username']
                
                supabase_client.table('usuarios').update(update_data).eq('id_usuario', session['user_id']).execute()
                return jsonify({'success': True, 'message': 'Perfil actualizado correctamente'})
        except Exception as e:
            print(f'Error actualizando perfil en Supabase: {e}')
            return jsonify({'success': False, 'error': str(e)}), 500
    
    return jsonify({'success': False, 'error': 'Supabase no configurado'}), 500

# Obtener solicitudes del usuario
@app.route('/api/usuario/solicitudes')
def get_solicitudes():
    if 'user_id' not in session:
        session['user_id'] = 1  # Usuario demo
    
    filtro = request.args.get('estado', 'todas')
    
    # Intentar con Supabase primero
    if supabase_client:
        try:
            # Filtrar por el usuario autenticado
            query = supabase_client.table('solicitudes_recoleccion').select('*').eq('id_usuario', session['user_id'])
            
            if filtro != 'todas':
                query = query.eq('estado', filtro)
            
            response = query.order('fecha_solicitud', desc=True).execute()
            return jsonify(response.data if response.data else [])
        except Exception as e:
            print(f'Error consultando Supabase: {e}')
            return jsonify({'error': 'Error al consultar solicitudes'}), 500
    
    return jsonify({'error': 'Supabase no configurado'}), 500

# Crear nueva solicitud
@app.route('/api/usuario/solicitudes', methods=['POST'])
def crear_solicitud():
    if 'user_id' not in session:
        session['user_id'] = 1  # Usuario demo
    
    data = request.get_json()
    print(f"\n📝 Creando solicitud para usuario {session['user_id']}")
    print(f"   Datos recibidos: {data}")
    
    # Intentar con Supabase primero
    if supabase_client:
        print(f"   🔄 Intentando guardar en Supabase...")
        try:
            # Payload para Supabase - mapear nombres de columnas (con espacios)
            # Convertir strings vacíos a None para campos numéricos
            payload = {
                'id_usuario': session['user_id'],
                'calle': data.get('calle', '') or None,
                'numero exterior': int(data.get('numero_exterior', '') or 0) if data.get('numero_exterior', '').strip() else None,
                'colonia': data.get('colonia', '') or None,
                'codigo postal': int(data.get('codigo_postal', '') or 0) if data.get('codigo_postal', '').strip() else None,
                'referencias': data.get('referencias', '') or None,
                'kilos': data.get('kilos', 0),
                'tipo_residuo': data.get('tipoResiduo', ''),
                'info_extra': data.get('informacion', '') or None,
                'lat': data.get('lat'),
                'lng': data.get('lng'),
                'estado': 'pendiente'
            }
            print(f"   📦 Payload: {payload}")
            response = supabase_client.table('solicitudes_recoleccion').insert(payload).execute()
            print(f"   ✅ Respuesta Supabase: {response}")
            if response.data:
                solicitud_id = response.data[0].get('id_solicitud')
                print(f"   ✓ Solicitud guardada en Supabase con ID: {solicitud_id}")
                return jsonify({'success': True, 'id_solicitud': solicitud_id})
            else:
                print(f"   ⚠️  Supabase no devolvió datos")
                return jsonify({'success': False, 'error': 'No se pudo crear la solicitud'}), 500
        except Exception as e:
            print(f"   ❌ Error en Supabase: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'error': str(e)}), 500
    
    return jsonify({'success': False, 'error': 'Supabase no configurado'}), 500

# ==================== ENDPOINTS DE RECOLECTOR ====================

# Obtener solicitudes disponibles (estado = 'pendiente')
@app.route('/api/recolector/solicitudes-disponibles')
def get_solicitudes_disponibles():
    if 'user_id' not in session:
        session['user_id'] = 2  # Recolector demo
    
    # Intentar con Supabase primero
    if supabase_client:
        try:
            response = supabase_client.table('solicitudes_recoleccion').select('*').eq('estado', 'pendiente').order('fecha_solicitud', desc=True).execute()
            if response.data:
                return jsonify(response.data)
        except Exception as e:
            print(f'Error consultando Supabase: {e}')
    
    # Fallback a SQLite
    conn = get_db_connection()
    solicitudes = conn.execute('''
        SELECT sr.*, u.nombre, u.apellidos, u.telefono as usuario_telefono
        FROM solicitudes_recoleccion sr
        JOIN usuarios u ON sr.id_usuario = u.id_usuario
        WHERE sr.estado = 'pendiente'
        ORDER BY sr.fecha_solicitud DESC
    ''').fetchall()
    conn.close()
    
    return jsonify([dict(row) for row in solicitudes])

# Obtener mis solicitudes aceptadas (recolector actual)
@app.route('/api/recolector/mis-solicitudes')
def get_mis_solicitudes():
    if 'user_id' not in session:
        session['user_id'] = 2  # Recolector demo
    
    # Intentar con Supabase primero
    if supabase_client:
        try:
            # Obtener asignaciones del recolector actual
            response = supabase_client.table('asignaciones').select('id_solicitud').eq('id_recolector', session['user_id']).execute()
            
            if response.data:
                ids_solicitudes = [a['id_solicitud'] for a in response.data]
                solicitudes = []
                for id_sol in ids_solicitudes:
                    sol_resp = supabase_client.table('solicitudes_recoleccion').select('*').eq('id_solicitud', id_sol).execute()
                    if sol_resp.data:
                        solicitudes.extend(sol_resp.data)
                return jsonify(solicitudes)
        except Exception as e:
            print(f'Error consultando Supabase: {e}')
    
    # Fallback a SQLite
    conn = get_db_connection()
    solicitudes = conn.execute('''
        SELECT sr.*, u.nombre, u.apellidos, u.telefono as usuario_telefono, u.direccion as usuario_direccion
        FROM solicitudes_recoleccion sr
        JOIN usuarios u ON sr.id_usuario = u.id_usuario
        JOIN asignaciones a ON sr.id_solicitud = a.id_solicitud
        WHERE a.id_recolector = ? AND sr.estado IN ('pendiente', 'en-proceso')
        ORDER BY sr.fecha_solicitud DESC
    ''', (session['user_id'],)).fetchall()
    conn.close()
    
    return jsonify([dict(row) for row in solicitudes])

# Aceptar una solicitud
@app.route('/api/recolector/aceptar-solicitud/<int:id_solicitud>', methods=['POST'])
def aceptar_solicitud(id_solicitud):
    if 'user_id' not in session:
        session['user_id'] = 2  # Recolector demo
    
    # Intentar con Supabase primero
    if supabase_client:
        try:
            # Crear asignación (sin columna 'estado' que no existe en Supabase)
            asignacion = {
                'id_recolector': session['user_id'],
                'id_solicitud': id_solicitud,
                'fecha_asignacion': datetime.now().isoformat()
            }
            supabase_client.table('asignaciones').insert(asignacion).execute()
            
            # Actualizar estado de solicitud a 'en-proceso'
            supabase_client.table('solicitudes_recoleccion').update({'estado': 'en-proceso'}).eq('id_solicitud', id_solicitud).execute()
            
            return jsonify({'success': True, 'mensaje': 'Solicitud aceptada correctamente'})
        except Exception as e:
            print(f'Error aceptando solicitud en Supabase: {e}')
            return jsonify({'success': False, 'error': str(e)}), 400
    
    # Fallback a SQLite
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Verificar que la solicitud existe
        solicitud = cursor.execute('SELECT * FROM solicitudes_recoleccion WHERE id_solicitud = ?', (id_solicitud,)).fetchone()
        if not solicitud:
            return jsonify({'success': False, 'error': 'Solicitud no encontrada'}), 404
        
        # Crear asignación (si la tabla existe)
        try:
            cursor.execute('''
                INSERT INTO asignaciones (id_recolector, id_solicitud, estado)
                VALUES (?, ?, ?)
            ''', (session['user_id'], id_solicitud, 'asignada'))
        except:
            pass  # La tabla de asignaciones podría no existir
        
        # Actualizar estado de solicitud
        cursor.execute('UPDATE solicitudes_recoleccion SET estado = ? WHERE id_solicitud = ?', ('en-proceso', id_solicitud))
        
        conn.commit()
        
        return jsonify({'success': True, 'mensaje': 'Solicitud aceptada correctamente'})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400
    finally:
        conn.close()

# Obtener mis recolecciones asignadas
@app.route('/api/recolector/mis-recolecciones')
def get_mis_recolecciones():
    if 'user_id' not in session:
        session['user_id'] = 2  # Recolector demo
    
    # Intentar con Supabase primero
    if supabase_client:
        try:
            # Obtener solicitudes asignadas a este recolector que NO estén completadas
            response = supabase_client.table('asignaciones') \
                .select('id_solicitud, solicitudes_recoleccion(id_solicitud, id_usuario, tipo_residuo, kilos, calle, "numero exterior", colonia, "codigo postal", referencias, lat, lng, info_extra, estado, fecha_solicitud)') \
                .eq('id_recolector', session['user_id']) \
                .execute()
            
            if response.data:
                recolecciones = []
                for item in response.data:
                    sol = item.get('solicitudes_recoleccion', {})
                    # Solo mostrar las que están en proceso (no completadas)
                    if sol.get('estado') == 'en-proceso':
                        recolecciones.append({
                            'id_solicitud': sol.get('id_solicitud'),
                            'tipo_residuo': sol.get('tipo_residuo'),
                            'kilos': sol.get('kilos'),
                            'calle': sol.get('calle'),
                            'numero_exterior': sol.get('numero exterior'),
                            'colonia': sol.get('colonia'),
                            'codigo_postal': sol.get('codigo postal'),
                            'referencias': sol.get('referencias'),
                            'lat': sol.get('lat'),
                            'lng': sol.get('lng'),
                            'info_extra': sol.get('info_extra'),
                            'estado': sol.get('estado'),
                            'fecha_solicitud': sol.get('fecha_solicitud')
                        })
                return jsonify(recolecciones)
            return jsonify([])
        except Exception as e:
            print(f'Error obteniendo mis recolecciones: {e}')
    
    # Fallback a SQLite
    conn = get_db_connection()
    recolecciones = conn.execute('''
        SELECT sr.* FROM solicitudes_recoleccion sr
        INNER JOIN asignaciones a ON sr.id_solicitud = a.id_solicitud
        WHERE a.id_recolector = ? AND sr.estado = 'en-proceso'
        ORDER BY sr.fecha_solicitud DESC
    ''', (session['user_id'],)).fetchall()
    conn.close()
    
    return jsonify([dict(row) for row in recolecciones])

# Finalizar recolección
@app.route('/api/recolector/finalizar-recoleccion', methods=['POST'])
def finalizar_recoleccion():
    if 'user_id' not in session:
        session['user_id'] = 2  # Recolector demo
    
    try:
        id_solicitud = request.form.get('id_solicitud', type=int)
        fecha_finalizacion = request.form.get('fecha_finalizacion')
        tipo_evidencia = request.form.get('tipo_evidencia')
        notas = request.form.get('notas', '')
        lat_final = request.form.get('lat_final', type=float)
        lng_final = request.form.get('lng_final', type=float)
        
        print(f'📝 Finalizando recolección #{id_solicitud} - Tipo: {tipo_evidencia}')
        
        # Intentar con Supabase primero
        if supabase_client:
            try:
                # Actualizar asignación con datos de finalización
                update_data = {
                    'fecha_finalizacion': fecha_finalizacion,
                    'evidencia': tipo_evidencia,
                    'lat_final': lat_final,
                    'lng_final': lng_final
                }
                
                supabase_client.table('asignaciones').update(update_data) \
                    .eq('id_solicitud', id_solicitud) \
                    .eq('id_recolector', session['user_id']) \
                    .execute()
                
                # Actualizar estado de solicitud según el tipo de evidencia
                if tipo_evidencia in ['completada', 'completada-usuario']:
                    nuevo_estado = 'completada'
                else:
                    nuevo_estado = 'pendiente-revision'  # Para fallos, requiere revisión
                
                supabase_client.table('solicitudes_recoleccion').update({'estado': nuevo_estado}) \
                    .eq('id_solicitud', id_solicitud) \
                    .execute()
                
                # Si es un fallo, crear nueva asignación para reintentar después
                if tipo_evidencia not in ['completada', 'completada-usuario']:
                    # Cambiar a estado 'pendiente' para que otro recolector pueda aceptarla
                    supabase_client.table('solicitudes_recoleccion').update({'estado': 'pendiente'}) \
                        .eq('id_solicitud', id_solicitud) \
                        .execute()
                    
                    print(f'ℹ️ Recolección #{id_solicitud} marcada para reintentar (tipo: {tipo_evidencia})')
                
                # Registrar la actividad en la tabla de historial
                if nuevo_estado == 'completada':
                    solicitud_data = supabase_client.table('solicitudes_recoleccion').select('*').eq('id_solicitud', id_solicitud).execute()
                    if solicitud_data.data:
                        sol = solicitud_data.data[0]
                        duracion = None
                        if sol.get('fecha_solicitud'):
                            try:
                                # Manejo robusto de zonas horarias
                                fecha_solicitud_str = sol['fecha_solicitud']
                                
                                # Asegurar formato ISO con zona horaria
                                if fecha_solicitud_str.endswith('Z'):
                                    fecha_solicitud_str = fecha_solicitud_str.replace('Z', '+00:00')
                                
                                fecha_inicio = datetime.fromisoformat(fecha_solicitud_str)
                                
                                # Manejar fecha_finalizacion
                                fecha_fin_str = fecha_finalizacion
                                if isinstance(fecha_fin_str, str):
                                    if fecha_fin_str.endswith('Z'):
                                        fecha_fin_str = fecha_fin_str.replace('Z', '+00:00')
                                    # Si es naive (sin zona horaria), agregar UTC
                                    if '+' not in fecha_fin_str and 'Z' not in fecha_fin_str:
                                        fecha_fin_str += '+00:00'
                                    fecha_fin = datetime.fromisoformat(fecha_fin_str)
                                else:
                                    fecha_fin = fecha_fin_str
                                
                                # Ambos deberían ser aware ahora, pero si uno es naive, convertir
                                if fecha_inicio.tzinfo is None:
                                    fecha_inicio = fecha_inicio.replace(tzinfo=timezone.utc)
                                if fecha_fin.tzinfo is None:
                                    fecha_fin = fecha_fin.replace(tzinfo=timezone.utc)
                                
                                duracion = (fecha_fin - fecha_inicio).total_seconds() / 3600
                                print(f'⏱️ Duración calculada: {duracion:.2f} horas')
                            except Exception as e:
                                print(f'⚠️ Error calculando duración: {e}')
                                duracion = None
                        
                        actividad_data = {
                            'id_solicitud': id_solicitud,
                            'id_usuario': sol.get('id_usuario'),
                            'id_recolector': session['user_id'],
                            'kilos_recolectados': sol.get('kilos', 0),
                            'tipo_residuo': sol.get('tipo_residuo', ''),
                            'estado_recoleccion': 'completada',
                            'tipo_evidencia': tipo_evidencia,
                            'notas': notas,
                            'lat_final': lat_final,
                            'lng_final': lng_final,
                            'fecha_inicio': sol.get('fecha_solicitud'),
                            'fecha_finalizacion': fecha_finalizacion,
                            'duracion_horas': duracion
                        }
                        
                        supabase_client.table('actividad_recolecciones').insert(actividad_data).execute()
                        print(f'📊 Actividad registrada para solicitud #{id_solicitud}')
                
                print(f'✅ Recolección #{id_solicitud} finalizada como {nuevo_estado}')
                return jsonify({'success': True, 'mensaje': 'Recolección finalizada correctamente'})
                
            except Exception as e:
                print(f'❌ Error en Supabase: {e}')
                return jsonify({'success': False, 'error': str(e)}), 400
        
        # Fallback a SQLite
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Actualizar asignación
            nuevo_estado = 'completada' if tipo_evidencia in ['completada', 'completada-usuario'] else 'pendiente-revision'
            
            cursor.execute('''
                UPDATE asignaciones 
                SET fecha_finalizacion = ?, evidencia = ?, lat_final = ?, lng_final = ?
                WHERE id_solicitud = ? AND id_recolector = ?
            ''', (fecha_finalizacion, tipo_evidencia, lat_final, lng_final, id_solicitud, session['user_id']))
            
            # Actualizar solicitud
            cursor.execute('''
                UPDATE solicitudes_recoleccion 
                SET estado = ?
                WHERE id_solicitud = ?
            ''', (nuevo_estado, id_solicitud))
            
            conn.commit()
            return jsonify({'success': True, 'mensaje': 'Recolección finalizada correctamente'})
            
        except Exception as e:
            conn.rollback()
            return jsonify({'success': False, 'error': str(e)}), 400
        finally:
            conn.close()
            
    except Exception as e:
        print(f'Error: {e}')
        return jsonify({'success': False, 'error': str(e)}), 400

# Enviar ubicación del recolector
@app.route('/api/recolector/enviar-ubicacion', methods=['POST'])
def enviar_ubicacion_recolector():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'No autenticado'}), 401
    
    try:
        data = request.get_json()
        lat = data.get('lat')
        lng = data.get('lng')
        
        if not lat or not lng:
            return jsonify({'success': False, 'error': 'Coordenadas inválidas'}), 400
        
        print(f'📍 Recolector #{session["user_id"]} enviando ubicación: {lat}, {lng}')
        
        # Intentar con Supabase primero
        if supabase_client:
            try:
                supabase_client.table('ubicaciones_recolectores').insert({
                    'id_recolector': session['user_id'],
                    'lat': lat,
                    'lng': lng
                }).execute()
                
                print(f'✅ Ubicación guardada en Supabase')
                return jsonify({'success': True, 'mensaje': 'Ubicación enviada correctamente'})
            except Exception as e:
                print(f'❌ Error en Supabase: {e}')
                return jsonify({'success': False, 'error': str(e)}), 400
        
        # Fallback a SQLite
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO ubicaciones_recolectores (id_recolector, lat, lng)
                VALUES (?, ?, ?)
            ''', (session['user_id'], lat, lng))
            conn.commit()
            print(f'✅ Ubicación guardada en SQLite')
            return jsonify({'success': True, 'mensaje': 'Ubicación enviada correctamente'})
        except Exception as e:
            conn.rollback()
            print(f'❌ Error en SQLite: {e}')
            return jsonify({'success': False, 'error': str(e)}), 400
        finally:
            conn.close()
            
    except Exception as e:
        print(f'❌ Error general: {e}')
        return jsonify({'success': False, 'error': str(e)}), 400

# Actualizar estado de solicitud
@app.route('/api/recolector/actualizar-estado/<int:id_solicitud>', methods=['POST'])
def actualizar_estado_solicitud(id_solicitud):
    if 'user_id' not in session:
        session['user_id'] = 2  # Recolector demo
    
    data = request.get_json()
    nuevo_estado = data.get('estado', 'en-proceso')  # 'en-proceso', 'completada'
    
    # Intentar con Supabase primero
    if supabase_client:
        try:
            supabase_client.table('solicitudes_recoleccion').update({'estado': nuevo_estado}).eq('id_solicitud', id_solicitud).execute()
            return jsonify({'success': True, 'mensaje': f'Estado actualizado a: {nuevo_estado}'})
        except Exception as e:
            print(f'Error actualizando estado en Supabase: {e}')
            return jsonify({'success': False, 'error': str(e)}), 400
    
    # Fallback a SQLite
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('UPDATE solicitudes_recoleccion SET estado = ? WHERE id_solicitud = ?', (nuevo_estado, id_solicitud))
        conn.commit()
        return jsonify({'success': True, 'mensaje': f'Estado actualizado a: {nuevo_estado}'})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400
    finally:
        conn.close()

# ==================== ENDPOINTS DE USUARIO (CONTRASEÑA, PERFIL) ====================

# Cambiar contraseña para cualquier usuario (recolector, usuario, admin)
@app.route('/api/usuario/cambiar-contrasena', methods=['POST'])
def cambiar_contrasena():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'No autenticado'}), 401
    
    data = request.get_json()
    contrasena_actual = data.get('contrasena_actual', '').strip()
    contrasena_nueva = data.get('contrasena_nueva', '').strip()
    contrasena_confirmar = data.get('contrasena_confirmar', '').strip()
    
    if not all([contrasena_actual, contrasena_nueva, contrasena_confirmar]):
        return jsonify({'success': False, 'error': 'Todos los campos son obligatorios'}), 400
    
    if contrasena_nueva != contrasena_confirmar:
        return jsonify({'success': False, 'error': 'Las contraseñas nuevas no coinciden'}), 400
    
    if len(contrasena_nueva) < 6:
        return jsonify({'success': False, 'error': 'La contraseña debe tener al menos 6 caracteres'}), 400
    
    # Intentar con Supabase primero
    if supabase_client:
        try:
            # Obtener usuario actual
            user_resp = supabase_client.table('usuarios').select('contrasena').eq('id_usuario', session['user_id']).execute()
            
            if not user_resp.data:
                return jsonify({'success': False, 'error': 'Usuario no encontrado'}), 404
            
            # Verificar contraseña actual
            if not check_password_hash(user_resp.data[0]['contrasena'], contrasena_actual):
                return jsonify({'success': False, 'error': 'Contraseña actual incorrecta'}), 403
            
            # Actualizar contraseña
            nueva_hash = generate_password_hash(contrasena_nueva)
            supabase_client.table('usuarios').update({'contrasena': nueva_hash}).eq('id_usuario', session['user_id']).execute()
            
            return jsonify({'success': True, 'mensaje': 'Contraseña actualizada correctamente'})
        except Exception as e:
            print(f'Error actualizando contraseña en Supabase: {e}')
            # Continuar con SQLite como fallback
    
    # Fallback a SQLite
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Obtener contraseña actual
        usuario = cursor.execute('SELECT contrasena FROM usuarios WHERE id_usuario = ?', (session['user_id'],)).fetchone()
        
        if not usuario:
            return jsonify({'success': False, 'error': 'Usuario no encontrado'}), 404
        
        # Verificar contraseña actual
        if not check_password_hash(usuario['contrasena'], contrasena_actual):
            return jsonify({'success': False, 'error': 'Contraseña actual incorrecta'}), 403
        
        # Actualizar contraseña
        nueva_hash = generate_password_hash(contrasena_nueva)
        cursor.execute('UPDATE usuarios SET contrasena = ? WHERE id_usuario = ?', (nueva_hash, session['user_id']))
        conn.commit()
        
        return jsonify({'success': True, 'mensaje': 'Contraseña actualizada correctamente'})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400
    finally:
        conn.close()

# Obtener estadísticas del dashboard
@app.route('/api/usuario/estadisticas')
def get_estadisticas():
    if 'user_id' not in session:
        session['user_id'] = 1  # Usuario demo
    
    # Intentar con Supabase primero
    if supabase_client:
        try:
            # Total de solicitudes del usuario
            total_resp = supabase_client.table('solicitudes_recoleccion').select('id_solicitud', count='exact').eq('id_usuario', session['user_id']).execute()
            total = total_resp.count if hasattr(total_resp, 'count') else len(total_resp.data)
            
            # Pendientes
            pend_resp = supabase_client.table('solicitudes_recoleccion').select('id_solicitud', count='exact').eq('estado', 'pendiente').eq('id_usuario', session['user_id']).execute()
            pendientes = pend_resp.count if hasattr(pend_resp, 'count') else len(pend_resp.data)
            
            # En proceso
            proc_resp = supabase_client.table('solicitudes_recoleccion').select('id_solicitud', count='exact').eq('estado', 'en-proceso').eq('id_usuario', session['user_id']).execute()
            en_proceso = proc_resp.count if hasattr(proc_resp, 'count') else len(proc_resp.data)
            
            # Completadas
            comp_resp = supabase_client.table('solicitudes_recoleccion').select('id_solicitud', count='exact').eq('estado', 'completada').eq('id_usuario', session['user_id']).execute()
            completadas = comp_resp.count if hasattr(comp_resp, 'count') else len(comp_resp.data)
            
            # Total de kilos (desde actividad_recolecciones - más confiable)
            kilos_resp = supabase_client.table('actividad_recolecciones').select('kilos_recolectados').eq('id_usuario', session['user_id']).eq('estado_recoleccion', 'completada').execute()
            total_kilos = sum(row.get('kilos_recolectados', 0) for row in kilos_resp.data) if kilos_resp.data else 0
            
            # Actividad reciente detallada (últimas 8 recolecciones completadas)
            actividad_resp = supabase_client.table('actividad_recolecciones') \
                .select('id_actividad, id_solicitud, kilos_recolectados, tipo_residuo, tipo_evidencia, fecha_finalizacion, duracion_horas') \
                .eq('id_usuario', session['user_id']) \
                .order('fecha_finalizacion', desc=True) \
                .limit(8) \
                .execute()
            actividad = actividad_resp.data if actividad_resp.data else []
            
            # Estadísticas por tipo de residuo
            residuo_resp = supabase_client.table('actividad_recolecciones') \
                .select('tipo_residuo, kilos_recolectados', count='exact') \
                .eq('id_usuario', session['user_id']) \
                .eq('estado_recoleccion', 'completada') \
                .execute()
            
            residuos_stats = {}
            if residuo_resp.data:
                for row in residuo_resp.data:
                    tipo = row.get('tipo_residuo', 'Desconocido')
                    if tipo not in residuos_stats:
                        residuos_stats[tipo] = {'kilos': 0, 'cantidad': 0}
                    residuos_stats[tipo]['kilos'] += row.get('kilos_recolectados', 0)
                    residuos_stats[tipo]['cantidad'] += 1
            
            return jsonify({
                'total': total,
                'pendientes': pendientes,
                'en_proceso': en_proceso,
                'completadas': completadas,
                'total_kilos': round(total_kilos, 2),
                'actividad': actividad,
                'residuos_stats': residuos_stats
            })
        except Exception as e:
            print(f'Error consultando estadísticas en Supabase: {e}')
    
    # Fallback a SQLite
    conn = get_db_connection()
    
    total = conn.execute('SELECT COUNT(*) as count FROM solicitudes_recoleccion WHERE id_usuario = ?', (session['user_id'],)).fetchone()['count']
    pendientes = conn.execute("SELECT COUNT(*) as count FROM solicitudes_recoleccion WHERE estado = 'pendiente' AND id_usuario = ?", (session['user_id'],)).fetchone()['count']
    en_proceso = conn.execute("SELECT COUNT(*) as count FROM solicitudes_recoleccion WHERE estado = 'en-proceso' AND id_usuario = ?", (session['user_id'],)).fetchone()['count']
    completadas = conn.execute("SELECT COUNT(*) as count FROM solicitudes_recoleccion WHERE estado = 'completada' AND id_usuario = ?", (session['user_id'],)).fetchone()['count']
    
    # Kilos desde actividad
    total_kilos = conn.execute("SELECT SUM(kilos_recolectados) as total FROM actividad_recolecciones WHERE id_usuario = ? AND estado_recoleccion = 'completada'", (session['user_id'],)).fetchone()['total'] or 0
    
    # Actividad reciente
    actividad = conn.execute('''
        SELECT id_actividad, id_solicitud, kilos_recolectados, tipo_residuo, tipo_evidencia, fecha_finalizacion, duracion_horas 
        FROM actividad_recolecciones 
        WHERE id_usuario = ? 
        ORDER BY fecha_finalizacion DESC 
        LIMIT 8
    ''', (session['user_id'],)).fetchall()
    
    # Estadísticas por tipo de residuo
    residuos_data = conn.execute('''
        SELECT tipo_residuo, COUNT(*) as cantidad, SUM(kilos_recolectados) as kilos 
        FROM actividad_recolecciones 
        WHERE id_usuario = ? AND estado_recoleccion = 'completada'
        GROUP BY tipo_residuo
    ''', (session['user_id'],)).fetchall()
    
    residuos_stats = {row['tipo_residuo']: {'cantidad': row['cantidad'], 'kilos': row['kilos']} for row in residuos_data}
    
    conn.close()
    
    return jsonify({
        'total': total,
        'pendientes': pendientes,
        'en_proceso': en_proceso,
        'completadas': completadas,
        'total_kilos': round(total_kilos, 2),
        'actividad': [dict(row) for row in actividad],
        'residuos_stats': residuos_stats
    })

# Estadísticas del recolector
@app.route('/api/recolector/estadisticas')
def get_estadisticas_recolector():
    if 'user_id' not in session:
        session['user_id'] = 2  # Recolector demo
    
    # Intentar con Supabase primero
    if supabase_client:
        try:
            # Contar solicitudes disponibles (pendientes)
            pend_resp = supabase_client.table('solicitudes_recoleccion').select('id_solicitud', count='exact').eq('estado', 'pendiente').execute()
            pendientes = pend_resp.count if hasattr(pend_resp, 'count') else len(pend_resp.data)
            
            # En proceso (asignadas a este recolector)
            proc_resp = supabase_client.table('asignaciones') \
                .select('id_solicitud, solicitudes_recoleccion(estado)', count='exact') \
                .eq('id_recolector', session['user_id']) \
                .execute()
            
            en_proceso = 0
            for item in proc_resp.data if proc_resp.data else []:
                sol = item.get('solicitudes_recoleccion', {})
                if sol.get('estado') == 'en-proceso':
                    en_proceso += 1
            
            # Completadas por este recolector
            comp_resp = supabase_client.table('actividad_recolecciones') \
                .select('id_actividad', count='exact') \
                .eq('id_recolector', session['user_id']) \
                .eq('estado_recoleccion', 'completada') \
                .execute()
            completadas = comp_resp.count if hasattr(comp_resp, 'count') else len(comp_resp.data)
            
            # Total de kilos recolectados por este recolector
            kilos_resp = supabase_client.table('actividad_recolecciones') \
                .select('kilos_recolectados') \
                .eq('id_recolector', session['user_id']) \
                .eq('estado_recoleccion', 'completada') \
                .execute()
            total_kilos = sum(row.get('kilos_recolectados', 0) for row in kilos_resp.data) if kilos_resp.data else 0
            
            # Actividad reciente del recolector (últimas 8 completadas)
            actividad_resp = supabase_client.table('actividad_recolecciones') \
                .select('id_actividad, id_solicitud, kilos_recolectados, tipo_residuo, tipo_evidencia, fecha_finalizacion') \
                .eq('id_recolector', session['user_id']) \
                .order('fecha_finalizacion', desc=True) \
                .limit(8) \
                .execute()
            actividad = actividad_resp.data if actividad_resp.data else []
            
            return jsonify({
                'pendientes': pendientes,
                'en_proceso': en_proceso,
                'completadas': completadas,
                'total_kilos': round(total_kilos, 2),
                'actividad': actividad
            })
        except Exception as e:
            print(f'Error consultando estadísticas recolector en Supabase: {e}')
    
    # Fallback a SQLite
    conn = get_db_connection()
    
    pendientes = conn.execute("SELECT COUNT(*) as count FROM solicitudes_recoleccion WHERE estado = 'pendiente'").fetchone()['count']
    
    en_proceso = conn.execute('''
        SELECT COUNT(*) as count FROM solicitudes_recoleccion sr
        INNER JOIN asignaciones a ON sr.id_solicitud = a.id_solicitud
        WHERE a.id_recolector = ? AND sr.estado = 'en-proceso'
    ''', (session['user_id'],)).fetchone()['count']
    
    completadas = conn.execute('''
        SELECT COUNT(*) as count FROM actividad_recolecciones
        WHERE id_recolector = ? AND estado_recoleccion = 'completada'
    ''', (session['user_id'],)).fetchone()['count']
    
    total_kilos = conn.execute('''
        SELECT SUM(kilos_recolectados) as total FROM actividad_recolecciones
        WHERE id_recolector = ? AND estado_recoleccion = 'completada'
    ''', (session['user_id'],)).fetchone()['total'] or 0
    
    actividad = conn.execute('''
        SELECT id_actividad, id_solicitud, kilos_recolectados, tipo_residuo, tipo_evidencia, fecha_finalizacion
        FROM actividad_recolecciones
        WHERE id_recolector = ?
        ORDER BY fecha_finalizacion DESC
        LIMIT 8
    ''', (session['user_id'],)).fetchall()
    
    conn.close()
    
    return jsonify({
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
        return jsonify({'success': False, 'error': 'No autenticado'}), 401
    
    data = request.get_json()
    
    if not data.get('motivo') or not data.get('descripcion'):
        return jsonify({'success': False, 'error': 'Motivo y descripción son requeridos'}), 400
    
    # Intentar con Supabase primero
    if supabase_client:
        try:
            # Preparar datos para la tabla quejas_soporte
            queja_data = {
                'id_usuario': session['user_id'],
                'motivo': data['motivo'],
                'descripcion': data['descripcion'],
                'estado': 'pendiente'
            }
            
            # Campos opcionales
            if data.get('id_recolector'):
                queja_data['id_recolector'] = data['id_recolector']
            
            if data.get('numeroSolicitud') or data.get('id_solicitud'):
                queja_data['id_solicitud'] = data.get('numeroSolicitud') or data.get('id_solicitud')
            
            response = supabase_client.table('quejas_soporte').insert(queja_data).execute()
            
            return jsonify({'success': True, 'message': 'Queja enviada correctamente'})
        except Exception as e:
            print(f'Error creando queja en Supabase: {e}')
            return jsonify({'success': False, 'error': str(e)}), 500
    
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
    
    return jsonify({'success': True, 'message': 'Queja enviada correctamente'})

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
    
    # Valores por defecto
    recolector_info = {
        'nombre': 'Sin asignar',
        'telefono': 'N/A',
        'vehiculo': 'N/A',
        'placas': 'N/A'
    }
    recolector_lat, recolector_lng = None, None
    usuario_lat, usuario_lng = 20.082, -98.363
    distancia = 0
    tiempo_estimado = 0
    
    # Intentar obtener desde Supabase
    if supabase_client:
        try:
            # Obtener ubicación del usuario desde la solicitud
            sol_resp = supabase_client.table('solicitudes_recoleccion') \
                .select('lat, lng') \
                .eq('id_solicitud', id_solicitud) \
                .execute()
            
            if sol_resp.data and len(sol_resp.data) > 0:
                usuario_lat = sol_resp.data[0].get('lat', usuario_lat)
                usuario_lng = sol_resp.data[0].get('lng', usuario_lng)
            
            # Obtener asignación con info del recolector
            asig_resp = supabase_client.table('asignaciones') \
                .select('id_recolector, recolectores(nombre, apellido, telefono, vehiculo, placa)') \
                .eq('id_solicitud', id_solicitud) \
                .execute()
            
            if asig_resp.data and len(asig_resp.data) > 0:
                asignacion = asig_resp.data[0]
                id_recolector = asignacion['id_recolector']
                rec_data = asignacion.get('recolectores', {})
                
                # Actualizar info del recolector
                if rec_data:
                    recolector_info['nombre'] = f"{rec_data.get('nombre', '')} {rec_data.get('apellido', '')}".strip()
                    recolector_info['telefono'] = rec_data.get('telefono', 'N/A')
                    recolector_info['vehiculo'] = rec_data.get('vehiculo', 'N/A')
                    recolector_info['placas'] = rec_data.get('placa', 'N/A')
                
                # Obtener última ubicación del recolector
                ubic_resp = supabase_client.table('ubicaciones_recolectores') \
                    .select('lat, lng') \
                    .eq('id_recolector', id_recolector) \
                    .order('id_ubicacion', desc=True) \
                    .limit(1) \
                    .execute()
                
                if ubic_resp.data and len(ubic_resp.data) > 0:
                    recolector_lat = ubic_resp.data[0]['lat']
                    recolector_lng = ubic_resp.data[0]['lng']
                    
                    # Calcular distancia real usando Haversine
                    from math import radians, sin, cos, sqrt, atan2
                    R = 6371  # Radio de la Tierra en km
                    
                    lat1, lon1 = radians(usuario_lat), radians(usuario_lng)
                    lat2, lon2 = radians(recolector_lat), radians(recolector_lng)
                    
                    dlat = lat2 - lat1
                    dlon = lon2 - lon1
                    
                    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
                    c = 2 * atan2(sqrt(a), sqrt(1-a))
                    distancia = R * c
                    
                    tiempo_estimado = int((distancia / 30) * 60)  # Asumiendo 30 km/h
                    
        except Exception as e:
            print(f'⚠️ Error obteniendo seguimiento: {e}')
    
    # Si no hay ubicación del recolector, usar la del usuario
    if recolector_lat is None:
        recolector_lat, recolector_lng = usuario_lat, usuario_lng
    
    return jsonify({
        'recolector': recolector_info,
        'ubicacion': {
            'lat': recolector_lat,
            'lng': recolector_lng
        },
        'ubicacion_usuario': {
            'lat': usuario_lat,
            'lng': usuario_lng
        },
        'distancia': round(distancia, 2),
        'tiempo_estimado': tiempo_estimado,
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

# Obtener ubicaciones de todos los recolectores activos
@app.route('/api/recolectores/ubicaciones')
def get_recolectores_ubicaciones():
    """Obtiene la ubicación más reciente de todos los recolectores para mostrar en el mapa"""
    
    # Intentar con Supabase primero
    if supabase_client:
        try:
            # Obtener todos los recolectores de la tabla 'recolectores'
            recolectores = supabase_client.table('recolectores').select('id_recolector, nombre, apellido, telefono, vehiculo, placa').execute()
            
            print(f"📋 Recolectores encontrados: {len(recolectores.data) if recolectores.data else 0}")
            
            resultado = []
            if recolectores.data:
                for recolector in recolectores.data:
                    # Obtener última ubicación de cada recolector
                    ubicaciones = supabase_client.table('ubicaciones_recolectores') \
                        .select('id_ubicacion, lat, lng') \
                        .eq('id_recolector', recolector['id_recolector']) \
                        .order('id_ubicacion', desc=True) \
                        .limit(1) \
                        .execute()
                    
                    print(f"   Recolector {recolector['id_recolector']}: {len(ubicaciones.data) if ubicaciones.data else 0} ubicaciones")
                    
                    if ubicaciones.data and len(ubicaciones.data) > 0:
                        ubicacion = ubicaciones.data[0]
                        resultado.append({
                            'id_recolector': recolector['id_recolector'],
                            'nombre': f"{recolector['nombre']} {recolector['apellido']}",
                            'apellidos': recolector['apellido'],
                            'telefono': recolector['telefono'],
                            'vehiculo': recolector['vehiculo'],
                            'placa': recolector['placa'],
                            'lat': ubicacion['lat'],
                            'lng': ubicacion['lng'],
                            'id_ubicacion': ubicacion['id_ubicacion']
                        })
            
            print(f"✅ Devolviendo {len(resultado)} recolectores con ubicación")
            return jsonify(resultado)
        except Exception as e:
            print(f'❌ Error consultando Supabase: {e}')
            import traceback
            traceback.print_exc()
    
    # Fallback a SQLite
    conn = get_db_connection()
    
    # Obtener todos los recolectores
    recolectores = conn.execute('''
        SELECT id_usuario, nombre, apellidos, telefono 
        FROM usuarios 
        WHERE rol = 'recolector'
    ''').fetchall()
    
    resultado = []
    for recolector in recolectores:
        # Obtener última ubicación
        ubicacion = conn.execute('''
            SELECT lat, lng, timestamp 
            FROM ubicaciones_recolectores 
            WHERE id_recolector = ? 
            ORDER BY timestamp DESC 
            LIMIT 1
        ''', (recolector['id_usuario'],)).fetchone()
        
        if ubicacion:
            resultado.append({
                'id_recolector': recolector['id_usuario'],
                'nombre': recolector['nombre'],
                'apellidos': recolector['apellidos'],
                'telefono': recolector['telefono'],
                'lat': ubicacion['lat'],
                'lng': ubicacion['lng'],
                'timestamp': ubicacion['timestamp']
            })
    
    conn.close()
    return jsonify(resultado)

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


# ==================== ENDPOINTS ADMIN ====================

@app.route('/api/admin/quejas')
def admin_get_quejas():
    """Obtiene quejas con datos básicos del usuario desde Supabase."""
    if not supabase_client:
        return jsonify({'success': False, 'error': 'Supabase no configurado'}), 500

    try:
        # Seleccionar columnas de forma amplia para evitar fallos por nombres diferentes
        # Usar fecha_envio (columna real) en lugar de fecha_creacion
        response = supabase_client.table('quejas_soporte') \
            .select('*, usuarios(nombre, apellidos, correo)') \
            .order('fecha_envio', desc=True) \
            .execute()

        rows = response.data or []
        # Mapear a formato esperado por frontend
        result = []
        for q in rows:
            usuario_nombre = None
            if isinstance(q.get('usuarios'), dict):
                u = q['usuarios']
                nombre = (u.get('nombre') or '').strip()
                apellidos = (u.get('apellidos') or '').strip()
                correo = (u.get('correo') or '').strip()
                usuario_nombre = (f"{nombre} {apellidos}" if (nombre or apellidos) else correo) or None

            result.append({
                'id': q.get('id') or q.get('id_queja') or q.get('id_soporte') or q.get('id_reporte') or q.get('id_solicitud') or q.get('id_usuario'),
                'usuario': usuario_nombre or f"Usuario #{q.get('id_usuario')}",
                'motivo': q.get('motivo') or q.get('asunto') or 'Sin motivo',
                'fecha': q.get('fecha_envio') or q.get('fecha_creacion') or q.get('fecha') or q.get('created_at') or '',
                'prioridad': q.get('prioridad') or 'baja',
                'estado': q.get('estado') or 'pendiente',
                'descripcion': q.get('descripcion') or q.get('detalle') or '',
                'solicitud': q.get('id_solicitud') or None,
                'recolector': q.get('id_recolector') or None
            })

        return jsonify(result)
    except Exception as exc:
        print(f'Error consultando quejas: {exc}')
        import traceback
        traceback.print_exc()
        return jsonify([])


@app.route('/api/admin/recolectores-ubicacion')
def admin_get_recolectores_ubicacion():
    """Obtiene todos los recolectores activos con su última ubicación desde Supabase."""
    if not supabase_client:
        print("⚠️ Supabase no configurado")
        return jsonify([]), 200

    try:
        # Obtener todos los recolectores
        response = supabase_client.table('recolectores').select('*').execute()
        print(f"📍 Recolectores encontrados: {len(response.data or [])}")
        
        resultado = []
        
        for recolector in response.data or []:
            id_rec = recolector.get('id_recolector')
            lat = recolector.get('lat', 20.0871)
            lng = recolector.get('lng', -98.7612)
            
            # Intentar obtener ubicación más reciente si existe tabla
            try:
                ubic_resp = supabase_client.table('ubicaciones_recolectores') \
                    .select('lat, lng') \
                    .eq('id_recolector', id_rec) \
                    .order('id_ubicacion', desc=True) \
                    .limit(1) \
                    .execute()
                
                if ubic_resp.data and len(ubic_resp.data) > 0:
                    lat = ubic_resp.data[0].get('lat', lat)
                    lng = ubic_resp.data[0].get('lng', lng)
                    print(f"   Recolector {id_rec}: ubicación actualizada ({lat}, {lng})")
            except Exception as e:
                print(f"   Recolector {id_rec}: usando ubicación por defecto - {e}")
            
            resultado.append({
                'id': id_rec,
                'nombre': f"{recolector.get('nombre', 'N/A')} {recolector.get('apellido', '')}".strip(),
                'telefono': recolector.get('telefono', ''),
                'correo': recolector.get('correo', ''),
                'estado': 'operativo',
                'lat': lat,
                'lng': lng,
                'placa': recolector.get('placa', ''),
                'vehiculo': recolector.get('vehiculo', '')
            })
        
        print(f"✅ Devolviendo {len(resultado)} recolectores")
        return jsonify(resultado)
    except Exception as exc:
        print(f'❌ Error: {exc}')
        import traceback
        traceback.print_exc()
        return jsonify([]), 200


@app.route('/api/admin/recolectores')
def admin_get_recolectores():
    """Lista recolectores y métricas de asignaciones desde Supabase."""
    if not supabase_client:
        return jsonify({'success': False, 'error': 'Supabase no configurado'}), 500

    try:
        response = supabase_client.table('recolectores').select('*').execute()
        data = []
        for rec in response.data or []:
            try:
                asig_resp = supabase_client.table('asignaciones').select('id_asignacion', count='exact').eq('id_recolector', rec['id_recolector']).execute()
                comp_resp = supabase_client.table('asignaciones').select('id_asignacion', count='exact').eq('id_recolector', rec['id_recolector']).not_.is_('fecha_finalizacion', 'null').execute()
                rec['asignaciones_totales'] = getattr(asig_resp, 'count', None) or len(asig_resp.data or [])
                rec['completadas'] = getattr(comp_resp, 'count', None) or len(comp_resp.data or [])
            except Exception:
                rec['asignaciones_totales'] = 0
                rec['completadas'] = 0
            data.append(rec)
        return jsonify(data)
    except Exception as exc:
        print(f'Error consultando recolectores: {exc}')
        return jsonify({'success': False, 'error': 'No se pudieron cargar los recolectores'}), 500


@app.route('/api/admin/vehiculos')
def admin_get_vehiculos():
    """Obtiene vehículos desde Supabase (si existen)."""
    if not supabase_client:
        return jsonify([])

    try:
        response = supabase_client.table('vehiculos').select('*').execute()
        return jsonify(response.data or [])
    except Exception as exc:
        print(f'Tabla vehiculos no disponible: {exc}')
        return jsonify([])


@app.route('/api/admin/rutas')
def admin_get_rutas():
    """Obtiene rutas generales desde Supabase (si existen)."""
    if not supabase_client:
        return jsonify([])

    try:
        rutas_resp = supabase_client.table('rutas_generales').select('*').execute()
        rutas = []
        for ruta in rutas_resp.data or []:
            puntos_resp = supabase_client.table('puntos_ruta').select('*').eq('id_ruta', ruta['id_ruta']).order('orden').execute()
            ruta['puntos'] = puntos_resp.data or []
            rutas.append(ruta)
        return jsonify(rutas)
    except Exception as exc:
        print(f'Tabla rutas_generales no disponible: {exc}')
        return jsonify([])

# Actualizar estado de una queja
@app.route('/api/admin/quejas/<int:id_queja>/estado', methods=['POST'])
def admin_actualizar_estado_queja(id_queja):
    if not supabase_client:
        return jsonify({'success': False, 'error': 'Supabase no configurado'}), 500

    data = request.get_json() or {}
    nuevo_estado = data.get('estado')

    if not nuevo_estado:
        return jsonify({'success': False, 'error': 'estado requerido'}), 400

    try:
        print(f"🛠️ Actualizando queja #{id_queja} -> estado={nuevo_estado}")
        update_data = {'estado': nuevo_estado}

        # Primero, buscar la fila para saber qué columna ID usar
        fila_actual = None
        id_col = None
        
        try:
            # Intentar por 'id' primero
            sel = supabase_client.table('quejas_soporte').select('*').eq('id', id_queja).limit(1).execute()
            fila_actual = (sel.data or [None])[0]
            if fila_actual:
                id_col = 'id'
        except Exception:
            pass

        # Si no encontró por 'id', intentar por 'id_queja'
        if not fila_actual:
            try:
                sel = supabase_client.table('quejas_soporte').select('*').eq('id_queja', id_queja).limit(1).execute()
                fila_actual = (sel.data or [None])[0]
                if fila_actual:
                    id_col = 'id_queja'
            except Exception:
                pass

        if not fila_actual:
            print(f"⚠️ Queja #{id_queja} no encontrada")
            return jsonify({'success': False, 'error': f'Queja #{id_queja} no encontrada'}), 404

        # Actualizar con la columna correcta identificada (SOLO estado, sin prioridad)
        if id_col == 'id':
            resp = supabase_client.table('quejas_soporte').update(update_data).eq('id', id_queja).execute()
        else:
            resp = supabase_client.table('quejas_soporte').update(update_data).eq('id_queja', id_queja).execute()

        updated = resp.data or []
        print(f"✅ Actualizada: {len(updated) > 0} | Filas afectadas: {len(updated)}")
        
        # Obtener fila actualizada para confirmar
        fila_nueva = None
        try:
            if id_col == 'id':
                sel = supabase_client.table('quejas_soporte').select('*').eq('id', id_queja).limit(1).execute()
            else:
                sel = supabase_client.table('quejas_soporte').select('*').eq('id_queja', id_queja).limit(1).execute()
            fila_nueva = (sel.data or [None])[0]
        except Exception as e:
            print(f"⚠️ Error obteniendo fila actualizada: {e}")

        estado_confirmado = fila_nueva.get('estado') if isinstance(fila_nueva, dict) else nuevo_estado
        print(f"✅ Estado confirmado en BD: {estado_confirmado}")
        
        return jsonify({
            'success': True, 
            'updated': len(updated) > 0, 
            'estado': estado_confirmado,
            'id_columna': id_col
        })
    except Exception as exc:
        print(f'❌ Error actualizando estado de queja: {exc}')
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(exc)}), 500

if __name__ == '__main__':
    import sys
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
