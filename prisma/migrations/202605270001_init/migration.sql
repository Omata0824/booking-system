-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'member');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('invited', 'active', 'disabled');

-- CreateEnum
CREATE TYPE "assignment_mode" AS ENUM ('round_robin', 'priority', 'random');

-- CreateEnum
CREATE TYPE "form_field_type" AS ENUM ('text', 'textarea', 'email', 'tel', 'checkbox', 'radio', 'select');

-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('held', 'confirmed', 'cancelled', 'rescheduled', 'completed', 'no_show', 'unconfirmed', 'failed');

-- CreateEnum
CREATE TYPE "calendar_sync_status" AS ENUM ('not_created', 'creating', 'created', 'update_pending', 'delete_pending', 'error');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "display_name" VARCHAR(120) NOT NULL,
    "image_url" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'member',
    "status" "user_status" NOT NULL DEFAULT 'invited',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Tokyo',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(32) NOT NULL DEFAULT 'google',
    "provider_account_id" VARCHAR(255) NOT NULL,
    "access_token_encrypted" TEXT,
    "refresh_token_encrypted" TEXT,
    "token_expires_at" TIMESTAMPTZ(3),
    "granted_scopes" TEXT,
    "last_refresh_error_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "google_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_connections" (
    "id" UUID NOT NULL,
    "google_account_id" UUID NOT NULL,
    "calendar_id" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(255),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "use_for_availability" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "calendar_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "assignment_mode" "assignment_mode" NOT NULL DEFAULT 'round_robin',
    "duration_minutes" INTEGER NOT NULL,
    "booking_window_days" INTEGER NOT NULL DEFAULT 30,
    "minimum_lead_hours" INTEGER NOT NULL DEFAULT 24,
    "change_cutoff_hours" INTEGER NOT NULL DEFAULT 24,
    "buffer_before_minutes" INTEGER NOT NULL DEFAULT 0,
    "buffer_after_minutes" INTEGER NOT NULL DEFAULT 0,
    "per_host_daily_limit" INTEGER,
    "project_daily_limit" INTEGER,
    "reminder_one_hour_enabled" BOOLEAN NOT NULL DEFAULT false,
    "logo_url" TEXT,
    "main_color" VARCHAR(7),
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_hosts" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "priority" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "project_hosts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_availabilities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,

    CONSTRAINT "user_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_availabilities" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,

    CONSTRAINT "project_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_fields" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "label" VARCHAR(160) NOT NULL,
    "type" "form_field_type" NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL,
    "options" JSONB,

    CONSTRAINT "form_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "host_id" UUID NOT NULL,
    "status" "booking_status" NOT NULL DEFAULT 'held',
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "blocked_starts_at" TIMESTAMPTZ(3) NOT NULL,
    "blocked_ends_at" TIMESTAMPTZ(3) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Tokyo',
    "guest_name_encrypted" TEXT NOT NULL,
    "guest_email_encrypted" TEXT NOT NULL,
    "guest_email_lookup_hash" CHAR(64) NOT NULL,
    "guest_phone_encrypted" TEXT,
    "management_token_hash" CHAR(64) NOT NULL,
    "idempotency_key" VARCHAR(120) NOT NULL,
    "calendar_id" VARCHAR(255),
    "google_event_id" VARCHAR(255),
    "google_meet_url" TEXT,
    "calendar_sync_status" "calendar_sync_status" NOT NULL DEFAULT 'not_created',
    "hold_expires_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "rescheduled_from_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_answers" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "form_field_id" UUID NOT NULL,
    "field_key" VARCHAR(80) NOT NULL,
    "field_label" VARCHAR(160) NOT NULL,
    "value_encrypted" TEXT NOT NULL,

    CONSTRAINT "booking_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_status_history" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "from_status" "booking_status",
    "to_status" "booking_status" NOT NULL,
    "changed_by_user_id" UUID,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "google_accounts_user_id_idx" ON "google_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "google_accounts_provider_provider_account_id_key" ON "google_accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_connections_google_account_id_calendar_id_key" ON "calendar_connections"("google_account_id", "calendar_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "project_hosts_user_id_idx" ON "project_hosts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_hosts_project_id_user_id_key" ON "project_hosts"("project_id", "user_id");

-- CreateIndex
CREATE INDEX "user_availabilities_user_id_weekday_idx" ON "user_availabilities"("user_id", "weekday");

-- CreateIndex
CREATE INDEX "project_availabilities_project_id_weekday_idx" ON "project_availabilities"("project_id", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "form_fields_project_id_key_key" ON "form_fields"("project_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "form_fields_project_id_sort_order_key" ON "form_fields"("project_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_management_token_hash_key" ON "bookings"("management_token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_idempotency_key_key" ON "bookings"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_rescheduled_from_id_key" ON "bookings"("rescheduled_from_id");

-- CreateIndex
CREATE INDEX "bookings_project_id_starts_at_idx" ON "bookings"("project_id", "starts_at");

-- CreateIndex
CREATE INDEX "bookings_host_id_starts_at_idx" ON "bookings"("host_id", "starts_at");

-- CreateIndex
CREATE INDEX "bookings_guest_email_lookup_hash_starts_at_idx" ON "bookings"("guest_email_lookup_hash", "starts_at");

-- CreateIndex
CREATE INDEX "bookings_status_starts_at_idx" ON "bookings"("status", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "booking_answers_booking_id_form_field_id_key" ON "booking_answers"("booking_id", "form_field_id");

-- CreateIndex
CREATE INDEX "booking_status_history_booking_id_created_at_idx" ON "booking_status_history"("booking_id", "created_at");

-- AddForeignKey
ALTER TABLE "google_accounts" ADD CONSTRAINT "google_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_google_account_id_fkey" FOREIGN KEY ("google_account_id") REFERENCES "google_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_hosts" ADD CONSTRAINT "project_hosts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_hosts" ADD CONSTRAINT "project_hosts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_availabilities" ADD CONSTRAINT "user_availabilities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_availabilities" ADD CONSTRAINT "project_availabilities_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_rescheduled_from_id_fkey" FOREIGN KEY ("rescheduled_from_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_answers" ADD CONSTRAINT "booking_answers_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_answers" ADD CONSTRAINT "booking_answers_form_field_id_fkey" FOREIGN KEY ("form_field_id") REFERENCES "form_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Custom PostgreSQL constraints not expressible in Prisma schema language.
CREATE EXTENSION IF NOT EXISTS "btree_gist";

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_duration_minutes_check" CHECK ("duration_minutes" > 0),
  ADD CONSTRAINT "projects_booking_window_days_check" CHECK ("booking_window_days" > 0),
  ADD CONSTRAINT "projects_minimum_lead_hours_check" CHECK ("minimum_lead_hours" >= 0),
  ADD CONSTRAINT "projects_change_cutoff_hours_check" CHECK ("change_cutoff_hours" >= 0),
  ADD CONSTRAINT "projects_buffer_minutes_check" CHECK ("buffer_before_minutes" >= 0 AND "buffer_after_minutes" >= 0),
  ADD CONSTRAINT "projects_daily_limits_check" CHECK (
    ("per_host_daily_limit" IS NULL OR "per_host_daily_limit" > 0)
    AND ("project_daily_limit" IS NULL OR "project_daily_limit" > 0)
  ),
  ADD CONSTRAINT "projects_main_color_check" CHECK ("main_color" IS NULL OR "main_color" ~ '^#[0-9A-Fa-f]{6}$'),
  ADD CONSTRAINT "projects_slug_check" CHECK ("slug" = lower("slug") AND "slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

ALTER TABLE "project_hosts"
  ADD CONSTRAINT "project_hosts_priority_check" CHECK ("priority" IS NULL OR "priority" > 0);

CREATE UNIQUE INDEX "project_hosts_project_priority_key"
  ON "project_hosts" ("project_id", "priority")
  WHERE "priority" IS NOT NULL;

CREATE UNIQUE INDEX "calendar_connections_one_primary_key"
  ON "calendar_connections" ("google_account_id")
  WHERE "is_primary";

ALTER TABLE "user_availabilities"
  ADD CONSTRAINT "user_availabilities_time_check" CHECK (
    "weekday" BETWEEN 0 AND 6
    AND "start_minute" >= 0
    AND "end_minute" <= 1440
    AND "start_minute" < "end_minute"
  ),
  ADD CONSTRAINT "user_availabilities_no_overlap" EXCLUDE USING gist (
    "user_id" WITH =,
    "weekday" WITH =,
    int4range("start_minute", "end_minute", '[)') WITH &&
  );

ALTER TABLE "project_availabilities"
  ADD CONSTRAINT "project_availabilities_time_check" CHECK (
    "weekday" BETWEEN 0 AND 6
    AND "start_minute" >= 0
    AND "end_minute" <= 1440
    AND "start_minute" < "end_minute"
  ),
  ADD CONSTRAINT "project_availabilities_no_overlap" EXCLUDE USING gist (
    "project_id" WITH =,
    "weekday" WITH =,
    int4range("start_minute", "end_minute", '[)') WITH &&
  );

ALTER TABLE "form_fields"
  ADD CONSTRAINT "form_fields_sort_order_check" CHECK ("sort_order" >= 0);

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_time_check" CHECK ("starts_at" < "ends_at"),
  ADD CONSTRAINT "bookings_blocked_time_check" CHECK (
    "blocked_starts_at" <= "starts_at"
    AND "ends_at" <= "blocked_ends_at"
    AND "blocked_starts_at" < "blocked_ends_at"
  ),
  ADD CONSTRAINT "bookings_hold_expiration_check" CHECK (
    "status" <> 'held' OR "hold_expires_at" IS NOT NULL
  ),
  ADD CONSTRAINT "bookings_host_no_overlap" EXCLUDE USING gist (
    "host_id" WITH =,
    tstzrange("blocked_starts_at", "blocked_ends_at", '[)') WITH &&
  ) WHERE ("status" IN ('held', 'confirmed')),
  ADD CONSTRAINT "bookings_guest_no_overlap" EXCLUDE USING gist (
    "guest_email_lookup_hash" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  ) WHERE ("status" IN ('held', 'confirmed'));

CREATE UNIQUE INDEX "bookings_google_event_id_key"
  ON "bookings" ("google_event_id")
  WHERE "google_event_id" IS NOT NULL;

