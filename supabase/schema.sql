-- Run this in your Supabase SQL editor

-- Devices: stores the APNs device token from the iOS app
CREATE TABLE IF NOT EXISTS devices (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token       text        NOT NULL UNIQUE,
  device_name text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Notifications: audit log of every push sent through the server
CREATE TABLE IF NOT EXISTS notifications (
  id       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title    text        NOT NULL,
  body     text        NOT NULL,
  data     jsonb,
  status   text        NOT NULL DEFAULT 'sent', -- 'sent' | 'failed'
  error    text,
  sent_at  timestamptz NOT NULL DEFAULT now()
);

-- Keep updated_at current on devices
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS devices_updated_at ON devices;
CREATE TRIGGER devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
