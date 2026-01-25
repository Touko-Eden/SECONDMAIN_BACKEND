const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Annonce = sequelize.define('Annonce', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Le titre est requis' },
      len: {
        args: [5, 200],
        msg: 'Le titre doit contenir entre 5 et 200 caractères'
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'La description est requise' },
      len: {
        args: [20, 5000],
        msg: 'La description doit contenir entre 20 et 5000 caractères'
      }
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Le prix est requis' },
      min: {
        args: [0],
        msg: 'Le prix doit être positif'
      }
    }
  },
  category: {
    type: DataTypes.ENUM(
      'Électronique',
      'Mobilier',
      'Mode',
      'Automobile',
      'Enfants',
      'Maison',
      'Sport',
      'Divers'
    ),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'La catégorie est requise' }
    }
  },
  condition: {
    type: DataTypes.ENUM('Neuf', 'Comme neuf', 'Bon état', 'État acceptable', 'Mauvais état'),
    allowNull: false,
    defaultValue: 'Bon état'
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'La localisation est requise' }
    }
  },
  images: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    validate: {
      isValidImages(value) {
        if (!Array.isArray(value) || value.length < 3) {
          throw new Error('Au moins 3 images sont requises');
        }
      }
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'vendu', 'suspendu', 'supprimé'),
    defaultValue: 'active',
    allowNull: false
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'annonces',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['category'] },
    { fields: ['location'] },
    { fields: ['status'] },
    { fields: ['price'] }
  ]
});

// Association avec User
Annonce.belongsTo(User, {
  foreignKey: 'userId',
  as: 'seller'
});

User.hasMany(Annonce, {
  foreignKey: 'userId',
  as: 'annonces'
});

module.exports = Annonce;