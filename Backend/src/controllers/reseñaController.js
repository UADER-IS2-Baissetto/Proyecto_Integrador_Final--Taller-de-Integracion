
const pool = require("../config/db");

// Obtener las reseñas de un producto
const obtenerResenasProducto = async (req, res) => {
    try {
        const idProducto = Number(req.params.idproducto);

        if (!Number.isInteger(idProducto) || idProducto <= 0) {
            return res.status(400).json({
                mensaje: "El ID del producto no es válido"
            });
        }

        const producto = await pool.query(
            "SELECT id FROM producto WHERE id = $1",
            [idProducto]
        );

        if (producto.rows.length === 0) {
            return res.status(404).json({
                mensaje: "El producto no existe"
            });
        }

        const resultado = await pool.query(
            `SELECT
                r.id,
                r.contenido
             FROM reseña r
             WHERE r.idproducto = $1
             ORDER BY r.id DESC`,
            [idProducto]
        );

        return res.json({
            cantidad: resultado.rows.length,
            resenas: resultado.rows
        });

    } catch (error) {
        console.error("Error al obtener reseñas:", error);

        return res.status(500).json({
            mensaje: "Error al obtener las reseñas"
        });
    }
};

// Publicar una reseña
const crearResena = async (req, res) => {
    try {
        const idCliente = req.usuario.id;
        const idProducto = Number(req.body.idproducto);
        const contenido = typeof req.body.contenido === "string"
            ? req.body.contenido.trim()
            : "";

        if (!Number.isInteger(idProducto) || idProducto <= 0) {
            return res.status(400).json({
                mensaje: "Debe indicar un producto válido"
            });
        }

        if (!contenido) {
            return res.status(400).json({
                mensaje: "La reseña no puede estar vacía"
            });
        }

        if (contenido.length > 200) {
            return res.status(400).json({
                mensaje: "La reseña no puede superar los 200 caracteres"
            });
        }

        const producto = await pool.query(
            "SELECT id FROM producto WHERE id = $1",
            [idProducto]
        );

        if (producto.rows.length === 0) {
            return res.status(404).json({
                mensaje: "El producto no existe"
            });
        }

        const resultado = await pool.query(
            `INSERT INTO reseña (idcliente, idproducto, contenido)
             VALUES ($1, $2, $3)
             RETURNING id, contenido`,
            [idCliente, idProducto, contenido]
        );

        return res.status(201).json({
            mensaje: "Reseña publicada correctamente",
            resena: resultado.rows[0]
        });

    } catch (error) {
        console.error("Error al publicar reseña:", error);

        return res.status(500).json({
            mensaje: "Error al publicar la reseña"
        });
    }
};

module.exports = {
    obtenerResenasProducto,
    crearResena
};
