const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const paymentController = require('../controllers/paymentController');

router.post('/:orderId/initiate', protect, paymentController.initiateRedirectPayment);
router.post('/webhook', paymentController.webhook);
router.get('/return', paymentController.returnPage);
router.get('/:orderId/status', protect, paymentController.getStatus);

module.exports = router;
