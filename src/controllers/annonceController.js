const Annonce = require('../models/Annonce');
const User = require('../models/User');
const { Op } = require('sequelize');
const fs = require('fs');

// @desc    Créer une nouvelle annonce
// @route   POST /api/annonces
// @access  Private
exports.createAnnonce = async (req, res) => {
  try {
    const { title, description, price, category, condition, location } = req.body;
    
    // ---------------------------------------------------------
    // TRAITEMENT DES IMAGES (Nouveau)
    // ---------------------------------------------------------
    let images = [];
    
    // Cas 1: Fichiers uploadés via Multipart (App Mobile)
    if (req.files && req.files.length > 0) {
        // Crée des URLs complètes pour l'accès public
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        images = req.files.map(file => `${baseUrl}/uploads/${file.filename}`);
    } 
    // Cas 2: URLs envoyées en JSON (Test ou Legacy)
    else if (req.body.images) {
        images = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
    }

    // ---------------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------------
    if (!title || !description || !price || !category || !location) {
      // Nettoyage si erreur validation
      if (req.files) req.files.forEach(f => fs.unlinkSync(f.path));
      
      return res.status(400).json({ 
          success: false, 
          message: 'Veuillez fournir tous les champs requis (titre, description, prix, catégorie, localisation)' 
      });
    }

    if (images.length < 3) {
      if (req.files) req.files.forEach(f => fs.unlinkSync(f.path));
      
      return res.status(400).json({ 
          success: false, 
          message: 'Au moins 3 images sont requises' 
      });
    }

    // ---------------------------------------------------------
    // CRÉATION DE L'ANNONCE
    // ---------------------------------------------------------
    const annonce = await Annonce.create({
      title,
      description,
      price: parseFloat(price), // Assure que le prix est un nombre
      category,
      condition: condition || 'Bon état',
      location,
      images: images, // Sequelize gère le tableau grâce à DataTypes.JSON
      userId: req.user.id
    });

    // Récupérer l'annonce avec infos vendeur
    const annonceWithSeller = await Annonce.findByPk(annonce.id, {
      include: [{
        model: User,
        as: 'seller',
        attributes: ['id', 'fullName', 'phone', 'location', 'avatar']
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Annonce créée avec succès',
      data: annonceWithSeller
    });

  } catch (error) {
    console.error('Erreur createAnnonce:', error);
    // Nettoyage en cas d'erreur DB
    if (req.files) {
        req.files.forEach(f => {
            if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'annonce',
      error: error.message
    });
  }
};

// @desc    Obtenir toutes les annonces avec filtres
// @route   GET /api/annonces
// @access  Public
exports.getAnnonces = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      location,
      minPrice,
      maxPrice,
      condition,
      search,
      sortBy = 'createdAt',
      order = 'DESC'
    } = req.query;

    // Construction des filtres
    const where = { status: 'active' };

    if (category && category !== 'Tous') {
      where.category = category;
    }

    if (location && location !== 'Tous') {
      where.location = location;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
    }

    if (condition) {
      where.condition = condition;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    // Pagination
    const offset = (page - 1) * limit;

    // Récupération des annonces
    const { count, rows: annonces } = await Annonce.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'seller',
        attributes: ['id', 'fullName', 'phone', 'location', 'avatar']
      }],
      limit: parseInt(limit),
      offset: offset,
      order: [[sortBy, order.toUpperCase()]]
    });

    res.status(200).json({
      success: true,
      data: {
        annonces,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Erreur getAnnonces:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des annonces',
      error: error.message
    });
  }
};

// @desc    Obtenir une annonce par ID
// @route   GET /api/annonces/:id
// @access  Public
exports.getAnnonceById = async (req, res) => {
  try {
    const annonce = await Annonce.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'seller',
        attributes: ['id', 'fullName', 'phone', 'email', 'location', 'avatar', 'createdAt']
      }]
    });

    if (!annonce) {
      return res.status(404).json({
        success: false,
        message: 'Annonce non trouvée'
      });
    }

    // Incrémenter le nombre de vues
    annonce.views += 1;
    await annonce.save();

    res.status(200).json({
      success: true,
      data: annonce
    });

  } catch (error) {
    console.error('Erreur getAnnonceById:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'annonce',
      error: error.message
    });
  }
};

// @desc    Mettre à jour une annonce
// @route   PUT /api/annonces/:id
// @access  Private
exports.updateAnnonce = async (req, res) => {
  try {
    const annonce = await Annonce.findByPk(req.params.id);

    if (!annonce) {
      return res.status(404).json({
        success: false,
        message: 'Annonce non trouvée'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (annonce.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à modifier cette annonce'
      });
    }

    // Mettre à jour les champs autorisés
    const { title, description, price, category, condition, location, images } = req.body;

    if (title) annonce.title = title;
    if (description) annonce.description = description;
    if (price) annonce.price = price;
    if (category) annonce.category = category;
    if (condition) annonce.condition = condition;
    if (location) annonce.location = location;
    if (images) annonce.images = images;

    await annonce.save();

    const updatedAnnonce = await Annonce.findByPk(annonce.id, {
      include: [{
        model: User,
        as: 'seller',
        attributes: ['id', 'fullName', 'phone', 'location', 'avatar']
      }]
    });

    res.status(200).json({
      success: true,
      message: 'Annonce mise à jour avec succès',
      data: updatedAnnonce
    });

  } catch (error) {
    console.error('Erreur updateAnnonce:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de l\'annonce',
      error: error.message
    });
  }
};

// @desc    Supprimer une annonce
// @route   DELETE /api/annonces/:id
// @access  Private
exports.deleteAnnonce = async (req, res) => {
  try {
    const annonce = await Annonce.findByPk(req.params.id);

    if (!annonce) {
      return res.status(404).json({
        success: false,
        message: 'Annonce non trouvée'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (annonce.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à supprimer cette annonce'
      });
    }

    // Soft delete (changer le statut)
    annonce.status = 'supprimé';
    await annonce.save();

    res.status(200).json({
      success: true,
      message: 'Annonce supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur deleteAnnonce:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'annonce',
      error: error.message
    });
  }
};

// @desc    Obtenir les annonces d'un utilisateur
// @route   GET /api/annonces/user/:userId
// @access  Public
exports.getUserAnnonces = async (req, res) => {
  try {
    const annonces = await Annonce.findAll({
      where: {
        userId: req.params.userId,
        status: 'active'
      },
      include: [{
        model: User,
        as: 'seller',
        attributes: ['id', 'fullName', 'phone', 'location', 'avatar']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: annonces
    });

  } catch (error) {
    console.error('Erreur getUserAnnonces:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des annonces',
      error: error.message
    });
  }
};

// @desc    Obtenir les annonces de l'utilisateur connecté
// @route   GET /api/annonces/my/annonces
// @access  Private
exports.getMyAnnonces = async (req, res) => {
  try {
    const annonces = await Annonce.findAll({
      where: {
        userId: req.user.id
      },
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: annonces
    });

  } catch (error) {
    console.error('Erreur getMyAnnonces:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de vos annonces',
      error: error.message
    });
  }
};