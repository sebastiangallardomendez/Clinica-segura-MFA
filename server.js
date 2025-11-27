const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));
// Base de datos temporal
let users = {}; 

// --- CONFIGURACIÓN DEL CORREO ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'pruebaciberseguridad.doctor@gmail.com', // CORREO de prueba
        pass: 'fzum ywvx wjsf kzpa'  // CONTRASEÑA DE APLICACIÓN ENTREGADA POR GOOGLE
    }
});

// --- REGISTRO ---
app.post('/register', (req, res) => {
    const { nombre, email, password } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    users[email] = { 
        nombre, 
        password, 
        verificationCode: code, 
        verified: false,
        loginAttempts: 0,  // Intentos de contraseña fallidos
        mfaAttempts: 0,    // Intentos de código MFA fallidos
        isLocked: false,   
        loginCode: null    
    };

    console.log(`Código Registro (backup): ${code}`);

    const mailOptions = {
        from: '"Registro Clínica" <tu_correo@gmail.com>',
        to: email,
        subject: 'Verifica tu cuenta',
        text: `Tu código de registro es: ${code}`
    };

    transporter.sendMail(mailOptions, (err) => { if(err) console.log(err); });
    res.status(200).json({ message: 'Código enviado a tu correo' });
});

// --- VERIFICAR REGISTRO ---
app.post('/verify', (req, res) => {
    const { email, code } = req.body;
    if (users[email] && users[email].verificationCode === code) {
        users[email].verified = true;
        res.status(200).json({ message: 'Cuenta verificada exitosamente' });
    } else {
        res.status(400).json({ message: 'Código incorrecto' });
    }
});

// --- LOGIN (Fase 1: Contraseña) ---
// --- LOGIN (Fase 1: Contraseña) ---
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const user = users[email];

    // 1. Validar usuario
    if (!user) return res.status(400).json({ message: 'Usuario no encontrado' });

    // 2. Validar bloqueo previo
    if (user.isLocked) {
        return res.status(403).json({ message: 'CUENTA BLOQUEADA. Revisa tu correo.' });
    }

    // 3. Validar contraseña
    if (user.password !== password) {
        user.loginAttempts += 1; // Sumamos un fallo
        
        // CASO A: YA LLEGÓ AL LÍMITE (3 intentos) -> BLOQUEAR
        if (user.loginAttempts >= 3) {
            user.isLocked = true;
            
            // Alerta de Contraseña Fallida al Correo
            const mailOptions = {
                from: '"Seguridad Clínica" <tu_correo@gmail.com>',
                to: email,
                subject: ' ALERTA: Bloqueo por contraseña incorrecta',
                text: `Hola ${user.nombre}, se han detectado 3 intentos fallidos de contraseña. Tu cuenta ha sido bloqueada por seguridad.`
            };
            transporter.sendMail(mailOptions, (err) => { if(err) console.log(err); });

            return res.status(403).json({ message: ' Has excedido los intentos. CUENTA BLOQUEADA.' });
        }

        // CASO B: ES EL SEGUNDO INTENTO (ADVERTENCIA) -> NUEVO CÓDIGO AQUÍ
        if (user.loginAttempts === 2) {
            return res.status(401).json({ 
                message: 'Es tu último intento. Si fallas de nuevo, tu cuenta se bloqueará.' 
            });
        }

        // CASO C: ES EL PRIMER ERROR
        return res.status(401).json({ 
            message: `Contraseña incorrecta. Llevas 1 fallo.` 
        });
    }

    // 4. Contraseña Correcta -> Generar MFA
    const mfaCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.loginCode = mfaCode;
    user.loginAttempts = 0; // Reseteamos fallos de pass al acertar
    user.mfaAttempts = 0;   
    
    console.log(`Código Login (backup): ${mfaCode}`);

    const mailOptions = {
        from: '"Seguridad Clínica" <tu_correo@gmail.com>',
        to: email,
        subject: ' Código de Acceso (2FA)',
        text: `Tu código para iniciar sesión es: ${mfaCode}`
    };

    transporter.sendMail(mailOptions, (err) => { if(err) console.log(err); });
    
    res.status(200).json({ message: 'Credenciales correctas. Ingresa el código enviado.', requireMFA: true });
});

// VERIFICAR LOGIN (Fase 2: Código MFA) 
app.post('/login-verify', (req, res) => {
    const { email, code } = req.body;
    const user = users[email];

    if (!user) return res.status(400).json({ message: 'Error de sesión' });

    // Verificar si ya estaba bloqueado
    if (user.isLocked) {
        return res.status(403).json({ message: 'CUENTA BLOQUEADA. Contacta a soporte.' });
    }

    // Comparar código
    if (user.loginCode === code) {
        // Login exitoso
        user.loginAttempts = 0;
        user.mfaAttempts = 0;
        user.loginCode = null; 
        res.status(200).json({ message: 'Bienvenido al sistema' });
    } else {
        // CÓDIGO INCORRECTO -> Posible Hacker
        user.mfaAttempts += 1;

        if (user.mfaAttempts >= 3) {
            user.isLocked = true; // Bloqueo inmediato
            user.loginCode = null; // Invalidamos el código actual

            // ENVIAR ALERTA CRÍTICA
            const mailOptions = {
                from: '"ALERTA DE SEGURIDAD" <tu_correo@gmail.com>',
                to: email,
                subject: 'ALERTA ROJA: Intento de Acceso No Autorizado',
                text: `URGENTE ${user.nombre}: \n\nAlguien ha ingresado tu contraseña correctamente pero falló 3 veces la verificación de código (MFA).\n\nEsto indica que un atacante podría tener tu contraseña.\n\nHemos bloqueado tu cuenta preventivamente. Por favor cambia tu contraseña inmediatamente o contacta a soporte para brindarte mas seguridad.`
            };
            transporter.sendMail(mailOptions, (err) => { if(err) console.log(err); });

            return res.status(403).json({ message: 'SEGURIDAD: Cuenta bloqueada por actividad sospechosa en MFA.' });
        }

        res.status(400).json({ message: `Código incorrecto. Intento ${user.mfaAttempts} de 3.` });
    }
});

app.listen(3000, () => {
    console.log('Servidor Seguro v3 (Anti-Hacker) corriendo en puerto 3000');
});