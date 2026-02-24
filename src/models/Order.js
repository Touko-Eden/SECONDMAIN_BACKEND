const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Annonce = require('./Annonce');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  buyerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  sellerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  annonceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'annonces', key: 'id' }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: { min: 1 }
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.ENUM('cod', 'mobile_money', 'card'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'canceled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  reference: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true
  }
}, {
  tableName: 'orders',
  timestamps: true,
  indexes: [
    { fields: ['buyerId'] },
    { fields: ['sellerId'] },
    { fields: ['annonceId'] },
    { fields: ['status'] },
    { fields: ['reference'], unique: true }
  ]
});

Order.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });
Order.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });
Order.belongsTo(Annonce, { foreignKey: 'annonceId', as: 'annonce' });

module.exports = Order;
