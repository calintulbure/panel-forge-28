-- Reset the sequence to the correct value
SELECT setval('products_resources_resource_id_seq', (SELECT COALESCE(MAX(resource_id), 0) + 1 FROM products_resources), false);