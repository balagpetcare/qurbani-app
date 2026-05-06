-- AlterEnum (must run before any migration that depends on this LeadStatus value)
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'FOLLOW_UP_NEEDED';
