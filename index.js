const loginsec = document.querySelector('.login-section');
const loginlink = document.querySelector('.login-link');
const registerlink = document.querySelector('.register-link');

//SELECCIÓN DE TODOS LOS PANELES
const registerBox = document.querySelector('.form-box.register');
const loginBox = document.querySelector('.form-box.login');
const verifyBox = document.querySelector('.form-box.verify');
const verifyLoginBox = document.querySelector('.form-box.verify-login');

//SELECCIÓN DE FORMULARIOS
const registerForm = document.querySelector('.form-box.register form');
const loginForm = document.querySelector('.form-box.login form');
const verifyForm = document.getElementById('verifyForm');
const loginVerifyForm = document.getElementById('loginVerifyForm');

let userEmail = ""; 

//FUNCIÓN MAESTRA PARA CAMBIAR VISTAS
// Esta función oculta todo primero, y solo muestra lo que le pidas, ya que el login se estaba bugueando.
function showView(viewToShow) {
    // Lista de todas las vistas posibles
    const allViews = [registerBox, loginBox, verifyBox, verifyLoginBox];

    // Ocultamos todas
    allViews.forEach(view => {
        view.style.display = 'none';
        view.style.transform = 'translateX(0)'; // Reseteamos posiciones
    });

    // Mostramos solo la deseada
    viewToShow.style.display = 'flex';
}

// EVENTOS DE NAVEGACIÓN

registerlink.addEventListener('click', () => {
    loginsec.classList.add('active');
    showView(registerBox); // Usamos la función maestra
});

loginlink.addEventListener('click', () => {
    loginsec.classList.remove('active');
    // Pequeño delay para la animación del panel deslizante
    setTimeout(() => {
        showView(loginBox); // Usamos la funcion maestra
    }, 500);
});

// LOGICA DE REGISTRO
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputs = registerForm.querySelectorAll('input');
    const nombre = inputs[0].value;
    const email = inputs[1].value;
    const password = inputs[2].value;
    userEmail = email;

    try {
        const response = await fetch('http://localhost:3000/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, email, password })
        });
        const data = await response.json();
        
        if (response.ok) {
            alert(data.message);
            showView(verifyBox); // AQUÍ CAMBIAMOS LIMPIAMENTE
        } else { alert(data.message); }
    } catch (error) { console.error(error); }
});

//VERIFICAR CÓDIGO REGISTRO
verifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('otpCode').value;
    try {
        const response = await fetch('http://localhost:3000/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail, code })
        });
        if (response.ok) {
            alert("Cuenta verificada. Inicia sesión.");
            loginlink.click(); // Simula click para ir al login
        } else { alert("Código incorrecto"); }
    } catch (error) { console.error(error); }
});

//LÓGICA DE LOGIN
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputs = loginForm.querySelectorAll('input');
    const email = inputs[0].value;
    const password = inputs[1].value;
    userEmail = email;

    try {
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();

        if (response.status === 403) {
            alert("⛔ " + data.message);
        } else if (response.ok && data.requireMFA) {
            alert("🔒 Credenciales correctas. Enviando código...");
            
            // LA CORRECCIÓN CLAVE ESTÁ AQUÍ:
            showView(verifyLoginBox); // Oculta loginBox y muestra verifyLoginBox
            
        } else {
            alert("⚠️ " + data.message);
        }

    } catch (error) { console.error(error); }
});

//VERIFICAR CÓDIGO LOGIN (2FA)
loginVerifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('loginOtpCode').value;

    try {
        const response = await fetch('http://localhost:3000/login-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail, code })
        });
        const data = await response.json();

        if (response.ok) {
            alert(" " + data.message);
            
        } else {
            alert(" " + data.message);
        }
    } catch (error) { console.error(error); }
});