-- =====================================================
-- 酒店停车场车位远程监测与管理系统
-- 初始数据脚本
-- =====================================================

-- =====================================================
-- 1. 用户数据
-- =====================================================

-- 管理员账户
INSERT INTO users (id, username, password, name, role, phone, email, balance, is_active) VALUES
('admin-id-001', 'admin', 'admin123', '系统管理员', 'admin', '13800000000', 'admin@hotel.com', 0, true);

-- 测试用户
INSERT INTO users (id, username, password, name, role, phone, email, balance, plate_number, is_active) VALUES
('user-id-001', 'zhangsan', '123456', '张三', 'user', '13800138001', 'zhangsan@example.com', 500.00, '京A12345', true),
('user-id-002', 'lisi', '123456', '李四', 'user', '13800138002', 'lisi@example.com', 300.00, '京B66666', true),
('user-id-003', 'wangwu', '123456', '王五', 'user', '13800138003', 'wangwu@example.com', 150.00, '沪A88888', true),
('user-id-004', 'zhaoliu', '123456', '赵六', 'user', '13800138004', 'zhaoliu@example.com', 200.00, '粤C12345', true),
('user-id-005', 'sunqi', '123456', '孙七', 'user', '13800138005', 'sunqi@example.com', 80.00, '苏D55555', true);

-- =====================================================
-- 2. 停车场数据
-- =====================================================

INSERT INTO parking_lots (id, name, location, total_spots, available_spots, description, is_active) VALUES
('lot-001', '阳光酒店停车场', '北京市海淀区中关村大街88号', 50, 45, '五星级酒店配套停车场，24小时营业，配备智能监控系统', true),
('lot-002', '万达广场地下停车场', '北京市朝阳区建国路100号', 80, 72, '大型商业综合体停车场，支持预约车位', true),
('lot-003', '东方广场停车场', '北京市东城区东长安街1号', 60, 55, '市中心高端停车场，收费合理', true),
('lot-004', '科技园区停车场', '北京市海淀区上地信息路10号', 100, 90, '科技园区配套停车场，月租优惠', true);

-- =====================================================
-- 3. 车位数据
-- =====================================================

-- 阳光酒店停车场车位
INSERT INTO parking_spots (id, lot_id, spot_number, floor, zone, type, status) VALUES
-- B1层 A区
('spot-001', 'lot-001', 'A-001', 'B1', 'A', 'regular', 'available'),
('spot-002', 'lot-001', 'A-002', 'B1', 'A', 'regular', 'available'),
('spot-003', 'lot-001', 'A-003', 'B1', 'A', 'regular', 'available'),
('spot-004', 'lot-001', 'A-004', 'B1', 'A', 'regular', 'available'),
('spot-005', 'lot-001', 'A-005', 'B1', 'A', 'regular', 'available'),
-- B1层 B区
('spot-006', 'lot-001', 'B-001', 'B1', 'B', 'regular', 'available'),
('spot-007', 'lot-001', 'B-002', 'B1', 'B', 'regular', 'available'),
('spot-008', 'lot-001', 'B-003', 'B1', 'B', 'regular', 'available'),
('spot-009', 'lot-001', 'B-004', 'B1', 'B', 'regular', 'available'),
('spot-010', 'lot-001', 'B-005', 'B1', 'B', 'regular', 'available'),
-- B2层 C区
('spot-011', 'lot-001', 'C-001', 'B2', 'C', 'large', 'available'),
('spot-012', 'lot-001', 'C-002', 'B2', 'C', 'large', 'available'),
('spot-013', 'lot-001', 'C-003', 'B2', 'C', 'large', 'available'),
('spot-014', 'lot-001', 'C-004', 'B2', 'C', 'large', 'available'),
('spot-015', 'lot-001', 'C-005', 'B2', 'C', 'large', 'available'),
-- B2层 D区 (VIP)
('spot-016', 'lot-001', 'D-001', 'B2', 'D', 'vip', 'available'),
('spot-017', 'lot-001', 'D-002', 'B2', 'D', 'vip', 'available'),
('spot-018', 'lot-001', 'D-003', 'B2', 'D', 'vip', 'available'),
('spot-019', 'lot-001', 'D-004', 'B2', 'D', 'vip', 'available'),
('spot-020', 'lot-001', 'D-005', 'B2', 'D', 'vip', 'available');

-- 万达广场停车场车位
INSERT INTO parking_spots (id, lot_id, spot_number, floor, zone, type, status) VALUES
('spot-101', 'lot-002', 'A-001', 'B1', 'A', 'regular', 'available'),
('spot-102', 'lot-002', 'A-002', 'B1', 'A', 'regular', 'available'),
('spot-103', 'lot-002', 'A-003', 'B1', 'A', 'regular', 'available'),
('spot-104', 'lot-002', 'A-004', 'B1', 'A', 'regular', 'available'),
('spot-105', 'lot-002', 'A-005', 'B1', 'A', 'regular', 'available'),
('spot-106', 'lot-002', 'A-006', 'B1', 'A', 'regular', 'available'),
('spot-107', 'lot-002', 'A-007', 'B1', 'A', 'regular', 'available'),
('spot-108', 'lot-002', 'A-008', 'B1', 'A', 'regular', 'available'),
('spot-109', 'lot-002', 'A-009', 'B1', 'A', 'regular', 'available'),
('spot-110', 'lot-002', 'A-010', 'B1', 'A', 'regular', 'available');

-- 东方广场停车场车位
INSERT INTO parking_spots (id, lot_id, spot_number, floor, zone, type, status) VALUES
('spot-201', 'lot-003', 'A-001', 'B1', 'A', 'regular', 'available'),
('spot-202', 'lot-003', 'A-002', 'B1', 'A', 'regular', 'available'),
('spot-203', 'lot-003', 'A-003', 'B1', 'A', 'regular', 'available'),
('spot-204', 'lot-003', 'A-004', 'B1', 'A', 'regular', 'available'),
('spot-205', 'lot-003', 'A-005', 'B1', 'A', 'regular', 'available'),
('spot-206', 'lot-003', 'A-006', 'B1', 'A', 'regular', 'available'),
('spot-207', 'lot-003', 'A-007', 'B1', 'A', 'regular', 'available'),
('spot-208', 'lot-003', 'A-008', 'B1', 'A', 'regular', 'available'),
('spot-209', 'lot-003', 'A-009', 'B1', 'A', 'regular', 'available'),
('spot-210', 'lot-003', 'A-010', 'B1', 'A', 'regular', 'available');

-- =====================================================
-- 4. 收费规则数据
-- =====================================================

INSERT INTO fee_rules (id, lot_id, name, first_hour_rate, additional_rate, max_daily_rate, free_minutes, description, is_active) VALUES
('rule-001', 'lot-001', '阳光酒店标准收费', 10.00, 5.00, 80.00, 15, '首小时10元，之后每小时5元，每日封顶80元，免费15分钟', true),
('rule-002', 'lot-002', '万达广场收费', 8.00, 4.00, 60.00, 30, '首小时8元，之后每小时4元，每日封顶60元，免费30分钟', true),
('rule-003', 'lot-003', '东方广场收费', 12.00, 6.00, 100.00, 15, '首小时12元，之后每小时6元，每日封顶100元', true),
('rule-004', 'lot-004', '科技园区收费', 6.00, 3.00, 50.00, 60, '首小时6元，之后每小时3元，每日封顶50元，免费1小时', true);

-- =====================================================
-- 5. 历史车辆进出记录
-- =====================================================

-- 已完成的停车记录
INSERT INTO vehicle_records (id, user_id, plate_number, spot_id, lot_id, vehicle_type, entry_time, exit_time, duration, fee, status, driver_name, driver_phone) VALUES
('record-001', 'user-id-001', '京A12345', 'spot-001', 'lot-001', 'sedan', 
 NOW() - INTERVAL '5 hours', NOW() - INTERVAL '3 hours', 120, 15.00, 'completed', '张三', '13800138001'),
('record-002', 'user-id-002', '京B66666', 'spot-002', 'lot-001', 'sedan', 
 NOW() - INTERVAL '8 hours', NOW() - INTERVAL '5 hours', 180, 20.00, 'completed', '李四', '13800138002'),
('record-003', 'user-id-003', '沪A88888', 'spot-101', 'lot-002', 'sedan', 
 NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '4 hours', 240, 24.00, 'completed', '王五', '13800138003'),
('record-004', 'user-id-004', '粤C12345', 'spot-201', 'lot-003', 'suv', 
 NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '6 hours', 360, 36.00, 'completed', '赵六', '13800138004'),
('record-005', 'user-id-001', '京A12345', 'spot-003', 'lot-001', 'sedan', 
 NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '2 hours', 120, 15.00, 'completed', '张三', '13800138001');

-- =====================================================
-- 6. 历史预约记录
-- =====================================================

INSERT INTO reservations (id, plate_number, lot_id, spot_id, user_id, reservation_time, start_time, end_time, status, driver_name, driver_phone) VALUES
('res-001', '京A12345', 'lot-001', 'spot-004', 'user-id-001', 
 NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '3 hours', 
 'completed', '张三', '13800138001'),
('res-002', '京B66666', 'lot-002', 'spot-102', 'user-id-002', 
 NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '5 hours', 
 'completed', '李四', '13800138002');

-- =====================================================
-- 7. 充值记录
-- =====================================================

INSERT INTO recharge_records (id, user_id, amount, payment_method, status, balance_after, created_at) VALUES
('recharge-001', 'user-id-001', 500.00, 'alipay', 'completed', 500.00, NOW() - INTERVAL '7 days'),
('recharge-002', 'user-id-002', 300.00, 'wechat', 'completed', 300.00, NOW() - INTERVAL '5 days'),
('recharge-003', 'user-id-003', 150.00, 'alipay', 'completed', 150.00, NOW() - INTERVAL '3 days'),
('recharge-004', 'user-id-004', 200.00, 'wechat', 'completed', 200.00, NOW() - INTERVAL '2 days'),
('recharge-005', 'user-id-005', 80.00, 'alipay', 'completed', 80.00, NOW() - INTERVAL '1 day');

-- =====================================================
-- 8. 缴费记录
-- =====================================================

INSERT INTO payment_records (id, user_id, record_id, plate_number, amount, payment_method, status, description, created_at) VALUES
('pay-001', 'user-id-001', 'record-001', '京A12345', 15.00, 'balance', 'completed', '阳光酒店停车场停车费', NOW() - INTERVAL '3 hours'),
('pay-002', 'user-id-002', 'record-002', '京B66666', 20.00, 'balance', 'completed', '阳光酒店停车场停车费', NOW() - INTERVAL '5 hours'),
('pay-003', 'user-id-003', 'record-003', '沪A88888', 24.00, 'balance', 'completed', '万达广场停车场停车费', NOW() - INTERVAL '2 days'),
('pay-004', 'user-id-004', 'record-004', '粤C12345', 36.00, 'balance', 'completed', '东方广场停车场停车费', NOW() - INTERVAL '1 day'),
('pay-005', 'user-id-001', 'record-005', '京A12345', 15.00, 'balance', 'completed', '阳光酒店停车场停车费', NOW() - INTERVAL '3 days');

-- =====================================================
-- 9. 黑名单数据
-- =====================================================

INSERT INTO blacklists (id, plate_number, reason, created_at) VALUES
('black-001', '京X99999', '多次逃费，欠费金额超过500元', NOW() - INTERVAL '10 days'),
('black-002', '沪B11111', '损坏停车设施，拒绝赔偿', NOW() - INTERVAL '5 days');

-- =====================================================
-- 10. 操作日志
-- =====================================================

INSERT INTO operation_logs (user_id, username, action, module, description, created_at) VALUES
('admin-id-001', 'admin', 'login', 'auth', '管理员登录系统', NOW() - INTERVAL '1 hour'),
('admin-id-001', 'admin', 'create', 'parking_lots', '创建停车场：阳光酒店停车场', NOW() - INTERVAL '2 hours'),
('admin-id-001', 'admin', 'create', 'users', '创建用户：张三', NOW() - INTERVAL '3 hours'),
('user-id-001', 'zhangsan', 'login', 'auth', '用户登录系统', NOW() - INTERVAL '4 hours'),
('user-id-001', 'zhangsan', 'recharge', 'payment', '充值500元', NOW() - INTERVAL '5 hours');

-- =====================================================
-- 数据初始化完成
-- =====================================================
