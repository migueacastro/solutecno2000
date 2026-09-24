-- compare_at_price a nivel de producto
--
-- Completa la desviación deliberada del modelo puro de Shopify: como `price`
-- vive en products (la mayoría de productos no tendrá variantes), el precio
-- "antes" tachado del storefront también va a nivel de producto. Las variantes
-- ya tienen su propio compare_at_price (0003) y lo conservan.
--
-- Regla de negocio en DB: el precio de referencia exige un precio base real —
-- si price_on_request es true no hay "antes/ahora" (no hay precio base).

alter table public.products
	add column compare_at_price numeric(12, 2),
	add constraint products_compare_at_requires_price
		check (
			compare_at_price is null
			or (price is not null and not price_on_request)
		);

-- Sin políticas RLS nuevas: products ya tiene su par select público/gestiona
-- del staff (0003) y la columna no introduce casos especiales.