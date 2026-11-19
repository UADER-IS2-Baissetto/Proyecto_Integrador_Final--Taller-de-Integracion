
const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Registrar un cliente
const register = async (req, res) => {
    try {
        const { nombre, apellido, correo, direccion, contrasena } = req.body;

        if (!nombre || !apellido || !correo || !direccion || !contrasena) {
            return res.status(400).json({
                mensaje: "Todos los campos son obligatorios"
            });
        }

        if (contrasena.length < 8 || contrasena.length > 30) {
            return res.status(400).json({
                mensaje: "La contraseña debe tener entre 8 y 30 caracteres"
            });
        }

        const correoNormalizado = correo.trim().toLowerCase();

        const usuarioExistente = await pool.query(
            "SELECT id FROM cliente WHERE LOWER(correo) = $1",
            [correoNormalizado]
        );

        if (usuarioExistente.rows.length > 0) {
            return res.status(409).json({
                mensaje: "Ya existe una cuenta con ese correo"
            });
        }

        const contrasenaHasheada = await bcrypt.hash(contrasena, 10);

        const resultado = await pool.query(
            `INSERT INTO cliente
                (nombre, apellido, correo, direccion, contrasena)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, nombre, apellido, correo, direccion, rol`,
            [
                nombre.trim(),
                apellido.trim(),
                correoNormalizado,
                direccion.trim(),
                contrasenaHasheada
            ]
        );

        return res.status(201).json({
            mensaje: "Cuenta registrada correctamente",
            usuario: resultado.rows[0]
        });

    } catch (error) {
        console.error("Error al registrar usuario:", error);

        return res.status(500).json({
            mensaje: "Error interno al registrar el usuario"
        });
    }
};

// Iniciar sesión
const login = async (req, res) => {
    try {
        const { correo, contrasena } = req.body;

        if (!correo || !contrasena) {
            return res.status(400).json({
                mensaje: "Debe ingresar correo y contraseña"
            });
        }

        const resultado = await pool.query(
            `SELECT id, nombre, apellido, correo, direccion, contrasena, rol
             FROM cliente
             WHERE LOWER(correo) = $1`,
            [correo.trim().toLowerCase()]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                mensaje: "Correo o contraseña incorrectos"
            });
        }

        const usuario = resultado.rows[0];

        const contrasenaValida = await bcrypt.compare(
            contrasena,
            usuario.contrasena
        );

        if (!contrasenaValida) {
            return res.status(401).json({
                mensaje: "Correo o contraseña incorrectos"
            });
        }

        const token = jwt.sign(
            {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                correo: usuario.correo,
                rol: usuario.rol
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.json({
            mensaje: "Inicio de sesión correcto",
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                correo: usuario.correo,
                direccion: usuario.direccion,
                rol: usuario.rol
            }
        });

    } catch (error) {
        console.error("Error al iniciar sesión:", error);

        return res.status(500).json({
            mensaje: "Error interno al iniciar sesión"
        });
    }
};

// Obtener los datos del usuario autenticado
const obtenerPerfil = async (req, res) => {
    try {
        const idCliente = req.usuario.id;

        const resultado = await pool.query(
            `SELECT id, nombre, apellido, correo, direccion, rol
             FROM cliente
             WHERE id = $1`,
            [idCliente]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado"
            });
        }

        return res.json({
            usuario: resultado.rows[0]
        });

    } catch (error) {
        console.error("Error al obtener perfil:", error);

        return res.status(500).json({
            mensaje: "Error al obtener los datos del perfil"
        });
    }
};

module.exports = {
    register,
    login,
    obtenerPerfil
};
