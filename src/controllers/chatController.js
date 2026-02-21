const { Op } = require('sequelize');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Annonce = require('../models/Annonce');

exports.createOrGetConversation = async (req, res) => {
  try {
    const { receiverId, annonceId } = req.body;
    const userId = req.user.id;

    if (!receiverId || parseInt(receiverId) === userId) {
      return res.status(400).json({
        success: false,
        message: 'Destinataire invalide'
      });
    }

    // Optionnel: s'assurer que l'annonce existe si fournie
    let annonce = null;
    if (annonceId) {
      annonce = await Annonce.findByPk(annonceId);
      if (!annonce) {
        return res.status(404).json({ success: false, message: 'Annonce non trouvée' });
      }
    }

    // Ordonner pour éviter doublons user1/user2
    const [u1, u2] = userId < receiverId ? [userId, receiverId] : [receiverId, userId];

    let conversation = await Conversation.findOne({
      where: {
        user1Id: u1,
        user2Id: u2,
        ...(annonceId ? { annonceId } : {})
      },
      include: [
        { model: User, as: 'user1', attributes: ['id', 'fullName', 'avatar'] },
        { model: User, as: 'user2', attributes: ['id', 'fullName', 'avatar'] },
        { model: Annonce, as: 'annonce', attributes: ['id', 'title', 'price'] }
      ]
    });

    if (!conversation) {
      conversation = await Conversation.create({
        user1Id: u1,
        user2Id: u2,
        annonceId: annonceId || null
      });
      conversation = await Conversation.findByPk(conversation.id, {
        include: [
          { model: User, as: 'user1', attributes: ['id', 'fullName', 'avatar'] },
          { model: User, as: 'user2', attributes: ['id', 'fullName', 'avatar'] },
          { model: Annonce, as: 'annonce', attributes: ['id', 'title', 'price'] }
        ]
      });
    }

    res.status(201).json({ success: true, data: conversation });
  } catch (error) {
    console.error('createOrGetConversation error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.getMyConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await Conversation.findAll({
      where: {
        [Op.or]: [{ user1Id: userId }, { user2Id: userId }]
      },
      include: [
        { model: User, as: 'user1', attributes: ['id', 'fullName', 'avatar'] },
        { model: User, as: 'user2', attributes: ['id', 'fullName', 'avatar'] },
        { model: Annonce, as: 'annonce', attributes: ['id', 'title', 'price'] }
      ],
      order: [['lastMessageAt', 'DESC'], ['updatedAt', 'DESC']]
    });
    res.status(200).json({ success: true, data: conversations });
  } catch (error) {
    console.error('getMyConversations error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { id } = req.params; // conversationId
    const userId = req.user.id;

    const conv = await Conversation.findByPk(id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation non trouvée' });
    if (![conv.user1Id, conv.user2Id].includes(userId)) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }

    const messages = await Message.findAll({
      where: { conversationId: id },
      include: [{ model: User, as: 'sender', attributes: ['id', 'fullName', 'avatar'] }],
      order: [['createdAt', 'ASC']]
    });

    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    console.error('getMessages error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { id } = req.params; // conversationId
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.toString().trim() === '') {
      return res.status(400).json({ success: false, message: 'Message vide' });
    }

    const conv = await Conversation.findByPk(id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation non trouvée' });
    if (![conv.user1Id, conv.user2Id].includes(userId)) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }

    const message = await Message.create({
      conversationId: conv.id,
      senderId: userId,
      content: content.toString().trim()
    });

    // Mettre à jour résumé conversation
    conv.lastMessageText = message.content;
    conv.lastMessageAt = message.createdAt;
    if (userId === conv.user1Id) {
      conv.unreadForUser2 += 1;
    } else {
      conv.unreadForUser1 += 1;
    }
    await conv.save();

    // Émettre l'événement temps réel si io présent
    try {
      const io = req.app.get('io');
      if (io) {
        const otherUserId = userId === conv.user1Id ? conv.user2Id : conv.user1Id;
        io.to(`user:${otherUserId}`).emit('message:new', {
          conversationId: conv.id,
          fromUserId: userId,
          content: message.content,
          createdAt: message.createdAt
        });
        io.to(`user:${otherUserId}`).emit('conversation:updated', {
          conversationId: conv.id,
          lastMessageText: conv.lastMessageText,
          lastMessageAt: conv.lastMessageAt,
          unreadForYou: userId === conv.user1Id ? conv.unreadForUser2 : conv.unreadForUser1
        });
      }
    } catch (e) {
      console.warn('Socket emit failed:', e.message);
    }

    const saved = await Message.findByPk(message.id, {
      include: [{ model: User, as: 'sender', attributes: ['id', 'fullName', 'avatar'] }]
    });

    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    console.error('sendMessage error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params; // conversationId
    const userId = req.user.id;

    const conv = await Conversation.findByPk(id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation non trouvée' });
    if (![conv.user1Id, conv.user2Id].includes(userId)) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }

    if (userId === conv.user1Id) {
      conv.unreadForUser1 = 0;
    } else {
      conv.unreadForUser2 = 0;
    }
    await conv.save();

    res.status(200).json({ success: true, message: 'Marqué comme lu' });
  } catch (error) {
    console.error('markAsRead error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};
