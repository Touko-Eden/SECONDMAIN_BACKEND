const { Sequelize } = require('sequelize');

// Configuration directe (sans .env)
const sequelize = new Sequelize(
  'secondmain_db',    // Nom de la base de données
  'root',             // Utilisateur MySQL
  '',                 // Mot de passe (vide par défaut sur WAMP)
  {
    host: 'localhost',
    port: 3306,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: false,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    }
  }
);

// Test de la connexion
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à MySQL réussie !');
  } catch (error) {
    console.error('❌ Erreur de connexion à MySQL:', error.message);
    console.error('Détails:', error);
    process.exit(1);
  }
};

// Synchronisation des modèles avec la base de données
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Base de données synchronisée !');
  } catch (error) {
    console.error('❌ Erreur de synchronisation:', error.message);
  }
};

module.exports = {
  sequelize,
  testConnection,
  syncDatabase
};