-- CreateTable
CREATE TABLE "deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ NOT NULL,
    "send_date" DATE NOT NULL,
    "time_slot" TEXT NOT NULL,
    "template_type" TEXT NOT NULL,
    "final_message" TEXT NOT NULL,
    "source_text" TEXT,
    "student_id7" TEXT,
    "last_login_at" TIMESTAMPTZ,
    "offer_status" TEXT NOT NULL DEFAULT 'none',
    "approved_at" TIMESTAMPTZ,
    "on_hold_at" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "notes" TEXT,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_deliveries_sent_at" ON "deliveries"("sent_at");

-- CreateIndex
CREATE INDEX "idx_deliveries_send_date" ON "deliveries"("send_date");

-- CreateIndex
CREATE INDEX "idx_deliveries_time_slot" ON "deliveries"("time_slot");

-- CreateIndex
CREATE INDEX "idx_deliveries_template_type" ON "deliveries"("template_type");

-- CreateIndex
CREATE INDEX "idx_deliveries_student_id7" ON "deliveries"("student_id7");

-- CreateIndex
CREATE INDEX "idx_deliveries_last_login_at" ON "deliveries"("last_login_at");

-- CreateIndex
CREATE INDEX "idx_deliveries_offer_status" ON "deliveries"("offer_status");
