const { 
    loadUsers, 
    saveUsers, 
    generateToken, 
    hashPassword, 
    comparePassword, 
    generateId 
} = require('../utils/authHelper');

// Register new user
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all fields'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // Load existing users
        const users = loadUsers();

        // Check if user exists
        const existingUser = users.find(user => 
            user.email === email || user.username === username
        );

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create new user
        const newUser = {
            id: generateId(),
            username,
            email,
            password: hashedPassword,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };

        // Save user
        users.push(newUser);
        saveUsers(users);

        // Generate token
        const token = generateToken(newUser.id);

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed'
        });
    }
};

// Login user
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Load users
        const users = loadUsers();

        // Find user
        const user = users.find(user => user.email === email);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check password
        const isMatch = await comparePassword(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update last login
        user.lastLogin = new Date().toISOString();
        saveUsers(users);

        // Generate token
        const token = generateToken(user.id);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
};

// Logout user
const logout = (req, res) => {
    res.json({
        success: true,
        message: 'Logout successful'
    });
};

// Get current user
const getCurrentUser = (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
};

module.exports = {
    register,
    login,
    logout,
    getCurrentUser
};
