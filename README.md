# *Amargo y Dulce*
## Proyecto Final Taller Integrador

### El proyecto está dividido principalmente en:
- Frontend: HTML, CSS y JavaScript.
- Backend: Node.js + Express.
- Base de datos: PostgreSQL, pgAdmin.
- Pagos: Mercado Pago

## *Frontend*


## *Backend*
### Tecnologías utilizadas
El backend está desarrollado utilizando:  
- Node.js: Entorno de ejecución utilizado para ejecutar JavaScript del lado del servidor.  
- Express: Framework utilizado para crear el servidor HTTP y la API REST.  
- JavaScript:Lenguaje utilizado para desarrollar toda la lógica del backend.
- PostgreSQL: Base de datos utilizada por el backend.
- JWT (JSON Web Token): Utilizado para mantener la autenticación del usuario.
Cuando un usuario inicia sesión correctamente, el backend genera un token JWT que posteriormente será enviado por el frontend en las peticiones que requieran autenticación.
- bcrypt: Utilizado para almacenar las contraseñas de forma segura mediante hashes.
- La contraseña que introduce el usuario puede tener entre 8 y 30 caracteres, pero la base de datos almacena el hash generado por bcrypt, por lo que la columna contrasena utiliza VARCHAR(255).
- CORS: Permite que el frontend pueda realizar peticiones al backend desde un origen diferente.
- dotenv: Permite utilizar variables de entorno mediante el archivo .env, evitando colocar directamente en el código datos como la contraseña de PostgreSQL o la clave secreta del JWT.
- Nodemon: Herramienta utilizada durante el desarrollo para reiniciar automáticamente el servidor cuando se modifican los archivos.

### Ejecución
El servidor se ejecuta mediante:
\ ```npm run dev```
Con puerto: \
```3000```
La ruta principal: \
```GET http://localhost:3000/```
devuelve: \
```{"mensaje": "Backend de Amargo y Dulce funcionando"}```

### Registro
Endpoint:<br>
```POST /api/auth/register```
Ejemplo:<br>
```{
    "nombre": "Juan",
    "apellido": "Perez",
    "correo": "juan@gmail.com",
    "contrasena": "12345678"
}
```

### Login
Endpoint:<br>
```POST /api/auth/login```
Ejemplo:<br>
```{
    "correo": "juan@gmail.com",
    "contrasena": "12345678"
}
```
Si las credenciales son correctas, el backend devuelve:<br>
```{
    "mensaje": "Login exitoso",
    "token": "...",
    "usuario": {
        "id": 1,
        "nombre": "Juan",
        "apellido": "Perez",
        "correo": "juan@gmail.com",
        "rol": "cliente"
    }
}
```

## *Base de Datos*
### Tecnología
- La base de datos está desarrollada en: PostgreSQL
- Administrada mediante: pgAdmin 4
- Base de datos: "AmargoYDulce"
- El backend se conecta utilizando el driver: pg

### Tablas Principales (omitiendo las auxiliares)
- Cliente
- Localidad
- Direccion
- Sabor
- Producto
- Carrito
- CarritoProducto
- Compra
- CompraProducto
- Reseña
- Favorito
- Promo
- Ingreso

### Restricciones principales
La BD utiliza claves primarias, claves foráneas y restricciones CHECK como:
- precio > 0
- stock >= 0
- calificacion >= 0 AND calificacion <= 5
- unidades > 0
- descuento >= 0 AND descuento <= 100

### Usuarios
- admin_user: con control total del sistema
- cliente_user: con permisos limitados a las transacciones básicas
