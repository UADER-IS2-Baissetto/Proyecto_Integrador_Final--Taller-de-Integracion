
const express = require("express");
const router = express.Router();

const {
    register,
    login,
    obtenerPerfil
} = require("../controllers/authController");

const verificarToken = require("../middleware/auth");

// Registro
router.post("/register", register);

// Login
router.post("/login", login);

// Perfil del usuario autenticado
router.get("/perfil", verificarToken, obtenerPerfil);

module.exports = router;
