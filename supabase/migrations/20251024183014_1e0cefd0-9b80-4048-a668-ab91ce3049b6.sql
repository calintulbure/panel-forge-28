-- Create backup copy of products table
CREATE TABLE products_bak AS 
SELECT * FROM products;

-- Add primary key to backup table
ALTER TABLE products_bak 
ADD PRIMARY KEY (articol_id);

-- Add unique constraints to backup table
ALTER TABLE products_bak 
ADD CONSTRAINT products_bak_articol_id_key UNIQUE (articol_id);

ALTER TABLE products_bak 
ADD CONSTRAINT products_bak_erp_product_code_key UNIQUE (erp_product_code);