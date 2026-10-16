ALTER TABLE assets
    ADD COLUMN global_importance INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN opening_price NUMERIC(19, 4) NOT NULL DEFAULT 0.0000;

UPDATE assets
SET opening_price = current_price
WHERE opening_price = 0.0000;

ALTER TABLE assets
    ADD CONSTRAINT assets_global_importance_check CHECK (global_importance BETWEEN 1 AND 10);