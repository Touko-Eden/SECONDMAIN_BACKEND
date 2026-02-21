const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Annonce = require('./Annonce');

const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user1Id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  user2Id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  annonceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'annonces', key: 'id' }
  },
  lastMessageText: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  unreadForUser1: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  unreadForUser2: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'conversations',
  timestamps: true,
  indexes: [
    { fields: ['user1Id'] },
    { fields: ['user2Id'] },
    { fields: ['annonceId'] },
    { fields: ['lastMessageAt'] }
  ]
});

Conversation.belongsTo(User, { foreignKey: 'user1Id', as: 'user1' });
Conversation.belongsTo(User, { foreignKey: 'user2Id', as: 'user2' });
Conversation.belongsTo(Annonce, { foreignKey: 'annonceId', as: 'annonce' });

module.exports = Conversation;
