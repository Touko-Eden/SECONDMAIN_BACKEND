const express = require('express');
const router = express.Router();
const annonceController = require('../controllers/annonceController');
const { protect } = require('../middleware/authMiddleware');

// Routes publiques
router.get('/', annonceController.getAnnonces);
router.get('/:id', annonceController.getAnnonceById);
router.get('/user/:userId', annonceController.getUserAnnonces);

// Routes protégées (nécessitent authentification)
router.post('/', protect, annonceController.createAnnonce);
router.put('/:id', protect, annonceController.updateAnnonce);
router.delete('/:id', protect, annonceController.deleteAnnonce);
router.get('/my/annonces', protect, annonceController.getMyAnnonces);

module.exports = router;