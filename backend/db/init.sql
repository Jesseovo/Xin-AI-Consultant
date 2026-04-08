-- Xin AI Consultant 数据库初始化
-- Docker MySQL 首次启动时自动执行

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE DATABASE IF NOT EXISTS xin_ai
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE xin_ai;
