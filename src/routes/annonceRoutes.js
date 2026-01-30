const express = require('express');
const router = express.Router();
const annonceController = require('../controllers/annonceController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload'); // <--- AJOUTER CECI

// Routes publiques
router.get('/', annonceController.getAnnonces);
router.get('/:id', annonceController.getAnnonceById);
router.get('/user/:userId', annonceController.getUserAnnonces);

// Routes protégées
// MODIFIER CETTE LIGNE :
router.post('/', protect, upload.array('images', 5), annonceController.createAnnonce);

router.put('/:id', protect, annonceController.updateAnnonce);
router.delete('/:id', protect, annonceController.deleteAnnonce);
router.get('/my/annonces', protect, annonceController.getMyAnnonces);

module.exports = router;