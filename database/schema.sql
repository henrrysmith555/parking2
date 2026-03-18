-- =====================================================
-- 酒店停车场车位远程监测与管理系统
-- 完整数据库建表脚本
-- 数据库类型: PostgreSQL (Supabase)
-- =====================================================

-- =====================================================
-- 第一部分：删除已存在的表（按依赖顺序）
-- =====================================================

DROP TABLE IF EXISTS operation_logs CASCADE;
DROP TABLE IF EXISTS blacklists CASCADE;
DROP TABLE IF EXISTS fee_rules CASCADE;
DROP TABLE IF EXISTS payment_records CASCADE;
DROP TABLE IF EXISTS recharge_records CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS vehicle_records CASCADE;
DROP TABLE IF EXISTS parking_spots CASCADE;
DROP TABLE IF EXISTS parking_lots CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS health_check CASCADE;

-- =====================================================
-- 第二部分：创建表
-- =====================================================

-- 1. 用户表
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    phone VARCHAR(20),
    email VARCHAR(100),
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    plate_number VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX users_username_idx ON users(username);
CREATE INDEX users_role_idx ON users(role);
CREATE INDEX users_plate_idx ON users(plate_number);

-- 2. 停车场表
CREATE TABLE parking_lots (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    total_spots INTEGER NOT NULL DEFAULT 0,
    available_spots INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX parking_lots_name_idx ON parking_lots(name);

-- 3. 车位表
CREATE TABLE parking_spots (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id VARCHAR(36) NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE,
    spot_number VARCHAR(20) NOT NULL,
    floor VARCHAR(10) NOT NULL DEFAULT '1',
    zone VARCHAR(10) NOT NULL DEFAULT 'A',
    type VARCHAR(20) NOT NULL DEFAULT 'regular',
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    vehicle_id VARCHAR(36),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(lot_id, spot_number)
);

CREATE INDEX parking_spots_lot_idx ON parking_spots(lot_id);
CREATE INDEX parking_spots_status_idx ON parking_spots(status);
CREATE INDEX parking_spots_number_idx ON parking_spots(spot_number);

-- 4. 车辆进出记录表
CREATE TABLE vehicle_records (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    plate_number VARCHAR(20) NOT NULL,
    spot_id VARCHAR(36) REFERENCES parking_spots(id) ON DELETE SET NULL,
    lot_id VARCHAR(36) NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(20) NOT NULL DEFAULT 'sedan',
    entry_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    exit_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER,
    fee DECIMAL(10, 2) DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'parked',
    driver_name VARCHAR(100),
    driver_phone VARCHAR(20),
    video_url VARCHAR(500),
    notes TEXT,
    reservation_id VARCHAR(36),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX vehicle_records_user_idx ON vehicle_records(user_id);
CREATE INDEX vehicle_records_plate_idx ON vehicle_records(plate_number);
CREATE INDEX vehicle_records_spot_idx ON vehicle_records(spot_id);
CREATE INDEX vehicle_records_status_idx ON vehicle_records(status);
CREATE INDEX vehicle_records_entry_time_idx ON vehicle_records(entry_time);
CREATE INDEX vehicle_records_reservation_idx ON vehicle_records(reservation_id);

-- 5. 预约表
CREATE TABLE reservations (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    plate_number VARCHAR(20) NOT NULL,
    lot_id VARCHAR(36) NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE,
    spot_id VARCHAR(36) REFERENCES parking_spots(id) ON DELETE SET NULL,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reservation_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    driver_name VARCHAR(100),
    driver_phone VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX reservations_user_idx ON reservations(user_id);
CREATE INDEX reservations_lot_idx ON reservations(lot_id);
CREATE INDEX reservations_status_idx ON reservations(status);
CREATE INDEX reservations_time_idx ON reservations(reservation_time);

-- 6. 充值记录表
CREATE TABLE recharge_records (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    balance_after DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX recharge_records_user_idx ON recharge_records(user_id);
CREATE INDEX recharge_records_time_idx ON recharge_records(created_at);

-- 7. 缴费记录表
CREATE TABLE payment_records (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    record_id VARCHAR(36) REFERENCES vehicle_records(id) ON DELETE SET NULL,
    plate_number VARCHAR(20) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX payment_records_user_idx ON payment_records(user_id);
CREATE INDEX payment_records_time_idx ON payment_records(created_at);

-- 8. 收费规则表
CREATE TABLE fee_rules (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id VARCHAR(36) NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    first_hour_rate DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
    additional_rate DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
    max_daily_rate DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
    free_minutes INTEGER DEFAULT 0,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX fee_rules_lot_idx ON fee_rules(lot_id);

-- 9. 黑名单表
CREATE TABLE blacklists (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    plate_number VARCHAR(20) NOT NULL UNIQUE,
    reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 10. 操作日志表
CREATE TABLE operation_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(100),
    action VARCHAR(50) NOT NULL,
    module VARCHAR(50),
    description TEXT,
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX operation_logs_user_idx ON operation_logs(user_id);
CREATE INDEX operation_logs_time_idx ON operation_logs(created_at);
CREATE INDEX operation_logs_action_idx ON operation_logs(action);
CREATE INDEX operation_logs_module_idx ON operation_logs(module);

-- 11. 健康检查表（系统表）
CREATE TABLE health_check (
    id SERIAL PRIMARY KEY,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 第三部分：更新时间触发器
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parking_lots_updated_at BEFORE UPDATE ON parking_lots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parking_spots_updated_at BEFORE UPDATE ON parking_spots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fee_rules_updated_at BEFORE UPDATE ON fee_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 第四部分：Row Level Security (RLS)
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recharge_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;

-- 允许所有操作（开发环境，生产环境请根据需要调整）
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on parking_lots" ON parking_lots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on parking_spots" ON parking_spots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on vehicle_records" ON vehicle_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on reservations" ON reservations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on recharge_records" ON recharge_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on payment_records" ON payment_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on fee_rules" ON fee_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on blacklists" ON blacklists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on operation_logs" ON operation_logs FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 建表完成
-- =====================================================
