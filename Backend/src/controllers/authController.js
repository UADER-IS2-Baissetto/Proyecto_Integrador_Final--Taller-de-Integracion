const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {

    try {

        const {
            nombre,
            apellido,
            correo,
            contrasena
        } = req.body;

        const existe = await pool.query(
            `
            SELECT *
            FROM cliente
            WHERE correo = $1
            `,
            [correo]
        );

        if (existe.rows.length > 0) {
            return res.status(400).json({
                mensaje: "El correo ya existe"
            });
        }

        const passwordHash =
            await bcrypt.hash(contrasena, 10);

        const nuevoCliente = await pool.query(
            `
            INSERT INTO cliente
            (
                nombre,
                apellido,
                correo,
                contrasena
            )
            VALUES
            ($1,$2,$3,$4)
            RETURNING *
            `,
            [
                nombre,
                apellido,
                correo,
                passwordHash
            ]
        );

        res.status(201).json({
            mensaje: "Usuario registrado",
            usuario: nuevoCliente.rows[0]
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            mensaje: "Error del servidor"
        });

    }
};

const login = async (req, res) => {

    try {

        const {
            correo,
            contrasena
        } = req.body;

        const resultado = await pool.query(
            `
            SELECT *
            FROM cliente
            WHERE correo = $1
            `,
            [correo]
        );

        if (resultado.rows.length === 0) {

            return res.status(400).json({
                mensaje: "Usuario inexistente"
            });

        }

        const usuario = resultado.rows[0];

        const coincide =
            await bcrypt.compare(
                contrasena,
                usuario.contrasena
            );

        if (!coincide) {

            return res.status(400).json({
                mensaje: "Contraseña incorrecta"
            });

        }

        const token = jwt.sign(
            {
                id: usuario.id,
                correo: usuario.correo
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.json({
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                correo: usuario.correo
            }
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            mensaje: "Error del servidor"
        });

    }
};

module.exports = {
    register,
    login
};