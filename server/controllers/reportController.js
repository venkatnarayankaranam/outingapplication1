const PDFDocument = require('pdfkit');
const OutingRequest = require('../models/OutingRequest');

exports.generateReport = async (req, res) => {
  try {
    const { role, hostelBlock, assignedFloor } = req.user;
    const { startDate, endDate, status } = req.query;

    let query = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    // Add role-specific filters
    switch(role) {
      case 'floor-incharge':
        query.hostelBlock = hostelBlock;
        query.floor = { $in: assignedFloor };
        break;
      case 'hostel-incharge':
        query.hostelBlock = hostelBlock;
        break;
      case 'warden':
        // Warden can see all requests
        break;
    }

    if (status) {
      query.status = status;
    }

    const requests = await OutingRequest.find(query)
      .populate('studentId', 'name rollNumber hostelBlock roomNumber')
      .sort({ createdAt: -1 });

    // Generate PDF
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=outing-report-${Date.now()}.pdf`);
    
    doc.pipe(res);

    // Add content to PDF
    doc.fontSize(16).text('Outing Requests Report', { align: 'center' });
    doc.moveDown();

    requests.forEach(request => {
      doc.fontSize(12).text(`Student: ${request.studentId.name} (${request.studentId.rollNumber})`);
      doc.fontSize(10).text(`Date: ${request.outingDate.toLocaleDateString()}`);
      doc.fontSize(10).text(`Time: ${request.outingTime} - ${request.returnTime}`);
      doc.fontSize(10).text(`Status: ${request.status}`);
      doc.moveDown();
    });

    doc.end();

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
