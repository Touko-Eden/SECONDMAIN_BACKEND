const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Toutes les routes nécessitent une authentification

router.post('/toggle', favoriteController.toggleFavorite);
router.get('/', favoriteController.getFavorites);
router.get('/:annonceId/check', favoriteController.checkFavorite);

module.exports = router;
