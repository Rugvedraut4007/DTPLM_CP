ALTER TABLE assessments
    ADD COLUMN remaining_sell_percentage NUMERIC(5, 2) NOT NULL;

UPDATE assessments
SET remaining_sell_percentage = max_sell_percentage;

ALTER TABLE assessments
    ADD CONSTRAINT assessments_remaining_sell_range
    CHECK (remaining_sell_percentage >= 0 AND remaining_sell_percentage <= 100);