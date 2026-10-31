# Amargo y Dulce

## Proyecto Final – Taller Integrador

El proyecto consiste en el desarrollo de una tienda online de bombones y productos de chocolatería.

### Tecnologías principales

- **Frontend:** HTML, CSS y JavaScript.
- **Backend:** Node.js + Express.
- **Base de datos:** PostgreSQL, administrada mediante pgAdmin 4.
- **Pagos:** Mercado Pago (Checkout Pro + API de Orders).

---

## Frontend

Desarrollado con HTML, CSS y JavaScript.

La comunicación con el backend se realiza mediante peticiones HTTP a la API REST.

---

## Backend

### Tecnologías utilizadas

- **Node.js:** Entorno de ejecución de JavaScript del lado del servidor.
- **Express:** Framework utilizado para desarrollar el servidor y la API REST.
- **JavaScript:** Lenguaje utilizado para implementar la lógica del backend.
- **PostgreSQL:** Base de datos utilizada para almacenar la información del sistema.
- **pg:** Driver utilizado para conectar Node.js con PostgreSQL.
- **JWT (JSON Web Token):** Gestiona la autenticación de usuarios y protege las rutas privadas.
- **bcrypt:** Permite almacenar las contraseñas mediante hashes seguros.
- **CORS:** Habilita la comunicación entre el frontend y el backend.
- **dotenv:** Permite administrar variables de entorno mediante el archivo `.env`.
- **Nodemon:** Reinicia automáticamente el servidor durante el desarrollo.
- **Mercado Pago:** Integración para generar órdenes y procesar pagos mediante Checkout Pro y API de Orders.

Las contraseñas ingresadas por los usuarios pueden tener entre 8 y 30 caracteres. En la base de datos se almacena el hash generado por bcrypt, por lo que la columna `contrasena` utiliza `VARCHAR(255)`.

### Ejecución

- Iniciar el servidor: `npm run dev`
- Puerto: `3000`
- Ruta principal: `GET http://localhost:3000/`
- Respuesta: `{"mensaje": "Backend de Amargo y Dulce funcionando"}`

### Funcionalidades implementadas

- **Registro de usuarios:** creación de cuentas de clientes.
- **Inicio de sesión:** validación de credenciales y generación de tokens JWT.
- **Productos:** consulta del catálogo y de productos individuales.
- **Carrito:** consulta, incorporación, modificación y eliminación de productos.
- **Compras:** confirmación de pedidos, cálculo de importes y consulta del historial.
- **Control de stock:** validaciones y actualización automática mediante triggers de PostgreSQL.
- **Pagos:** generación de órdenes de pago mediante Mercado Pago.
- **Webhooks:** recepción y validación de notificaciones de Mercado Pago para actualizar el estado de las compras.

### Principales endpoints

| Método | Endpoint | Función |
|---|---|---|
| POST | `/api/auth/register` | Registrar usuario |
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/productos` | Listar productos |
| GET | `/api/productos/:id` | Consultar producto |
| GET | `/api/carrito` | Consultar carrito |
| POST | `/api/carrito/items` | Agregar producto |
| PUT | `/api/carrito/items/:id` | Modificar cantidad |
| DELETE | `/api/carrito/items/:id` | Eliminar producto |
| POST | `/api/carrito/confirmar` | Confirmar compra |
| GET | `/api/compras` | Consultar compras |
| GET | `/api/compras/:id` | Consultar detalle de compra |
| POST | `/api/compras/:id/pagar` | Generar orden de pago |
| POST | `/api/webhooks/mercadopago` | Recibir notificaciones de pago |

Las rutas del carrito y de compras requieren autenticación mediante JWT. Para acceder a ellas, el frontend debe enviar el token en el encabezado `Authorization: Bearer TOKEN`.

### Integración con Mercado Pago

Se implementó la integración mediante **Checkout Pro + API de Orders**.

El procedimiento de pago contempla:

1. Confirmación de la compra en el backend.
2. Generación de una orden de pago en Mercado Pago.
3. Obtención de la URL de checkout.
4. Redirección del cliente al entorno de pago.
5. Recepción de notificaciones mediante Webhooks.
6. Validación de la firma y consulta de la orden en Mercado Pago.
7. Actualización del estado de la compra en PostgreSQL.

Se comprobó el funcionamiento mediante una compra de prueba, verificando la acreditación del pago, la recepción del Webhook y la actualización de la compra a estado `pagada`.

Para las pruebas locales se utilizó **ngrok**, que permite exponer temporalmente el servidor local mediante una URL HTTPS pública.

---

## Base de Datos

### Tecnología

- Motor: PostgreSQL.
- Administración: pgAdmin 4.
- Base de datos: `AmargoYDulce`.
- Conexión desde Node.js mediante el driver `pg`.

### Tablas principales

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

La base de datos utiliza claves primarias, claves foráneas y restricciones `CHECK`, entre ellas:

- `precio > 0`
- `stock >= 0`
- `calificacion >= 0 AND calificacion <= 5`
- `unidades > 0`
- `descuento >= 0 AND descuento <= 100`

### Funciones y triggers

Se implementaron funciones y triggers para automatizar y controlar distintas operaciones:

- Control de stock y prevención de valores negativos.
- Actualización del stock mediante ingresos.
- Descuento automático de stock al registrar productos en una compra.
- Validación de fechas de promociones.
- Cálculo automático de subtotales en carritos y compras.
- Validación de cantidades permitidas por producto.
- Confirmación de compras mediante una función de PostgreSQL.

### Usuarios y permisos

- `admin_user`: usuario con control total del sistema.
- `cliente_user`: usuario con permisos limitados a las operaciones correspondientes a clientes.

---

## Configuración

Para ejecutar el backend es necesario configurar las variables de entorno en un archivo `.env`, incluyendo:

- Datos de conexión a PostgreSQL.
- Clave secreta para JWT.
- Access Token de Mercado Pago.
- Secreto de firma de Webhooks de Mercado Pago.

**Importante:** el archivo `.env` no debe subirse al repositorio de GitHub, ya que contiene credenciales privadas.
