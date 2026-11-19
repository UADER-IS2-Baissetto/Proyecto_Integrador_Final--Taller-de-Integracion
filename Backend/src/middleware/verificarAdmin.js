
const verificarAdmin = (req, res, next) => {
    if (!req.usuario) {
        return res.status(401).json({
            mensaje: "Debe iniciar sesión"
        });
    }

    if (req.usuario.rol !== "admin") {
        return res.status(403).json({
            mensaje: "No tiene permisos para realizar esta operación"
        });
    }

    next();
};

module.exports = verificarAdmin;
