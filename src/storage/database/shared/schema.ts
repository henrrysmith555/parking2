import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  timestamp,
  boolean,
  integer,
  decimal,
  text,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

// =============================================
// 系统表（必须保留，不得删除）
// =============================================
export const healthCheck = pgTable("health_check", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// =============================================
// 业务表定义
// =============================================

// 1. 用户表
export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    username: varchar("username", { length: 50 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    role: varchar("role", { length: 20 }).notNull().default("user"),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 100 }),
    balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
    plateNumber: varchar("plate_number", { length: 20 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("users_username_idx").on(table.username),
    index("users_role_idx").on(table.role),
    index("users_plate_idx").on(table.plateNumber),
  ]
);

// 2. 停车场表
export const parkingLots = pgTable(
  "parking_lots",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 100 }).notNull(),
    location: varchar("location", { length: 255 }).notNull(),
    totalSpots: integer("total_spots").notNull().default(0),
    availableSpots: integer("available_spots").notNull().default(0),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("parking_lots_name_idx").on(table.name),
  ]
);

// 3. 车位表
export const parkingSpots = pgTable(
  "parking_spots",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    lotId: varchar("lot_id", { length: 36 }).notNull().references(() => parkingLots.id),
    spotNumber: varchar("spot_number", { length: 20 }).notNull(),
    floor: varchar("floor", { length: 10 }).notNull().default("1"),
    zone: varchar("zone", { length: 10 }).notNull().default("A"),
    type: varchar("type", { length: 20 }).notNull().default("regular"),
    status: varchar("status", { length: 20 }).notNull().default("available"),
    vehicleId: varchar("vehicle_id", { length: 36 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("parking_spots_lot_idx").on(table.lotId),
    index("parking_spots_status_idx").on(table.status),
    index("parking_spots_number_idx").on(table.spotNumber),
  ]
);

// 4. 车辆进出记录表
export const vehicleRecords = pgTable(
  "vehicle_records",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 }).references(() => users.id),
    plateNumber: varchar("plate_number", { length: 20 }).notNull(),
    spotId: varchar("spot_id", { length: 36 }).references(() => parkingSpots.id),
    lotId: varchar("lot_id", { length: 36 }).notNull().references(() => parkingLots.id),
    vehicleType: varchar("vehicle_type", { length: 20 }).notNull().default("sedan"),
    entryTime: timestamp("entry_time", { withTimezone: true }).defaultNow().notNull(),
    exitTime: timestamp("exit_time", { withTimezone: true }),
    duration: integer("duration"),
    fee: decimal("fee", { precision: 10, scale: 2 }).default("0.00"),
    status: varchar("status", { length: 20 }).notNull().default("parked"),
    driverName: varchar("driver_name", { length: 100 }),
    driverPhone: varchar("driver_phone", { length: 20 }),
    videoUrl: varchar("video_url", { length: 500 }),
    notes: text("notes"),
    reservationId: varchar("reservation_id", { length: 36 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("vehicle_records_user_idx").on(table.userId),
    index("vehicle_records_plate_idx").on(table.plateNumber),
    index("vehicle_records_spot_idx").on(table.spotId),
    index("vehicle_records_status_idx").on(table.status),
    index("vehicle_records_entry_time_idx").on(table.entryTime),
    index("vehicle_records_reservation_idx").on(table.reservationId),
  ]
);

// 5. 预约表
export const reservations = pgTable(
  "reservations",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    plateNumber: varchar("plate_number", { length: 20 }).notNull(),
    lotId: varchar("lot_id", { length: 36 }).notNull().references(() => parkingLots.id),
    spotId: varchar("spot_id", { length: 36 }).references(() => parkingSpots.id),
    userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    reservationTime: timestamp("reservation_time", { withTimezone: true }).defaultNow().notNull(),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }),
    status: varchar("status", { length: 20 }).notNull().default("confirmed"),
    driverName: varchar("driver_name", { length: 100 }),
    driverPhone: varchar("driver_phone", { length: 20 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("reservations_user_idx").on(table.userId),
    index("reservations_lot_idx").on(table.lotId),
    index("reservations_status_idx").on(table.status),
    index("reservations_time_idx").on(table.reservationTime),
  ]
);

// 6. 充值记录表
export const rechargeRecords = pgTable(
  "recharge_records",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("completed"),
    balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("recharge_records_user_idx").on(table.userId),
    index("recharge_records_time_idx").on(table.createdAt),
  ]
);

// 7. 缴费记录表
export const paymentRecords = pgTable(
  "payment_records",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    recordId: varchar("record_id", { length: 36 }).references(() => vehicleRecords.id),
    plateNumber: varchar("plate_number", { length: 20 }).notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("completed"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("payment_records_user_idx").on(table.userId),
    index("payment_records_time_idx").on(table.createdAt),
  ]
);

// 8. 收费规则表
export const feeRules = pgTable(
  "fee_rules",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    lotId: varchar("lot_id", { length: 36 }).notNull().references(() => parkingLots.id),
    name: varchar("name", { length: 100 }).notNull(),
    firstHourRate: decimal("first_hour_rate", { precision: 10, scale: 2 }).notNull().default("10.00"),
    additionalRate: decimal("additional_rate", { precision: 10, scale: 2 }).notNull().default("10.00"),
    maxDailyRate: decimal("max_daily_rate", { precision: 10, scale: 2 }).notNull().default("100.00"),
    freeMinutes: integer("free_minutes").default(0),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("fee_rules_lot_idx").on(table.lotId),
  ]
);

// 9. 黑名单表
export const blacklists = pgTable(
  "blacklists",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    plateNumber: varchar("plate_number", { length: 20 }).notNull().unique(),
    reason: varchar("reason", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

// 10. 操作日志表
export const operationLogs = pgTable(
  "operation_logs",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 }).references(() => users.id),
    username: varchar("username", { length: 100 }),
    action: varchar("action", { length: 50 }).notNull(),
    module: varchar("module", { length: 50 }),
    description: text("description"),
    details: jsonb("details"),
    ipAddress: varchar("ip_address", { length: 50 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("operation_logs_user_idx").on(table.userId),
    index("operation_logs_time_idx").on(table.createdAt),
    index("operation_logs_action_idx").on(table.action),
    index("operation_logs_module_idx").on(table.module),
  ]
);

// TypeScript 类型导出
export type User = typeof users.$inferSelect;
export type ParkingLot = typeof parkingLots.$inferSelect;
export type ParkingSpot = typeof parkingSpots.$inferSelect;
export type VehicleRecord = typeof vehicleRecords.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
export type RechargeRecord = typeof rechargeRecords.$inferSelect;
export type PaymentRecord = typeof paymentRecords.$inferSelect;
export type FeeRule = typeof feeRules.$inferSelect;
export type Blacklist = typeof blacklists.$inferSelect;
export type OperationLog = typeof operationLogs.$inferSelect;
