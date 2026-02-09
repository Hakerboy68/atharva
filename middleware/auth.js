const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

// Load users from JSON file
const loadUsers = () => {
    const usersFile = path.join(__dirname, '..', 'data', 'users.json');
    const data = fs.readFileSync(usersFile, 'utf8');
    return JSON.parse(data);
};

// Authentication middleware
const authMiddleware = (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const token = authHeader.split(' ')[1];
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'aura-ai-secret-key');
        
        // Load users and find the user
        const users = loadUsers();
        const user = users.find(u => u.id === decoded.userId);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        // Attach user to request
        req.user = {
            id: user.id,
            username: user.username,
            email: user.email
        };
        
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

module.exports = authMiddleware;
