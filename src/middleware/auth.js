const authService = require('../services/AuthService');
const config = require('../config');

// Middleware to verify JWT token
const authenticate = async (req, res, next) => {
  // Skip authentication if disabled
  if (!config.features.auth) {
    req.user = { id: 1, role: 'admin', email: 'system@example.com' }; // Default user for non-auth mode
    return next();
  }

  try {
    const token = authService.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const decoded = authService.verifyToken(token);
    const user = await authService.validateUser(decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    return res.status(401).json({ error: error.message || 'Authentication failed' });
  }
};

// Middleware to check for specific role
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!config.features.auth) {
      return next(); // Skip role check if auth is disabled
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!authService.hasRole(req.user, requiredRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Middleware to check for specific permission
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!config.features.auth) {
      return next(); // Skip permission check if auth is disabled
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!authService.hasPermission(req.user, permission)) {
      return res.status(403).json({ error: `Missing required permission: ${permission}` });
    }

    next();
  };
};

// Middleware for optional authentication (user info if logged in, but not required)
const optionalAuth = async (req, res, next) => {
  if (!config.features.auth) {
    req.user = { id: 1, role: 'admin', email: 'system@example.com' };
    return next();
  }

  try {
    const token = authService.extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const decoded = authService.verifyToken(token);
      const user = await authService.validateUser(decoded.id);
      req.user = user;
    }
  } catch (error) {
    // Silent failure - user just won't be authenticated
    console.debug('Optional auth failed:', error.message);
  }

  next();
};

// Middleware to check if user is an engineer
const requireEngineer = (req, res, next) => {
  if (!config.features.auth) {
    return next();
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.is_engineer && req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Engineer access required' });
  }

  next();
};

// Middleware to check if user can access specific resource
const canAccessResource = (resourceType) => {
  return async (req, res, next) => {
    if (!config.features.auth) {
      return next();
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admins and managers can access everything
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      return next();
    }

    // Engineers can only access their assigned items
    if (req.user.role === 'engineer' || req.user.is_engineer) {
      // This would check if the resource is assigned to the engineer
      // Implementation depends on the specific resource type
      // For now, allowing access
      return next();
    }

    // Regular users have read-only access
    if (req.method === 'GET') {
      return next();
    }

    return res.status(403).json({ error: 'Insufficient permissions for this resource' });
  };
};

module.exports = {
  authenticate,
  requireRole,
  requirePermission,
  optionalAuth,
  requireEngineer,
  canAccessResource
};