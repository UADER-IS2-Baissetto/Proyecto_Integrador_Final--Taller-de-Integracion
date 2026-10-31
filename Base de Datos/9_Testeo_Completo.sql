----------------- TESTEO COMPLETO ----------------

-- Agregar productos al carrito del cliente 1
insert into CarritoProducto
(idcarrito, idproducto, unidades, preciounitario, subtotal, descuento)
values
(1, 4, 2, 2000, 0, 0),
(1, 5, 1, 3500, 0, 10);

-- Mostrar carrito antes de confirmar
select *
from vista_carrito_detalle
where id_carrito = 1;

-- Mostrar stock inicial
select id, nombre, stock
from Producto
where id in (4,5);

-- Confirmar compra
select confirmar_compra(1);

-- Mostrar última compra generada
select *
from Compra
where idcliente = 1
order by id desc
limit 1;

-- Mostrar detalle de la compra
select cp.*
from CompraProducto cp
where cp.idcompra =
(
    select max(id)
    from Compra
    where idcliente = 1
);

-- Mostrar stock actualizado
select id, nombre, stock
from Producto
where id in (4,5);

-- Verificar que el carrito quedó vacío
select *
from CarritoProducto
where idcarrito = 1;