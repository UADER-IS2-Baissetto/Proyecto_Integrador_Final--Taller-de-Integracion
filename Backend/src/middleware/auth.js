const jwt = require("jsonwebtoken");

const verificarToken = (req, res, next) => {

    const authorization = req.headers.authorization;

    if (!authorization) {
        return res.status(401).json({
            mensaje: "No se proporcionó un token"
        });
    }

    // Esperamos:
    // Authorization: Bearer TOKEN

    const partes = authorization.split(" ");

    if (partes.length !== 2 || partes[0] !== "Bearer") {
        return res.status(401).json({
            mensaje: "Formato de token inválido"
        });
    }

    const token = partes[1];

    try {

        const usuario = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Guardamos los datos del usuario
        // para que los controllers puedan utilizarlos
        req.usuario = usuario;

        next();

    } catch (error) {

        return res.status(401).json({
            mensaje: "Token inválido o expirado"
        });

    }
};

module.exports = verificarToken;