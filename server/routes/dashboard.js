const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const OutingRequest = require('../models/OutingRequest');
const User = require('../models/User');

// Student Dashboard Routes
router.get('/student/requests', auth, checkRole(['student']), async (req, res) => {
  try {
    console.log('Fetching requests for student:', req.user.id);
    
    const [requests, stats] = await Promise.all([
      OutingRequest.find({ studentId: req.user.id })
        .sort({ createdAt: -1 })
        .select('outingDate outingTime returnTime status purpose createdAt')
        .lean(),
      {
        pending: await OutingRequest.countDocuments({ 
          studentId: req.user.id, 
          status: 'pending' 
        }),
        approved: await OutingRequest.countDocuments({ 
          studentId: req.user.id, 
          status: 'approved' 
        }),
        denied: await OutingRequest.countDocuments({ 
          studentId: req.user.id, 
          status: 'denied' 
        })
      }
    ]);

    console.log(`Found ${requests.length} requests for student ${req.user.id}`);

    res.json({ 
      success: true, 
      requests: requests.map(req => ({
        id: req._id,
        date: req.outingDate,
        outTime: req.outingTime,
        inTime: req.returnTime,
        status: req.status,
        purpose: req.purpose,
        createdAt: req.createdAt
      })),
      stats 
    });
  } catch (error) {
    console.error('Error fetching student requests:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.post('/student/submit-request', auth, checkRole(['student']), async (req, res) => {
  try {
    const newRequest = new OutingRequest({
      studentId: req.user.id,
      outingDate: req.body.outingDate,
      outingTime: req.body.outTime,
      returnTime: req.body.inTime,
      returnDate: req.body.outingDate,
      purpose: req.body.purpose,
      parentPhoneNumber: req.body.parentContact,
      hostelBlock: req.user.hostelBlock,
      floor: req.user.floor,
      status: 'pending',
      currentLevel: 'floor-incharge'
    });

    await newRequest.save();

    res.json({
      success: true,
      request: {
        id: newRequest._id,
        date: newRequest.outingDate,
        outTime: newRequest.outingTime,
        inTime: newRequest.returnTime,
        status: newRequest.status,
        purpose: newRequest.purpose
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Floor Incharge Dashboard Routes
router.get('/floor-incharge/requests', auth, checkRole(['floor-incharge']), async (req, res) => {
  try {
    const requests = await OutingRequest.find({
      currentLevel: 'floor-incharge',
      hostelBlock: req.user.assignedBlock,
      floor: req.user.assignedFloor
    }).populate('studentId', 'name rollNumber roomNumber');

    // Get total count of students
    const totalStudents = await User.countDocuments({
      role: 'student',
      hostelBlock: req.user.assignedBlock,
      floor: req.user.assignedFloor
    });

    const stats = {
      totalStudents,
      pending: await OutingRequest.countDocuments({
        currentLevel: 'floor-incharge',
        hostelBlock: req.user.assignedBlock,
        floor: req.user.assignedFloor,
        status: 'pending'
      }),
      approved: await OutingRequest.countDocuments({
        hostelBlock: req.user.assignedBlock,
        floor: req.user.assignedFloor,
        'workflow.level': 'floor-incharge',
        'workflow.status': 'approved'
      }),
      denied: await OutingRequest.countDocuments({
        hostelBlock: req.user.assignedBlock,
        floor: req.user.assignedFloor,
        'workflow.level': 'floor-incharge',
        'workflow.status': 'denied'
      })
    };

    res.json({ 
      success: true, 
      requests, 
      stats,
      totalStudents 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Handle request actions
router.post('/request/:requestId/action', auth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, comments } = req.body;

    const request = await OutingRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    request.workflow.push({
      level: req.user.role,
      status: action,
      actionBy: req.user.id,
      actionAt: new Date(),
      comments: comments || ''
    });

    if (action === 'approve') {
      request.moveToNextLevel();
    } else if (action === 'deny') {
      request.status = 'denied';
      request.currentLevel = 'completed';
    }

    await request.save();

    res.json({
      success: true,
      message: `Request ${action}d successfully`,
      request: {
        id: request._id,
        status: request.status,
        currentLevel: request.currentLevel
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
