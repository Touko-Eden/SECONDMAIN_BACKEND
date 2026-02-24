const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');


// Configuration en dur (temporaire)
process.env.PORT = 3000;
process.env.NODE_ENV = 'development';

const { testConnection, syncDatabase } = require('./src/config/database');

// Import des routes
const authRoutes = require('./src/routes/authRoutes');
const annonceRoutes = require('./src/routes/annonceRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const favoriteRoutes = require('./src/routes/favoriteRoutes');

// Création de l'application Express et du serveur HTTP
const app = express();
const server = http.createServer(app);

// Rendre le dossier uploads accessible publiquement
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Middlewares
app.use(cors()); // Permettre les requêtes cross-origin
app.use(express.json()); // Parser le JSON
app.use(express.urlencoded({ extended: true })); // Parser les données de formulaire

// Route de test
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 API SecondMain 237 - Backend opérationnel !',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      annonces: '/api/annonces'
    }
  });
});

// Routes de l'API
app.use('/api/auth', authRoutes);
app.use('/api/annonces', annonceRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/favorites', favoriteRoutes);

// Gestion des routes non trouvées (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur serveur interne',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Définir le port
const PORT = 3000;

// Socket.IO
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// partager l'instance io dans l'app pour l'utiliser dans les contrôleurs
app.set('io', io);

io.on('connection', (socket) => {
  console.log('🔌 Nouveau client connecté:', socket.id);

  socket.on('auth', (token) => {
    try {
      const decoded = jwt.verify(token, 'votre_secret_jwt_super_securise_237_secondmain_2025');
      const userId = decoded.id;
      socket.join(`user:${userId}`);
      socket.data.userId = userId;
      console.log(`✅ Socket authentifié, userId=${userId}`);
    } catch (e) {
      console.warn('❌ Auth socket invalide:', e.message);
      socket.emit('error', { message: 'Token invalide' });
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client déconnecté:', socket.id);
  });
});

// Fonction pour démarrer le serveur
const startServer = async () => {
  try {
    // Tester la connexion à la base de données
    await testConnection();
    
    // Synchroniser les modèles avec la base de données
    await syncDatabase();
    
    // Démarrer le serveur
    server.listen(PORT, () => {
      console.log('');
      console.log('═══════════════════════════════════════════');
      console.log(`✅ Serveur démarré sur le port ${PORT}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`📝 API Docs: http://localhost:${PORT}/api`);
      console.log(`🗄️  Base de données: ${process.env.DB_NAME}`);
      console.log('═══════════════════════════════════════════');
      console.log('');
      console.log('📌 Endpoints disponibles :');
      console.log('   POST   /api/auth/register      - Inscription');
      console.log('   POST   /api/auth/login         - Connexion');
      console.log('   GET    /api/auth/me            - Profil utilisateur');
      console.log('   GET    /api/annonces           - Liste des annonces');
      console.log('   POST   /api/annonces           - Créer une annonce');
      console.log('   GET    /api/annonces/:id       - Détails d\'une annonce');
      console.log('   GET    /api/chat/conversations - Mes conversations');
      console.log('   POST   /api/chat/conversations - Démarrer une conversation');
      console.log('   GET    /api/chat/conversations/:id/messages - Messages');
      console.log('   POST   /api/chat/conversations/:id/messages - Envoyer un message');
      console.log('');
      console.log('🔥 Prêt à recevoir des requêtes !');
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

// Démarrer le serveur
startServer();

// Gestion propre de l'arrêt du serveur
process.on('SIGINT', () => {
  console.log('\n⏸️  Arrêt du serveur...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏸️  Arrêt du serveur...');
  process.exit(0);
});
