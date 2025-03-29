const PDFDocument = require('pdfkit');

const generatePDF = (res, { title, requests, role }) => {
  const doc = new PDFDocument({
    margin: 50,
    size: 'A4',
    layout: 'landscape'
  });

  // Pipe the PDF to the response
  doc.pipe(res);

  // Add header
  doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).font('Helvetica').text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
  doc.moveDown();

  // Define table layout
  const tableTop = 150;
  const columnSpacing = {
    srNo: 30,
    name: 100,
    rollNo: 80,
    blockRoom: 80,
    contact: 100,
    branch: 80,
    outTime: 70,
    inTime: 70,
    purpose: 120
  };

  let currentY = tableTop;

  // Draw table headers
  doc.font('Helvetica-Bold');
  let currentX = 50;

  const headers = [
    { width: columnSpacing.srNo, text: 'Sr.No' },
    { width: columnSpacing.name, text: 'Name' },
    { width: columnSpacing.rollNo, text: 'Roll No' },
    { width: columnSpacing.blockRoom, text: 'Block/Room' },
    { width: columnSpacing.contact, text: 'Contact' },
    { width: columnSpacing.branch, text: 'Branch' },
    { width: columnSpacing.outTime, text: 'Out Time' },
    { width: columnSpacing.inTime, text: 'In Time' },
    { width: columnSpacing.purpose, text: 'Purpose' }
  ];

  // Draw header background
  doc.fillColor('#f3f4f6')
     .rect(currentX - 5, currentY - 5, 
           headers.reduce((sum, h) => sum + h.width, 0) + 10, 25)
     .fill();

  // Draw header text
  doc.fillColor('#000000');
  headers.forEach(header => {
    doc.text(header.text, currentX, currentY, {
      width: header.width,
      align: 'left'
    });
    currentX += header.width;
  });

  currentY += 30;
  doc.font('Helvetica');

  // Draw table rows
  requests.forEach((request, index) => {
    // Add new page if needed
    if (currentY > 500) {
      doc.addPage();
      currentY = 50;
    }

    currentX = 50;
    const rowHeight = 20;

    // Draw row background (alternate colors)
    doc.fillColor(index % 2 === 0 ? '#ffffff' : '#f9fafb')
       .rect(currentX - 5, currentY - 5, 
             headers.reduce((sum, h) => sum + h.width, 0) + 10, rowHeight + 10)
       .fill();

    // Draw row data
    doc.fillColor('#000000');

    // Serial Number
    doc.text((index + 1).toString(), currentX, currentY, {
      width: columnSpacing.srNo,
      align: 'left'
    });
    currentX += columnSpacing.srNo;

    // Student Name
    doc.text(request.studentId.name || 'N/A', currentX, currentY, {
      width: columnSpacing.name,
      align: 'left'
    });
    currentX += columnSpacing.name;

    // Roll Number
    doc.text(request.studentId.rollNumber || 'N/A', currentX, currentY, {
      width: columnSpacing.rollNo,
      align: 'left'
    });
    currentX += columnSpacing.rollNo;

    // Block/Room
    doc.text(`${request.studentId.hostelBlock}/${request.studentId.roomNumber}`, 
             currentX, currentY, {
      width: columnSpacing.blockRoom,
      align: 'left'
    });
    currentX += columnSpacing.blockRoom;

    // Contact Details
    doc.text(`${request.studentId.phoneNumber}\n${request.parentPhoneNumber}`, 
             currentX, currentY, {
      width: columnSpacing.contact,
      align: 'left'
    });
    currentX += columnSpacing.contact;

    // Branch
    doc.text(request.studentId.branch || 'N/A', currentX, currentY, {
      width: columnSpacing.branch,
      align: 'left'
    });
    currentX += columnSpacing.branch;

    // Out Time
    doc.text(request.outingTime || 'N/A', currentX, currentY, {
      width: columnSpacing.outTime,
      align: 'left'
    });
    currentX += columnSpacing.outTime;

    // In Time
    doc.text(request.returnTime || 'N/A', currentX, currentY, {
      width: columnSpacing.inTime,
      align: 'left'
    });
    currentX += columnSpacing.inTime;

    // Purpose
    doc.text(request.purpose || 'N/A', currentX, currentY, {
      width: columnSpacing.purpose,
      align: 'left'
    });

    currentY += rowHeight + 10;
  });

  // Add footer
  doc.fontSize(8)
     .text(`Generated from ${role} Dashboard - ${new Date().toLocaleString()}`, 50, doc.page.height - 50, {
       align: 'center'
     });

  // Finalize PDF
  doc.end();
};

module.exports = { generatePDF };
