CREATE TABLE session_refresh_tokens (
    id uuid PRIMARY KEY,
    session_id uuid NOT NULL REFERENCES user_sessions (id) ON DELETE CASCADE,
    token_hash bytea NOT NULL UNIQUE,
    csrf_hash bytea NOT NULL,
    issued_at timestamptz NOT NULL DEFAULT now(),
    consumed_at timestamptz,
    CONSTRAINT session_refresh_tokens_hash_size CHECK (
        octet_length(token_hash) = 32 AND octet_length(csrf_hash) = 32
    )
);

CREATE INDEX session_refresh_tokens_session_idx
    ON session_refresh_tokens (session_id, issued_at DESC);
CREATE UNIQUE INDEX session_refresh_tokens_one_active_idx
    ON session_refresh_tokens (session_id)
    WHERE consumed_at IS NULL;

INSERT INTO session_refresh_tokens (id, session_id, token_hash, csrf_hash)
SELECT gen_random_uuid(), id, token_hash, csrf_hash
FROM user_sessions
WHERE revoked_at IS NULL;
