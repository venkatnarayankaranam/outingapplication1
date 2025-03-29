const OutingRequest = require('../models/OutingRequest');
const User = require('../models/User');

exports.getStudentDashboard = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Get latest requests
    const requests = await OutingRequest.find({ studentId })
      .sort({ createdAt: -1 })
      .limit(10);

    // Get request stats
    const stats = {
      pending: await OutingRequest.countDocuments({ studentId, status: 'pending' }),
      approved: await OutingRequest.countDocuments({ studentId, status: 'approved' }),
      denied: await OutingRequest.countDocuments({ studentId, status: 'denied' })
    };

    // Get student profile
    const student = await User.findById(studentId);

    res.json({
      success: true,
      data: {
        requests: requests.map(req => ({
          id: req._id,
          date: req.outingDate,
          outTime: req.outingTime,
          inTime: req.returnTime,
          status: req.status,
          purpose: req.purpose
        })),
        stats,
        profile: {
          name: student.name,
          email: student.email,
          rollNumber: student.rollNumber,
          hostelBlock: student.hostelBlock,
          floor: student.floor,
          roomNumber: student.roomNumber,
          parentPhoneNumber: student.parentPhoneNumber
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.submitOutingRequest = async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    
    const newRequest = new OutingRequest({
      studentId: student._id,
      outingDate: req.body.outingDate,
      outingTime: req.body.outTime,
      returnTime: req.body.inTime,
      returnDate: req.body.outingDate,
      purpose: req.body.purpose,
      parentPhoneNumber: req.body.parentContact || student.parentPhoneNumber,
      hostelBlock: student.hostelBlock,
      floor: student.floor
    });

    await newRequest.save();

    res.status(201).json({
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
