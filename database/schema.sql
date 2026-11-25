-- ==============================================================
-- CƠ SỞ DỮ LIỆU ÔN THI TRẮC NGHIỆM TRIẾT HỌC MÁC - LÊNIN
-- ==============================================================

CREATE DATABASE IF NOT EXISTS `triet_hoc_quiz`
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `triet_hoc_quiz`;

-- Bảng chủ đề / bộ đề ôn tập
CREATE TABLE IF NOT EXISTS `topics` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(50) NOT NULL UNIQUE,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng câu hỏi
CREATE TABLE IF NOT EXISTS `questions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `topic_id` INT NOT NULL,
    `q_num` INT NOT NULL,
    `content` TEXT NOT NULL,
    `explanation` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng các phương án lựa chọn (A, B, C, D, E)
CREATE TABLE IF NOT EXISTS `options` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `question_id` INT NOT NULL,
    `label` VARCHAR(10) NOT NULL,
    `content` TEXT NOT NULL,
    `is_correct` TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng lịch sử làm bài thi / luyện tập
CREATE TABLE IF NOT EXISTS `quiz_attempts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_name` VARCHAR(100) DEFAULT 'Sinh viên ôn thi',
    `mode` ENUM('practice', 'exam') NOT NULL DEFAULT 'practice',
    `topic_code` VARCHAR(50) NOT NULL,
    `total_questions` INT NOT NULL,
    `correct_answers` INT NOT NULL DEFAULT 0,
    `score` DECIMAL(4,2) NOT NULL DEFAULT 0.00,
    `time_spent_seconds` INT NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng chi tiết đáp án của từng câu trong lượt thi (để xem lại câu sai)
CREATE TABLE IF NOT EXISTS `quiz_attempt_details` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `attempt_id` INT NOT NULL,
    `question_id` INT NOT NULL,
    `selected_option_id` INT NULL,
    `is_correct` TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (`attempt_id`) REFERENCES `quiz_attempts`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

