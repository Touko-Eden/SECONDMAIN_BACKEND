const express = require('express');
const router = express.Router();
const annonceController = require('../controllers/annonceController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload'); // <--- AJOUTER CECI

// Routes publiques
router.get('/', annonceController.getAnnonces);
router.get('/user/:userId', annonceController.getUserAnnonces);
router.get('/:id', annonceController.getAnnonceById);

// Routes protégées
// MODIFIER CETTE LIGNE :
router.post('/', protect, upload.array('images', 5), annonceController.createAnnonce);

router.put('/:id', protect, upload.array('images', 5), annonceController.updateAnnonce);
router.delete('/:id', protect, annonceController.deleteAnnonce);
router.get('/my/annonces', protect, annonceController.getMyAnnonces);

// Routes pour les favoris
router.get('/my/favorites', protect, annonceController.getFavorites);
router.post('/favorites/toggle', protect, annonceController.toggleFavorite);

module.exports = router;
