CREATE TYPE "public"."lead_source" AS ENUM('referral', 'website', 'phone', 'walk_in', 'social_media', 'email', 'event', 'other');--> statement-breakpoint
-- Normalize any pre-existing free-text values (e.g. "Referral") before the
-- type change below -- the enum labels are lowercase, and this table
-- predates the enum (source used to be a plain text column).
UPDATE "leads" SET "source" = lower("source") WHERE "source" IS NOT NULL;--> statement-breakpoint
-- Anything that doesn't match one of the fixed categories gets bucketed
-- into "other" rather than failing the migration outright.
UPDATE "leads" SET "source" = 'other' WHERE "source" IS NOT NULL AND lower("source") NOT IN ('referral', 'website', 'phone', 'walk_in', 'social_media', 'email', 'event', 'other');--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "source" SET DATA TYPE "public"."lead_source" USING "source"::"public"."lead_source";