ALTER TABLE "clients" ADD COLUMN "billing_line1" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "billing_line2" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "billing_sub_locality" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "billing_city" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "billing_state_province" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "billing_postal_code" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "billing_country" text;--> statement-breakpoint
-- Preserve existing free-text billing_address data by moving it into the
-- new structured line1 field rather than dropping it silently -- we can't
-- reliably parse free text into city/state/postal/country components, so
-- line1 (plus a user follow-up to fill in the rest) is the safe choice.
UPDATE "clients" SET "billing_line1" = "billing_address" WHERE "billing_address" IS NOT NULL;