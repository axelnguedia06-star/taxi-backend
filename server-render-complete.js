// server-deploy.js - Version PostgreSQL pour déploiement Heroku/Render
const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// ========== CONFIGURATION BASE DE DONNÉES (SUPABASE / RENDER) ==========
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Obligatoire pour Supabase, Render, etc.
});

// Test de connexion et initialisation des tables
pool.connect(async (err, client, release) => {
  if (err) {
    console.error('❌ Erreur de connexion PostgreSQL:', err.stack);
    process.exit(1);
  }
  console.log('✅ Connecté à PostgreSQL (Supabase)');
  release();

  // Création des tables et données par défaut
  await createTables();
  await insertDefaultCategories();
});

// ========== CRÉATION DES TABLES (POSTGRESQL) ==========
async function createTables() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS chauffeurs (
        id SERIAL PRIMARY KEY,
        nom TEXT NOT NULL,
        prenom TEXT NOT NULL,
        telephone TEXT NOT NULL,
        permis_numero TEXT NOT NULL UNIQUE,
        statut TEXT DEFAULT 'actif',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS vehicules (
        immatriculation TEXT PRIMARY KEY,
        marque TEXT NOT NULL,
        modele TEXT NOT NULL,
        annee INTEGER,
        couleur TEXT,
        kilometrage_actuel INTEGER DEFAULT 0,
        statut TEXT DEFAULT 'actif',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS journees (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        vehicule_immat TEXT NOT NULL REFERENCES vehicules(immatriculation),
        chauffeur_id INTEGER NOT NULL REFERENCES chauffeurs(id),
        recette_total DECIMAL(10,2) DEFAULT 0,
        manquant DECIMAL(10,2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        nom TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS depenses (
        id SERIAL PRIMARY KEY,
        journee_id INTEGER REFERENCES journees(id) ON DELETE SET NULL,
        categorie_id INTEGER NOT NULL REFERENCES categories(id),
        montant DECIMAL(10,2) NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (const query of queries) {
    try {
      await pool.query(query);
    } catch (err) {
      console.error('❌ Erreur création table:', err.message);
    }
  }
  console.log('✅ Tables PostgreSQL prêtes');
}

// ========== DONNÉES PAR DÉFAUT (CATÉGORIES) ==========
async function insertDefaultCategories() {
  const defaultCategories = [
    ['Carburant', 'depense', 'Essence, diesel, gaz'],
    ['Entretien moteur', 'depense', 'Vidange, Complément vidange, Filtres à huile, Bougies, Injecteurs'],
    ['Péage', 'depense', 'Frais de péage'],
    ['Nettoyage', 'depense', 'Lavage du véhicule'],
    ['Administratif', 'depense', 'Assurance, Vignette, Carte bleue, Licence'],
    ['Permis', 'depense', 'Renouvellement permis']
  ];

  for (const [nom, type, description] of defaultCategories) {
    await pool.query(
      `INSERT INTO categories (nom, type, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (nom) DO NOTHING`,
      [nom, type, description]
    );
  }
  console.log('✅ Catégories par défaut insérées');
}

// ========== CONFIGURATION SERVEUR ==========
const PORT = process.env.PORT || 5432;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

console.log(`🚀 Environnement: ${NODE_ENV}`);
console.log(`🌐 Port: ${PORT}`);

// ========== MIDDLEWARE ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// ========== CORS (adapté à Netlify) ==========
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://stellular-arithmetic-650ee8.netlify.app',
      'https://*.netlify.app',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:8080',
      null
    ];
    if (!isProduction) return callback(null, true);
    const isAllowed = allowedOrigins.some(allowed => {
      if (!allowed) return true;
      if (allowed.includes('*')) {
        const regex = new RegExp('^' + allowed.replace(/\*/g, '.*') + '$');
        return regex.test(origin);
      }
      return origin === allowed;
    });
    if (isAllowed) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ========== ROUTES PUBLIQUES ==========
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚖 API Taxi Manager - Backend (PostgreSQL)',
    version: '1.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'healthy', database: 'PostgreSQL', timestamp: new Date().toISOString() });
});

// ========== ROUTES JOURNÉES ==========
app.get('/api/journees', async (req, res) => {
  try {
    const { vehicule, date_debut, date_fin, tri, limit = 50 } = req.query;
    let sql = `
      SELECT j.*,
             v.marque, v.modele, v.immatriculation,
             c.nom as chauffeur_nom, c.prenom as chauffeur_prenom
      FROM journees j
      LEFT JOIN vehicules v ON j.vehicule_immat = v.immatriculation
      LEFT JOIN chauffeurs c ON j.chauffeur_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (vehicule) {
      sql += ` AND j.vehicule_immat = $${paramIndex++}`;
      params.push(vehicule);
    }
    if (date_debut) {
      sql += ` AND j.date >= $${paramIndex++}`;
      params.push(date_debut);
    }
    if (date_fin) {
      sql += ` AND j.date <= $${paramIndex++}`;
      params.push(date_fin);
    }

    switch (tri) {
      case 'date_asc': sql += ' ORDER BY j.date ASC'; break;
      case 'recette_desc': sql += ' ORDER BY j.recette_total DESC'; break;
      case 'recette_asc': sql += ' ORDER BY j.recette_total ASC'; break;
      default: sql += ' ORDER BY j.date DESC';
    }
    sql += ` LIMIT $${paramIndex++}`;
    params.push(parseInt(limit));

    const result = await pool.query(sql, params);
    res.json({ success: true, journees: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/journees/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ success: false, message: 'ID invalide' });

  try {
    const result = await pool.query(
      `SELECT j.*,
              v.marque, v.modele, v.immatriculation,
              c.nom as chauffeur_nom, c.prenom as chauffeur_prenom
       FROM journees j
       LEFT JOIN vehicules v ON j.vehicule_immat = v.immatriculation
       LEFT JOIN chauffeurs c ON j.chauffeur_id = c.id
       WHERE j.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Journée non trouvée' });
    res.json({ success: true, journee: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/journees', async (req, res) => {
  const { date, vehicule_immat, chauffeur_id, recette_total, manquant, notes } = req.body;
  if (!date || !vehicule_immat || !chauffeur_id) {
    return res.status(400).json({ success: false, error: 'Date, véhicule et chauffeur requis' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO journees (date, vehicule_immat, chauffeur_id, recette_total, manquant, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [date, vehicule_immat, chauffeur_id, recette_total || 0, manquant || 0, notes || '']
    );
    res.json({ success: true, message: 'Journée créée', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/journees/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { date, vehicule_immat, chauffeur_id, recette_total, manquant, notes } = req.body;
  if (isNaN(id)) return res.status(400).json({ success: false, message: 'ID invalide' });
  if (!date || !vehicule_immat || !chauffeur_id) {
    return res.status(400).json({ success: false, message: 'Date, véhicule et chauffeur obligatoires' });
  }

  try {
    const result = await pool.query(
      `UPDATE journees
       SET date = $1, vehicule_immat = $2, chauffeur_id = $3,
           recette_total = $4, manquant = $5, notes = $6
       WHERE id = $7`,
      [date, vehicule_immat, chauffeur_id, recette_total || 0, manquant || 0, notes || '', id]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Journée non trouvée' });
    res.json({ success: true, message: 'Journée modifiée' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/journees/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ success: false, message: 'ID invalide' });

  try {
    // Vérifier les dépenses liées
    const depCheck = await pool.query('SELECT COUNT(*) FROM depenses WHERE journee_id = $1', [id]);
    if (parseInt(depCheck.rows[0].count) > 0) {
      return res.status(400).json({ success: false, message: `Impossible de supprimer : ${depCheck.rows[0].count} dépense(s) liée(s)` });
    }
    const result = await pool.query('DELETE FROM journees WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Journée non trouvée' });
    res.json({ success: true, message: 'Journée supprimée' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== ROUTES VÉHICULES ==========
app.get('/api/vehicules', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vehicules ORDER BY immatriculation');
    res.json({ success: true, vehicules: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/vehicules/:immatriculation', async (req, res) => {
  const immat = decodeURIComponent(req.params.immatriculation);
  try {
    const result = await pool.query('SELECT * FROM vehicules WHERE immatriculation = $1', [immat]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Véhicule non trouvé' });
    res.json({ success: true, vehicule: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/vehicules', async (req, res) => {
  const { immatriculation, marque, modele, annee, couleur, kilometrage_actuel, statut } = req.body;
  if (!immatriculation || !marque || !modele) {
    return res.status(400).json({ success: false, error: 'Immatriculation, marque et modèle requis' });
  }

  try {
    await pool.query(
      `INSERT INTO vehicules (immatriculation, marque, modele, annee, couleur, kilometrage_actuel, statut)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (immatriculation) DO UPDATE SET
         marque = EXCLUDED.marque,
         modele = EXCLUDED.modele,
         annee = EXCLUDED.annee,
         couleur = EXCLUDED.couleur,
         kilometrage_actuel = EXCLUDED.kilometrage_actuel,
         statut = EXCLUDED.statut`,
      [immatriculation, marque, modele, annee || null, couleur || '', kilometrage_actuel || 0, statut || 'actif']
    );
    res.json({ success: true, message: 'Véhicule enregistré' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/vehicules/:immatriculation', async (req, res) => {
  const ancienneImmat = decodeURIComponent(req.params.immatriculation);
  const { immatriculation, marque, modele, annee, couleur, kilometrage_actuel, statut } = req.body;
  if (!immatriculation || !marque) {
    return res.status(400).json({ success: false, message: 'Immatriculation et marque obligatoires' });
  }

  try {
    if (ancienneImmat !== immatriculation) {
      const existing = await pool.query('SELECT immatriculation FROM vehicules WHERE immatriculation = $1', [immatriculation]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Cette immatriculation existe déjà' });
      }
    }
    const result = await pool.query(
      `UPDATE vehicules
       SET immatriculation = $1, marque = $2, modele = $3, annee = $4, couleur = $5, kilometrage_actuel = $6, statut = $7
       WHERE immatriculation = $8`,
      [immatriculation, marque, modele || '', annee || null, couleur || '', kilometrage_actuel || 0, statut || 'actif', ancienneImmat]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Véhicule non trouvé' });
    res.json({ success: true, message: 'Véhicule modifié' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/vehicules/:immatriculation', async (req, res) => {
  const immat = decodeURIComponent(req.params.immatriculation);
  try {
    const result = await pool.query('DELETE FROM vehicules WHERE immatriculation = $1', [immat]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Véhicule non trouvé' });
    res.json({ success: true, message: 'Véhicule supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== ROUTES CHAUFFEURS ==========
app.get('/api/chauffeurs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM chauffeurs ORDER BY nom, prenom');
    res.json({ success: true, chauffeurs: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/chauffeurs/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const result = await pool.query('SELECT * FROM chauffeurs WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Chauffeur non trouvé' });
    res.json({ success: true, chauffeur: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/chauffeurs', async (req, res) => {
  const { nom, prenom, telephone, permis_numero, statut } = req.body;
  if (!nom || !prenom || !telephone || !permis_numero) {
    return res.status(400).json({ success: false, error: 'Tous les champs sont requis' });
  }

  try {
    const existing = await pool.query('SELECT id FROM chauffeurs WHERE permis_numero = $1', [permis_numero]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Ce numéro de permis existe déjà' });
    }
    const result = await pool.query(
      `INSERT INTO chauffeurs (nom, prenom, telephone, permis_numero, statut)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [nom, prenom, telephone, permis_numero, statut || 'actif']
    );
    res.json({ success: true, message: 'Chauffeur enregistré', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/chauffeurs/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { nom, prenom, telephone, permis_numero, statut } = req.body;
  if (!nom || !prenom || !telephone || !permis_numero) {
    return res.status(400).json({ success: false, message: 'Tous les champs sont obligatoires' });
  }

  try {
    const existing = await pool.query('SELECT id FROM chauffeurs WHERE permis_numero = $1 AND id != $2', [permis_numero, id]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Ce numéro de permis est déjà utilisé' });
    }
    const result = await pool.query(
      `UPDATE chauffeurs SET nom = $1, prenom = $2, telephone = $3, permis_numero = $4, statut = $5 WHERE id = $6`,
      [nom, prenom, telephone, permis_numero, statut || 'actif', id]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Chauffeur non trouvé' });
    res.json({ success: true, message: 'Chauffeur modifié' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/chauffeurs/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const result = await pool.query('DELETE FROM chauffeurs WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Chauffeur non trouvé' });
    res.json({ success: true, message: 'Chauffeur supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== ROUTES DÉPENSES ==========
app.get('/api/depenses', async (req, res) => {
  try {
    const { journee_id, categorie_id, date_debut, date_fin, limit = 100 } = req.query;
    let sql = `
      SELECT d.*, c.nom as categorie_nom
      FROM depenses d
      LEFT JOIN categories c ON d.categorie_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (journee_id) {
      sql += ` AND d.journee_id = $${idx++}`;
      params.push(journee_id);
    }
    if (categorie_id) {
      sql += ` AND d.categorie_id = $${idx++}`;
      params.push(categorie_id);
    }
    if (date_debut) {
      sql += ` AND d.created_at >= $${idx++}`;
      params.push(date_debut);
    }
    if (date_fin) {
      sql += ` AND d.created_at <= $${idx++}`;
      params.push(date_fin);
    }
    sql += ` ORDER BY d.created_at DESC LIMIT $${idx++}`;
    params.push(parseInt(limit));

    const result = await pool.query(sql, params);
    res.json({ success: true, depenses: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/depenses/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const result = await pool.query(
      `SELECT d.*, c.nom as categorie_nom
       FROM depenses d
       LEFT JOIN categories c ON d.categorie_id = c.id
       WHERE d.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Dépense non trouvée' });
    res.json({ success: true, depense: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/depenses', async (req, res) => {
  const { journee_id, categorie_id, montant, description } = req.body;
  if (!montant || !categorie_id || !description) {
    return res.status(400).json({ success: false, error: 'Montant, catégorie et description requis' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO depenses (journee_id, categorie_id, montant, description)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [journee_id || null, categorie_id, montant, description]
    );
    res.json({ success: true, message: 'Dépense enregistrée', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/depenses/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { journee_id, categorie_id, montant, description } = req.body;
  if (!categorie_id || !montant) {
    return res.status(400).json({ success: false, message: 'Catégorie et montant obligatoires' });
  }
  try {
    const result = await pool.query(
      `UPDATE depenses SET journee_id = $1, categorie_id = $2, montant = $3, description = $4 WHERE id = $5`,
      [journee_id || null, categorie_id, montant, description || '', id]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Dépense non trouvée' });
    res.json({ success: true, message: 'Dépense modifiée' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/depenses/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const result = await pool.query('DELETE FROM depenses WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Dépense non trouvée' });
    res.json({ success: true, message: 'Dépense supprimée' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== ROUTES CATÉGORIES ==========
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY type, nom');
    res.json({ success: true, categories: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/categories', async (req, res) => {
  const { nom, type, description } = req.body;
  if (!nom || !type) return res.status(400).json({ success: false, error: 'Nom et type requis' });

  try {
    const existing = await pool.query('SELECT id FROM categories WHERE nom = $1', [nom]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Cette catégorie existe déjà' });
    }
    const result = await pool.query(
      `INSERT INTO categories (nom, type, description) VALUES ($1, $2, $3) RETURNING id`,
      [nom, type, description || '']
    );
    res.json({ success: true, message: 'Catégorie créée', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== ROUTES STATISTIQUES ==========
app.get('/api/stats', async (req, res) => {
  const { date_debut, date_fin } = req.query;
  try {
    // Récupération des journées filtrées
    let journeesQuery = `
      SELECT j.*, v.immatriculation, v.marque, v.modele,
             c.nom as chauffeur_nom, c.prenom as chauffeur_prenom
      FROM journees j
      LEFT JOIN vehicules v ON j.vehicule_immat = v.immatriculation
      LEFT JOIN chauffeurs c ON j.chauffeur_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (date_debut) {
      journeesQuery += ` AND j.date >= $${idx++}`;
      params.push(date_debut);
    }
    if (date_fin) {
      journeesQuery += ` AND j.date <= $${idx++}`;
      params.push(date_fin);
    }
    journeesQuery += ' ORDER BY j.date DESC';
    const journeesResult = await pool.query(journeesQuery, params);
    const journees = journeesResult.rows;

    // Total dépenses
    const depensesResult = await pool.query('SELECT COALESCE(SUM(montant), 0) as total FROM depenses');
    const totalDepenses = parseFloat(depensesResult.rows[0].total);

    // Calculs généraux
    const totalJournees = journees.length;
    const totalRecette = journees.reduce((sum, j) => sum + (parseFloat(j.recette_total) || 0), 0);
    const totalManquant = journees.reduce((sum, j) => sum + (parseFloat(j.manquant) || 0), 0);
    const recetteReelle = totalRecette - totalManquant;
    const beneficeNet = recetteReelle - totalDepenses;
    const tauxManquant = totalRecette > 0 ? ((totalManquant / totalRecette) * 100).toFixed(2) : '0.00';

    // Statistiques par véhicule
    const statsVehicule = {};
    journees.forEach(j => {
      const immat = j.immatriculation || j.vehicule_immat;
      if (!immat) return;
      if (!statsVehicule[immat]) {
        statsVehicule[immat] = {
          vehicule: `${j.marque || ''} ${j.modele || ''}`.trim() || immat,
          immatriculation: immat,
          journees: 0,
          recette: 0,
          manquant: 0,
          recette_reelle: 0
        };
      }
      statsVehicule[immat].journees++;
      statsVehicule[immat].recette += (parseFloat(j.recette_total) || 0);
      statsVehicule[immat].manquant += (parseFloat(j.manquant) || 0);
      statsVehicule[immat].recette_reelle += ((parseFloat(j.recette_total) || 0) - (parseFloat(j.manquant) || 0));
    });

    res.json({
      success: true,
      stats: {
        general: {
          total_journees: totalJournees,
          total_recette: totalRecette,
          total_manquant: totalManquant,
          recette_reelle: recetteReelle,
          total_depenses: totalDepenses,
          benefice_net: beneficeNet,
          taux_manquant: tauxManquant
        },
        par_vehicule: Object.values(statsVehicule),
        dernieres_journees: journees.slice(0, 10)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== ROUTE SPÉCIALE ==========
app.get('/api/depenses/par-journee-date', async (req, res) => {
  const { date_debut, date_fin } = req.query;
  try {
    let sql = `
      SELECT d.*,
             c.nom as categorie_nom, c.type as categorie_type,
             j.date as journee_date, j.vehicule_immat,
             v.marque, v.modele
      FROM depenses d
      LEFT JOIN categories c ON d.categorie_id = c.id
      LEFT JOIN journees j ON d.journee_id = j.id
      LEFT JOIN vehicules v ON j.vehicule_immat = v.immatriculation
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (date_debut) {
      sql += ` AND j.date >= $${idx++}`;
      params.push(date_debut);
    }
    if (date_fin) {
      sql += ` AND j.date <= $${idx++}`;
      params.push(date_fin);
    }
    sql += ' ORDER BY j.date DESC';

    const result = await pool.query(sql, params);
    res.json({ success: true, depenses: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== GESTION DES ERREURS 404 & GLOBAL ==========
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route API non trouvée', path: req.originalUrl });
});

app.use((err, req, res, next) => {
  console.error('❌ Erreur globale:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ========== DÉMARRAGE DU SERVEUR ==========
const server = app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 SERVEUR TAXI MANAGER (PostgreSQL) DÉMARRÉ');
  console.log('='.repeat(60));
  console.log(`📊 Port: ${PORT}`);
  console.log(`🌐 Environnement: ${NODE_ENV}`);
  console.log(`🔗 URL API: http://localhost:${PORT}/api`);
  console.log(`🔧 Test API: http://localhost:${PORT}/api/health`);
  console.log('='.repeat(60));
});

// ========== ARRÊT PROPRE ==========
const shutdown = async () => {
  console.log('\n🛑 Arrêt du serveur...');
  await pool.end();
  console.log('✅ Pool PostgreSQL fermé');
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
