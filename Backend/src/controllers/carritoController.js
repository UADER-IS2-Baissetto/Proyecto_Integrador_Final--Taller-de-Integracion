
const pool = require("../config/db");

// Busca el carrito válido del cliente o crea uno.
const obtenerOCrearCarrito = async (conexion, idCliente) => {
    const resultado = await conexion.query(
        `SELECT id
         FROM carrito
         WHERE idcliente = $1 AND valido = TRUE
         ORDER BY id DESC
         LIMIT 1
         FOR UPDATE`,
        [idCliente]
    );

    if (resultado.rows.length > 0) {
        return resultado.rows[0].id;
    }

    const nuevo = await conexion.query(
        `INSERT INTO carrito (idcliente, valido)
         VALUES ($1, TRUE)
         RETURNING id`,
        [idCliente]
    );

    return nuevo.rows[0].id;
};

// Obtiene el descuento de la promoción vigente más alta.
// Si no hay promoción, devuelve 0.
const obtenerDescuento = async (conexion, idProducto) => {
    const resultado = await conexion.query(
        `SELECT valordescuento
         FROM promo
         WHERE idproducto = $1
           AND CURRENT_DATE BETWEEN fechainicio AND fechafin
         ORDER BY valordescuento DESC
         LIMIT 1`,
        [idProducto]
    );

    if (resultado.rows.length === 0) {
        return 0;
    }

    const descuento = Number(resultado.rows[0].valordescuento);

    if (!Number.isFinite(descuento) || descuento <= 0 || descuento > 100) {
        throw new Error("DESCUENTO_PROMOCIONAL_INVALIDO");
    }

    return descuento;
};

// Consulta el carrito del usuario autenticado.
const obtenerCarrito = async (req, res) => {
    try {
        const idCliente = req.usuario.id;

        const carritoResultado = await pool.query(
            `SELECT id
             FROM carrito
             WHERE idcliente = $1 AND valido = TRUE
             ORDER BY id DESC
             LIMIT 1`,
            [idCliente]
        );

        if (carritoResultado.rows.length === 0) {
            return res.status(200).json({
                carrito: null,
                productos: [],
                total: "0"
            });
        }

        const idCarrito = carritoResultado.rows[0].id;

        const resultado = await pool.query(
            `SELECT
                cp.id AS id_item,
                cp.idproducto,
                p.nombre,
                p.cantidad AS bombones_por_caja,
                p.precio AS precio_unitario,
                cp.unidades,
                cp.descuento,
                cp.subtotal,
                p.stock,
                p.disponibilidad,
                s.nombre AS sabor
             FROM carritoproducto cp
             JOIN producto p ON p.id = cp.idproducto
             LEFT JOIN sabor s ON s.id = p.id_sabor
             WHERE cp.idcarrito = $1
             ORDER BY cp.id`,
            [idCarrito]
        );

        const totalResultado = await pool.query(
            `SELECT COALESCE(SUM(subtotal), 0) AS total
             FROM carritoproducto
             WHERE idcarrito = $1`,
            [idCarrito]
        );

        return res.status(200).json({
            carrito: { id: idCarrito },
            productos: resultado.rows,
            total: totalResultado.rows[0].total
        });
    } catch (error) {
        console.error("Error al consultar el carrito:", error);

        return res.status(500).json({
            mensaje: "Error interno al consultar el carrito"
        });
    }
};

// Agrega un producto al carrito.
// Si ya existe, suma las unidades solicitadas a las que tenía.
const agregarProducto = async (req, res) => {
    const idProducto = Number(req.body.idproducto);
    const unidades = Number(req.body.unidades);

    if (!Number.isInteger(idProducto) || idProducto <= 0) {
        return res.status(400).json({
            mensaje: "El ID del producto debe ser un entero positivo"
        });
    }

    if (!Number.isInteger(unidades) || unidades <= 0) {
        return res.status(400).json({
            mensaje: "Las unidades deben ser un entero positivo"
        });
    }

    const conexion = await pool.connect();

    try {
        await conexion.query("BEGIN");

        const idCliente = req.usuario.id;
        const idCarrito = await obtenerOCrearCarrito(conexion, idCliente);

        const productoResultado = await conexion.query(
            `SELECT id, nombre, precio, stock, disponibilidad
             FROM producto
             WHERE id = $1
             FOR UPDATE`,
            [idProducto]
        );

        if (productoResultado.rows.length === 0) {
            await conexion.query("ROLLBACK");
            return res.status(404).json({
                mensaje: "El producto no existe"
            });
        }

        const producto = productoResultado.rows[0];

        if (!producto.disponibilidad) {
            await conexion.query("ROLLBACK");
            return res.status(400).json({
                mensaje: "El producto no está disponible"
            });
        }

        const existente = await conexion.query(
            `SELECT id, unidades
             FROM carritoproducto
             WHERE idcarrito = $1 AND idproducto = $2
             LIMIT 1
             FOR UPDATE`,
            [idCarrito, idProducto]
        );

        const unidadesFinales = existente.rows.length > 0
            ? Number(existente.rows[0].unidades) + unidades
            : unidades;

        if (unidadesFinales > Number(producto.stock)) {
            await conexion.query("ROLLBACK");
            return res.status(400).json({
                mensaje: "Stock insuficiente",
                stockDisponible: Number(producto.stock),
                unidadesSolicitadas: unidadesFinales
            });
        }

        const descuento = await obtenerDescuento(conexion, idProducto);
        let itemResultado;

        if (existente.rows.length > 0) {
            itemResultado = await conexion.query(
                `UPDATE carritoproducto
                 SET unidades = $1,
                     preciounitario = $2,
                     descuento = $3
                 WHERE id = $4
                 RETURNING id, idproducto, unidades,
                           preciounitario, descuento, subtotal`,
                [
                    unidadesFinales,
                    producto.precio,
                    descuento,
                    existente.rows[0].id
                ]
            );
        } else {
            itemResultado = await conexion.query(
                `INSERT INTO carritoproducto
                    (idcarrito, idproducto, unidades,
                     preciounitario, subtotal, descuento)
                 VALUES ($1, $2, $3, $4, 0, $5)
                 RETURNING id, idproducto, unidades,
                           preciounitario, descuento, subtotal`,
                [
                    idCarrito,
                    idProducto,
                    unidadesFinales,
                    producto.precio,
                    descuento
                ]
            );
        }

        await conexion.query("COMMIT");

        return res.status(200).json({
            mensaje: "Producto agregado al carrito",
            item: itemResultado.rows[0]
        });
    } catch (error) {
        await conexion.query("ROLLBACK").catch(() => {});

        console.error("Error al agregar al carrito:", error);

        if (error.message === "DESCUENTO_PROMOCIONAL_INVALIDO") {
            return res.status(400).json({
                mensaje: "La promoción tiene un descuento inválido"
            });
        }

        return res.status(500).json({
            mensaje: "Error interno al agregar el producto"
        });
    } finally {
        conexion.release();
    }
};

// Modifica la cantidad de un artículo del carrito.
const actualizarProducto = async (req, res) => {
    const idItem = Number(req.params.id);
    const unidades = Number(req.body.unidades);

    if (!Number.isInteger(idItem) || idItem <= 0) {
        return res.status(400).json({
            mensaje: "El ID del artículo debe ser un entero positivo"
        });
    }

    if (!Number.isInteger(unidades) || unidades <= 0) {
        return res.status(400).json({
            mensaje: "Las unidades deben ser un entero positivo"
        });
    }

    const conexion = await pool.connect();

    try {
        await conexion.query("BEGIN");

        const idCliente = req.usuario.id;

        const itemResultado = await conexion.query(
            `SELECT cp.id, cp.idproducto, c.id AS idcarrito
             FROM carritoproducto cp
             JOIN carrito c ON c.id = cp.idcarrito
             WHERE cp.id = $1
               AND c.idcliente = $2
               AND c.valido = TRUE
             FOR UPDATE OF cp`,
            [idItem, idCliente]
        );

        if (itemResultado.rows.length === 0) {
            await conexion.query("ROLLBACK");
            return res.status(404).json({
                mensaje: "No se encontró ese artículo en tu carrito"
            });
        }

        const item = itemResultado.rows[0];

        const productoResultado = await conexion.query(
            `SELECT id, precio, stock, disponibilidad
             FROM producto
             WHERE id = $1
             FOR UPDATE`,
            [item.idproducto]
        );

        if (productoResultado.rows.length === 0) {
            await conexion.query("ROLLBACK");
            return res.status(404).json({
                mensaje: "El producto ya no existe"
            });
        }

        const producto = productoResultado.rows[0];

        if (!producto.disponibilidad) {
            await conexion.query("ROLLBACK");
            return res.status(400).json({
                mensaje: "El producto no está disponible"
            });
        }

        if (unidades > Number(producto.stock)) {
            await conexion.query("ROLLBACK");
            return res.status(400).json({
                mensaje: "Stock insuficiente",
                stockDisponible: Number(producto.stock)
            });
        }

        const descuento = await obtenerDescuento(
            conexion,
            item.idproducto
        );

        const actualizado = await conexion.query(
            `UPDATE carritoproducto
             SET unidades = $1,
                 preciounitario = $2,
                 descuento = $3
             WHERE id = $4
             RETURNING id, idproducto, unidades,
                       preciounitario, descuento, subtotal`,
            [unidades, producto.precio, descuento, idItem]
        );

        await conexion.query("COMMIT");

        return res.status(200).json({
            mensaje: "Cantidad actualizada",
            item: actualizado.rows[0]
        });
    } catch (error) {
        await conexion.query("ROLLBACK").catch(() => {});

        console.error("Error al actualizar el carrito:", error);

        if (error.message === "DESCUENTO_PROMOCIONAL_INVALIDO") {
            return res.status(400).json({
                mensaje: "La promoción tiene un descuento inválido"
            });
        }

        return res.status(500).json({
            mensaje: "Error interno al actualizar el carrito"
        });
    } finally {
        conexion.release();
    }
};

// Quita un artículo del carrito del usuario autenticado.
const eliminarProducto = async (req, res) => {
    const idItem = Number(req.params.id);

    if (!Number.isInteger(idItem) || idItem <= 0) {
        return res.status(400).json({
            mensaje: "El ID del artículo debe ser un entero positivo"
        });
    }

    try {
        const resultado = await pool.query(
            `DELETE FROM carritoproducto cp
             USING carrito c
             WHERE cp.id = $1
               AND cp.idcarrito = c.id
               AND c.idcliente = $2
               AND c.valido = TRUE
             RETURNING cp.id`,
            [idItem, req.usuario.id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "No se encontró ese artículo en tu carrito"
            });
        }

        return res.status(200).json({
            mensaje: "Producto eliminado del carrito"
        });
    } catch (error) {
        console.error("Error al eliminar del carrito:", error);

        return res.status(500).json({
            mensaje: "Error interno al eliminar el producto"
        });
    }
};

module.exports = {
    obtenerCarrito,
    agregarProducto,
    actualizarProducto,
    eliminarProducto
};
