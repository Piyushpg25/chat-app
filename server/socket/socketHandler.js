const Message = require('../models/Message');
const User = require('../models/User');

const socketHandler = (io) => {
  const onlineUsers = {};

  io.on('connection', (socket) => {
    console.log(`🟢 Connected: ${socket.id}`);

    socket.on('user_online', async (userId) => {
      try {
        const user = await User.findById(userId).select('username');
        if (user) {
          onlineUsers[userId] = {
            socketId: socket.id,
            username: user.username
          };
          io.emit('online_users', Object.values(onlineUsers).map(u => u.username));
        }
      } catch (err) {
        console.log('user_online error:', err.message);
      }
    });

    socket.on('join_room', async (room) => {
      for (const joined of socket.rooms) {
        if (joined !== socket.id) {
          socket.leave(joined);
        }
      }
      socket.join(room);
      try {
        const messages = await Message.find({ room })
          .populate('sender', 'username')
          .sort({ createdAt: 1 })
          .limit(50);
        socket.emit('message_history', messages);
      } catch (err) {
        console.log('Message history error:', err.message);
      }
    });

    // ── Ye poora block replace karo ──
socket.on('send_message', async (data) => {
  try {
    const message = await Message.create({
      sender:    data.senderId,
      room:      data.room,
      content:   data.content  || '',
      mediaUrl:  data.mediaUrl  || null,
      mediaType: data.mediaType || 'text',
      mediaName: data.mediaName || null,
      mediaSize: data.mediaSize || null,
    });
    const populated = await message.populate('sender', 'username');
    io.to(data.room).emit('receive_message', populated);
  } catch (err) {
    console.log('Message error:', err.message);
  }
});

    
    socket.on('typing', (data) => {
      socket.to(data.room).emit('user_typing', data.username);
    });

    socket.on('stop_typing', (data) => {
      socket.to(data.room).emit('user_stop_typing');
    });

    socket.on('delete_message', async (data) => {
      try {
        const message = await Message.findById(data.messageId);
        if (message && message.sender.toString() === data.userId) {
          await Message.findByIdAndDelete(data.messageId);
          io.to(data.room).emit('message_deleted', data.messageId);
        }
      } catch (err) {
        console.log('Delete error:', err.message);
      }
    });

    socket.on('edit_message', async (data) => {
      try {
        const message = await Message.findById(data.messageId);
        if (message && message.sender.toString() === data.userId) {
          message.content = data.content;
          message.edited = true;
          await message.save();
          const updated = await message.populate('sender', 'username');
          io.to(data.room).emit('message_edited', updated);
        }
      } catch (err) {
        console.log('Edit error:', err.message);
      }
    });

    // ✅ FIXED — to ki jagah io use karo
    socket.on('disconnect', () => {
      const userId = Object.keys(onlineUsers).find(
        key => onlineUsers[key].socketId === socket.id
      );
      if (userId) {
        delete onlineUsers[userId];
        io.emit('online_users', Object.values(onlineUsers).map(u => u.username));
      }
      console.log(`🔴 Disconnected: ${socket.id}`);
    });
  });
};

module.exports = socketHandler;