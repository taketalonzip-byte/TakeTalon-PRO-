-- ============================================================
-- TakeTalon PRO — Profile Photo Ownership & History Schema
-- Migration: 004_profile_photos_schema.sql
-- Supports: Server-enforced pricing (500 FBu new, 300 FBu switch, 0 FBu delete, 100 FBu restore)
-- ============================================================

-- 1. PROFILE PHOTOS HISTORY TABLE
CREATE TABLE IF NOT EXISTS profile_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  restored_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_photos_user_active 
  ON profile_photos(user_id, is_deleted, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_photos_user_current 
  ON profile_photos(user_id, is_current);

-- 2. PROFILE PHOTO TRANSACTIONS LOG TABLE
CREATE TABLE IF NOT EXISTS profile_photo_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  photo_id UUID REFERENCES profile_photos(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'NEW_PROFILE' | 'SWITCH_EXISTING' | 'DELETE_PHOTO' | 'RESTORE_PHOTO'
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'FBu',
  status TEXT DEFAULT 'SUCCESS',
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_photo_tx_user 
  ON profile_photo_transactions(user_id, created_at DESC);
