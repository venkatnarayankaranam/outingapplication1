const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const studentController = require('../controllers/studentController');

router.get('/dashboard', auth, checkRole(['student']), studentController.getStudentDashboard);
router.post('/submit-request', auth, checkRole(['student']), studentController.submitOutingRequest);

module.exports = router;
