const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  fullName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Le nom complet est requis' },
      len: {
        args: [2, 100],
        msg: 'Le nom doit contenir entre 2 et 100 caractères'
      }
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: {
      msg: 'Cet email est déjà utilisé'
    },
    validate: {
      isEmail: { msg: 'Email invalide' }
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: {
      msg: 'Ce numéro de téléphone est déjà utilisé'
    },
    validate: {
      notEmpty: { msg: 'Le numéro de téléphone est requis' }
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Le mot de passe est requis' },
      len: {
        args: [6, 255],
        msg: 'Le mot de passe doit contenir au moins 6 caractères'
      }
    }
  },
  role: {
    type: DataTypes.ENUM('acheteur', 'vendeur', 'admin'),
    defaultValue: 'acheteur',
    allowNull: false
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  verificationCode: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  avatar: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    // Hash le mot de passe avant de sauvegarder
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Méthode pour comparer les mots de passe
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Méthode pour obtenir l'utilisateur sans le mot de passe
User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  delete values.verificationCode;
  return values;
};

module.exports = User;