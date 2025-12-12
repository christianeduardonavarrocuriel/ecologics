// JavaScript específico para inicio_sesion.html

// Función para inicializar la página de inicio de sesión
function initLoginPage() {
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.querySelector('.error-message');
    const successMessage = document.querySelector('.success-message');

    // Toggle password visibility
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    }

    // Función para mostrar mensajes
    function showMessage(element, message) {
        if (element) {
            const span = element.querySelector('span');
            if (span) {
                span.textContent = message;
            }
            element.style.display = 'flex';
            element.classList.add('show');
            setTimeout(() => {
                element.classList.remove('show');
            }, 4000);
        }
    }

    // Función para ocultar mensajes
    function hideMessages() {
        if (errorMessage) {
            errorMessage.classList.remove('show');
            errorMessage.style.display = 'none';
        }
        if (successMessage) {
            successMessage.classList.remove('show');
            successMessage.style.display = 'none';
        }
    }

    // Handle form submission
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            hideMessages();

            const email = document.getElementById('email').value.trim();
            const password = passwordInput.value.trim();

            // Validación básica
            if (!email || !password) {
                showMessage(errorMessage, 'Por favor, complete todos los campos');
                return;
            }

            // Validación de email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showMessage(errorMessage, 'Por favor, ingrese un correo electrónico válido');
                return;
            }

            fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            })
            .then(async (response) => {
                const data = await response.json();
                if (!response.ok || !data.success) {
                    showMessage(errorMessage, data && data.message ? data.message : 'Credenciales incorrectas.');
                    return;
                }

                showMessage(successMessage, '¡Inicio de sesión exitoso! Redirigiendo...');
                const rol = data.rol || 'usuario';
                const redirectMap = {
                    admin: '/panel-admin',
                    recolector: '/panel-recolector',
                    usuario: '/panel-usuario'
                };

                setTimeout(() => {
                    window.location.href = redirectMap[rol] || '/panel-usuario';
                }, 1200);
            })
            .catch(() => {
                showMessage(errorMessage, 'No se pudo conectar con el servidor. Intente nuevamente.');
            });
        });
    }

    // Tecla Enter para enviar formulario
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                loginForm.dispatchEvent(new Event('submit'));
            }
        });
    }

    // Ctrl+Enter también envía el formulario
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter' && loginForm) {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initLoginPage);
