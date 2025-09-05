ALTER TABLE "Media" ADD COLUMN "isCover" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Media_trailId_isCover_idx" ON "Media"("trailId", "isCover");
