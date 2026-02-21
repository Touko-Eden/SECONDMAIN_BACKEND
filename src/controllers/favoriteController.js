const Favorite = require('../models/Favorite');
const Annonce = require('../models/Annonce');
const User = require('../models/User');

// @desc    Ajouter ou supprimer un favori
// @route   POST /api/favorites/toggle
// @access  Private
exports.toggleFavorite = async (req, res) => {
  try {
    const { annonceId } = req.body;
    const userId = req.user.id;

    if (!annonceId) {
      return res.status(400).json({
        success: false,
        message: 'L\'ID de l\'annonce est requis'
      });
    }

    // Vérifier si l'annonce existe
    const annonce = await Annonce.findByPk(annonceId);
    if (!annonce) {
      return res.status(404).json({
        success: false,
        message: 'Annonce non trouvée'
      });
    }

    // Vérifier si le favori existe déjà
    const existingFavorite = await Favorite.findOne({
      where: { userId, annonceId }
    });

    if (existingFavorite) {
      // Si existe, on supprime
      await existingFavorite.destroy();
      return res.status(200).json({
        success: true,
        isFavorite: false,
        message: 'Retiré des favoris'
      });
    } else {
      // Sinon, on crée
      await Favorite.create({ userId, annonceId });
      return res.status(201).json({
        success: true,
        isFavorite: true,
        message: 'Ajouté aux favoris'
      });
    }

  } catch (error) {
    console.error('Erreur toggleFavorite:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la gestion des favoris',
      error: error.message
    });
  }
};

// @desc    Obtenir les favoris de l'utilisateur
// @route   GET /api/favorites
// @access  Private
exports.getFavorites = async (req, res) => {
  try {
    const userId = req.user.id;

    const favorites = await Favorite.findAll({
      where: { userId },
      include: [{
        model: Annonce,
        as: 'annonce',
        include: [{
          model: User,
          as: 'seller',
          attributes: ['id', 'fullName', 'avatar', 'location']
        }]
      }],
      order: [['createdAt', 'DESC']]
    });

    // Transformer pour renvoyer directement la liste des annonces
    const annonces = favorites.map(f => {
      const a = f.annonce.toJSON();
      a.isFavorite = true; // Flag utile pour le frontend
      return a;
    });

    res.status(200).json({
      success: true,
      data: annonces
    });

  } catch (error) {
    console.error('Erreur getFavorites:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des favoris',
      error: error.message
    });
  }
};

// @desc    Vérifier si une annonce est en favori
// @route   GET /api/favorites/:annonceId/check
// @access  Private
exports.checkFavorite = async (req, res) => {
  try {
    const { annonceId } = req.params;
    const userId = req.user.id;

    const favorite = await Favorite.findOne({
      where: { userId, annonceId }
    });

    res.status(200).json({
      success: true,
      isFavorite: !!favorite
    });

  } catch (error) {
    console.error('Erreur checkFavorite:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};
