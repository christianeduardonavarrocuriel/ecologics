# Ecologics

Aplicación web para gestionar solicitudes de recolección de residuos reciclables. El proyecto se desarrolló como ejercicio académico de Estructura de Datos y desarrollo web, con el objetivo de practicar:

- Manejo de rutas y controladores en una API REST usando Flask.
- Integración con servicios externos (Supabase y Mapbox).
- Persistencia de datos y manejo de estados de las solicitudes.

No es un producto terminado, sino un prototipo funcional orientado al aprendizaje.

## ¿Qué hace la aplicación?

Ecologics conecta a tres tipos de actores:

- Usuarios: crean solicitudes de recolección indicando dirección, tipo de residuo y cantidad estimada.
- Recolectores: visualizan las solicitudes pendientes, aceptan recolecciones, actualizan estados y envían su ubicación.
- Administrador: consulta quejas, visualiza recolectores en el mapa y revisa información general del sistema.

Funciones principales:

- Registro e inicio de sesión de usuarios.
- Panel de usuario para crear y seguir solicitudes de recolección.
- Panel de recolector para ver solicitudes asignadas, cambiar estados y reportar finalización.
- Panel de administración con listado de quejas y recolectores.
- Visualización de ubicaciones y rutas con Mapbox.
- Estadísticas básicas: número de solicitudes por estado y kilos recolectados.

## Tecnologías utilizadas

Backend:

- Python 3.11.
- Flask como framework web.
- Werkzeug para hashing y verificación de contraseñas.
- Supabase como base de datos principal en la nube (SDK supabase-py).
- SQLite como base de datos local de respaldo cuando Supabase no está disponible.
- python-dotenv para leer variables de entorno.

Frontend:

- HTML, CSS y JavaScript sencillo.
- Mapbox para mostrar mapas y ubicaciones de recolectores/usuarios.

Infraestructura y herramientas:

- Docker y docker-compose para empaquetar y ejecutar la aplicación.
- Variables de entorno para credenciales de Supabase y token de Mapbox.

## Problema que intenta resolver

En muchas colonias la recolección selectiva de residuos es poco organizada y los usuarios tienen poca visibilidad de:

- Cuándo será atendida su solicitud de recolección.
- Quién es el recolector asignado.
- En qué estado real está cada recolección (pendiente, en proceso, completada).

Este proyecto propone un flujo básico donde:

- El usuario registra su solicitud desde un panel sencillo.
- El recolector acepta solicitudes, actualiza estados y envía su ubicación.
- El sistema guarda un historial de actividades y genera estadísticas simples.

Aun siendo un prototipo académico, la lógica se acerca a un escenario realista, con manejo de roles, seguimiento en mapa y persistencia en base de datos.

## Instalación y ejecución (desarrollo)

1. Clonar el repositorio y entrar a la carpeta del proyecto.
2. (Opcional) Crear y activar un entorno virtual de Python:

	```bash
	python -m venv .venv
	source .venv/bin/activate  # Linux/macOS
	# .venv\\Scripts\\activate   # Windows
	```

3. Instalar dependencias:

	```bash
	pip install -r requirements.txt
	```

4. Configurar variables de entorno mínimas (por ejemplo en un archivo `.env`):

	- `MAPBOX_TOKEN`: token de Mapbox para mostrar mapas.
	- `SUPABASE_URL`: URL del proyecto Supabase.
	- `SUPABASE_SERVICE_ROLE_KEY` o `SUPABASE_ANON_KEY`: clave de acceso a Supabase.

	Si no se configuran credenciales de Supabase, la aplicación intentará usar SQLite como base de datos local (`ecologics.db`).

5. Ejecutar la aplicación:

	```bash
	python app.py
	```

	Por defecto se inicia en el puerto `8080`.

6. Abrir en el navegador:

	- Página principal: http://localhost:8080/
	- Panel de usuario: http://localhost:8080/panel-usuario
	- Panel de recolector: http://localhost:8080/panel-recolector
	- Panel de administración: http://localhost:8080/panel-admin

## Ejecución con Docker

Requisitos previos:

- Docker
- docker-compose

Comandos básicos:

```bash
docker-compose up --build
```

El servicio quedará disponible en `http://localhost:8080`, utilizando las variables de entorno definidas en tu sistema para Supabase y Mapbox.

## Endpoints principales (resumen)

**Páginas web**

- `GET /` → Página de inicio.
- `GET /login` → Vista de inicio de sesión.
- `GET /registro` → Vista de registro de usuario.
- `GET /panel-usuario` → Panel del usuario.
- `GET /panel-recolector` → Panel del recolector.
- `GET /panel-admin` → Panel del administrador.

**Autenticación y usuarios**

- `POST /login` → Inicia sesión y devuelve rol/destino.
- `POST /registro` → Registra un nuevo usuario.
- `GET /logout` → Cierra sesión.
- `GET /api/usuario/perfil` → Obtiene perfil del usuario logueado.
- `POST /api/usuario/cambiar-contrasena` → Cambia la contraseña del usuario.

**Solicitudes y recolecciones**

- `GET /api/usuario/solicitudes` → Lista solicitudes del usuario.
- `POST /api/usuario/solicitudes` → Crea una nueva solicitud de recolección.
- `GET /api/recolector/solicitudes-disponibles` → Lista solicitudes pendientes para recolectores.
- `POST /api/recolector/aceptar-solicitud/<id_solicitud>` → Acepta una solicitud.
- `POST /api/recolector/finalizar-recoleccion` → Marca una recolección como finalizada o con fallo.

**Soporte, rutas y administración**

- `POST /api/usuario/quejas` → Envía una queja o reporte de soporte.
- `POST /api/usuario/rutas-sugeridas` → Usuario sugiere nueva ruta de recolección.
- `GET /api/admin/quejas` → Administrador consulta quejas.
- `GET /api/recolectores/ubicaciones` → Devuelve ubicaciones de recolectores para el mapa.

> Nota: El listado anterior es un resumen de los endpoints más usados. El archivo `app.py` contiene la definición completa de rutas y lógica.

## Autor

- Itzel Cortes Aguirre
- Christian Eduardo Navarro Curiel
- Landy Alberto Tolentino Olmedo

Este proyecto se utiliza principalmente como práctica y puede seguir cambiando conforme se incorporan nuevas funcionalidades o se refactoriza el código.
