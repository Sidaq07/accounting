import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from './database.js';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set before starting the server.');
}

// Middleware to authenticate JWT token
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

// Authentication Routes
export function registerAuthRoutes(app) {
  // Login Endpoint
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username.toLowerCase()], (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error occurred during login.' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      bcrypt.compare(password, user.password_hash, (err, isMatch) => {
        if (err || !isMatch) {
          return res.status(401).json({ error: 'Invalid username or password.' });
        }

        const token = jwt.sign(
          { id: user.id, username: user.username, role: user.role },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.json({
          message: 'Login successful.',
          token,
          user: { id: user.id, username: user.username, role: user.role }
        });
      });
    });
  });

  // Change Password Endpoint
  app.post('/api/auth/change-password', authenticateToken, (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const username = req.user.username;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old password and new password are required.' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
      if (err || !user) {
        return res.status(500).json({ error: 'User lookup failed.' });
      }

      bcrypt.compare(oldPassword, user.password_hash, (err, isMatch) => {
        if (err || !isMatch) {
          return res.status(400).json({ error: 'Incorrect current password.' });
        }

        bcrypt.hash(newPassword, 10, (err, hash) => {
          if (err) {
            return res.status(500).json({ error: 'Error hashing new password.' });
          }

          db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id], (err) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to update password in database.' });
            }

            res.json({ message: 'Password updated successfully.' });
          });
        });
      });
    });
  });

  // Token Validation Endpoint
  app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
  });
}
