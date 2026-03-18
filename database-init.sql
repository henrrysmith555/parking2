-- =============================================
-- 酒店停车场车位远程监测与管理系统
-- 数据库初始化脚本
-- 适用于 Supabase / PostgreSQL
-- =============================================

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  phone VARCHAR(20),
  email VARCHAR(100),
  balance DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
  plate_number VARCHAR(20),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE INDEX IF NOT EXISTS users_plate_idx ON users(plate_number);

-- 2. 停车场表
CREATE TABLE IF NOT EXISTS parking_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL,
  total_spots INTEGER NOT NULL DEFAULT 0,
  available_spots INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS parking_lots_name_idx ON parking_lots(name);

-- 3. 车位表
CREATE TABLE IF NOT EXISTS parking_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES parking_lots(id),
  spot_number VARCHAR(20) NOT NULL,
  floor VARCHAR(10) NOT NULL DEFAULT '1',
  zone VARCHAR(10) NOT NULL DEFAULT 'A',
  type VARCHAR(20) NOT NULL DEFAULT 'regular',
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  vehicle_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS parking_spots_lot_idx ON parking_spots(lot_id);
CREATE INDEX IF NOT EXISTS parking_spots_status_idx ON parking_spots(status);
CREATE INDEX IF NOT EXISTS parking_spots_number_idx ON parking_spots(spot_number);

-- 4. 车辆进出记录表
CREATE TABLE IF NOT EXISTS vehicle_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  plate_number VARCHAR(20) NOT NULL,
  spot_id UUID NOT NULL REFERENCES parking_spots(id),
  lot_id UUID NOT NULL REFERENCES parking_lots(id),
  vehicle_type VARCHAR(20) NOT NULL DEFAULT 'sedan',
  entry_time TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  exit_time TIMESTAMPTZ,
  duration INTEGER,
  fee DECIMAL(10,2) DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'parked',
  driver_name VARCHAR(100),
  driver_phone VARCHAR(20),
  video_url VARCHAR(500),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS vehicle_records_user_idx ON vehicle_records(user_id);
CREATE INDEX IF NOT EXISTS vehicle_records_plate_idx ON vehicle_records(plate_number);
CREATE INDEX IF NOT EXISTS vehicle_records_spot_idx ON vehicle_records(spot_id);
CREATE INDEX IF NOT EXISTS vehicle_records_status_idx ON vehicle_records(status);
CREATE INDEX IF NOT EXISTS vehicle_records_entry_time_idx ON vehicle_records(entry_time);

-- 5. 预约表
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number VARCHAR(20) NOT NULL,
  lot_id UUID NOT NULL REFERENCES parking_lots(id),
  spot_id UUID REFERENCES parking_spots(id),
  user_id UUID NOT NULL REFERENCES users(id),
  reservation_time TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  driver_name VARCHAR(100),
  driver_phone VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS reservations_user_idx ON reservations(user_id);
CREATE INDEX IF NOT EXISTS reservations_lot_idx ON reservations(lot_id);
CREATE INDEX IF NOT EXISTS reservations_status_idx ON reservations(status);
CREATE INDEX IF NOT EXISTS reservations_time_idx ON reservations(reservation_time);

-- 6. 充值记录表
CREATE TABLE IF NOT EXISTS recharge_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  balance_after DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS recharge_records_user_idx ON recharge_records(user_id);
CREATE INDEX IF NOT EXISTS recharge_records_time_idx ON recharge_records(created_at);

-- 7. 缴费记录表
CREATE TABLE IF NOT EXISTS payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  record_id UUID REFERENCES vehicle_records(id),
  plate_number VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS payment_records_user_idx ON payment_records(user_id);
CREATE INDEX IF NOT EXISTS payment_records_time_idx ON payment_records(created_at);

-- 8. 收费规则表
CREATE TABLE IF NOT EXISTS fee_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES parking_lots(id),
  name VARCHAR(100) NOT NULL,
  first_hour_rate DECIMAL(10,2) NOT NULL DEFAULT 10.00,
  additional_rate DECIMAL(10,2) NOT NULL DEFAULT 10.00,
  max_daily_rate DECIMAL(10,2) NOT NULL DEFAULT 100.00,
  free_minutes INTEGER DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS fee_rules_lot_idx ON fee_rules(lot_id);

-- 9. 黑名单表
CREATE TABLE IF NOT EXISTS blacklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number VARCHAR(20) NOT NULL UNIQUE,
  reason VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10. 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  username VARCHAR(100),
  action VARCHAR(50) NOT NULL,
  module VARCHAR(50),
  description TEXT,
  details JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS operation_logs_user_idx ON operation_logs(user_id);
CREATE INDEX IF NOT EXISTS operation_logs_time_idx ON operation_logs(created_at);
CREATE INDEX IF NOT EXISTS operation_logs_action_idx ON operation_logs(action);
CREATE INDEX IF NOT EXISTS operation_logs_module_idx ON operation_logs(module);

-- =============================================
-- 初始数据 - 仅创建默认管理员账户
-- =============================================

-- 插入管理员账户（仅在不存在时创建）
INSERT INTO users (username, password, name, role, balance, is_active)
VALUES ('admin', 'admin123', '系统管理员', 'admin', 0, true)
ON CONFLICT (username) DO NOTHING;

-- =============================================
-- 完成
-- =============================================
-- 执行完成后，系统将：
-- 1. 创建所有必要的数据表
-- 2. 创建默认管理员账户 (admin / admin123)
-- 3. 其他数据（停车场、车位等）通过管理后台添加
