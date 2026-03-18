-- Vercel Postgres 数据库初始化脚本
-- 在 Vercel Dashboard → Storage → Postgres → Query 中执行

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(100) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user',
  balance NUMERIC(10,2) DEFAULT 0,
  plate_number VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 停车场表
CREATE TABLE IF NOT EXISTS parking_lots (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location TEXT,
  total_spots INTEGER DEFAULT 0,
  available_spots INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 车位表
CREATE TABLE IF NOT EXISTS parking_spots (
  id VARCHAR(100) PRIMARY KEY,
  lot_id VARCHAR(100) NOT NULL,
  spot_number VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'available',
  floor VARCHAR(50),
  area VARCHAR(100),
  position_x NUMERIC(10,2),
  position_y NUMERIC(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lot_id) REFERENCES parking_lots(id)
);

-- 预约表
CREATE TABLE IF NOT EXISTS reservations (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  spot_id VARCHAR(100) NOT NULL,
  lot_id VARCHAR(100) NOT NULL,
  plate_number VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'confirmed',
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  actual_start_time TIMESTAMP,
  actual_end_time TIMESTAMP,
  fee NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (spot_id) REFERENCES parking_spots(id),
  FOREIGN KEY (lot_id) REFERENCES parking_lots(id)
);

-- 车辆进出记录表
CREATE TABLE IF NOT EXISTS vehicle_records (
  id VARCHAR(100) PRIMARY KEY,
  plate_number VARCHAR(50) NOT NULL,
  spot_id VARCHAR(100),
  lot_id VARCHAR(100),
  reservation_id VARCHAR(100),
  user_id VARCHAR(100),
  entry_time TIMESTAMP,
  exit_time TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active',
  fee NUMERIC(10,2) DEFAULT 0,
  paid BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (spot_id) REFERENCES parking_spots(id),
  FOREIGN KEY (lot_id) REFERENCES parking_lots(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 支付记录表
CREATE TABLE IF NOT EXISTS payment_records (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100),
  amount NUMERIC(10,2) NOT NULL,
  type VARCHAR(50) NOT NULL,
  related_id VARCHAR(100),
  payment_method VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 黑名单表
CREATE TABLE IF NOT EXISTS blacklist (
  id VARCHAR(100) PRIMARY KEY,
  plate_number VARCHAR(50) UNIQUE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100),
  username VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  module VARCHAR(100) NOT NULL,
  description TEXT,
  details TEXT,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_spot ON reservations(spot_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_plate ON vehicle_records(plate_number);
CREATE INDEX IF NOT EXISTS idx_parking_spots_lot ON parking_spots(lot_id);
CREATE INDEX IF NOT EXISTS idx_logs_time ON operation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_user ON operation_logs(user_id);

-- 插入默认管理员账户（如果不存在）
INSERT INTO users (id, username, password, name, role, balance, is_active)
SELECT 'admin-id-001', 'admin', 'admin123', '系统管理员', 'admin', 0, true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- 完成提示
SELECT '✅ 数据库初始化完成！' AS message;
SELECT '默认管理员账户: admin / admin123' AS info;
