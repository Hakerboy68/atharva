const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

// Load users from JSON file
const loadUsers = () => {
    const usersFile = path.join(__dirname, '..', 'data', 'users.json');
    const data = fs.readFileSync(usersFile, 'utf8');
    return JSON.parse(data);
};

// Save users to JSON file
const saveUsers = (users) => {
    const usersFile = path.join(__dirname, '..', 'data', 'users.json');
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
};

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET || 'aura-ai-secret-key',
        { expiresIn: '7d' }
    );
};

// Hash password
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

// Compare password
const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

// Generate unique ID
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

module.exports = {
    loadUsers,
    saveUsers,
    generateToken,
    hashPassword,
    comparePassword,
    generateId
};
