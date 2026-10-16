ALTER TABLE users
    ADD COLUMN daily_goal_minutes INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN current_streak INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN longest_streak INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN last_goal_completed_date DATE,
    ADD CONSTRAINT users_daily_goal_positive CHECK (daily_goal_minutes > 0),
    ADD CONSTRAINT users_current_streak_non_negative CHECK (current_streak >= 0),
    ADD CONSTRAINT users_longest_streak_non_negative CHECK (longest_streak >= 0),
    ADD CONSTRAINT users_streak_order CHECK (longest_streak >= current_streak);