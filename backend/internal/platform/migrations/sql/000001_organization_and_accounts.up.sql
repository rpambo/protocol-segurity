CREATE TABLE countries (
    id uuid PRIMARY KEY,
    iso_code char(2) NOT NULL UNIQUE,
    name text NOT NULL,
    enabled boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT countries_iso_code_uppercase CHECK (iso_code = upper(iso_code)),
    CONSTRAINT countries_name_nonempty CHECK (length(trim(name)) > 0)
);

CREATE TABLE regions (
    id uuid PRIMARY KEY,
    country_id uuid NOT NULL REFERENCES countries (id) ON DELETE RESTRICT,
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT regions_name_nonempty CHECK (length(trim(name)) > 0),
    CONSTRAINT regions_id_country_unique UNIQUE (id, country_id),
    CONSTRAINT regions_country_name_unique UNIQUE (country_id, name)
);

CREATE TABLE branches (
    id uuid PRIMARY KEY,
    country_id uuid NOT NULL REFERENCES countries (id) ON DELETE RESTRICT,
    region_id uuid,
    code text,
    name text NOT NULL,
    timezone text NOT NULL DEFAULT 'UTC',
    enabled boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT branches_region_country_fk
        FOREIGN KEY (region_id, country_id)
        REFERENCES regions (id, country_id)
        ON DELETE RESTRICT,
    CONSTRAINT branches_name_nonempty CHECK (length(trim(name)) > 0),
    CONSTRAINT branches_timezone_nonempty CHECK (length(trim(timezone)) > 0),
    CONSTRAINT branches_id_country_unique UNIQUE (id, country_id),
    CONSTRAINT branches_country_name_unique UNIQUE (country_id, name)
);

CREATE TABLE accounts (
    id uuid PRIMARY KEY,
    email text NOT NULL,
    email_normalized text NOT NULL UNIQUE,
    display_name text NOT NULL,
    status text NOT NULL DEFAULT 'invited'
        CHECK (status IN ('invited', 'active', 'blocked', 'disabled')),
    preferred_language text NOT NULL DEFAULT 'en',
    timezone text NOT NULL DEFAULT 'UTC',
    email_verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    CONSTRAINT accounts_email_nonempty CHECK (length(trim(email_normalized)) > 3),
    CONSTRAINT accounts_display_name_nonempty CHECK (length(trim(display_name)) > 0),
    CONSTRAINT accounts_timezone_nonempty CHECK (length(trim(timezone)) > 0)
);

CREATE TABLE roles (
    id uuid PRIMARY KEY,
    code text NOT NULL UNIQUE,
    display_name text NOT NULL,
    is_system_role boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT roles_code_nonempty CHECK (length(trim(code)) > 0),
    CONSTRAINT roles_display_name_nonempty CHECK (length(trim(display_name)) > 0)
);

INSERT INTO roles (id, code, display_name) VALUES
    ('00000000-0000-4000-8000-000000000001', 'global_admin', 'Global Admin'),
    ('00000000-0000-4000-8000-000000000002', 'regional_admin', 'Regional Admin'),
    ('00000000-0000-4000-8000-000000000003', 'country_admin', 'Country Admin'),
    ('00000000-0000-4000-8000-000000000004', 'local_admin', 'Local Admin'),
    ('00000000-0000-4000-8000-000000000005', 'member', 'Member');

CREATE TABLE account_roles (
    account_id uuid NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    role_id uuid NOT NULL REFERENCES roles (id) ON DELETE RESTRICT,
    assigned_by uuid REFERENCES accounts (id) ON DELETE SET NULL,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (account_id, role_id)
);

CREATE TABLE account_scope_assignments (
    id uuid PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    scope_type text NOT NULL CHECK (scope_type IN ('global', 'region', 'country', 'branch')),
    country_id uuid REFERENCES countries (id) ON DELETE RESTRICT,
    region_id uuid,
    branch_id uuid,
    assigned_by uuid REFERENCES accounts (id) ON DELETE SET NULL,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT assignment_scope_shape CHECK (
        (scope_type = 'global' AND country_id IS NULL AND region_id IS NULL AND branch_id IS NULL)
        OR (scope_type = 'country' AND country_id IS NOT NULL AND region_id IS NULL AND branch_id IS NULL)
        OR (scope_type = 'region' AND country_id IS NOT NULL AND region_id IS NOT NULL AND branch_id IS NULL)
        OR (scope_type = 'branch' AND country_id IS NOT NULL AND region_id IS NULL AND branch_id IS NOT NULL)
    ),
    CONSTRAINT assignment_region_country_fk
        FOREIGN KEY (region_id, country_id)
        REFERENCES regions (id, country_id)
        ON DELETE RESTRICT,
    CONSTRAINT assignment_branch_country_fk
        FOREIGN KEY (branch_id, country_id)
        REFERENCES branches (id, country_id)
        ON DELETE RESTRICT
);

CREATE UNIQUE INDEX account_scope_assignments_unique_global
    ON account_scope_assignments (account_id)
    WHERE scope_type = 'global';
CREATE UNIQUE INDEX account_scope_assignments_unique_country
    ON account_scope_assignments (account_id, country_id)
    WHERE scope_type = 'country';
CREATE UNIQUE INDEX account_scope_assignments_unique_region
    ON account_scope_assignments (account_id, region_id)
    WHERE scope_type = 'region';
CREATE UNIQUE INDEX account_scope_assignments_unique_branch
    ON account_scope_assignments (account_id, branch_id)
    WHERE scope_type = 'branch';
CREATE INDEX account_scope_assignments_account_idx
    ON account_scope_assignments (account_id, scope_type);
CREATE INDEX branches_country_region_idx
    ON branches (country_id, region_id);
CREATE INDEX accounts_status_idx
    ON accounts (status)
    WHERE deleted_at IS NULL;

CREATE TABLE account_credentials (
    account_id uuid PRIMARY KEY REFERENCES accounts (id) ON DELETE CASCADE,
    password_hash text NOT NULL,
    password_changed_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT account_credentials_hash_nonempty CHECK (length(trim(password_hash)) > 0)
);

CREATE TABLE account_invitations (
    id uuid PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    token_hash bytea NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    accepted_at timestamptz,
    created_by uuid REFERENCES accounts (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT account_invitations_token_hash_size CHECK (octet_length(token_hash) = 32),
    CONSTRAINT account_invitations_expiry CHECK (expires_at > created_at)
);
CREATE INDEX account_invitations_account_idx ON account_invitations (account_id);

CREATE TABLE user_sessions (
    id uuid PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    token_hash bytea NOT NULL UNIQUE,
    csrf_hash bytea NOT NULL,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    user_agent text NOT NULL DEFAULT '',
    CONSTRAINT user_sessions_token_hash_size CHECK (octet_length(token_hash) = 32),
    CONSTRAINT user_sessions_csrf_hash_size CHECK (octet_length(csrf_hash) = 32)
);
CREATE INDEX user_sessions_account_expiry_idx ON user_sessions (account_id, expires_at);

CREATE TABLE audit_events (
    id uuid PRIMARY KEY,
    actor_account_id uuid REFERENCES accounts (id) ON DELETE SET NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid,
    result text NOT NULL CHECK (result IN ('success', 'denied', 'failure')),
    country_id uuid REFERENCES countries (id) ON DELETE SET NULL,
    branch_id uuid REFERENCES branches (id) ON DELETE SET NULL,
    request_id text NOT NULL,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT audit_action_nonempty CHECK (length(trim(action)) > 0),
    CONSTRAINT audit_resource_type_nonempty CHECK (length(trim(resource_type)) > 0)
);
CREATE INDEX audit_events_occurred_at_idx ON audit_events (occurred_at DESC);
CREATE INDEX audit_events_actor_occurred_idx ON audit_events (actor_account_id, occurred_at DESC);

CREATE TABLE notifications (
    id uuid PRIMARY KEY,
    recipient_account_id uuid NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    event_type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL DEFAULT '',
    target_path text NOT NULL DEFAULT '',
    resource_type text,
    resource_id uuid,
    deduplication_key text,
    created_at timestamptz NOT NULL DEFAULT now(),
    read_at timestamptz,
    expires_at timestamptz,
    CONSTRAINT notifications_event_type_nonempty CHECK (length(trim(event_type)) > 0),
    CONSTRAINT notifications_title_nonempty CHECK (length(trim(title)) > 0),
    CONSTRAINT notifications_target_local CHECK (
        target_path = '' OR (left(target_path, 1) = '/' AND left(target_path, 2) <> '//')
    )
);
CREATE INDEX notifications_recipient_created_idx
    ON notifications (recipient_account_id, created_at DESC);
CREATE INDEX notifications_unread_idx
    ON notifications (recipient_account_id, created_at DESC)
    WHERE read_at IS NULL;
CREATE UNIQUE INDEX notifications_recipient_dedup_idx
    ON notifications (recipient_account_id, deduplication_key)
    WHERE deduplication_key IS NOT NULL;

CREATE TABLE notification_preferences (
    account_id uuid NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    event_type text NOT NULL,
    in_app_enabled boolean NOT NULL DEFAULT true,
    email_enabled boolean NOT NULL DEFAULT false,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (account_id, event_type)
);

CREATE TABLE notification_outbox (
    id uuid PRIMARY KEY,
    notification_id uuid REFERENCES notifications (id) ON DELETE CASCADE,
    recipient_account_id uuid NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    channel text NOT NULL CHECK (channel IN ('email', 'push')),
    template_key text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    available_at timestamptz NOT NULL DEFAULT now(),
    sent_at timestamptz,
    last_error_code text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notification_outbox_pending_idx
    ON notification_outbox (available_at, created_at)
    WHERE status IN ('pending', 'failed');
