const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth'); // Import the auth middleware

const ADMIN_CREDENTIALS = {
  "floorincharge@kietgroup.com": {
    password: "FloorIncharge@2026",
    role: "floor-incharge",
    assignedBlock: "D-Block",
    assignedFloor: ["1st Floor", "2nd Floor", "3rd Floor", "4th Floor"],
    isAdmin: true
  },
  "hostelincharge@kietgroup.com": {
    password: "HostelIncharge@2026",
    role: "hostel-incharge",
  },
  "maingate@kietgroup.com": {
    password: "MainGate@2026",
    role: "gate",
  },
  "warden@kietgroup.com": {
    password: "Warden@2026",
    role: "warden",
  },
};

router.post('/register', async (req, res) => {
  try {
    const {
      email,
      password,
      name,
      rollNumber,
      phoneNumber,
      parentPhoneNumber,
      hostelBlock,
      floor,
      roomNumber,
      branch,
      semester,
    } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Format floor value
    const formattedFloor = User.formatFloor(floor);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      email,
      password: hashedPassword,
      name,
      rollNumber,
      phoneNumber,
      parentPhoneNumber,
      hostelBlock,
      floor: formattedFloor, // Use formatted floor value
      roomNumber,
      branch,
      semester,
      role: 'student',
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Handle admin users
    if (ADMIN_CREDENTIALS[email]) {
      if (password === ADMIN_CREDENTIALS[email].password) {
        const adminData = {
          id: email,
          email,
          role: ADMIN_CREDENTIALS[email].role,
          isAdmin: true,
          assignedBlock: ADMIN_CREDENTIALS[email].assignedBlock,
          assignedFloor: ADMIN_CREDENTIALS[email].assignedFloor,
          name: ADMIN_CREDENTIALS[email].role.replace('-', ' ').toUpperCase(),
        };

        const token = jwt.sign(
          adminData,
          process.env.JWT_SECRET || 'OutingApplication@2026',
          { expiresIn: '1d' }
        );

        return res.json({
          success: true,
          user: adminData,
          token,
        });
      }
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Handle regular users
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        hostelBlock: user.hostelBlock,
        floor: user.floor,
      },
      process.env.JWT_SECRET || 'OutingApplication@2026',
      { expiresIn: '1d' }
    );

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber,
        phoneNumber: user.phoneNumber,
        parentPhoneNumber: user.parentPhoneNumber,
        hostelBlock: user.hostelBlock,
        floor: user.floor,
        roomNumber: user.roomNumber,
        branch: user.branch,
        semester: user.semester,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update verify endpoint
router.get('/verify', auth, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      isAdmin: req.user.isAdmin || false,
      assignedBlocks: req.user.assignedBlocks || []
    }
  });
});

module.exports = router;