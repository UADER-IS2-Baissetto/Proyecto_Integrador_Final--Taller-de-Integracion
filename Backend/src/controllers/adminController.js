
const pool = require("../config/db");

// Consultar todos los productos
const obtenerProductosAdmin = async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT
                p.id,
                p.nombre,
                p.cantidad,
                p.disponibilidad,
                p.precio,
                p.stock,
                p.calificacion,
                p.edicionespecial,
                p.id_sabor,
                p.imagen,
                s.nombre AS sabor
             FROM producto p
             LEFT JOIN sabor s ON s.id = p.id_sabor
             ORDER BY p.id`
        );

        return res.json({
            cantidad: resultado.rows.length,
            productos: resultado.rows
        });
    } catch (error) {
        console.error("Error al consultar productos:", error);
        return res.status(500).json({
            mensaje: "Error al consultar los productos"
        });
    }
};

// Crear un producto
const crearProducto = async (req, res) => {
    try {
        const {
            nombre,
            cantidad,
            precio,
            stock,
            id_sabor,
            imagen,
            edicionespecial
        } = req.body;

        const cantidadNumero = Number(cantidad);
        const precioNumero = Number(precio);
        const stockNumero = Number(stock);
        const idSaborNumero = Number(id_sabor);

        if (
            !nombre ||
            !Number.isInteger(cantidadNumero) ||
            ![6, 12, 24].includes(cantidadNumero) ||
            !Number.isFinite(precioNumero) ||
            precioNumero <= 0 ||
            !Number.isInteger(stockNumero) ||
            stockNumero < 0 ||
            !Number.isInteger(idSaborNumero) ||
            idSaborNumero <= 0
        ) {
            return res.status(400).json({
                mensaje: "Los datos del producto son inválidos"
            });
        }

        const sabor = await pool.query(
            "SELECT id FROM sabor WHERE id = $1",
            [idSaborNumero]
        );

        if (sabor.rows.length === 0) {
            return res.status(404).json({
                mensaje: "El sabor indicado no existe"
            });
        }

        const resultado = await pool.query(
            `INSERT INTO producto
                (nombre, cantidad, disponibilidad, precio, stock,
                 calificacion, edicionespecial, id_sabor, imagen)
             VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8)
             RETURNING *`,
            [
                nombre.trim(),
                cantidadNumero,
                stockNumero > 0,
                precioNumero,
                stockNumero,
                edicionespecial === true,
                idSaborNumero,
                imagen || null
            ]
        );

        return res.status(201).json({
            mensaje: "Producto creado correctamente",
            producto: resultado.rows[0]
        });
    } catch (error) {
        console.error("Error al crear producto:", error);
        return res.status(500).json({
            mensaje: "Error al crear el producto"
        });
    }
};

// Modificar los datos de un producto
const actualizarProductoAdmin = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                mensaje: "El ID del producto no es válido"
            });
        }

        const {
            nombre,
            cantidad,
            precio,
            id_sabor,
            imagen,
            edicionespecial
        } = req.body;

        const cantidadNumero = Number(cantidad);
        const precioNumero = Number(precio);
        const idSaborNumero = Number(id_sabor);

        if (
            !nombre ||
            ![6, 12, 24].includes(cantidadNumero) ||
            !Number.isFinite(precioNumero) ||
            precioNumero <= 0 ||
            !Number.isInteger(idSaborNumero) ||
            idSaborNumero <= 0
        ) {
            return res.status(400).json({
                mensaje: "Los datos del producto son inválidos"
            });
        }

        const sabor = await pool.query(
            "SELECT id FROM sabor WHERE id = $1",
            [idSaborNumero]
        );

        if (sabor.rows.length === 0) {
            return res.status(404).json({
                mensaje: "El sabor indicado no existe"
            });
        }

        const resultado = await pool.query(
            `UPDATE producto
             SET nombre = $1,
                 cantidad = $2,
                 precio = $3,
                 id_sabor = $4,
                 imagen = $5,
                 edicionespecial = $6
             WHERE id = $7
             RETURNING *`,
            [
                nombre.trim(),
                cantidadNumero,
                precioNumero,
                idSaborNumero,
                imagen || null,
                edicionespecial === true,
                id
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "El producto no existe"
            });
        }

        return res.json({
            mensaje: "Producto actualizado correctamente",
            producto: resultado.rows[0]
        });
    } catch (error) {
        console.error("Error al actualizar producto:", error);
        return res.status(500).json({
            mensaje: "Error al actualizar el producto"
        });
    }
};

// Cambiar disponibilidad de un producto
const cambiarDisponibilidad = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { disponibilidad } = req.body;

        if (
            !Number.isInteger(id) ||
            id <= 0 ||
            typeof disponibilidad !== "boolean"
        ) {
            return res.status(400).json({
                mensaje: "Los datos enviados no son válidos"
            });
        }

        const resultado = await pool.query(
            `UPDATE producto
             SET disponibilidad = $1
             WHERE id = $2
             RETURNING id, nombre, disponibilidad`,
            [disponibilidad, id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "El producto no existe"
            });
        }

        return res.json({
            mensaje: "Disponibilidad actualizada correctamente",
            producto: resultado.rows[0]
        });
    } catch (error) {
        console.error("Error al cambiar disponibilidad:", error);
        return res.status(500).json({
            mensaje: "Error al cambiar la disponibilidad"
        });
    }
};

// Dar de baja un producto sin eliminarlo de la base
const darDeBajaProducto = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                mensaje: "El ID del producto no es válido"
            });
        }

        const resultado = await pool.query(
            `UPDATE producto
             SET disponibilidad = FALSE
             WHERE id = $1
             RETURNING id, nombre, disponibilidad`,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "El producto no existe"
            });
        }

        return res.json({
            mensaje: "Producto dado de baja correctamente",
            producto: resultado.rows[0]
        });
    } catch (error) {
        console.error("Error al dar de baja el producto:", error);
        return res.status(500).json({
            mensaje: "Error al dar de baja el producto"
        });
    }
};

// Registrar un ingreso de stock
const registrarIngreso = async (req, res) => {
    try {
        const idProducto = Number(req.body.idproducto);
        const cantidadIngreso = Number(req.body.cantidadingreso);

        if (
            !Number.isInteger(idProducto) ||
            idProducto <= 0 ||
            !Number.isInteger(cantidadIngreso) ||
            cantidadIngreso <= 0
        ) {
            return res.status(400).json({
                mensaje: "El producto y la cantidad de ingreso deben ser válidos"
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

        const conexion = await pool.connect();

        try {
            await conexion.query("BEGIN");

            const ingreso = await conexion.query(
                `INSERT INTO ingreso
                    (idproducto, fechaentrada, cantidadingreso)
                 VALUES ($1, CURRENT_DATE, $2)
                 RETURNING *`,
                [idProducto, cantidadIngreso]
            );

            // El trigger trg_actualizar_stock_ingreso aumenta el stock.
            const stock = await conexion.query(
                "SELECT stock FROM producto WHERE id = $1",
                [idProducto]
            );

            await conexion.query("COMMIT");

            return res.status(201).json({
                mensaje: "Ingreso registrado correctamente",
                ingreso: ingreso.rows[0],
                stock_actual: stock.rows[0].stock
            });
        } catch (error) {
            await conexion.query("ROLLBACK").catch(() => {
            });
            throw error;
        } finally {
            conexion.release();
        }
    } catch (error) {
        console.error("Error al registrar ingreso:", error);
        return res.status(500).json({
            mensaje: "Error al registrar el ingreso de stock"
        });
    }
};

// Consultar compras de todos los clientes
const obtenerComprasAdmin = async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT
                c.id AS id_compra,
                c.idcliente,
                cl.nombre,
                cl.apellido,
                cl.correo,
                c.fecha,
                c.estado,
                c.total,
                c.descuento
             FROM compra c
             JOIN cliente cl ON cl.id = c.idcliente
             ORDER BY c.fecha DESC, c.id DESC`
        );

        return res.json({
            cantidad: resultado.rows.length,
            compras: resultado.rows
        });
    } catch (error) {
        console.error("Error al consultar compras:", error);
        return res.status(500).json({
            mensaje: "Error al consultar las compras"
        });
    }
};

// Consultar el detalle de una compra
const obtenerCompraAdminPorId = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                mensaje: "El ID de la compra no es válido"
            });
        }

        const compra = await pool.query(
            `SELECT
                c.id AS id_compra,
                c.idcliente,
                cl.nombre,
                cl.apellido,
                cl.correo,
                c.fecha,
                c.estado,
                c.total,
                c.descuento
             FROM compra c
             JOIN cliente cl ON cl.id = c.idcliente
             WHERE c.id = $1`,
            [id]
        );

        if (compra.rows.length === 0) {
            return res.status(404).json({
                mensaje: "La compra no existe"
            });
        }

        const productos = await pool.query(
            `SELECT
                cp.id,
                cp.idproducto,
                p.nombre,
                cp.unidades,
                cp.preciounitario,
                cp.descuento,
                cp.subtotal
             FROM compraproducto cp
             JOIN producto p ON p.id = cp.idproducto
             WHERE cp.idcompra = $1
             ORDER BY cp.id`,
            [id]
        );

        return res.json({
            compra: compra.rows[0],
            productos: productos.rows
        });
    } catch (error) {
        console.error("Error al consultar detalle de compra:", error);
        return res.status(500).json({
            mensaje: "Error al consultar el detalle de la compra"
        });
    }
};

// Consultar ventas de una fecha
const obtenerVentasPorFechaAdmin = async (req, res) => {
    try {
        const { fecha } = req.query;

        if (
            typeof fecha !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
        ) {
            return res.status(400).json({
                mensaje: "Debe indicar una fecha con formato AAAA-MM-DD"
            });
        }

        const resultado = await pool.query(
            "SELECT * FROM ventas_por_fecha($1)",
            [fecha]
        );

        const total = await pool.query(
            "SELECT total_ventas_fecha($1) AS total",
            [fecha]
        );

        return res.json({
            fecha,
            cantidad: resultado.rows.length,
            ventas: resultado.rows,
            total: total.rows[0].total
        });
    } catch (error) {
        console.error("Error al consultar ventas por fecha:", error);
        return res.status(500).json({
            mensaje: "Error al consultar las ventas"
        });
    }
};

// Consultar estadísticas generales
const obtenerEstadisticas = async (req, res) => {
    try {
        const resumen = await pool.query(
            `SELECT
                COUNT(*) AS cantidad_compras,
                COALESCE(SUM(total) FILTER (WHERE estado = 'pagada'), 0) AS ingresos,
                COUNT(*) FILTER (WHERE estado = 'pendiente') AS compras_pendientes,
                COUNT(*) FILTER (WHERE estado = 'pagada') AS compras_pagadas
             FROM compra`
        );

        const productosVendidos = await pool.query(
            `SELECT id, nombre, total_vendido
             FROM vista_productos_vendidos
             LIMIT 5`
        );

        const sinStock = await pool.query(
            "SELECT * FROM productos_sin_stock()"
        );

        return res.json({
            resumen: resumen.rows[0],
            productos_mas_vendidos: productosVendidos.rows,
            productos_sin_stock: sinStock.rows
        });
    } catch (error) {
        console.error("Error al consultar estadísticas:", error);
        return res.status(500).json({
            mensaje: "Error al consultar las estadísticas"
        });
    }
};


// Consultar todas las promociones, incluso las vencidas
const obtenerPromosAdmin = async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT
                pr.id,
                pr.idproducto,
                pr.idproducto_complementario,
                pr.nombre,
                pr.descripcion,
                pr.fechainicio,
                pr.fechafin,
                pr.imagen,
                pr.cantidad_producto,
                pr.valordescuento,
                p.nombre AS producto,
                pc.nombre AS producto_complementario
             FROM promo pr
             JOIN producto p ON p.id = pr.idproducto
             LEFT JOIN producto pc ON pc.id = pr.idproducto_complementario
             ORDER BY pr.id DESC`
        );

        return res.json({
            cantidad: resultado.rows.length,
            promociones: resultado.rows
        });
    } catch (error) {
        console.error("Error al consultar promociones:", error);
        return res.status(500).json({
            mensaje: "Error al consultar las promociones"
        });
    }
};

// Crear una promoción
const crearPromo = async (req, res) => {
    try {
        const {
            idproducto,
            idproducto_complementario,
            nombre,
            descripcion,
            fechainicio,
            fechafin,
            imagen,
            cantidad_producto,
            valordescuento
        } = req.body;

        const idProductoNumero = Number(idproducto);

        const idComplementarioNumero = idproducto_complementario == null ||
            idproducto_complementario === ""
            ? null
            : Number(idproducto_complementario);

        const cantidadNumero = cantidad_producto == null ||
            cantidad_producto === ""
            ? null
            : Number(cantidad_producto);

        const descuentoNumero = Number(valordescuento);

        if (
            !Number.isInteger(idProductoNumero) ||
            idProductoNumero <= 0 ||
            (idComplementarioNumero !== null &&
                (!Number.isInteger(idComplementarioNumero) ||
                 idComplementarioNumero <= 0 ||
                 idComplementarioNumero === idProductoNumero)) ||
            !nombre ||
            !descripcion ||
            !fechainicio ||
            !fechafin ||
            fechafin < fechainicio ||
            (cantidadNumero !== null &&
                (!Number.isInteger(cantidadNumero) || cantidadNumero <= 0)) ||
            !Number.isFinite(descuentoNumero) ||
            descuentoNumero <= 0 ||
            descuentoNumero > 100
        ) {
            return res.status(400).json({
                mensaje: "Los datos de la promoción son inválidos"
            });
        }

        const producto = await pool.query(
            `SELECT id
             FROM producto
             WHERE id = $1`,
            [idProductoNumero]
        );

        if (producto.rows.length === 0) {
            return res.status(404).json({
                mensaje: "El producto principal no existe"
            });
        }

        if (idComplementarioNumero !== null) {
            const complementario = await pool.query(
                `SELECT id
                 FROM producto
                 WHERE id = $1`,
                [idComplementarioNumero]
            );

            if (complementario.rows.length === 0) {
                return res.status(404).json({
                    mensaje: "El producto complementario no existe"
                });
            }
        }

        const resultado = await pool.query(
            `INSERT INTO promo
                (idproducto, idproducto_complementario, nombre, descripcion,
                 fechainicio, fechafin, imagen, cantidad_producto, valordescuento)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
                idProductoNumero,
                idComplementarioNumero,
                nombre.trim(),
                descripcion.trim(),
                fechainicio,
                fechafin,
                imagen || null,
                cantidadNumero,
                descuentoNumero
            ]
        );

        return res.status(201).json({
            mensaje: "Promoción creada correctamente",
            promocion: resultado.rows[0]
        });
    } catch (error) {
        console.error("Error al crear promoción:", error);
        return res.status(400).json({
            mensaje: "No se pudo crear la promoción. Revisá las fechas y los datos."
        });
    }
};

// Modificar una promoción
const actualizarPromo = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                mensaje: "El ID de la promoción no es válido"
            });
        }

        const {
            idproducto,
            idproducto_complementario,
            nombre,
            descripcion,
            fechainicio,
            fechafin,
            imagen,
            cantidad_producto,
            valordescuento
        } = req.body;

        const idProductoNumero = Number(idproducto);

        const idComplementarioNumero = idproducto_complementario == null ||
            idproducto_complementario === ""
            ? null
            : Number(idproducto_complementario);

        const cantidadNumero = cantidad_producto == null ||
            cantidad_producto === ""
            ? null
            : Number(cantidad_producto);

        const descuentoNumero = Number(valordescuento);

        if (
            !Number.isInteger(idProductoNumero) ||
            idProductoNumero <= 0 ||
            (idComplementarioNumero !== null &&
                (!Number.isInteger(idComplementarioNumero) ||
                 idComplementarioNumero <= 0 ||
                 idComplementarioNumero === idProductoNumero)) ||
            !nombre ||
            !descripcion ||
            !fechainicio ||
            !fechafin ||
            fechafin < fechainicio ||
            (cantidadNumero !== null &&
                (!Number.isInteger(cantidadNumero) || cantidadNumero <= 0)) ||
            !Number.isFinite(descuentoNumero) ||
            descuentoNumero <= 0 ||
            descuentoNumero > 100
        ) {
            return res.status(400).json({
                mensaje: "Los datos de la promoción son inválidos"
            });
        }

        const producto = await pool.query(
            "SELECT id FROM producto WHERE id = $1",
            [idProductoNumero]
        );

        if (producto.rows.length === 0) {
            return res.status(404).json({
                mensaje: "El producto principal no existe"
            });
        }

        if (idComplementarioNumero !== null) {
            const complementario = await pool.query(
                "SELECT id FROM producto WHERE id = $1",
                [idComplementarioNumero]
            );

            if (complementario.rows.length === 0) {
                return res.status(404).json({
                    mensaje: "El producto complementario no existe"
                });
            }
        }

        const resultado = await pool.query(
            `UPDATE promo
             SET idproducto = $1,
                 idproducto_complementario = $2,
                 nombre = $3,
                 descripcion = $4,
                 fechainicio = $5,
                 fechafin = $6,
                 imagen = $7,
                 cantidad_producto = $8,
                 valordescuento = $9
             WHERE id = $10
             RETURNING *`,
            [
                idProductoNumero,
                idComplementarioNumero,
                nombre.trim(),
                descripcion.trim(),
                fechainicio,
                fechafin,
                imagen || null,
                cantidadNumero,
                descuentoNumero,
                id
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "La promoción no existe"
            });
        }

        return res.json({
            mensaje: "Promoción actualizada correctamente",
            promocion: resultado.rows[0]
        });
    } catch (error) {
        console.error("Error al actualizar promoción:", error);
        return res.status(400).json({
            mensaje: "No se pudo actualizar la promoción. Revisá los datos y las fechas."
        });
    }
};

// Eliminar una promoción
const eliminarPromo = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                mensaje: "El ID de la promoción no es válido"
            });
        }

        const resultado = await pool.query(
            "DELETE FROM promo WHERE id = $1 RETURNING id",
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "La promoción no existe"
            });
        }

        return res.json({
            mensaje: "Promoción eliminada correctamente"
        });
    } catch (error) {
        console.error("Error al eliminar promoción:", error);
        return res.status(500).json({
            mensaje: "Error al eliminar la promoción"
        });
    }
};

module.exports = {
    obtenerProductosAdmin,
    crearProducto,
    actualizarProductoAdmin,
    cambiarDisponibilidad,
    darDeBajaProducto,
    registrarIngreso,
    obtenerComprasAdmin,
    obtenerCompraAdminPorId,
    obtenerVentasPorFechaAdmin,
    obtenerEstadisticas,
    obtenerPromosAdmin,
    crearPromo,
    actualizarPromo,
    eliminarPromo
};
