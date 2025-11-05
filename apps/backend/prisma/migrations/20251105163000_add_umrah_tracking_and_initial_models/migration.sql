-- CreateTable
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_profile" (
    "user_id" UUID NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "country" TEXT,
    "language_ui" TEXT NOT NULL,
    "language_audio" TEXT NOT NULL,
    "madhhab" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "mobility" TEXT,
    "accessibility" JSONB,
    "guidance_mode" TEXT NOT NULL,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "consent" (
    "user_id" UUID NOT NULL,
    "essential" BOOLEAN NOT NULL DEFAULT true,
    "crash_reports" BOOLEAN NOT NULL DEFAULT true,
    "analytics" BOOLEAN NOT NULL DEFAULT true,
    "upload_transcripts" BOOLEAN NOT NULL DEFAULT false,
    "upload_audio_clips" BOOLEAN NOT NULL DEFAULT false,
    "background_location" BOOLEAN NOT NULL DEFAULT false,
    "email_updates" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "nav_checkpoint" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "ts" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stage" TEXT NOT NULL,
    "lap" INTEGER,
    "sai_leg" INTEGER,
    "floor" INTEGER,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "acc" DOUBLE PRECISION,

    CONSTRAINT "nav_checkpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "transcripts_meta" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "ts" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stage" TEXT,
    "size_bytes" INTEGER,
    "stored" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "transcripts_meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "events_analytics" (
    "id" BIGSERIAL NOT NULL,
    "user_uuid" UUID,
    "event" TEXT NOT NULL,
    "ts" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB,

    CONSTRAINT "events_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "umrah_session" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "state" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "umrah_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "umrah_event" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "lap" INTEGER,
    "ts" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,

    CONSTRAINT "umrah_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "umrah_progress" (
    "session_id" UUID NOT NULL,
    "current_step" TEXT NOT NULL,
    "tawaf_laps" INTEGER NOT NULL DEFAULT 0,
    "sai_laps" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "umrah_progress_pkey" PRIMARY KEY ("session_id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent" ADD CONSTRAINT "consent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nav_checkpoint" ADD CONSTRAINT "nav_checkpoint_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcripts_meta" ADD CONSTRAINT "transcripts_meta_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events_analytics" ADD CONSTRAINT "events_analytics_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_session" ADD CONSTRAINT "umrah_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_event" ADD CONSTRAINT "umrah_event_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "umrah_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umrah_progress" ADD CONSTRAINT "umrah_progress_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "umrah_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
