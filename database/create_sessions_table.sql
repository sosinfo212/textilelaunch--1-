-- Create sessions table if it doesn't exist
USE agency;

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(191) PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_token (token(255)),
  INDEX idx_sessions_expires (expires_at)
);

SELECT 'Sessions table created or already exists!' AS status;
