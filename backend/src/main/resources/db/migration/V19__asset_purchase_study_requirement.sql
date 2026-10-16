-- Learning unlocks buying: every subject asset carries the study minutes a
-- student must complete on that subject before they may buy it.
-- The requirement scales with the subject's global importance (5 + importance).
ALTER TABLE assets ADD COLUMN required_study_minutes INTEGER;
UPDATE assets SET required_study_minutes = 5 + global_importance WHERE required_study_minutes IS NULL;
ALTER TABLE assets ALTER COLUMN required_study_minutes SET NOT NULL;
