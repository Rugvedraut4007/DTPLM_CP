INSERT INTO assets (
    symbol,
    name,
    description,
    branch,
    category,
    global_importance,
    opening_price,
    current_price,
    status,
    created_at
)
VALUES
    ('DSA', 'Data Structures & Algorithms', NULL, 'Computer Science', 'Core', 10, 0.0500, 0.0500, 'ACTIVE', CURRENT_TIMESTAMP),
    ('DBMS', 'Database Management Systems', NULL, 'Computer Science', 'Core', 9, 0.0450, 0.0450, 'ACTIVE', CURRENT_TIMESTAMP),
    ('OS', 'Operating Systems', NULL, 'Computer Science', 'Core', 9, 0.0450, 0.0450, 'ACTIVE', CURRENT_TIMESTAMP),
    ('CN', 'Computer Networks', NULL, 'Computer Science', 'Core', 8, 0.0400, 0.0400, 'ACTIVE', CURRENT_TIMESTAMP),
    ('OOP', 'Object-Oriented Programming', NULL, 'Computer Science', 'Core', 8, 0.0400, 0.0400, 'ACTIVE', CURRENT_TIMESTAMP),
    ('COA', 'Computer Organization & Architecture', NULL, 'Computer Science', 'Core', 7, 0.0350, 0.0350, 'ACTIVE', CURRENT_TIMESTAMP),
    ('TOC', 'Theory of Computation', NULL, 'Computer Science', 'Core', 7, 0.0350, 0.0350, 'ACTIVE', CURRENT_TIMESTAMP),
    ('AI', 'Artificial Intelligence', NULL, 'Computer Science', 'AI', 9, 0.0450, 0.0450, 'ACTIVE', CURRENT_TIMESTAMP),
    ('ML', 'Machine Learning', NULL, 'Computer Science', 'AI', 9, 0.0450, 0.0450, 'ACTIVE', CURRENT_TIMESTAMP),
    ('DL', 'Deep Learning', NULL, 'Computer Science', 'AI', 8, 0.0400, 0.0400, 'ACTIVE', CURRENT_TIMESTAMP),
    ('IS', 'Information Security', NULL, 'Computer Science', 'Core', 7, 0.0350, 0.0350, 'ACTIVE', CURRENT_TIMESTAMP),
    ('FSD', 'Full Stack Development', NULL, 'Computer Science', 'Development', 8, 0.0400, 0.0400, 'ACTIVE', CURRENT_TIMESTAMP),
    ('CLOUD', 'Cloud Computing', NULL, 'Computer Science', 'Development', 7, 0.0350, 0.0350, 'ACTIVE', CURRENT_TIMESTAMP);