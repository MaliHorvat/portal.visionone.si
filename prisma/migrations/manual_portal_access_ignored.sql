-- Ročno: dodaj status 'ignored' za PortalAccessRequest (PostgreSQL)
ALTER TYPE "PortalAccessRequestStatus" ADD VALUE IF NOT EXISTS 'ignored';
