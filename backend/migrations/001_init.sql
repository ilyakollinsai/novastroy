-- Строй Инжиниринг — начальная схема БД
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('contractor', 'admin') NOT NULL DEFAULT 'contractor',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS contractor_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  company_name VARCHAR(255) NOT NULL DEFAULT '',
  inn VARCHAR(20) NOT NULL DEFAULT '',
  specialization VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(50) NOT NULL DEFAULT '',
  contact_person VARCHAR(255) NOT NULL DEFAULT '',
  about TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_contractor_profiles_user (user_id),
  CONSTRAINT fk_contractor_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tenders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  public_code VARCHAR(50) NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  description TEXT NULL,
  category VARCHAR(255) NULL,
  sum DECIMAL(12, 2) NULL,
  deadline DATE NULL,
  status ENUM('draft', 'open', 'review', 'closed', 'won') NOT NULL DEFAULT 'draft',
  source ENUM('manual', 'parsed') NOT NULL DEFAULT 'manual',
  requirements TEXT NULL,
  winner_contractor_id INT NULL,
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tenders_winner FOREIGN KEY (winner_contractor_id) REFERENCES contractor_profiles(id) ON DELETE SET NULL,
  CONSTRAINT fk_tenders_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_tenders_status (status),
  INDEX idx_tenders_category (category),
  FULLTEXT INDEX ft_tenders_search (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tender_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tender_id INT NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tender_attachments_tender FOREIGN KEY (tender_id) REFERENCES tenders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tender_id INT NOT NULL,
  contractor_id INT NOT NULL,
  proposed_price DECIMAL(12, 2) NULL,
  comment TEXT NULL,
  status ENUM('submitted', 'under_review', 'won', 'rejected') NOT NULL DEFAULT 'submitted',
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_applications_tender_contractor (tender_id, contractor_id),
  CONSTRAINT fk_applications_tender FOREIGN KEY (tender_id) REFERENCES tenders(id) ON DELETE CASCADE,
  CONSTRAINT fk_applications_contractor FOREIGN KEY (contractor_id) REFERENCES contractor_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS application_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_application_attachments_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tender_sources_raw (
  id INT AUTO_INCREMENT PRIMARY KEY,
  telegram_message_id BIGINT NOT NULL UNIQUE,
  raw_text TEXT NULL,
  raw_media_paths TEXT NULL,
  parsed_title VARCHAR(500) NULL,
  parsed_sum DECIMAL(12, 2) NULL,
  parsed_deadline DATE NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  linked_tender_id INT NULL,
  fetched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tender_sources_raw_linked_tender FOREIGN KEY (linked_tender_id) REFERENCES tenders(id) ON DELETE SET NULL,
  INDEX idx_tender_sources_raw_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
