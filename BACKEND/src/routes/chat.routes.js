const express = require('express');
const router = express.Router();
const { Message, Conversation } = require('../models/Message');
const { protect: auth } = require('../middlewares/authMiddleware');

// Get or create conversation between two users
router.post('/conversation', auth, async (req, res) => {
  try {
    const { participantId } = req.body;
    const userId = req.user._id; // FIX: was req.user.userId (undefined), correct field is _id

    let conversation = await Conversation.findOne({
      participants: { $all: [userId, participantId] }
    }).populate('participants', 'name profileImage').populate('lastMessage');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, participantId]
      });
      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'name profileImage');
    }

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all conversations for user
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.user._id; // FIX: was req.user.userId
    const conversations = await Conversation.find({
      participants: userId
    })
    .populate('participants', 'name profileImage role')
    .populate('lastMessage')
    .sort({ lastMessageAt: -1 });

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages in a conversation
router.get('/messages/:conversationId', auth, async (req, res) => {
  try {
    const userId = req.user._id; // FIX: was req.user.userId
    const { page = 1, limit = 50 } = req.query;
    const messages = await Message.find({ conversationId: req.params.conversationId })
      .populate('sender', 'name profileImage')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Mark messages as read
    await Message.updateMany(
      { conversationId: req.params.conversationId, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send a message
router.post('/message', auth, async (req, res) => {
  try {
    const { conversationId, content, messageType = 'text' } = req.body;
    const userId = req.user._id; // FIX: was req.user.userId

    const message = await Message.create({
      conversationId,
      sender: userId,
      content,
      messageType,
      readBy: [userId]
    });

    await Message.populate(message, { path: 'sender', select: 'name profileImage' });

    // Update conversation with last message
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastMessageAt: new Date()
    });

    // Emit socket event for real-time delivery
    const conversation = await Conversation.findById(conversationId);
    const io = req.app.get('io');
    
    if (io && conversation) {
      conversation.participants.forEach(participantId => {
        if (participantId.toString() !== userId.toString()) {
          io.to(`user:${participantId}`).emit('chat:new-message', {
            conversationId,
            message
          });
        }
      });
    }

    res.json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unread message count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const userId = req.user._id; // FIX: was req.user.userId
    const conversations = await Conversation.find({
      participants: userId
    });
    
    const conversationIds = conversations.map(c => c._id);
    
    const unreadCount = await Message.countDocuments({
      conversationId: { $in: conversationIds },
      sender: { $ne: userId },
      readBy: { $ne: userId }
    });

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark messages as read
router.put('/read/:conversationId', auth, async (req, res) => {
  try {
    const userId = req.user._id; // FIX: was req.user.userId
    await Message.updateMany(
      { 
        conversationId: req.params.conversationId, 
        readBy: { $ne: userId } 
      },
      { $addToSet: { readBy: userId } }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;