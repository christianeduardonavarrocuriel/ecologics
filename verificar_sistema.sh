#!/bin/bash
# Script de verificación para EcoRecolección con Mapbox

echo "🔍 Iniciando verificación del sistema..."
echo ""

# Verificar Python
echo "1️⃣  Verificando Python..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "   ✅ $PYTHON_VERSION"
else
    echo "   ❌ Python no encontrado"
    exit 1
fi

echo ""
echo "2️⃣  Verificando dependencias Python..."

# Verificar Flask
if python3 -c "import flask" 2>/dev/null; then
    echo "   ✅ Flask instalado"
else
    echo "   ❌ Flask no instalado"
fi

# Verificar python-dotenv
if python3 -c "import dotenv" 2>/dev/null; then
    echo "   ✅ python-dotenv instalado"
else
    echo "   ❌ python-dotenv no instalado"
fi

# Verificar Werkzeug
if python3 -c "import werkzeug" 2>/dev/null; then
    echo "   ✅ Werkzeug instalado"
else
    echo "   ❌ Werkzeug no instalado"
fi

echo ""
echo "3️⃣  Verificando archivos de configuración..."

# Verificar .env
if [ -f "/workspaces/ecologics/.env" ]; then
    echo "   ✅ Archivo .env existe"
    # Verificar si tiene MAPBOX_TOKEN
    if grep -q "MAPBOX_TOKEN" /workspaces/ecologics/.env; then
        echo "   ✅ MAPBOX_TOKEN configurado"
    else
        echo "   ⚠️  MAPBOX_TOKEN no encontrado en .env"
    fi
else
    echo "   ❌ Archivo .env no existe"
fi

# Verificar .env.example
if [ -f "/workspaces/ecologics/.env.example" ]; then
    echo "   ✅ Archivo .env.example existe"
else
    echo "   ⚠️  Archivo .env.example no existe"
fi

echo ""
echo "4️⃣  Verificando estructura de archivos..."

# Verificar archivos principales
FILES=(
    "/workspaces/ecologics/app.py"
    "/workspaces/ecologics/requirements.txt"
    "/workspaces/ecologics/base_de_datos.sql"
    "/workspaces/ecologics/static/mapas.js"
    "/workspaces/ecologics/templates/panel_recolector.html"
    "/workspaces/ecologics/templates/usuario_mejorado.html"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $(basename $file) existe"
    else
        echo "   ❌ $(basename $file) NO existe"
    fi
done

echo ""
echo "5️⃣  Verificando contenido de archivos..."

# Verificar que app.py tiene load_dotenv
if grep -q "from dotenv import load_dotenv" /workspaces/ecologics/app.py; then
    echo "   ✅ app.py importa dotenv"
else
    echo "   ❌ app.py no importa dotenv"
fi

# Verificar que app.py tiene el endpoint de Mapbox
if grep -q "def get_mapbox_token" /workspaces/ecologics/app.py; then
    echo "   ✅ app.py tiene endpoint /api/config/mapbox-token"
else
    echo "   ❌ app.py NO tiene endpoint de Mapbox"
fi

# Verificar que mapas.js existe y tiene funciones
if grep -q "function initSolicitudesMap" /workspaces/ecologics/static/mapas.js; then
    echo "   ✅ mapas.js tiene initSolicitudesMap"
else
    echo "   ❌ mapas.js NO tiene initSolicitudesMap"
fi

if grep -q "function initSeguimientoMap" /workspaces/ecologics/static/mapas.js; then
    echo "   ✅ mapas.js tiene initSeguimientoMap"
else
    echo "   ❌ mapas.js NO tiene initSeguimientoMap"
fi

if grep -q "function initRutasMap" /workspaces/ecologics/static/mapas.js; then
    echo "   ✅ mapas.js tiene initRutasMap"
else
    echo "   ❌ mapas.js NO tiene initRutasMap"
fi

echo ""
echo "6️⃣  Verificando que templates usan Mapbox..."

if grep -q "mapbox-gl-js" /workspaces/ecologics/templates/panel_recolector.html; then
    echo "   ✅ panel_recolector.html incluye Mapbox GL JS"
else
    echo "   ❌ panel_recolector.html NO incluye Mapbox GL JS"
fi

if grep -q "mapas.js" /workspaces/ecologics/templates/panel_recolector.html; then
    echo "   ✅ panel_recolector.html carga mapas.js"
else
    echo "   ❌ panel_recolector.html NO carga mapas.js"
fi

if grep -q "mapbox-gl-js" /workspaces/ecologics/templates/usuario_mejorado.html; then
    echo "   ✅ usuario_mejorado.html incluye Mapbox GL JS"
else
    echo "   ❌ usuario_mejorado.html NO incluye Mapbox GL JS"
fi

if grep -q "mapas.js" /workspaces/ecologics/templates/usuario_mejorado.html; then
    echo "   ✅ usuario_mejorado.html carga mapas.js"
else
    echo "   ❌ usuario_mejorado.html NO carga mapas.js"
fi

echo ""
echo "7️⃣  Verificando que requirements.txt está actualizado..."

if grep -q "python-dotenv" /workspaces/ecologics/requirements.txt; then
    echo "   ✅ requirements.txt incluye python-dotenv"
else
    echo "   ❌ requirements.txt NO incluye python-dotenv"
fi

echo ""
echo "8️⃣  Verificando documentación..."

if [ -f "/workspaces/ecologics/CONFIGURACION_MAPBOX.md" ]; then
    echo "   ✅ CONFIGURACION_MAPBOX.md existe"
else
    echo "   ❌ CONFIGURACION_MAPBOX.md NO existe"
fi

if [ -f "/workspaces/ecologics/RESUMEN_IMPLEMENTACION.md" ]; then
    echo "   ✅ RESUMEN_IMPLEMENTACION.md existe"
else
    echo "   ❌ RESUMEN_IMPLEMENTACION.md NO existe"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ Verificación completada"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Próximos pasos:"
echo "1. Ejecuta: cd /workspaces/ecologics && python app.py"
echo "2. Abre: http://localhost:5000/panel-recolector"
echo "3. Verifica que los mapas se cargan correctamente"
echo ""
