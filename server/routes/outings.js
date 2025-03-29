const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const OutingRequest = require('../models/OutingRequest');
const User = require('../models/User');
const { auth, checkRole } = require('../middleware/auth');
const socketIO = require('../config/socket');
const workflowController = require('../controllers/outingWorkflowController');
const PDFDocument = require('pdfkit');
const { generatePDF } = require('../services/pdfService');

// Get students under floor incharge
router.get('/floor-incharge/students/:email', auth, async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).trim().toLowerCase();
    
    const floorIncharge = await User.findOne({ email });
    if (!floorIncharge) {
      return res.status(404).json({
        success: false,
        message: 'Floor incharge not found',
      });
    }

    // Convert floor value to array if it's not already
    const floors = Array.isArray(floorIncharge.floor) 
      ? floorIncharge.floor 
      : floorIncharge.floor ? [floorIncharge.floor] : [];

    console.log('Floor incharge details:', {
      hostelBlock: floorIncharge.hostelBlock,
      floors: floors,
      email: floorIncharge.email
    });

    // Get all students under this floor incharge
    const students = await User.find({
      role: 'student',
      hostelBlock: floorIncharge.hostelBlock,
      floor: { $in: floors }
    }).select('name email rollNumber hostelBlock floor roomNumber phoneNumber parentPhoneNumber branch semester')
      .sort({ floor: 1, roomNumber: 1 });

    console.log(`Found ${students.length} students for block ${floorIncharge.hostelBlock} and floors ${floors.join(', ')}`);

    res.json({
      success: true,
      students,
      totalStudents: students.length,
      debug: {
        floorInchargeDetails: {
          hostelBlock: floorIncharge.hostelBlock,
          floors: floors,
          email: floorIncharge.email
        }
      }
    });
  } catch (error) {
    console.error('Error in /floor-incharge/students/:email:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get all outing requests for floor incharge (not just pending)
router.get('/floor-incharge/requests', auth, checkRole(['floor-incharge']), async (req, res) => {
  try {
    const { assignedBlock, assignedFloor } = req.user;
    
    console.log('Floor Incharge Request Query:', {
      user: req.user,
      assignedBlock,
      assignedFloor
    });

    if (!assignedBlock || !assignedFloor || assignedFloor.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Floor Incharge has no assigned block or floors',
        debug: { assignedBlock, assignedFloor }
      });
    }

    const floors = Array.isArray(assignedFloor) ? assignedFloor : [assignedFloor];

    const requests = await OutingRequest.find({
      hostelBlock: assignedBlock,
      floor: { $in: floors },
      status: 'pending',
      currentLevel: 'floor-incharge'
    }).populate({
      path: 'studentId',
      select: 'name email rollNumber hostelBlock floor roomNumber phoneNumber parentPhoneNumber'
    }).sort({ createdAt: -1 });

    console.log(`Found ${requests.length} requests for ${assignedBlock}, floors: ${floors.join(', ')}`);

    const stats = {
      totalStudents: await User.countDocuments({
        role: 'student',
        hostelBlock: assignedBlock,
        floor: { $in: floors }
      }),
      pending: await OutingRequest.countDocuments({
        hostelBlock: assignedBlock,
        floor: { $in: floors },
        status: 'pending',
        currentLevel: 'floor-incharge'
      }),
      approved: await OutingRequest.countDocuments({
        hostelBlock: assignedBlock,
        floor: { $in: floors },
        status: 'approved'
      }),
      denied: await OutingRequest.countDocuments({
        hostelBlock: assignedBlock,
        floor: { $in: floors },
        status: 'denied'
      })
    };

    res.json({
      success: true,
      requests: requests.map(req => ({
        ...req.toObject(),
        studentName: req.studentId?.name,
        studentEmail: req.studentId?.email
      })),
      stats,
      debug: {
        searchedFloors: floors,
        hostelBlock: assignedBlock,
        foundRequests: requests.length
      }
    });

  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      debug: error.stack
    });
  }
});

// Get approved outing students
router.get('/floor-incharge/approved-students', auth, checkRole(['floor-incharge']), async (req, res) => {
  try {
    const { hostelBlock, assignedFloor } = req.user;
    const allFloorFormats = assignedFloor.flatMap(floor => {
      const numericFloor = String(floor).replace(/[^\d]/g, '');
      return [floor, numericFloor, `${numericFloor}`, `${numericFloor}nd Floor`];
    });

    const approvedRequests = await OutingRequest.find({
      hostelBlock,
      floor: { $in: allFloorFormats },
      status: 'approved'
    }).populate('studentId', 'name email rollNumber hostelBlock floor roomNumber phoneNumber parentPhoneNumber branch semester')
      .sort({ outingDate: -1 });

    const uniqueStudents = Array.from(new Map(
      approvedRequests.map(request => [
        request.studentId._id.toString(),
        {
          ...request.studentId.toObject(),
          outTime: request.outingTime,
          inTime: request.returnTime,
          outingDate: request.outingDate
        }
      ])
    ).values());

    res.json({
      success: true,
      students: uniqueStudents
    });
  } catch (error) {
    console.error('Error fetching approved students:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Handle request actions (approve/deny)
router.patch('/floor-incharge/request/:requestId/:action', auth, checkRole(['floor-incharge']), async (req, res) => {
  try {
    const { requestId, action } = req.params;
    const { comments = '' } = req.body;
    
    console.log('Processing floor-incharge request:', {
      requestId,
      action,
      userDetails: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        assignedBlock: req.user.assignedBlock,
        assignedFloor: req.user.assignedFloor
      }
    });

    // Validate action parameter
    if (!['approve', 'deny'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be either "approve" or "deny"'
      });
    }

    const request = await OutingRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found',
        requestId
      });
    }

    // Load student details
    await request.populate('studentId', 'name email rollNumber hostelBlock floor roomNumber phoneNumber parentPhoneNumber');

    // Validate request state
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot ${action} request that is not pending`,
        currentStatus: request.status
      });
    }

    const status = action === 'approve' ? 'approved' : 'denied';

    // Initialize approval flow array if not exists
    if (!Array.isArray(request.approvalFlow)) {
      request.approvalFlow = [];
    }

    // Create approval entry
    const approvalEntry = {
      level: 'floor-incharge',
      status: status,
      timestamp: new Date(),
      remarks: comments,
      approvedBy: req.user.email,
      approverModel: 'Admin',
      approverInfo: {
        email: req.user.email,
        role: 'floor-incharge'
      }
    };

    // Add to approval flow
    request.approvalFlow.push(approvalEntry);

    // Update status fields
    request.status = status;
    request.floorInchargeApproval = status;
    request.approvalTimestamps.floorIncharge = new Date();
    request.lastModifiedBy = req.user.email;

    // Move to next level if approved
    if (status === 'approved') {
      await request.moveToNextLevel();
    } else {
      request.currentLevel = 'completed';
    }

    // Save the updated request
    const savedRequest = await request.save();
    
    // Emit socket update
    try {
      const room = `${request.hostelBlock}-${request.floor}`;
      socketIO.getIO().to(room).emit('request-update', {
        type: 'status-change',
        request: {
          id: request._id,
          status: request.status,
          studentName: request.studentId.name,
          rollNumber: request.studentId.rollNumber,
          outingDate: request.outingDate,
          outingTime: request.outingTime,
          returnTime: request.returnTime,
          purpose: request.purpose,
          hostelBlock: request.hostelBlock,
          floor: request.floor,
          roomNo: request.studentId.roomNumber,
          email: request.studentId.email,
          phoneNumber: request.studentId.phoneNumber,
          parentPhoneNumber: request.studentId.parentPhoneNumber
        }
      });
    } catch (socketError) {
      console.error('Socket emission error:', socketError);
    }

    res.json({
      success: true,
      message: `Request ${action}ed successfully`,
      request: {
        id: savedRequest._id,
        status: savedRequest.status,
        currentLevel: savedRequest.currentLevel,
        studentName: savedRequest.studentId.name,
        rollNumber: savedRequest.studentId.rollNumber
      }
    });

  } catch (error) {
    console.error('Error updating request:', {
      error: error.message,
      stack: error.stack,
      requestId: req.params.requestId,
      action: req.params.action
    });

    res.status(500).json({
      success: false,
      message: 'Failed to process request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }
});

// Create new outing request (for students)
router.post('/requests/submit', auth, checkRole(['student']), async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Normalize floor format
    const normalizedFloor = OutingRequest.normalizeFloor(student.floor);

    const newRequest = new OutingRequest({
      studentId: student._id,
      outingDate: new Date(req.body.outingDate),
      outingTime: req.body.outTime,
      returnTime: req.body.returnTime,
      returnDate: new Date(req.body.returnDate || req.body.outingDate),
      purpose: req.body.purpose,
      parentPhoneNumber: req.body.parentContact || student.parentPhoneNumber,
      hostelBlock: student.hostelBlock,
      floor: normalizedFloor,
      status: 'pending',
      currentLevel: 'floor-incharge',
    });

    await newRequest.save();

    console.log('New outing request created:', {
      studentId: student._id,
      hostelBlock: newRequest.hostelBlock,
      floor: newRequest.floor,
      status: newRequest.status,
    });

    // Emit new request event with error handling
    try {
      const room = `${newRequest.hostelBlock}-${newRequest.floor}`;
      socketIO.getIO().to(room).emit('new-request', {
        type: 'new-request',
        request: {
          id: newRequest._id,
          studentId: student._id,
          studentName: student.name,
          rollNumber: student.rollNumber,
          outingDate: newRequest.outingDate,
          outingTime: newRequest.outingTime,
          returnTime: newRequest.returnTime,
          purpose: newRequest.purpose,
          status: newRequest.status,
          hostelBlock: newRequest.hostelBlock,
          floor: newRequest.floor,
          roomNo: student.roomNumber,
          email: student.email,
          phoneNumber: student.phoneNumber,
          parentPhoneNumber: student.parentPhoneNumber
        }
      });
    } catch (socketError) {
      console.error('Socket emission error:', socketError);
      // Continue with the response even if socket emission fails
    }

    res.status(201).json({
      success: true,
      request: {
        id: newRequest._id,
        date: newRequest.outingDate,
        outTime: newRequest.outingTime,
        inTime: newRequest.returnTime,
        status: newRequest.status,
        purpose: newRequest.purpose,
      },
    });
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Handle approval at any level
router.post('/:requestId/approve', auth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { approvalFlow } = req.body;

    // First fetch the request
    const outingRequest = await OutingRequest.findById(requestId);
    if (!outingRequest) {
      return res.status(404).json({
        success: false,
        message: 'Request not found',
        requestId
      });
    }

    // Allow approval if request is either pending OR at hostel-incharge level
    if (outingRequest.status !== 'pending' && outingRequest.currentLevel !== 'hostel-incharge') {
      return res.status(400).json({
        success: false,
        message: 'Cannot approve this request',
        currentStatus: outingRequest.status,
        currentLevel: outingRequest.currentLevel
      });
    }

    // Get current approval
    const currentApproval = approvalFlow[0];
    
    try {
      // Check approval content
      const validationErrors = [];
      if (!currentApproval.approvedBy) validationErrors.push('approvedBy is required');
      if (!currentApproval.approverInfo?.email) validationErrors.push('approver email is required');
      if (currentApproval.approverInfo?.role !== 'HostelIncharge') {
        validationErrors.push('approverInfo.role must be exactly "HostelIncharge"');
      }

      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid approval data',
        details: {
          error: error.message,
          received: currentApproval
        }
      });
    }

    // Add approval to flow
    outingRequest.approvalFlow.push({
      ...currentApproval,
      timestamp: new Date(),
      status: 'approved'
    });

    // Update request status
    outingRequest.hostelInchargeApproval = 'approved';
    outingRequest.currentLevel = 'warden';
    outingRequest.lastModifiedBy = currentApproval.approverInfo.email;

    await outingRequest.save();

    res.json({
      success: true,
      message: 'Request approved successfully',
      request: {
        id: outingRequest._id,
        status: outingRequest.status,
        currentLevel: outingRequest.currentLevel,
        approvalFlow: outingRequest.approvalFlow
      }
    });

  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process approval',
      details: error.message
    });
  }
});

// Get requests by approval level
router.get('/pending/:level', auth, checkRole(['floor-incharge', 'hostel-incharge', 'warden']), async (req, res) => {
  try {
    const { level } = req.params;
    const requests = await OutingRequest.find({
      currentLevel: level,
      hostelBlock: req.user.assignedBlock,
      ...(level === 'floor-incharge' && { floor: req.user.assignedFloor })
    })
    .populate('studentId', 'name email rollNumber phoneNumber hostelBlock roomNumber')
    .populate('approvalFlow.approvedBy', 'name email role');

    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// QR code verification endpoint
router.post('/verify-qr', auth, checkRole(['security']), async (req, res) => {
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
    if (type === 'outgoing') {
      request.checkOut = {
        time: new Date(),
        scannedBy: req.user.id
      };
    } else {
      request.checkIn = {
        time: new Date(),
        scannedBy: req.user.id
      };
    }

    await request.save();

    res.json({
      success: true,
      studentDetails: {
        name: request.studentId.name,
        rollNumber: request.studentId.rollNumber,
        phoneNumber: request.studentId.phoneNumber,
        parentPhoneNumber: request.parentPhoneNumber,
        outTime: request.outingTime,
        inTime: request.returnTime
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get hostel incharge dashboard data
router.get('/dashboard/hostel-incharge', auth, checkRole(['hostel-incharge']), async (req, res) => {
  try {
    const { assignedBlocks } = req.user;
    
    const requests = await OutingRequest.find({
      hostelBlock: { $in: assignedBlocks }
    })
    .populate('studentId', 'name email rollNumber phoneNumber hostelBlock floor roomNumber branch semester')
    .lean() // Convert to plain JavaScript object
    .exec();

    // Transform requests to include approval status
    const transformedRequests = requests.map(request => ({
      id: request._id,
      studentName: request.studentId?.name,
      rollNumber: request.studentId?.rollNumber,
      hostelBlock: request.studentId?.hostelBlock,
      floor: request.studentId?.floor,
      roomNumber: request.studentId?.roomNumber,
      branch: request.studentId?.branch,
      semester: request.studentId?.semester,
      outingDate: request.outingDate,
      outingTime: request.outingTime,
      returnTime: request.returnTime,
      purpose: request.purpose,
      status: request.status,
      currentLevel: request.currentLevel,
      floorInchargeApproval: request.floorInchargeApproval,
      hostelInchargeApproval: request.hostelInchargeApproval,
      wardenApproval: request.wardenApproval,
      approvalFlow: request.approvalFlow,
      parentPhoneNumber: request.parentPhoneNumber,
      createdAt: request.createdAt
    }));

    const stats = {
      pending: await OutingRequest.countDocuments({
        hostelBlock: { $in: assignedBlocks },
        currentLevel: 'hostel-incharge'
      }),
      approved: await OutingRequest.countDocuments({
        hostelBlock: { $in: assignedBlocks },
        hostelInchargeApproval: 'approved'
      }),
      denied: await OutingRequest.countDocuments({
        hostelBlock: { $in: assignedBlocks },
        hostelInchargeApproval: 'denied'
      }),
      awaitingApproval: await OutingRequest.countDocuments({
        hostelBlock: { $in: assignedBlocks },
        floorInchargeApproval: 'approved',
        hostelInchargeApproval: 'pending'
      }),
      pendingFloorIncharge: await OutingRequest.countDocuments({
        hostelBlock: { $in: assignedBlocks },
        floorInchargeApproval: 'pending'
      })
    };

    res.json({
      success: true,
      data: { 
        requests: transformedRequests,
        stats 
      }
    });
  } catch (error) {
    console.error('Error fetching hostel incharge dashboard:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update the warden dashboard endpoint
router.get('/dashboard/warden', auth, checkRole(['warden']), async (req, res) => {
  try {
    const [pendingRequests, stats] = await Promise.all([
      OutingRequest.find({
        currentLevel: 'warden',
        hostelInchargeApproval: 'approved',
        wardenApproval: 'pending'
      }).populate('studentId', 'name email rollNumber phoneNumber hostelBlock floor roomNumber parentPhoneNumber'),

      {
        pending: await OutingRequest.countDocuments({
          currentLevel: 'warden',
          hostelInchargeApproval: 'approved',
          wardenApproval: 'pending'
        }),
        approved: await OutingRequest.countDocuments({
          wardenApproval: 'approved'
        }),
        denied: await OutingRequest.countDocuments({
          wardenApproval: 'denied'
        })
      }
    ]);

    // Get additional stats
    const [totalHostels, totalStudents, outingsToday] = await Promise.all([
      OutingRequest.distinct('hostelBlock').countDocuments(),
      User.countDocuments({ role: 'student' }),
      OutingRequest.countDocuments({
        outingDate: {
          $gte: new Date().setHours(0, 0, 0, 0),
          $lt: new Date().setHours(23, 59, 59, 999)
        }
      })
    ]);

    // Calculate approval rate
    const approvalRate = stats.approved > 0 
      ? Math.round((stats.approved / (stats.approved + stats.denied)) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        requests: pendingRequests,
        totalHostels,
        totalStudents,
        outingsToday,
        approvalRate,
        stats
      }
    });
  } catch (error) {
    console.error('Warden dashboard error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update warden approve endpoint
router.post('/warden/approve/:requestId', auth, checkRole(['warden']), async (req, res) => {
  try {
    const { requestId } = req.params;

    // Validate ObjectId
    if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format',
        details: { providedId: requestId }
      });
    }

    const outingRequest = await OutingRequest.findById(requestId)
      .populate('studentId', 'name email rollNumber');

    if (!outingRequest) {
      return res.status(404).json({
        success: false,
        message: 'Request not found',
        details: { requestId }
      });
    }

    // Validate request state
    if (outingRequest.currentLevel !== 'warden' || outingRequest.hostelInchargeApproval !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Invalid request state. Must be approved by Hostel Incharge first',
        currentState: {
          currentLevel: outingRequest.currentLevel,
          hostelInchargeApproval: outingRequest.hostelInchargeApproval
        }
      });
    }

    const { remarks = '' } = req.body;

    // Create approval entry
    const approvalEntry = {
      level: 'warden',
      status: 'approved',
      timestamp: new Date(),
      remarks,
      approvedBy: req.user.email,
      approverModel: 'Admin',
      approverInfo: {
        email: req.user.email,
        role: 'warden'
      }
    };

    // Update request
    outingRequest.approvalFlow.push(approvalEntry);
    outingRequest.wardenApproval = 'approved';
    outingRequest.status = 'approved';
    outingRequest.currentLevel = 'completed';
    outingRequest.lastModifiedBy = req.user.email;

    await outingRequest.save();
    
    // Generate QR codes after final approval
    if (outingRequest.status === 'approved') {
      await outingRequest.generateQRCodes();
    }

    res.json({
      success: true,
      message: 'Request approved by Warden',
      request: {
        id: outingRequest._id,
        status: outingRequest.status,
        currentLevel: outingRequest.currentLevel,
        studentName: outingRequest.studentId.name,
        rollNumber: outingRequest.studentId.rollNumber
      }
    });
  } catch (error) {
    console.error('Warden approval error:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Failed to process approval',
      error: error.message
    });
  }
});

// Add new routes for workflow
router.post('/:requestId/approve', 
  auth, 
  checkRole(['floor-incharge', 'hostel-incharge', 'warden']), 
  workflowController.handleApproval
);

router.get('/dashboard/:role', 
  auth, 
  checkRole(['floor-incharge', 'hostel-incharge', 'warden']), 
  workflowController.getDashboardData
);

router.post('/verify-qr',
  auth,
  checkRole(['security']),
  workflowController.verifyQRCode
);

// Update the PDF generation endpoint
router.get('/approved-requests/pdf', auth, checkRole(['floor-incharge', 'hostel-incharge', 'warden']), async (req, res) => {
  try {
    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=approved-requests.pdf');

    // Get role-specific title and data
    const titles = {
      'floor-incharge': 'Floor Incharge Report - Approved Outing Requests',
      'hostel-incharge': 'Hostel Incharge Report - Approved Outing Requests',
      'warden': 'Warden Report - Approved Outing Requests'
    };

    // Get requests based on role
    const requests = await OutingRequest.find({
      status: 'approved',
      ...(req.user.role === 'hostel-incharge' ? {
        hostelBlock: { $in: req.user.assignedBlocks }
      } : req.user.role === 'floor-incharge' ? {
        hostelBlock: req.user.assignedBlock,
        floor: { $in: req.user.assignedFloor }
      } : {})
    }).populate('studentId', 'name rollNumber hostelBlock floor roomNumber phoneNumber parentPhoneNumber branch');

    // Generate PDF
    generatePDF(res, {
      title: titles[req.user.role],
      requests,
      role: req.user.role
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message
    });
  }
});

module.exports = router;