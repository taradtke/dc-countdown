const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

class AuthService {
  constructor() {
    this.userModel = new User();
  }

  generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      is_engineer: user.is_engineer
    };

    return jwt.sign(payload, config.auth.jwtSecret, {
      expiresIn: config.auth.tokenExpiry
    });
  }

  generateRefreshToken(user) {
    const payload = {
      id: user.id,
      type: 'refresh'
    };

    return jwt.sign(payload, config.auth.jwtSecret, {
      expiresIn: config.auth.refreshTokenExpiry
    });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, config.auth.jwtSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  async login(email, password) {
    const user = await this.userModel.authenticate(email, password);
    
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      user: this.userModel.sanitizeUser(user),
      token,
      refreshToken
    };
  }

  async register(userData) {
    // Check if user already exists
    const existingUser = await this.userModel.findByEmail(userData.email);
    
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create new user
    const user = await this.userModel.create({
      email: userData.email.toLowerCase(),
      password: userData.password,
      first_name: userData.first_name,
      last_name: userData.last_name,
      role: userData.role || 'user',
      is_engineer: userData.is_engineer || false
    });

    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      user: this.userModel.sanitizeUser(user),
      token,
      refreshToken
    };
  }

  async refreshToken(refreshToken) {
    const decoded = this.verifyToken(refreshToken);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    const user = await this.userModel.findById(decoded.id);
    
    if (!user || !user.is_active) {
      throw new Error('User not found or inactive');
    }

    const newToken = this.generateToken(user);
    const newRefreshToken = this.generateRefreshToken(user);

    return {
      token: newToken,
      refreshToken: newRefreshToken
    };
  }

  async validateUser(userId) {
    const user = await this.userModel.findById(userId);
    
    if (!user || !user.is_active) {
      return null;
    }

    return this.userModel.sanitizeUser(user);
  }

  async changePassword(userId, oldPassword, newPassword) {
    return this.userModel.changePassword(userId, oldPassword, newPassword);
  }

  async resetPassword(email, newPassword) {
    return this.userModel.resetPassword(email, newPassword);
  }

  async logout(userId) {
    // In a production system, you might want to blacklist the token
    // or maintain a session store that can be invalidated
    // For now, this is handled client-side by removing the token
    return { success: true };
  }

  extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  // Role-based access control
  hasRole(user, requiredRole) {
    const roleHierarchy = {
      admin: 4,
      manager: 3,
      engineer: 2,
      user: 1
    };

    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return userLevel >= requiredLevel;
  }

  hasPermission(user, permission) {
    const permissions = {
      admin: ['*'], // Admin has all permissions
      manager: [
        'view_all',
        'edit_all',
        'assign_engineers',
        'view_reports',
        'send_notifications'
      ],
      engineer: [
        'view_assigned',
        'edit_assigned',
        'update_status',
        'view_reports'
      ],
      user: [
        'view_public',
        'view_reports'
      ]
    };

    const userPermissions = permissions[user.role] || [];
    
    return userPermissions.includes('*') || userPermissions.includes(permission);
  }
}

module.exports = new AuthService();