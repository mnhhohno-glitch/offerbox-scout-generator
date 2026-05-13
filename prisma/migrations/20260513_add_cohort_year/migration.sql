-- Add cohort_year column to deliveries table (default "27" backfills existing rows)
ALTER TABLE "deliveries" ADD COLUMN "cohort_year" TEXT NOT NULL DEFAULT '27';

-- Index for cohort filtering
CREATE INDEX "idx_deliveries_cohort_year" ON "deliveries"("cohort_year");
