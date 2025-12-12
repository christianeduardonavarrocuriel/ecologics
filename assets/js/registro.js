// JavaScript específico para registro.html

// Configuración de validación
const validationConfig = {
    email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Correo electrónico inválido'
    },
    phone: {
        pattern: /^[0-9]{10}$/,
        message: 'El teléfono debe tener 10 dígitos'
    },
    password: {
        minLength: 8,
        message: 'La contraseña debe tener al menos 8 caracteres'
    }
};

// Función para inicializar la página de registro
function initRegisterPage() {
    const registerForm = document.getElementById('registerForm');
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const successMessage = document.querySelector('.success-message');
    const serverError = document.querySelector('.server-error');
    const submitButton = registerForm ? registerForm.querySelector('button[type="submit"]') : null;

    // Toggle password visibility
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    }

    if (toggleConfirmPassword && confirmPasswordInput) {
        toggleConfirmPassword.addEventListener('click', function() {
            const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            confirmPasswordInput.setAttribute('type', type);
            this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    }

    // Función para mostrar error
    function showError(inputId, message) {
        const input = document.getElementById(inputId);
        const errorText = input.parentElement.querySelector('.error-text');
        
        if (input) input.classList.add('error');
        if (errorText) {
            errorText.textContent = message;
            errorText.classList.add('show');
        }
    }

    // Función para limpiar error
    function clearError(inputId) {
        const input = document.getElementById(inputId);
        const errorText = input.parentElement.querySelector('.error-text');
        
        if (input) input.classList.remove('error');
        if (errorText) errorText.classList.remove('show');
    }

    function showBanner(element, message) {
        if (!element) return;
        const span = element.querySelector('span');
        if (span) {
            span.textContent = message;
        }
        element.classList.add('show');
    }

    function hideBanner(element) {
        if (element) {
            element.classList.remove('show');
        }
    }

    // Validación en tiempo real para email
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            const value = this.value.trim();
            if (value && !validationConfig.email.pattern.test(value)) {
                showError('email', validationConfig.email.message);
            } else {
                clearError('email');
            }
        });

        emailInput.addEventListener('input', function() {
            if (this.classList.contains('error')) {
                clearError('email');
            }
        });
    }

    // Validación en tiempo real para teléfono
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('blur', function() {
            const value = this.value.trim();
            if (value && !validationConfig.phone.pattern.test(value)) {
                showError('phone', validationConfig.phone.message);
            } else {
                clearError('phone');
            }
        });

        phoneInput.addEventListener('input', function() {
            // Solo permitir números
            this.value = this.value.replace(/[^0-9]/g, '');
            if (this.classList.contains('error')) {
                clearError('phone');
            }
        });
    }

    // Validación de contraseña
    if (passwordInput) {
        passwordInput.addEventListener('blur', function() {
            const value = this.value;
            if (value && value.length < validationConfig.password.minLength) {
                showError('password', validationConfig.password.message);
            } else {
                clearError('password');
            }
        });

        passwordInput.addEventListener('input', function() {
            if (this.classList.contains('error')) {
                clearError('password');
            }
            // Validar coincidencia de contraseñas si ya hay algo en confirmar
            if (confirmPasswordInput && confirmPasswordInput.value) {
                validatePasswordMatch();
            }
        });
    }

    // Validación de confirmación de contraseña
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', function() {
            validatePasswordMatch();
        });

        confirmPasswordInput.addEventListener('blur', function() {
            validatePasswordMatch();
        });
    }

    function validatePasswordMatch() {
        if (passwordInput && confirmPasswordInput) {
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (confirmPassword && password !== confirmPassword) {
                showError('confirmPassword', 'Las contraseñas no coinciden');
            } else {
                clearError('confirmPassword');
            }
        }
    }

    // Handle form submission
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();

            hideBanner(serverError);
            hideBanner(successMessage);

            // Limpiar errores previos
            ['fullName', 'email', 'phone', 'address', 'password', 'confirmPassword'].forEach(clearError);

            let hasErrors = false;

            // Validar nombre completo
            const fullName = document.getElementById('fullName').value.trim();
            if (!fullName) {
                showError('fullName', 'El nombre es requerido');
                hasErrors = true;
            }

            // Validar email
            const email = emailInput.value.trim();
            if (!email) {
                showError('email', 'El correo electrónico es requerido');
                hasErrors = true;
            } else if (!validationConfig.email.pattern.test(email)) {
                showError('email', validationConfig.email.message);
                hasErrors = true;
            }

            // Validar teléfono
            const phone = phoneInput.value.trim();
            if (!phone) {
                showError('phone', 'El teléfono es requerido');
                hasErrors = true;
            } else if (!validationConfig.phone.pattern.test(phone)) {
                showError('phone', validationConfig.phone.message);
                hasErrors = true;
            }

            // Validar dirección
            const address = document.getElementById('address').value.trim();
            if (!address) {
                showError('address', 'La dirección es requerida');
                hasErrors = true;
            }

            // Validar contraseña
            const password = passwordInput.value;
            if (!password) {
                showError('password', 'La contraseña es requerida');
                hasErrors = true;
            } else if (password.length < validationConfig.password.minLength) {
                showError('password', validationConfig.password.message);
                hasErrors = true;
            }

            // Validar confirmación de contraseña
            const confirmPassword = confirmPasswordInput.value;
            if (!confirmPassword) {
                showError('confirmPassword', 'Debe confirmar la contraseña');
                hasErrors = true;
            } else if (password !== confirmPassword) {
                showError('confirmPassword', 'Las contraseñas no coinciden');
                hasErrors = true;
            }

            // Validar términos y condiciones
            const termsCheckbox = document.getElementById('terms');
            if (!termsCheckbox.checked) {
                showError('terms', 'Debe aceptar los términos y condiciones');
                hasErrors = true;
            }

            if (hasErrors) {
                return;
            }

            const payload = {
                fullName,
                email,
                phone,
                address,
                password
            };

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.classList.add('loading');
            }

            fetch('/registro', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
            .then(async (response) => {
                const data = await response.json();
                if (!response.ok || !data.success) {
                    const message = data && data.message ? data.message : 'No se pudo completar el registro.';
                    showBanner(serverError, message);
                    return;
                }

                showBanner(successMessage, '¡Registro exitoso! Redirigiendo a inicio de sesión...');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1800);
            })
            .catch(() => {
                showBanner(serverError, 'No se pudo conectar con el servidor. Inténtalo de nuevo.');
            })
            .finally(() => {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.classList.remove('loading');
                }
            });
        });
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initRegisterPage);
