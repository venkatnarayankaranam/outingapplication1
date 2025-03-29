const OutingRequest = require('../models/OutingRequest');
const User = require('../models/User');
const socketIO = require('../config/socket');
const QRCode = require('qrcode');

exports.handleApproval = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { remarks = '' } = req.body;

    console.log('Processing approval:', {
      requestId,
      userRole: req.user.role,
      currentTime: new Date().toISOString()
    });

    const request = await OutingRequest.findById(requestId)
      .populate('studentId', 'name email rollNumber phoneNumber');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Validate current level matches user role
    if (request.currentLevel !== req.user.role) {
      return res.status(400).json({
        success: false,
        message: `Invalid approval sequence. Current level is ${request.currentLevel}, but got approval from ${req.user.role}`
      });
    }

    // Create approval entry
    const approvalEntry = {
      level: req.user.role,
      status: 'approved',
      timestamp: new Date(),
      remarks: remarks || '',
      approvedBy: req.user.email,
      approverModel: 'Admin',
      approverInfo: {
        email: req.user.email,
        role: req.user.role
      }
    };

    // Add to approval flow
    request.approvalFlow.push(approvalEntry);

    // Update approval status
    request[`${req.user.role.replace('-', '')}Approval`] = 'approved';

    // Move to next level
    const workflow = {
      'floor-incharge': 'hostel-incharge',
      'hostel-incharge': 'warden',
      'warden': 'completed'
    };

    request.currentLevel = workflow[req.user.role];

    // Handle completion
    if (request.currentLevel === 'completed') {
      request.status = 'approved';
      await request.generateQRCodes();
    }

    // Save with validation
    await request.save();

    // Return success response
    res.json({
      success: true,
      message: 'Request approved successfully',
      request: {
        id: request._id,
        status: request.status,
        currentLevel: request.currentLevel,
        approvalFlow: request.approvalFlow
      }
    });

  } catch (error) {
    console.error('Approval error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getDashboardData = async (req, res) => {
  try {
    const { role } = req.user;
    
    if (role === 'warden') {
      const [requests, students, hostels, outingsToday] = await Promise.all([
        OutingRequest.find({
          currentLevel: 'warden',
          hostelInchargeApproval: 'approved'
        }).populate('studentId', 'name email rollNumber hostelBlock roomNumber floor'),
        User.countDocuments({ role: 'student' }),
        User.distinct('hostelBlock'),
        OutingRequest.countDocuments({
          status: 'approved',
          outingDate: {
            $gte: new Date().setHours(0, 0, 0, 0),
            $lt: new Date().setHours(23, 59, 59, 999)
          }
        })
      ]);

      const stats = await OutingRequest.aggregate([
        { $match: { currentLevel: 'warden' } },
        { $group: {
          _id: '$status',
          count: { $sum: 1 }
        }}
      ]);

      return res.json({
        success: true,
        data: {
          requests,
          totalHostels: hostels.length,
          totalStudents: students,
          outingsToday,
          stats: {
            pending: stats.find(s => s._id === 'pending')?.count || 0,
            approved: stats.find(s => s._id === 'approved')?.count || 0,
            denied: stats.find(s => s._id === 'denied')?.count || 0
          }
        }
      });
    }
    
    const { hostelBlock, assignedFloor } = req.user;
    let query = {};

    // Build query based on role
    switch(role) {
      case 'floor-incharge':
        query = { 
          hostelBlock,
          floor: { $in: assignedFloor },
          currentLevel: 'floor-incharge'
        };
        break;
      case 'hostel-incharge':
        query = { 
          hostelBlock,
          currentLevel: 'hostel-incharge'
        };
        break;
      case 'warden':
        query = { 
          currentLevel: 'warden'
        };
        break;
    }

    const [requests, stats] = await Promise.all([
      OutingRequest.find(query)
        .populate('studentId', 'name email rollNumber phoneNumber hostelBlock roomNumber')
        .populate('approvalFlow.approvedBy', 'name email role')
        .sort({ createdAt: -1 }),
      OutingRequest.aggregate([
        { $match: query },
        { $group: {
          _id: '$status',
          count: { $sum: 1 }
        }}
      ])
    ]);

    const formattedStats = {
      pending: 0,
      approved: 0,
      denied: 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
    });

    res.json({
      success: true,
      requests,
      stats: formattedStats
    });

  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyQRCode = async (req, res) => {
  try {
    const { qrData, type } = req.body;
    const data = JSON.parse(qrData);
    
    const request = await OutingRequest.findById(data.requestId)
      .populate('studentId', 'name email rollNumber phoneNumber');

    if (!request || request.currentLevel !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or unauthorized QR code'
      });
    }

    // Handle check-in/check-out
    const now = new Date();
    if (type === 'outgoing') {
      request.checkOut = {
        time: now,
        scannedBy: req.user.id
      };
    } else {
      request.checkIn = {
        time: now,
        scannedBy: req.user.id
      };

      // Check if return is within 30 minutes of scheduled time
      const scheduledReturn = new Date(`${request.returnDate}T${request.returnTime}`);
      const timeDiff = Math.abs(scheduledReturn - now) / (1000 * 60); // difference in minutes
      
      if (timeDiff > 30) {
        request.status = 'late-return';
      }
    }

    await request.save();

    // Emit real-time update
    socketIO.getIO().emit('qr-scan', {
      requestId: request._id,
      type,
      timestamp: now
    });

    res.json({
      success: true,
      studentDetails: {
        name: request.studentId.name,
        rollNumber: request.studentId.rollNumber,
        phoneNumber: request.studentId.phoneNumber,
        parentPhoneNumber: request.parentPhoneNumber,
        outTime: request.outingTime,
        inTime: request.returnTime
      },
      scanTime: now
    });

  } catch (error) {
    console.error('QR verification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
