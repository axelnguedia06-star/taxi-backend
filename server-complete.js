// server-complete.js - Version avec plus de routes
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();

// ========== CORS POUR VOTRE FRONTEND ==========
const corsOptions = {
    origin: 'https://stellular-arithmetic-650ee8.netlify.app',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
    credentials: true,
    maxAge: 86400
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ========== MIDDLEWARE ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
    next();
});

// ========== BASE DE DONNÉES ==========
const dbPath = path.join(__dirname, 'data', 'taxi.db');
const dbDir = path.join(__dirname, 'data');

// Créer le dossier data s'il n'existe pas
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Erreur connexion DB:', err.message);
    } else {
        console.log('✅ Connecté à la DB:', dbPath);
        initializeDatabase();
    }
});

// Initialiser la DB avec toutes les tables
function initializeDatabase() {
    db.serialize(() => {
        // Table chauffeurs
        db.run(`
            CREATE TABLE IF NOT EXISTS chauffeurs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nom TEXT NOT NULL,
                prenom TEXT NOT NULL,
                telephone TEXT NOT NULL,
                permis_numero TEXT NOT NULL UNIQUE,
                statut TEXT DEFAULT 'actif',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Table vehicules
        db.run(`
            CREATE TABLE IF NOT EXISTS vehicules (
                immatriculation TEXT PRIMARY KEY,
                marque TEXT NOT NULL,
                modele TEXT NOT NULL,
                annee INTEGER,
                couleur TEXT,
                kilometrage_actuel INTEGER DEFAULT 0,
                statut TEXT DEFAULT 'actif',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Table journees
        db.run(`
            CREATE TABLE IF NOT EXISTS journees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date DATE NOT NULL,
                vehicule_immat TEXT NOT NULL,
                chauffeur_id INTEGER NOT NULL,
                recette_total DECIMAL(10,2) DEFAULT 0,
                manquant DECIMAL(10,2) DEFAULT 0,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vehicule_immat) REFERENCES vehicules(immatriculation),     
                FOREIGN KEY (chauffeur_id) REFERENCES chauffeurs(id)
            )
        `);

        // Table categories
        db.run(`
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nom TEXT NOT NULL UNIQUE,
                type TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Table depenses
        db.run(`
            CREATE TABLE IF NOT EXISTS depenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                journee_id INTEGER,
                categorie_id INTEGER NOT NULL,
                montant DECIMAL(10,2) NOT NULL,
                description TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (journee_id) REFERENCES journees(id),
                FOREIGN KEY (categorie_id) REFERENCES categories(id)
            )
        `);

        // Données par défaut
        setTimeout(() => {
            insertDefaultData();
        }, 1000);
    });
}

function insertDefaultData() {
    // Catégories par défaut
    const categories = [
        ['Carburant', 'depense', 'Essence, diesel, gaz'],
        ['Entretien', 'depense', 'Vidange, réparations'],
        ['Péage', 'depense', 'Frais de péage'],
        ['Nettoyage', 'depense', 'Lavage du véhicule'],
        ['Assurance', 'depense', 'Assurance annuelle'],
        ['Permis', 'depense', 'Renouvellement permis']
    ];

    categories.forEach(([nom, type, description]) => {
        db.run(
            'INSERT OR IGNORE INTO categories (nom, type, description) VALUES (?, ?, ?)',
            [nom, type, description]
        );
    });

    // Véhicules par défaut
    db.run(`INSERT OR IGNORE INTO vehicules VALUES
            ('AB-123-CD', 'Toyota', 'Corolla', 2020, 'Blanc', 50000, 'actif', CURRENT_TIMESTAMP)`);

    db.run(`INSERT OR IGNORE INTO vehicules VALUES
            ('EF-456-GH', 'Honda', 'Civic', 2021, 'Noir', 30000, 'actif', CURRENT_TIMESTAMP)`);

    // Chauffeurs par défaut
    db.run(`INSERT OR IGNORE INTO chauffeurs VALUES
            (1, 'Dupont', 'Jean', '0123456789', 'PER123456', 'actif', CURRENT_TIMESTAMP)`);

    db.run(`INSERT OR IGNORE INTO chauffeurs VALUES
            (2, 'Martin', 'Marie', '0987654321', 'PER654321', 'actif', CURRENT_TIMESTAMP)`);

    console.log('✅ Données par défaut insérées');
}

// ========== ROUTES COMPLÈTES ==========

// Route racine
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🚖 API Taxi Manager - Version Complète',
        version: '3.0.0',
        frontend: 'https://stellular-arithmetic-650ee8.netlify.app',
        cors: 'activé',
        database: 'sqlite',
        endpoints: {
            health: 'GET /api/health',
            journees: 'GET /api/journees',
            journee_by_id: 'GET /api/journees/:id',
            vehicules: 'GET /api/vehicules',
            vehicule_by_immat: 'GET /api/vehicules/:immatriculation',
            chauffeurs: 'GET /api/chauffeurs',
            chauffeur_by_id: 'GET /api/chauffeurs/:id',
            depenses: 'GET /api/depenses',
            depense_by_id: 'GET /api/depenses/:id',
            categories: 'GET /api/categories',
            stats: 'GET /api/stats',
            depenses_par_date: 'GET /api/depenses/par-journee-date'
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
        database: 'connectée',
        tables: ['chauffeurs', 'vehicules', 'journees', 'categories', 'depenses']       
    });
});

// ========== ROUTES JOURNÉES ==========

// GET toutes les journées avec filtres
app.get('/api/journees', (req, res) => {
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

    if (vehicule) {
        sql += ' AND j.vehicule_immat = ?';
        params.push(vehicule);
    }

    if (date_debut) {
        sql += ' AND j.date >= ?';
        params.push(date_debut);
    }

    if (date_fin) {
        sql += ' AND j.date <= ?';
        params.push(date_fin);
    }

    // Tri
    switch(tri) {
        case 'date_asc': sql += ' ORDER BY j.date ASC'; break;
        case 'recette_desc': sql += ' ORDER BY j.recette_total DESC'; break;
        case 'recette_asc': sql += ' ORDER BY j.recette_total ASC'; break;
        default: sql += ' ORDER BY j.date DESC';
    }

    sql += ' LIMIT ?';
    params.push(parseInt(limit));

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('❌ Erreur journées:', err.message);
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, journees: rows || [] });
        }
    });
});

// GET une journée spécifique
app.get('/api/journees/:id', (req, res) => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'ID invalide' });        
    }

    const sql = `
        SELECT j.*,
               v.marque, v.modele, v.immatriculation,
               c.nom as chauffeur_nom, c.prenom as chauffeur_prenom
        FROM journees j
        LEFT JOIN vehicules v ON j.vehicule_immat = v.immatriculation
        LEFT JOIN chauffeurs c ON j.chauffeur_id = c.id
        WHERE j.id = ?
    `;

    db.get(sql, [id], (err, row) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else if (row) {
            res.json({ success: true, journee: row });
        } else {
            res.status(404).json({ success: false, message: 'Journée non trouvée' });   
        }
    });
});

// POST créer une journée
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
            console.error('❌ Erreur création journée:', err.message);
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

// PUT modifier une journée
app.put('/api/journees/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const data = req.body;

    if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'ID invalide' });        
    }

    if (!data.date || !data.vehicule_immat || !data.chauffeur_id) {
        return res.status(400).json({
            success: false,
            message: 'Date, véhicule et chauffeur sont obligatoires'
        });
    }

    const sql = `
        UPDATE journees
        SET date = ?, vehicule_immat = ?, chauffeur_id = ?,
            recette_total = ?, manquant = ?, notes = ?
        WHERE id = ?
    `;

    const params = [
        data.date,
        data.vehicule_immat,
        data.chauffeur_id,
        data.recette_total || 0,
        data.manquant || 0,
        data.notes || '',
        id
    ];

    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Erreur modification journée:', err.message);
            res.status(500).json({ success: false, error: err.message });
        } else if (this.changes > 0) {
            res.json({ success: true, message: 'Journée modifiée' });
        } else {
            res.status(404).json({ success: false, message: 'Journée non trouvée' });   
        }
    });
});

// DELETE supprimer une journée
app.delete('/api/journees/:id', (req, res) => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'ID invalide' });        
    }

    // Vérifier d'abord si la journée existe
    db.get('SELECT id FROM journees WHERE id = ?', [id], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });        
        }

        if (!row) {
            return res.status(404).json({ success: false, message: 'Journée non trouvée' });
        }

        // Vérifier les dépenses liées
        db.get('SELECT COUNT(*) as count FROM depenses WHERE journee_id = ?', [id], (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });    
            }

            if (result && result.count > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Impossible de supprimer : ${result.count} dépense(s) liée(s)`
                });
            }

            // Supprimer
            db.run('DELETE FROM journees WHERE id = ?', [id], function(err) {
                if (err) {
                    res.status(500).json({ success: false, error: err.message });       
                } else if (this.changes > 0) {
                    res.json({ success: true, message: 'Journée supprimée' });
                } else {
                    res.status(404).json({ success: false, message: 'Journée non trouvée' });
                }
            });
        });
    });
});

// ========== ROUTES VÉHICULES ==========

app.get('/api/vehicules', (req, res) => {
    db.all('SELECT * FROM vehicules ORDER BY immatriculation', (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, vehicules: rows || [] });
        }
    });
});

app.get('/api/vehicules/:immatriculation', (req, res) => {
    const immatriculation = decodeURIComponent(req.params.immatriculation);

    db.get('SELECT * FROM vehicules WHERE immatriculation = ?', [immatriculation], (err, row) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else if (row) {
            res.json({ success: true, vehicule: row });
        } else {
            res.status(404).json({ success: false, message: 'Véhicule non trouvé' });   
        }
    });
});

app.post('/api/vehicules', (req, res) => {
    const { immatriculation, marque, modele, annee, couleur, kilometrage_actuel, statut } = req.body;

    if (!immatriculation || !marque || !modele) {
        return res.status(400).json({
            success: false,
            error: 'Immatriculation, marque et modèle requis'
        });
    }

    db.run(`
        INSERT OR REPLACE INTO vehicules
        (immatriculation, marque, modele, annee, couleur, kilometrage_actuel, statut)   
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [immatriculation, marque, modele, annee || null, couleur || '', kilometrage_actuel || 0, statut || 'actif'],
    function(err) {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({
                success: true,
                message: 'Véhicule enregistré',
                id: this.lastID
            });
        }
    });
});

app.put('/api/vehicules/:immatriculation', (req, res) => {
    const ancienneImmat = decodeURIComponent(req.params.immatriculation);
    const data = req.body;

    if (!data.immatriculation || !data.marque) {
        return res.status(400).json({
            success: false,
            message: 'Immatriculation et marque sont obligatoires'
        });
    }

    // Si changement d'immatriculation, vérifier unicité
    if (ancienneImmat !== data.immatriculation) {
        db.get('SELECT immatriculation FROM vehicules WHERE immatriculation = ?',       
               [data.immatriculation], (err, row) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });    
            }

            if (row) {
                return res.status(409).json({
                    success: false,
                    message: 'Cette immatriculation existe déjà'
                });
            }

            updateVehicle();
        });
    } else {
        updateVehicle();
    }

    function updateVehicle() {
        const sql = `
            UPDATE vehicules
            SET immatriculation = ?, marque = ?, modele = ?,
                annee = ?, couleur = ?, kilometrage_actuel = ?, statut = ?
            WHERE immatriculation = ?
        `;

        const params = [
            data.immatriculation,
            data.marque,
            data.modele || '',
            data.annee || '',
            data.couleur || '',
            data.kilometrage_actuel || 0,
            data.statut || 'actif',
            ancienneImmat
        ];

        db.run(sql, params, function(err) {
            if (err) {
                res.status(500).json({ success: false, error: err.message });
            } else if (this.changes > 0) {
                res.json({ success: true, message: 'Véhicule modifié' });
            } else {
                res.status(404).json({ success: false, message: 'Véhicule non trouvé' });
            }
        });
    }
});

app.delete('/api/vehicules/:immatriculation', (req, res) => {
    const immatriculation = decodeURIComponent(req.params.immatriculation);

    db.run('DELETE FROM vehicules WHERE immatriculation = ?', [immatriculation], function(err) {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else if (this.changes > 0) {
            res.json({ success: true, message: 'Véhicule supprimé' });
        } else {
            res.status(404).json({ success: false, message: 'Véhicule non trouvé' });   
        }
    });
});

// ========== ROUTES CHAUFFEURS ==========

app.get('/api/chauffeurs', (req, res) => {
    db.all('SELECT * FROM chauffeurs ORDER BY nom, prenom', (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, chauffeurs: rows || [] });
        }
    });
});

app.get('/api/chauffeurs/:id', (req, res) => {
    const id = parseInt(req.params.id);

    db.get('SELECT * FROM chauffeurs WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else if (row) {
            res.json({ success: true, chauffeur: row });
        } else {
            res.status(404).json({ success: false, message: 'Chauffeur non trouvé' });  
        }
    });
});

app.post('/api/chauffeurs', (req, res) => {
    const { nom, prenom, telephone, permis_numero, statut } = req.body;

    if (!nom || !prenom || !telephone || !permis_numero) {
        return res.status(400).json({
            success: false,
            error: 'Tous les champs sont requis'
        });
    }

    // Vérifier unicité permis
    db.get('SELECT id FROM chauffeurs WHERE permis_numero = ?', [permis_numero], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });        
        }

        if (row) {
            return res.status(409).json({
                success: false,
                message: 'Ce numéro de permis existe déjà'
            });
        }

        db.run(`
            INSERT INTO chauffeurs (nom, prenom, telephone, permis_numero, statut)      
            VALUES (?, ?, ?, ?, ?)
        `, [nom, prenom, telephone, permis_numero, statut || 'actif'],
        function(err) {
            if (err) {
                res.status(500).json({ success: false, error: err.message });
            } else {
                res.json({
                    success: true,
                    message: 'Chauffeur enregistré',
                    id: this.lastID
                });
            }
        });
    });
});

app.put('/api/chauffeurs/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const data = req.body;

    if (!data.nom || !data.prenom || !data.telephone || !data.permis_numero) {
        return res.status(400).json({
            success: false,
            message: 'Tous les champs sont obligatoires'
        });
    }

    // Vérifier unicité permis (sauf pour ce chauffeur)
    db.get('SELECT id FROM chauffeurs WHERE permis_numero = ? AND id != ?',
           [data.permis_numero, id], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });        
        }

        if (row) {
            return res.status(409).json({
                success: false,
                message: 'Ce numéro de permis est déjà utilisé'
            });
        }

        const sql = `
            UPDATE chauffeurs
            SET nom = ?, prenom = ?, telephone = ?, permis_numero = ?, statut = ?       
            WHERE id = ?
        `;

        const params = [
            data.nom,
            data.prenom,
            data.telephone,
            data.permis_numero,
            data.statut || 'actif',
            id
        ];

        db.run(sql, params, function(err) {
            if (err) {
                res.status(500).json({ success: false, error: err.message });
            } else if (this.changes > 0) {
                res.json({ success: true, message: 'Chauffeur modifié' });
            } else {
                res.status(404).json({ success: false, message: 'Chauffeur non trouvé' });
            }
        });
    });
});

app.delete('/api/chauffeurs/:id', (req, res) => {
    const id = parseInt(req.params.id);

    db.run('DELETE FROM chauffeurs WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else if (this.changes > 0) {
            res.json({ success: true, message: 'Chauffeur supprimé' });
        } else {
            res.status(404).json({ success: false, message: 'Chauffeur non trouvé' });  
        }
    });
});

// ========== ROUTES DÉPENSES ==========

app.get('/api/depenses', (req, res) => {
    const { journee_id, categorie_id, date_debut, date_fin, limit = 100 } = req.query;  

    let sql = `
        SELECT d.*, c.nom as categorie_nom
        FROM depenses d
        LEFT JOIN categories c ON d.categorie_id = c.id
        WHERE 1=1
    `;

    const params = [];

    if (journee_id) {
        sql += ' AND d.journee_id = ?';
        params.push(journee_id);
    }

    if (categorie_id) {
        sql += ' AND d.categorie_id = ?';
        params.push(categorie_id);
    }

    if (date_debut) {
        sql += ' AND d.created_at >= ?';
        params.push(date_debut);
    }

    if (date_fin) {
        sql += ' AND d.created_at <= ?';
        params.push(date_fin);
    }

    sql += ' ORDER BY d.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, depenses: rows || [] });
        }
    });
});

app.get('/api/depenses/:id', (req, res) => {
    const id = parseInt(req.params.id);

    const sql = `
        SELECT d.*, c.nom as categorie_nom
        FROM depenses d
        LEFT JOIN categories c ON d.categorie_id = c.id
        WHERE d.id = ?
    `;

    db.get(sql, [id], (err, row) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else if (row) {
            res.json({ success: true, depense: row });
        } else {
            res.status(404).json({ success: false, message: 'Dépense non trouvée' });   
        }
    });
});

app.post('/api/depenses', (req, res) => {
    const { journee_id, categorie_id, montant, description } = req.body;

    if (!montant || !categorie_id || !description) {
        return res.status(400).json({
            success: false,
            error: 'Montant, catégorie et description requis'
        });
    }

    db.run(`
        INSERT INTO depenses (journee_id, categorie_id, montant, description)
        VALUES (?, ?, ?, ?)
    `, [journee_id || null, categorie_id, montant, description],
    function(err) {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({
                success: true,
                message: 'Dépense enregistrée',
                id: this.lastID
            });
        }
    });
});

app.put('/api/depenses/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const data = req.body;

    if (!data.categorie_id || !data.montant) {
        return res.status(400).json({
            success: false,
            message: 'Catégorie et montant sont obligatoires'
        });
    }

    const sql = `
        UPDATE depenses
        SET journee_id = ?, categorie_id = ?, montant = ?, description = ?
        WHERE id = ?
    `;

    const params = [
        data.journee_id || null,
        data.categorie_id,
        data.montant,
        data.description || '',
        id
    ];

    db.run(sql, params, function(err) {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else if (this.changes > 0) {
            res.json({ success: true, message: 'Dépense modifiée' });
        } else {
            res.status(404).json({ success: false, message: 'Dépense non trouvée' });   
        }
    });
});

app.delete('/api/depenses/:id', (req, res) => {
    const id = parseInt(req.params.id);

    db.run('DELETE FROM depenses WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else if (this.changes > 0) {
            res.json({ success: true, message: 'Dépense supprimée' });
        } else {
            res.status(404).json({ success: false, message: 'Dépense non trouvée' });   
        }
    });
});

// ========== ROUTES CATÉGORIES ==========

app.get('/api/categories', (req, res) => {
    db.all('SELECT * FROM categories ORDER BY type, nom', (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, categories: rows || [] });
        }
    });
});

app.post('/api/categories', (req, res) => {
    const { nom, type, description } = req.body;

    if (!nom || !type) {
        return res.status(400).json({
            success: false,
            error: 'Nom et type requis'
        });
    }

    // Vérifier unicité
    db.get('SELECT id FROM categories WHERE nom = ?', [nom], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });        
        }

        if (row) {
            return res.status(409).json({
                success: false,
                message: 'Cette catégorie existe déjà'
            });
        }

        db.run(`
            INSERT INTO categories (nom, type, description)
            VALUES (?, ?, ?)
        `, [nom, type, description || ''],
        function(err) {
            if (err) {
                res.status(500).json({ success: false, error: err.message });
            } else {
                res.json({
                    success: true,
                    message: 'Catégorie créée',
                    id: this.lastID
                });
            }
        });
    });
});

// ========== ROUTES STATISTIQUES ==========

app.get('/api/stats', (req, res) => {
    const { date_debut, date_fin } = req.query;

    let sqlJournees = `
        SELECT j.*, v.immatriculation, v.marque, v.modele,
               c.nom as chauffeur_nom, c.prenom as chauffeur_prenom
        FROM journees j
        LEFT JOIN vehicules v ON j.vehicule_immat = v.immatriculation
        LEFT JOIN chauffeurs c ON j.chauffeur_id = c.id
        WHERE 1=1
    `;

    const params = [];

    if (date_debut) {
        sqlJournees += ' AND j.date >= ?';
        params.push(date_debut);
    }

    if (date_fin) {
        sqlJournees += ' AND j.date <= ?';
        params.push(date_fin);
    }

    sqlJournees += ' ORDER BY j.date DESC';

    db.all(sqlJournees, params, (err, journees) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });        
        }

        // Dépenses
        db.get('SELECT SUM(montant) as total FROM depenses', (err, depensesRow) => {    
            if (err) {
                return res.status(500).json({ success: false, error: err.message });    
            }

            const totalJournees = journees.length;
            const totalRecette = journees.reduce((sum, j) => sum + (j.recette_total || 0), 0);
            const totalManquant = journees.reduce((sum, j) => sum + (j.manquant || 0), 0);
            const recetteReelle = totalRecette - totalManquant;
            const totalDepenses = depensesRow.total || 0;
            const beneficeNet = recetteReelle - totalDepenses;

            // Par véhicule
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
                statsVehicule[immat].recette += (j.recette_total || 0);
                statsVehicule[immat].manquant += (j.manquant || 0);
                statsVehicule[immat].recette_reelle += ((j.statsVehicule[immat].recette_reelle += ((j.recette_total || 0) - (j.manquant || 0));
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
                        taux_manquant: totalRecette > 0 ?
                            ((totalManquant / totalRecette) * 100).toFixed(2) : '0.00'  
                    },
                    par_vehicule: Object.values(statsVehicule),
                    dernieres_journees: journees.slice(0, 10)
                }
            });
        });
    });
});

// ========== ROUTES SPÉCIALES ==========

// Dépenses par date de journée
app.get('/api/depenses/par-journee-date', (req, res) => {
    const { date_debut, date_fin } = req.query;

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

    if (date_debut) {
        sql += ' AND j.date >= ?';
        params.push(date_debut);
    }

    if (date_fin) {
        sql += ' AND j.date <= ?';
        params.push(date_fin);
    }

    sql += ' ORDER BY j.date DESC';

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, depenses: rows || [] });
        }
    });
});

// Dépenses avec filtres
app.get('/api/depenses/filtres', (req, res) => {
    const { vehicule_id, date_debut, date_fin, categorie_id, limit } = req.query;       

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

    if (vehicule_id) {
        sql += ' AND j.vehicule_immat = ?';
        params.push(vehicule_id);
    }

    if (date_debut) {
        sql += ' AND d.created_at >= ?';
        params.push(date_debut);
    }

    if (date_fin) {
        sql += ' AND d.created_at <= ?';
        params.push(date_fin);
    }

    if (categorie_id) {
        sql += ' AND d.categorie_id = ?';
        params.push(categorie_id);
    }

    sql += ' ORDER BY d.created_at DESC';

    if (limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(limit));
    } else {
        sql += ' LIMIT 100';
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, depenses: rows || [] });
        }
    });
});

// Statistiques des dépenses
app.get('/api/depenses/stats', (req, res) => {
    const { date_debut, date_fin } = req.query;

    let sql = `
        SELECT
            c.id as categorie_id,
            c.nom as categorie_nom,
            c.type as categorie_type,
            COUNT(d.id) as nombre_depenses,
            SUM(d.montant) as total_montant,
            j.vehicule_immat,
            v.marque,
            v.modele
        FROM depenses d
        LEFT JOIN categories c ON d.categorie_id = c.id
        LEFT JOIN journees j ON d.journee_id = j.id
        LEFT JOIN vehicules v ON j.vehicule_immat = v.immatriculation
        WHERE 1=1
    `;

    const params = [];

    if (date_debut) {
        sql += ' AND j.date >= ?';
        params.push(date_debut);
    }

    if (date_fin) {
        sql += ' AND j.date <= ?';
        params.push(date_fin);
    }

    sql += ' GROUP BY c.id, j.vehicule_immat ORDER BY total_montant DESC';

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            // Calculer les totaux
            const totalDepenses = rows.reduce((sum, row) => sum + (row.total_montant || 0), 0);

            // Regrouper par catégorie
            const parCategorie = {};
            rows.forEach(row => {
                if (!parCategorie[row.categorie_id]) {
                    parCategorie[row.categorie_id] = {
                        categorie_nom: row.categorie_nom,
                        categorie_type: row.categorie_type,
                        total_montant: 0,
                        nombre_depenses: 0,
                        par_vehicule: []
                    };
                }
                parCategorie[row.categorie_id].total_montant += (row.total_montant || 0);
                parCategorie[row.categorie_id].nombre_depenses += (row.nombre_depenses || 0);

                if (row.vehicule_immat) {
                    parCategorie[row.categorie_id].par_vehicule.push({
                        vehicule_immat: row.vehicule_immat,
                        vehicule: `${row.marque || ''} ${row.modele || ''}`.trim(),     
                        montant: row.total_montant
                    });
                }
            });

            res.json({
                success: true,
                stats: {
                    total_depenses: totalDepenses,
                    nombre_total_depenses: rows.reduce((sum, row) => sum + (row.nombre_depenses || 0), 0),
                    par_categorie: Object.values(parCategorie),
                    detail: rows
                }
            });
        }
    });
});

// ========== ROUTES DE TEST ==========

app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API Taxi Manager fonctionnelle',
        timestamp: new Date().toISOString(),
        version: '3.0.0',
        cors: 'activé pour Netlify',
        database: 'sqlite'
    });
});

// ========== GESTION DES ERREURS ==========

// Route 404 pour API
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route API non trouvée',
        path: req.originalUrl,
        available_endpoints: [
            '/api/health',
            '/api/journees',
            '/api/journees/:id',
            '/api/vehicules',
            '/api/vehicules/:immatriculation',
            '/api/chauffeurs',
            '/api/chauffeurs/:id',
            '/api/depenses',
            '/api/depenses/:id',
            '/api/categories',
            '/api/stats',
            '/api/depenses/par-journee-date',
            '/api/depenses/filtres',
            '/api/depenses/stats',
            '/api/test'
        ]
    });
});

// Middleware d'erreur global
app.use((err, req, res, next) => {
    console.error('❌ Erreur globale:', err.stack);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Erreur interne du serveur',
        timestamp: new Date().toISOString()
    });
});

// ========== DÉMARRAGE DU SERVEUR ==========

const PORT = process.env.PORT || 3001;

// Vérifier que la DB est prête avant de démarrer
setTimeout(() => {
    app.listen(PORT, () => {
        console.log('='.repeat(70));
        console.log('🚀 API TAXI MANAGER - VERSION COMPLÈTE');
        console.log('='.repeat(70));
        console.log(`📊 Port: ${PORT}`);
        console.log(`🌐 URL: http://localhost:${PORT}`);
        console.log(`🎯 Frontend: https://stellular-arithmetic-650ee8.netlify.app`);    
        console.log(`🔧 CORS: Activé spécifiquement pour votre frontend`);
        console.log(`💾 Database: SQLite (${dbPath})`);
        console.log('='.repeat(70));
        console.log('📋 Routes disponibles:');
        console.log('  GET  /                    - Page d\'accueil API');
        console.log('  GET  /api/health          - Vérification santé');
        console.log('  GET  /api/test            - Test API');
        console.log('  GET  /api/journees        - Liste des journées');
        console.log('  POST /api/journees        - Créer une journée');
        console.log('  GET  /api/journees/:id    - Détail journée');
        console.log('  PUT  /api/journees/:id    - Modifier journée');
        console.log('  DEL  /api/journees/:id    - Supprimer journée');
        console.log('  GET  /api/vehicules       - Liste véhicules');
        console.log('  POST /api/vehicules       - Ajouter véhicule');
        console.log('  GET  /api/chauffeurs      - Liste chauffeurs');
        console.log('  POST /api/chauffeurs      - Ajouter chauffeur');
        console.log('  GET  /api/depenses        - Liste dépenses');
        console.log('  POST /api/depenses        - Ajouter dépense');
        console.log('  GET  /api/categories      - Liste catégories');
        console.log('  GET  /api/stats           - Statistiques');
        console.log('='.repeat(70));
        console.log('✅ Serveur prêt à recevoir des requêtes !');
        console.log('='.repeat(70));
    });
}, 1500);

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt du serveur...');
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('❌ Erreur fermeture DB:', err.message);
            } else {
                console.log('✅ Base de données fermée');
            }
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Signal SIGTERM reçu, arrêt...');
    if (db) db.close();
    process.exit(0);
});