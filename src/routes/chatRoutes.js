const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const chatController = require('../controllers/chatController');

// Démarrer/récupérer une conversation
router.post('/conversations', protect, chatController.createOrGetConversation);

// Récupérer mes conversations
router.get('/conversations', protect, chatController.getMyConversations);

// Récupérer les messages d'une conversation
router.get('/conversations/:id/messages', protect, chatController.getMessages);

// Envoyer un message
router.post('/conversations/:id/messages', protect, chatController.sendMessage);

router.put('/conversations/:id/read', protect, chatController.markAsRead);

module.exports = router;
