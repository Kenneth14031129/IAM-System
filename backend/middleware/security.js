const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
};

// Rate limiting for auth endpoints
const authAttempts = new Map();

const rateLimitAuth = (req, res, next) => {
  try {
    const ip = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;
    const maxAttempts = 10;

    if (!authAttempts.has(ip)) {
      authAttempts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const attempts = authAttempts.get(ip);
    
    if (now > attempts.resetTime) {
      authAttempts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (attempts.count >= maxAttempts) {
      return res.status(429).json({ 
        error: 'Too many login attempts. Please try again later.' 
      });
    }

    attempts.count++;
    next();
  } catch (error) {
    console.warn('Rate limiting error:', error.message);
    next();
  }
};

module.exports = {
  securityHeaders,
  rateLimitAuth
};