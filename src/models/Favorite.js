const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Annonce = require('./Annonce');

const Favorite = sequelize.define('Favorite', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  annonceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'annonces',
      key: 'id'
    }
  }
}, {
  tableName: 'favorites',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['annonceId'] },
    { fields: ['userId', 'annonceId'], unique: true }
  ]
});

// Associations
Favorite.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Favorite.belongsTo(Annonce, { foreignKey: 'annonceId', as: 'annonce' });

User.hasMany(Favorite, { foreignKey: 'userId', as: 'favorites' });
Annonce.hasMany(Favorite, { foreignKey: 'annonceId', as: 'favoritedBy' });

module.exports = Favorite;
