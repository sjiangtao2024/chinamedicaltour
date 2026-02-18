UPDATE service_products
SET price = 19900, updated_at = datetime('now')
WHERE item_type = 'package' AND item_id = 'pre-consultation';
