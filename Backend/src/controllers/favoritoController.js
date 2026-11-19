
const pool = require("../config/db");

// Obtener los favoritos del cliente autenticado
const obtenerFavoritos = async (req, res) => {
    try {
        const idCliente = req.usuario.id;

        const resultado = await pool.query(
            `SELECT
                f.id AS id_favorito,
                p.id AS id_producto,
                p.nombre,
                p.cantidad,
                p.precio,
                p.stock,
                p.disponibilidad,
                p.calificacion,
                p.edicionespecial,
                p.imagen,
                s.nombre AS sabor
             FROM favorito f
             JOIN producto p ON p.id = f.idproducto
             LEFT JOIN sabor s ON s.id = p.id_sabor
             WHERE f.idcliente = $1
             ORDER BY f.id DESC`,
            [idCliente]
        );

        return res.json({
            cantidad: resultado.rows.length,
            favoritos: resultado.rows
        });

    } catch (error) {
        console.error("Error al obtener favoritos:", error);

        return res.status(500).json({
            mensaje: "Error al obtener los favoritos"
        });
    }
};

// Agregar un producto a favoritos
const agregarFavorito = async (req, res) => {
    try {
        const idCliente = req.usuario.id;
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
            `INSERT INTO favorito (idcliente, idproducto)
             VALUES ($1, $2)
             ON CONFLICT (idcliente, idproducto) DO NOTHING
             RETURNING id`,
            [idCliente, idProducto]
        );

        if (resultado.rows.length === 0) {
            return res.status(200).json({
                mensaje: "El producto ya estaba en favoritos"
            });
        }

        return res.status(201).json({
            mensaje: "Producto agregado a favoritos",
            id_favorito: resultado.rows[0].id
        });

    } catch (error) {
        console.error("Error al agregar favorito:", error);

        return res.status(500).json({
            mensaje: "Error al agregar el producto a favoritos"
        });
    }
};

// Eliminar un producto de favoritos
const eliminarFavorito = async (req, res) => {
    try {
        const idCliente = req.usuario.id;
        const idProducto = Number(req.params.idproducto);

        if (!Number.isInteger(idProducto) || idProducto <= 0) {
            return res.status(400).json({
                mensaje: "El ID del producto no es válido"
            });
        }

        const resultado = await pool.query(
            `DELETE FROM favorito
             WHERE idcliente = $1
               AND idproducto = $2
             RETURNING id`,
            [idCliente, idProducto]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "El producto no estaba en favoritos"
            });
        }

        return res.json({
            mensaje: "Producto eliminado de favoritos"
        });

    } catch (error) {
        console.error("Error al eliminar favorito:", error);

        return res.status(500).json({
            mensaje: "Error al eliminar el producto de favoritos"
        });
    }
};

module.exports = {
    obtenerFavoritos,
    agregarFavorito,
    eliminarFavorito
};
