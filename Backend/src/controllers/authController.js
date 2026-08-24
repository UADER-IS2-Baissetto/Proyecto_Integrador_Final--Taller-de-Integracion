const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// =====================================================
// REGISTRO
// =====================================================

const register = async (req, res) => {

    try {

        const {
            nombre,
            apellido,
            correo,
            contrasena
        } = req.body;

        // ---------------------------------------------
        // Validar campos obligatorios
        // ---------------------------------------------

        if (!nombre || !apellido || !correo || !contrasena) {

            return res.status(400).json({
                mensaje: "Todos los campos son obligatorios"
            });

        }

        // ---------------------------------------------
        // Validar longitud de contraseña
        // Mínimo: 8
        // Máximo: 30
        // ---------------------------------------------

        if (contrasena.length < 8 || contrasena.length > 30) {

            return res.status(400).json({
                mensaje: "La contraseña debe tener entre 8 y 30 caracteres"
            });

        }

        // ---------------------------------------------
        // Verificar si ya existe el correo
        // ---------------------------------------------

        const existe = await pool.query(
            `
            SELECT id
            FROM cliente
            WHERE correo = $1
            `,
            [correo]
        );

        if (existe.rows.length > 0) {

            return res.status(400).json({
                mensaje: "El correo ya está registrado"
            });

        }

        // ---------------------------------------------
        // Encriptar contraseña
        // ---------------------------------------------

        const passwordHash = await bcrypt.hash(
            contrasena,
            10
        );

        // ---------------------------------------------
        // Crear cliente
        //
        // NO enviamos rol.
        // PostgreSQL utilizará:
        //
        // rol = 'cliente'
        // ---------------------------------------------

        const resultado = await pool.query(
            `
            INSERT INTO cliente
            (
                nombre,
                apellido,
                correo,
                contrasena
            )
            VALUES
            ($1, $2, $3, $4)
            RETURNING
                id,
                nombre,
                apellido,
                correo,
                rol
            `,
            [
                nombre,
                apellido,
                correo,
                passwordHash
            ]
        );

        const usuario = resultado.rows[0];

        res.status(201).json({
            mensaje: "Usuario registrado correctamente",
            usuario: usuario
        });

    } catch (error) {

        console.error("Error en registro:", error);

        res.status(500).json({
            mensaje: "Error interno del servidor"
        });

    }
};


// =====================================================
// LOGIN
// =====================================================

const login = async (req, res) => {

    try {

        const {
            correo,
            contrasena
        } = req.body;

        // ---------------------------------------------
        // Validar campos
        // ---------------------------------------------

        if (!correo || !contrasena) {

            return res.status(400).json({
                mensaje: "Correo y contraseña son obligatorios"
            });

        }

        // ---------------------------------------------
        // Buscar usuario
        // ---------------------------------------------

        const resultado = await pool.query(
            `
            SELECT
                id,
                nombre,
                apellido,
                correo,
                contrasena,
                rol
            FROM cliente
            WHERE correo = $1
            `,
            [correo]
        );

        if (resultado.rows.length === 0) {

            return res.status(401).json({
                mensaje: "Correo o contraseña incorrectos"
            });

        }

        const usuario = resultado.rows[0];

        // ---------------------------------------------
        // Comparar contraseña con bcrypt
        // ---------------------------------------------

        const contraseñaCorrecta = await bcrypt.compare(
            contrasena,
            usuario.contrasena
        );

        if (!contraseñaCorrecta) {

            return res.status(401).json({
                mensaje: "Correo o contraseña incorrectos"
            });

        }

        // ---------------------------------------------
        // Crear JWT
        // ---------------------------------------------

        const token = jwt.sign(
            {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                correo: usuario.correo,
                rol: usuario.rol
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        // ---------------------------------------------
        // Respuesta
        // ---------------------------------------------

        res.json({
            mensaje: "Login exitoso",

            token: token,

            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                correo: usuario.correo,
                rol: usuario.rol
            }
        });

    } catch (error) {

        console.error("Error en login:", error);

        res.status(500).json({
            mensaje: "Error interno del servidor"
        });

    }
};


// =====================================================
// EXPORTAR
// =====================================================

module.exports = {
    register,
    login
};