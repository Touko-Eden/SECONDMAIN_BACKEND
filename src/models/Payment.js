const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Order = require('./Order');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'orders', key: 'id' }
  },
  method: {
    type: DataTypes.ENUM('cod', 'mobile_money', 'card'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('initiated', 'succeeded', 'failed'),
    allowNull: false,
    defaultValue: 'initiated'
  },
  providerReference: {
    type: DataTypes.STRING(128),
    allowNull: true
  }
}, {
  tableName: 'payments',
  timestamps: true,
  indexes: [
    { fields: ['orderId'] },
    { fields: ['status'] }
  ]
});

Payment.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

module.exports = Payment;
