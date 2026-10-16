ALTER TABLE users
    ADD COLUMN xp BIGINT NOT NULL DEFAULT 0,
    ADD CONSTRAINT users_xp_non_negative CHECK (xp >= 0);