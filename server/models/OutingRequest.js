const mongoose = require('mongoose');
const QRCode = require('qrcode');

const outingRequestSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  outingDate: {
    type: Date,
    required: true,
  },
  outingTime: {
    type: String,
    required: true,
  },
  returnTime: {
    type: String,
    required: true,
  },
  returnDate: {
    type: Date,
    required: true,
  },
  purpose: {
    type: String,
    required: true,
  },
  parentPhoneNumber: {
    type: String,
    required: true,
  },
  hostelBlock: {
    type: String,
    required: true,
  },
  floor: {
    type: String,
    required: true,
    get: function(v) {
      return v; // Return the original value without transformation
    }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied'],
    default: 'pending',
  },
  floorInchargeApproval: {
    type: String,
    enum: ['pending', 'approved', 'denied'],
    default: 'pending',
  },
  hostelInchargeApproval: {
    type: String,
    enum: ['pending', 'approved', 'denied'],
    default: 'pending',
  },
  wardenApproval: {
    type: String,
    enum: ['pending', 'approved', 'denied'],
    default: 'pending',
  },
  approvalTimestamps: {
    floorIncharge: Date,
    hostelIncharge: Date,
    warden: Date,
  },
  approvalFlow: [{
    level: {
      type: mongoose.Schema.Types.Mixed, // Allow both string and number
      required: true,
      validate: {
        validator: function(v) {
          const validValues = ['1', '2', '3', 'floor-incharge', 'hostel-incharge', 'warden'];
          return validValues.includes(String(v));
        },
        message: props => `${props.value} is not a valid level`
      }
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'denied'],
      default: 'pending'
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    remarks: {
      type: String,
      default: ''
    },
    approvedBy: {
      type: String,
      required: true
    },
    approverModel: {
      type: String,
      required: true,
      enum: ['User', 'Admin'],
      default: 'Admin'
    },
    approverInfo: {
      email: {
        type: String,
        required: true
      },
      role: {
        type: String,
        required: true,
        enum: ['floor-incharge', 'hostel-incharge', 'warden', 'FloorIncharge', 'HostelIncharge', 'Warden']
      }
    }
  }],
  currentLevel: {
    type: String,
    enum: ['floor-incharge', 'hostel-incharge', 'warden', 'approved', 'completed'],
    default: 'floor-incharge',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  qrCode: {
    outgoing: {
      data: String,
      generatedAt: Date
    },
    incoming: {
      data: String,
      generatedAt: Date
    }
  },
  checkIn: {
    time: Date,
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  checkOut: {
    time: Date,
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
});

// Add indexes for better query performance
outingRequestSchema.index({ currentLevel: 1 });
outingRequestSchema.index({ 'approvalFlow.userId': 1 });
outingRequestSchema.index({ hostelBlock: 1, floor: 1 });

// Add static methods to help with querying
outingRequestSchema.statics.findForFloorIncharge = function(userId, hostelBlock, floor) {
  return this.find({
    $or: [
      {
        currentLevel: 'floor-incharge',
        hostelBlock: hostelBlock,
        floor: this.normalizeFloor(floor)
      },
      {
        'approvalFlow.userId': userId
      }
    ]
  }).populate('studentId').sort({ createdAt: -1 });
};

outingRequestSchema.statics.findForHostelIncharge = function(userId, hostelBlock) {
  return this.find({
    $or: [
      {
        currentLevel: 'hostel-incharge',
        hostelBlock: hostelBlock
      },
      {
        'approvalFlow.userId': userId
      }
    ]
  }).populate('studentId').sort({ createdAt: -1 });
};

outingRequestSchema.statics.findForWarden = function(userId) {
  return this.find({
    $or: [
      { currentLevel: 'warden' },
      { 'approvalFlow.userId': userId }
    ]
  }).populate('studentId').sort({ createdAt: -1 });
};

outingRequestSchema.methods.validateNextApprover = function(approverRole) {
  const approvalSequence = ['floor-incharge', 'hostel-incharge', 'warden'];
  const currentIndex = approvalSequence.indexOf(this.currentLevel);
  const approverIndex = approvalSequence.indexOf(approverRole);
  
  console.log('Validating approver:', {
    currentLevel: this.currentLevel,
    approverRole,
    currentIndex,
    approverIndex,
    approvalFlow: this.approvalFlow
  });

  if (currentIndex === -1 || approverIndex === -1) {
    throw new Error('Invalid approval level');
  }

  if (approverIndex !== currentIndex) {
    throw new Error(`Invalid approval sequence. Expected ${this.currentLevel}, got ${approverRole}`);
  }

  return true;
};

outingRequestSchema.methods.validateApprovalFlow = function(approvalEntry) {
  const validRoles = ['floor-incharge', 'hostel-incharge', 'warden', 'FloorIncharge', 'HostelIncharge', 'Warden'];
  const validLevels = ['1', '2', '3', 'floor-incharge', 'hostel-incharge', 'warden'];

  const missingFields = [];
  if (!approvalEntry.level) missingFields.push('level');
  if (!approvalEntry.status) missingFields.push('status');
  if (!approvalEntry.approvedBy) missingFields.push('approvedBy');
  if (!approvalEntry.approverInfo?.email) missingFields.push('approverInfo.email');
  if (!approvalEntry.approverInfo?.role) missingFields.push('approverInfo.role');

  if (missingFields.length > 0) {
    throw new Error(`Missing required approval fields: ${missingFields.join(', ')}`);
  }

  // Validate level
  if (!validLevels.includes(String(approvalEntry.level))) {
    throw new Error(`Invalid level: ${approvalEntry.level}. Must be one of: ${validLevels.join(', ')}`);
  }

  // Validate role
  if (!validRoles.includes(approvalEntry.approverInfo.role)) {
    throw new Error(`Invalid role: ${approvalEntry.approverInfo.role}. Must be one of: ${validRoles.join(', ')}`);
  }

  // Validate approval sequence
  try {
    this.validateApprovalSequence(approvalEntry);
  } catch (error) {
    throw new Error(`Invalid approval sequence: ${error.message}`);
  }

  return true;
};

outingRequestSchema.methods.validateApprovalSequence = function(newApproval) {
  // Define approval levels and their order
  const workflowLevels = {
    'floor-incharge': 1,
    'hostel-incharge': 2,
    'warden': 3,
    '1': 1,
    '2': 2,
    '3': 3
  };

  const getLevel = (level) => workflowLevels[String(level)] || 0;
  const newLevel = getLevel(newApproval.level);

  // Log validation context
  console.log('Validating approval:', {
    newApproval,
    currentLevel: this.currentLevel,
    existingApprovals: this.approvalFlow?.map(a => ({
      level: a.level,
      status: a.status
    }))
  });

  // Basic validation
  if (!newLevel) {
    throw new Error(`Invalid approval level: ${newApproval.level}`);
  }

  const existingApprovals = this.approvalFlow || [];
  
  // First approval must be from floor incharge
  if (existingApprovals.length === 0 && newLevel !== 1) {
    throw new Error('First approval must be from Floor Incharge');
  }

  // Get last valid approval
  const lastValidApproval = [...existingApprovals]
    .reverse()
    .find(a => a.status === 'approved');

  // Ensure proper sequence
  if (lastValidApproval) {
    const lastLevel = getLevel(lastValidApproval.level);
    
    // Allow same level approvals for current level
    if (newLevel === getLevel(this.currentLevel)) {
      return true;
    }

    // Check sequence
    if (newLevel !== lastLevel + 1) {
      throw new Error(
        `Invalid approval sequence: Expected level ${lastLevel + 1}, got ${newLevel}`
      );
    }
  }

  return true;
};

outingRequestSchema.pre('save', function(next) {
  try {
    if (this.isModified('approvalFlow') && this.approvalFlow?.length > 0) {
      // Get latest approval
      const latestApproval = this.approvalFlow[this.approvalFlow.length - 1];
      
      // Update status fields based on approval
      if (latestApproval.status === 'approved') {
        const level = String(latestApproval.level);
        switch (level) {
          case '1':
          case 'floor-incharge':
            this.floorInchargeApproval = 'approved';
            if (this.currentLevel === 'floor-incharge') {
              this.currentLevel = 'hostel-incharge';
            }
            break;
          case '2':
          case 'hostel-incharge':
            this.hostelInchargeApproval = 'approved';
            if (this.currentLevel === 'hostel-incharge') {
              this.currentLevel = 'warden';
            }
            break;
          case '3':
          case 'warden':
            this.wardenApproval = 'approved';
            if (this.currentLevel === 'warden') {
              this.currentLevel = 'approved';
              this.status = 'approved';
            }
            break;
        }
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Update the pre-save middleware for approval sequence validation
outingRequestSchema.pre('save', function(next) {
  try {
    if (this.isModified('approvalFlow')) {
      // Skip sequence validation for initial floor incharge approval
      if (this.approvalFlow.length === 1 && 
          (this.approvalFlow[0].level === 'floor-incharge' || 
           this.approvalFlow[0].level === '1')) {
        return next();
      }

      // Map numeric levels to string levels for validation
      const levelMap = {
        '1': 'floor-incharge',
        '2': 'hostel-incharge',
        '3': 'warden',
        'floor-incharge': 'floor-incharge',
        'hostel-incharge': 'hostel-incharge',
        'warden': 'warden'
      };

      const approvalOrder = ['floor-incharge', 'hostel-incharge', 'warden'];

      // Validate approval sequence
      if (this.approvalFlow.length > 1) {
        let lastValidLevel = null;
        
        for (const approval of this.approvalFlow) {
          const currentLevel = levelMap[String(approval.level)];
          
          if (!currentLevel) {
            throw new Error(`Invalid approval level: ${approval.level}`);
          }

          const currentIndex = approvalOrder.indexOf(currentLevel);
          
          if (lastValidLevel) {
            const lastIndex = approvalOrder.indexOf(lastValidLevel);
            
            // Allow same level approvals for floor incharge
            if (currentLevel === 'floor-incharge' && lastValidLevel === 'floor-incharge') {
              continue;
            }
            
            // Ensure proper sequence for other levels
            if (currentIndex <= lastIndex && currentLevel !== lastValidLevel) {
              throw new Error(`Invalid approval sequence: ${lastValidLevel} -> ${currentLevel}`);
            }
          }

          lastValidLevel = currentLevel;
        }
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

outingRequestSchema.methods.moveToNextLevel = async function() {
  const workflow = {
    'floor-incharge': 'hostel-incharge',
    'hostel-incharge': 'warden',
    'warden': 'completed'
  };

  if (!workflow[this.currentLevel]) {
    throw new Error(`Invalid current level: ${this.currentLevel}`);
  }

  const nextLevel = workflow[this.currentLevel];
  this.currentLevel = nextLevel;

  if (nextLevel === 'completed') {
    this.status = 'approved';
    await this.generateQRCodes();
  }

  return await this.save();
};

// Add validation for Warden approval
outingRequestSchema.methods.validateWardenApproval = function() {
  if (this.currentLevel !== 'warden') {
    throw new Error('Request not at Warden level');
  }

  if (this.hostelInchargeApproval !== 'approved') {
    throw new Error('Hostel Incharge approval required first');
  }

  return true;
};

outingRequestSchema.methods.generateQRCodes = async function() {
  try {
    const qrData = {
      requestId: this._id,
      name: this.studentId.name,
      rollNumber: this.studentId.rollNumber,
      phoneNumber: this.studentId.phoneNumber,
      parentPhoneNumber: this.parentPhoneNumber,
      outTime: this.outingTime,
      inTime: this.returnTime,
      hostelBlock: this.hostelBlock,
      floor: this.floor
    };

    // Generate outgoing QR code with error handling
    this.qrCode = {
      outgoing: {
        data: await QRCode.toDataURL(JSON.stringify({ ...qrData, type: 'outgoing' }), {
          errorCorrectionLevel: 'H',
          margin: 1,
          width: 300
        }),
        generatedAt: new Date()
      },
      incoming: {
        data: await QRCode.toDataURL(JSON.stringify({ ...qrData, type: 'incoming' }), {
          errorCorrectionLevel: 'H',
          margin: 1,
          width: 300
        }),
        generatedAt: new Date()
      }
    };

    return await this.save();
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw new Error('Failed to generate QR codes');
  }
};

outingRequestSchema.statics.normalizeFloor = function(floor) {
  const numericFloor = String(floor).replace(/\D/g, '');
  const floorMap = {
    '1': '1st Floor',
    '2': '2nd Floor',
    '3': '3rd Floor',
    '4': '4th Floor'
  };
  return floorMap[numericFloor] || floor;
};

outingRequestSchema.statics.matchesFloor = function(requestFloor, assignedFloors) {
  if (!requestFloor || !assignedFloors) return false;
  
  const normalizeFloor = (floor) => {
    const numeric = String(floor).replace(/[^\d]/g, '');
    const formatted = `${numeric}${this.getFloorSuffix(numeric)} Floor`;
    return [floor, numeric, formatted];
  };

  const requestFormats = normalizeFloor(requestFloor);
  const assignedFormats = Array.isArray(assignedFloors) 
    ? assignedFloors.flatMap(normalizeFloor)
    : normalizeFloor(assignedFloors);

  return requestFormats.some(rf => assignedFormats.includes(rf));
};

outingRequestSchema.statics.getFloorSuffix = function(num) {
  const n = parseInt(num);
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
};

outingRequestSchema.methods.addApproval = function(approver, status, remarks = '') {
  if (!approver || !approver.role || !approver.email) {
    throw new Error('Invalid approver data');
  }

  const approvalEntry = {
    level: approver.role,
    status: status || 'approved',
    timestamp: new Date(),
    remarks: remarks || '',
    approvedBy: approver.email,
    approverModel: approver.isAdmin ? 'Admin' : 'User',
    approverInfo: {
      email: approver.email,
      role: approver.role
    }
  };

  if (!approvalEntry.level || !approvalEntry.approvedBy || 
      !approvalEntry.approverInfo?.email || !approvalEntry.approverInfo?.role) {
    throw new Error('Missing required approval fields');
  }

  this.approvalFlow.push(approvalEntry);
  return this;
};

outingRequestSchema.pre('save', function(next) {
  if (this.approvalFlow?.length > 0) {
    const uniqueApprovals = [];
    const seen = new Set();
    
    this.approvalFlow.forEach(approval => {
      const key = `${approval.approverInfo?.email}-${approval.level}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueApprovals.push(approval);
      }
    });
    
    this.approvalFlow = uniqueApprovals;
  }
  next();
});

outingRequestSchema.methods.canApprove = function(userRole) {
  try {
    const approvalSequence = ['floor-incharge', 'hostel-incharge', 'warden'];
    const currentIndex = approvalSequence.indexOf(this.currentLevel);
    const userIndex = approvalSequence.indexOf(userRole);

    if (currentIndex === -1 || userIndex === -1) {
      throw new Error('Invalid approval role');
    }

    // Check if this is the correct level for approval
    if (currentIndex !== userIndex) {
      throw new Error(`Invalid approval sequence. Expected ${this.currentLevel}, got ${userRole}`);
    }

    // For levels after floor-incharge, check previous approval
    if (userIndex > 0) {
      const previousRole = approvalSequence[userIndex - 1];
      const hasPreRequisiteApproval = this.approvalFlow.some(
        approval => approval.level === previousRole && approval.status === 'approved'
      );

      if (!hasPreRequisiteApproval) {
        throw new Error(`Missing prerequisite approval from ${previousRole}`);
      }
    }

    return true;
  } catch (error) {
    console.error('Approval validation error:', error);
    throw error;
  }
};

outingRequestSchema.methods.validateApproval = function(approvalData) {
  const { level, approverInfo } = approvalData;
  
  if (!level || !approverInfo?.email || !approverInfo?.role) {
    throw new Error('Missing required approval information');
  }
  
  return true;
};

module.exports = mongoose.model('OutingRequest', outingRequestSchema);