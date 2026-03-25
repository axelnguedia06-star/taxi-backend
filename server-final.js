// server-final.js - Backend avec CORS activé pour votre frontend
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();

// ========== CORS SPÉCIFIQUE À VOTRE FRONTEND ==========
const corsOptions = {
    origin: 'https://stellular-arithmetic-650ee8.netlify.app',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
};

app.use(cors(corsOptions));

// Gérer les pré-vols OPTIONS
app.options('*', cors(corsOptions));

// ========== MIDDLEWARE ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
    next();
});

// ========== BASE DE DONNÉES ==========
const db = new sqlite3.Database(':memory:');

// Initialiser la DB avec données de test
db.serialize(() => {
    // Table journées
    db.run(`
        CREATE TABLE IF NOT EXISTS journees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            vehicule_immat TEXT NOT NULL,
            chauffeur_id INTEGER NOT NULL,
            recette_total DECIMAL(10,2) DEFAULT 0,
            manquant DECIMAL(10,2) DEFAULT 0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Table véhicules
    db.run(`
        CREATE TABLE IF NOT EXISTS vehicules (
            immatriculation TEXT PRIMARY KEY,
            marque TEXT NOT NULL,
            modele TEXT NOT NULL,
            statut TEXT DEFAULT 'actif'
        )
    `);

    // Table chauffeurs
    db.run(`
        CREATE TABLE IF NOT EXISTS chauffeurs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom TEXT NOT NULL,
            prenom TEXT NOT NULL,
            telephone TEXT NOT NULL
        )
    `);

    // Table dépenses
    db.run(`
        CREATE TABLE IF NOT EXISTS depenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            montant DECIMAL(10,2) NOT NULL,
            description TEXT NOT NULL,
            categorie TEXT DEFAULT 'Autre',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Données de test
    db.run(`INSERT OR IGNORE INTO vehicules VALUES ('AB-123-CD', 'Toyota', 'Corolla', 'actif')`);
    db.run(`INSERT OR IGNORE INTO vehicules VALUES ('EF-456-GH', 'Honda', 'Civic', 'actif')`);

    db.run(`INSERT OR IGNORE INTO chauffeurs VALUES (1, 'Dupont', 'Jean', '0123456789')`);
    db.run(`INSERT OR IGNORE INTO chauffeurs VALUES (2, 'Martin', 'Marie', '0987654321')`);

    db.run(`INSERT OR IGNORE INTO journees (date, vehicule_immat, chauffeur_id, recette_total)
            VALUES ('2024-01-15', 'AB-123-CD', 1, 85000)`);
    db.run(`INSERT OR IGNORE INTO journees (date, vehicule_immat, chauffeur_id, recette_total)
            VALUES ('2024-01-14', 'EF-456-GH', 2, 92000)`);

    db.run(`INSERT OR IGNORE INTO depenses (montant, description, categorie)
            VALUES (5000, 'Carburant', 'Essence')`);
    db.run(`INSERT OR IGNORE INTO depenses (montant, description, categorie)
            VALUES (3000, 'Entretien', 'Maintenance')`);
});

// ========== ROUTES ==========

// Route racine
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🚖 API Taxi Manager - Prêt pour Netlify',
        version: '2.0.0',
        frontend: 'https://stellular-arithmetic-650ee8.netlify.app',
        cors: 'activé',
        endpoints: {
            health: 'GET /api/health',
            journees: 'GET /api/journees',
            vehicules: 'GET /api/vehicules',
            chauffeurs: 'GET /api/chauffeurs',
            depenses: 'GET /api/depenses',
            stats: 'GET /api/stats'
        }
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: '✅ API Taxi Manager en ligne',
        timestamp: new Date().toISOString(),
        cors: {
            enabled: true,
            allowed_origin: 'https://stellular-arithmetic-650ee8.netlify.app',
            your_origin: req.headers.origin
        },
        database: 'connectée'
    });
});

// Journées
app.get('/api/journees', (req, res) => {
    const { limit = 50 } = req.query;

    db.all(`
        SELECT j.*,
               v.marque, v.modele,
               c.nom as chauffeur_nom, c.prenom as chauffeur_prenom
        FROM journees j
        LEFT JOIN vehicules v ON j.vehicule_immat = v.immatriculation
        LEFT JOIN chauffeurs c ON j.chauffeur_id = c.id
        ORDER BY j.date DESC
        LIMIT ?
    `, [parseInt(limit)], (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, journees: rows || [] });
        }
    });
});

app.post('/api/journees', (req, res) => {
    const { date, vehicule_immat, chauffeur_id, recette_total, manquant, notes } = req.body;

    if (!date || !vehicule_immat || !chauffeur_id) {
        return res.status(400).json({
            success: false,
            error: 'Date, véhicule et chauffeur requis'
        });
    }

    db.run(`
        INSERT INTO journees (date, vehicule_immat, chauffeur_id, recette_total, manquant, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [date, vehicule_immat, chauffeur_id, recette_total || 0, manquant || 0, notes || ''],
    function(err) {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({
                success: true,
                message: 'Journée créée',
                id: this.lastID
            });
        }
    });
});

// Véhicules
app.get('/api/vehicules', (req, res) => {
    db.all('SELECT * FROM vehicules ORDER BY immatriculation', (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, vehicules: rows || [] });
        }
    });
});

// Chauffeurs
app.get('/api/chauffeurs', (req, res) => {
    db.all('SELECT * FROM chauffeurs ORDER BY nom, prenom', (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, chauffeurs: rows || [] });
        }
    });
});

// Dépenses
app.get('/api/depenses', (req, res) => {
    const { limit = 100 } = req.query;

    db.all(`
        SELECT * FROM depenses
        ORDER BY created_at DESC
        LIMIT ?
    `, [parseInt(limit)], (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, depenses: rows || [] });
        }
    });
});

app.post('/api/depenses', (req, res) => {
    const { montant, description, categorie } = req.body;

    if (!montant || !description) {
        return res.status(400).json({
            success: false,
            error: 'Montant et description requis'
        });
    }

    db.run(`
        INSERT INTO depenses (montant, description, categorie)
        VALUES (?, ?, ?)
    `, [montant, description, categorie || 'Autre'],
    function(err) {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({
                success: true,
                message: 'Dépense créée',
                id: this.lastID
            });
        }
    });
});

// Statistiques
app.get('/api/stats', (req, res) => {
    // Récupérer toutes les données
    db.all('SELECT * FROM journees', (err, journees) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });        
        }

        db.all('SELECT * FROM depenses', (err, depenses) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });    
            }

            const totalRecette = journees.reduce((sum, j) => sum + (j.recette_total || 0), 0);
            const totalDepenses = depenses.reduce((sum, d) => sum + (d.montant || 0), 0);
            const totalManquant = journees.reduce((sum, j) => sum + (j.manquant || 0), 0);
            const benefice = totalRecette - totalDepenses - totalManquant;

            res.json({
                success: true,
                stats: {
                    general: {
                        total_journees: journees.length,
                        total_recette: totalRecette,
                        total_depenses: totalDepenses,
                        total_manquant: totalManquant,
                        benefice_net: benefice
                    },
                    dernieres_journees: journees.slice(0, 5),
                    dernieres_depenses: depenses.slice(0, 5)
                }
            });
        });
    });
});

// ========== DÉMARRAGE ==========
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log(`🚀 API Taxi Manager DÉMARRÉE`);
    console.log(`🌐 Port: ${PORT}`);
    console.log(`🔗 URL: https://taxi-manager-api.onrender.com`);
    console.log(`🎯 Frontend autorisé: https://stellular-arithmetic-650ee8.netlify.app`);
    console.log(`🔧 CORS: Activé spécifiquement pour votre frontend`);
    console.log('='.repeat(60));
    console.log('✅ Prêt à recevoir des requêtes!');
    console.log('='.repeat(60));
});