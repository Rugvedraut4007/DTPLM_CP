CREATE TABLE assessments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    asset_id BIGINT NOT NULL,
    score_percentage NUMERIC(5, 2) NOT NULL,
    max_sell_percentage NUMERIC(5, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_assessments_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_assessments_asset FOREIGN KEY (asset_id) REFERENCES assets (id),
    CONSTRAINT assessments_score_range CHECK (score_percentage >= 0 AND score_percentage <= 100),
    CONSTRAINT assessments_max_sell_range CHECK (max_sell_percentage >= 0 AND max_sell_percentage <= 100)
);

CREATE INDEX idx_assessments_user ON assessments (user_id);
CREATE INDEX idx_assessments_user_asset_created ON assessments (user_id, asset_id, created_at);