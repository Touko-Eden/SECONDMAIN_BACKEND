const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { Op } = require('sequelize');

// Générer un token JWT
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, 'votre_secret_jwt_super_securise_237_secondmain_2025', {
    expiresIn: '7d'
  });
};

// @desc    Inscription d'un nouvel utilisateur
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { fullName, email, phone, password, role } = req.body;

    // Validation
    if (!fullName || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir tous les champs requis'
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email: email || null },
          { phone }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Un utilisateur avec cet email ou téléphone existe déjà'
      });
    }

    // Créer l'utilisateur
    const user = await User.create({
      fullName,
      email: email || null,
      phone,
      password,
      role: role || 'acheteur'
    });

    // Générer le token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      data: {
        user: user.toJSON(),
        token
      }
    });

  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription',
      error: error.message
    });
  }
};

// @desc    Connexion d'un utilisateur
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Validation
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir un email/téléphone et un mot de passe'
      });
    }

    // Trouver l'utilisateur par email ou téléphone
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: identifier },
          { phone: identifier }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects'
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects'
      });
    }

    // Vérifier si le compte est actif
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Votre compte a été désactivé'
      });
    }

    // Générer le token
    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: user.toJSON(),
        token
      }
    });

  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion',
      error: error.message
    });
  }
};

// @desc    Obtenir l'utilisateur connecté
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    res.status(200).json({
      success: true,
      data: user.toJSON()
    });
  } catch (error) {
    console.error('Erreur getMe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// @desc    Mettre à jour le profil utilisateur
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, email, location } = req.body;

    const user = await User.findByPk(req.user.id);

    if (fullName) user.fullName = fullName;
    if (email) user.email = email;
    if (location) user.location = location;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: user.toJSON()
    });

  } catch (error) {
    console.error('Erreur updateProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil',
      error: error.message
    });
  }
};

// @desc    Vérifier le numéro de téléphone avec OTP
// @route   POST /api/auth/verify-phone
// @access  Private
exports.verifyPhone = async (req, res) => {
  try {
    const { code } = req.body;

    const user = await User.findByPk(req.user.id);

    if (user.verificationCode !== code) {
      return res.status(400).json({
        success: false,
        message: 'Code de vérification invalide'
      });
    }

    user.isVerified = true;
    user.verificationCode = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Téléphone vérifié avec succès',
      data: user.toJSON()
    });

  } catch (error) {
    console.error('Erreur verifyPhone:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification',
      error: error.message
    });
  }
};

// @desc    Demander un nouveau code OTP
// @route   POST /api/auth/resend-otp
// @access  Private
exports.resendOTP = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    // Générer un code OTP aléatoire (6 chiffres)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    user.verificationCode = otp;
    await user.save();

    // TODO: Envoyer le code par SMS avec Twilio ou un service local
    console.log(`Code OTP pour ${user.phone}: ${otp}`);

    res.status(200).json({
      success: true,
      message: 'Code OTP envoyé',
      // En développement seulement, retirer en production
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });

  } catch (error) {
    console.error('Erreur resendOTP:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi du code',
      error: error.message
    });
  }
};