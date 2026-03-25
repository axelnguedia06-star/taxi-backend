// server-render-complete.js - Version complète pour Render avec CORS
const express = require('express');
const path = require('path');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const app = express();

// ========== CONFIGURATION CORS POUR NETLIFY ==========
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

// Logging des requêtes
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
    next();
});

// ========== BASE DE DONNÉES ==========
const dbPath = path.join(__dirname, 'data', 'taxi-final.db');
const dataDir = path.join(__dirname, 'data');

// Créer le dossier data s'il n'existe pas
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Erreur connexion DB:', err.message);
    } else {
        console.log('✅ Connecté à la DB:', dbPath);
        initializeDatabase();
    }
});

// Initialiser la base de données
function initializeDatabase() {
    db.serialize(() => {
        // Table chauffeurs
        db.run(`
            CREATE TABLE IF NOT EXISTS chauffeurs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nom TEXT NOT NULL,
                prenom TEXT NOT NULL,
                telephone TEXT NOT NULL,
                permis_numero TEXT NOT NULL,
                statut TEXT DEFAULT 'actif',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error('Erreur création table chauffeurs:', err.message);        
            } else {
                console.log('✅ Table chauffeurs vérifiée/créée');
            }
        });

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
        `, (err) => {
            if (err) {
                console.error('Erreur création table vehicules:', err.message);
            } else {
                console.log('✅ Table vehicules vérifiée/créée');
            }
        });

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
        `, (err) => {
            if (err) {
                console.error('Erreur création table journees:', err.message);
            } else {
                console.log('✅ Table journees vérifiée/créée');
            }
        });

        // Table categories
        db.run(`
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nom TEXT NOT NULL,
                type TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error('Erreur création table categories:', err.message);        
            } else {
                console.log('✅ Table categories vérifiée/créée');
            }
        });

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
        `, (err) => {
            if (err) {
                console.error('Erreur création table depenses:', err.message);
            } else {
                console.log('✅ Table depenses vérifiée/créée');
            }
        });

        // Insérer des données par défaut
        setTimeout(() => {
            insertDefaultData();
        }, 1000);
    });
}

function insertDefaultData() {
    // Catégories par défaut
    const defaultCategories = [
        ['Carburant', 'depense', 'Essence, diesel, gaz'],
        ['Entretien', 'depense', 'Vidange, réparations'],
        ['Péage', 'depense', 'Frais de péage'],
        ['Nettoyage', 'depense', 'Lavage du véhicule'],
        ['Assurance', 'depense', 'Assurance annuelle'],
        ['Permis', 'depense', 'Renouvellement permis']
    ];

    defaultCategories.forEach(([nom, type, description]) => {
        db.run(
            'INSERT OR IGNORE INTO categories (nom, type, description) VALUES (?, ?, ?)',
            [nom, type, description]
        );
    });

    console.log('✅ Données par défaut insérées');
}

console.log('🚖 Taxi Yaoundé - Version Render avec CORS');

// ========== ROUTES API ==========

// Route racine
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🚖 API Taxi Manager - Version Complète',
        version: '4.0.0',
        frontend: 'https://stellular-arithmetic-650ee8.netlify.app',
        cors: 'activé',
        database: 'sqlite',
        endpoints: {
            health: 'GET /api/health',
            test: 'GET /api/test',
            journees: 'GET /api/journees',
            journee_by_id: 'GET /api/journees/:id',
            vehicules: 'GET /api/vehicules',
            vehicule_by_immat: 'GET /api/vehicules/:immatriculation',
            chauffeurs: 'GET /api/chauffeurs',
            chauffeur_by_id: 'GET /api/chauffeurs/:id',
            categories: 'GET /api/categories',
            categorie_by_id: 'GET /api/categories/:id',
            depenses: 'GET /api/depenses',
            depense_by_id: 'GET /api/depenses/:id',
            stats: 'GET /api/stats',
            depenses_filtres: 'GET /api/depenses/filtres',
            depenses_stats: 'GET /api/depenses/stats',
            depenses_par_date: 'GET /api/depenses/par-journee-date',
            journees_filtres: 'GET /api/journees/filtres'
        }
    });
});

// Test
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API OK',
        time: new Date().toISOString(),
        cors: 'activé pour Netlify'
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

// ========== ROUTES JOURNÉES ==========

// GET toutes les journées avec filtres
app.get('/api/journees', (req, res) => {
    const { vehicule, date_debut, date_fin, tri } = req.query;
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

    // Gestion du tri
    switch(tri) {
        case 'date_asc':
            sql += ' ORDER BY j.date ASC';
            break;
        case 'recette_desc':
            sql += ' ORDER BY j.recette_total DESC';
            break;
        case 'recette_asc':
            sql += ' ORDER BY j.recette_total ASC';
            break;
        default: // date_desc par défaut
            sql += ' ORDER BY j.date DESC';
    }

    // Limiter à 50 résultats maximum
    sql += ' LIMIT 50';

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Erreur journées:', err.message);
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, journees: rows });
        }
    });
});

// POST créer une journée
app.post('/api/journees', (req, res) => {
    console.log('POST /api/journees', req.body);
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
            console.error('Erreur création:', err.message);
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

// GET une journée spécifique
app.get('/api/journees/:id', (req, res) => {
    const id = parseInt(req.params.id);
    console.log('📥 GET /api/journees/:id - ID:', id);

    if (isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID invalide'
        });
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
            console.error('❌ Erreur GET journée:', err.message);
            res.status(500).json({
                success: false,
                message: 'Erreur serveur: ' + err.message
            });
        } else if (row) {
            console.log('✅ Journée trouvée:', row.id);
            res.json({
                success: true,
                journee: row
            });
        } else {
            console.log('❌ Journée non trouvée ID:', id);
            res.status(404).json({
                success: false,
                message: 'Journée non trouvée'
            });
        }
    });
});

// PUT modifier une journée
app.put('/api/journees/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const data = req.body;
    console.log('✏️ PUT /api/journees/:id - ID:', id, 'Data:', data);

    if (isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID invalide'
        });
    }

    // Validation
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
            console.error('❌ Erreur UPDATE journée:', err.message);
            res.status(500).json({
                success: false,
                message: 'Erreur modification: ' + err.message
            });
        } else if (this.changes > 0) {
            console.log('✅ Journée modifiée ID:', id);
            res.json({
                success: true,
                message: 'Journée modifiée avec succès'
            });
        } else {
            console.log('❌ Journée non trouvée pour modification ID:', id);
            res.status(404).json({
                success: false,
                message: 'Journée non trouvée'
            });
        }
    });
});

// DELETE supprimer une journée
app.delete('/api/journees/:id', (req, res) => {
    const id = parseInt(req.params.id);
    console.log('🗑️ DELETE /api/journees/:id - ID:', id);

    if (isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID invalide'
        });
    }

    // Vérifier d'abord si la journée existe
    db.get('SELECT id FROM journees WHERE id = ?', [id], (err, row) => {
        if (err) {
            console.error('❌ Erreur vérification journée:', err.message);
            return res.status(500).json({
                success: false,
                message: 'Erreur vérification: ' + err.message
            });
        }

        if (!row) {
            console.log('❌ Journée non trouvée pour suppression ID:', id);
            return res.status(404).json({
                success: false,
                message: 'Journée non trouvée'
            });
        }

        // Vérifier s'il y a des dépenses liées
        db.get('SELECT COUNT(*) as count FROM depenses WHERE journee_id = ?', [id], (err, result) => {
            if (err) {
                console.error('❌ Erreur vérification dépenses:', err.message);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur vérification dépenses: ' + err.message
                });
            }

            if (result && result.count > 0) {
                console.log('❌ Dépenses liées trouvées:', result.count);
                return res.status(400).json({
                    success: false,
                    message: `Impossible de supprimer : ${result.count} dépense(s) liée(s) à cette journée`
                });
            }

            // Supprimer la journée
            db.run('DELETE FROM journees WHERE id = ?', [id], function(err) {
                if (err) {
                    console.error('❌ Erreur DELETE journée:', err.message);
                    res.status(500).json({
                        success: false,
                        message: 'Erreur suppression: ' + err.message
                    });
                } else if (this.changes > 0) {
                    console.log('✅ Journée supprimée ID:', id);
                    res.json({
                        success: true,
                        message: 'Journée supprimée avec succès'
                    });
                } else {
                    console.log('❌ Aucune ligne affectée ID:', id);
                    res.status(404).json({
                        success: false,
                        message: 'Journée non trouvée'
                    });
                }
            });
        });
    });
});

// ========== ROUTES VÉHICULES ==========

// GET tous les véhicules
app.get('/api/vehicules', (req, res) => {
    db.all('SELECT * FROM vehicules ORDER BY immatriculation', (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, vehicules: rows });
        }
    });
});

// GET un véhicule spécifique
app.get('/api/vehicules/:immatriculation', (req, res) => {
    try {
        const immatriculation = decodeURIComponent(req.params.immatriculation);
        console.log('🔍 GET véhicule spécifique:', immatriculation);

        db.get('SELECT * FROM vehicules WHERE immatriculation = ?', [immatriculation], (err, row) => {
            if (err) {
                console.error('❌ Erreur SQL:', err.message);
                res.status(500).json({
                    success: false,
                    message: 'Erreur base de données: ' + err.message
                });
            } else if (row) {
                console.log('✅ Véhicule trouvé');
                res.json({
                    success: true,
                    vehicule: row
                });
            } else {
                console.log('❌ Véhicule non trouvé');
                res.status(404).json({
                    success: false,
                    message: 'Véhicule non trouvé'
                });
            }
        });
    } catch (error) {
        console.error('❌ Erreur générale:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur: ' + error.message
        });
    }
});

// POST créer un véhicule
app.post('/api/vehicules', (req, res) => {
    console.log('POST /api/vehicules', req.body);
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
            console.error('Erreur création véhicule:', err.message);
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

// PUT modifier un véhicule
app.put('/api/vehicules/:immatriculation', (req, res) => {
    const ancienneImmat = decodeURIComponent(req.params.immatriculation);
    const data = req.body;

    console.log('🔄 PUT Request:', {
        ancienne: ancienneImmat,
        nouvelle: data.immatriculation,
        timestamp: new Date().toISOString()
    });

    // Validation
    if (!data.immatriculation || !data.marque) {
        return res.status(400).json({
            success: false,
            message: 'Immatriculation et marque sont obligatoires'
        });
    }

    // Fonction principale
    const processUpdate = () => {
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
                console.error('❌ SQL Error:', err.message);
                // Gestion spécifique des erreurs
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({
                        success: false,
                        message: 'Cette immatriculation existe déjà. Veuillez en choisir une autre.',
                        code: 'DUPLICATE_IMMAT'
                    });
                }
                return res.status(500).json({
                    success: false,
                    message: 'Erreur base de données: ' + err.message
                });
            }

            if (this.changes > 0) {
                console.log('✅ Update successful, changes:', this.changes);
                res.json({
                    success: true,
                    message: 'Véhicule modifié avec succès',
                    vehicule: {
                        immatriculation: data.immatriculation,
                        marque: data.marque,
                        modele: data.modele,
                        annee: data.annee,
                        statut: data.statut
                    }
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Véhicule non trouvé'
                });
            }
        });
    };

    // Vérifier l'unicité seulement si l'immatriculation change
    if (ancienneImmat !== data.immatriculation) {
        db.get('SELECT immatriculation FROM vehicules WHERE immatriculation = ?',       
               [data.immatriculation], (err, row) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Erreur vérification: ' + err.message
                });
            }

            if (row) {
                return res.status(409).json({
                    success: false,
                    message: 'Cette immatriculation existe déjà. Veuillez en choisir une autre.',
                    code: 'DUPLICATE_IMMAT',
                    existingImmat: row.immatriculation
                });
            }

            // Pas de doublon, procéder
            processUpdate();
        });
    } else {
        // Même immatriculation, pas besoin de vérifier
        processUpdate();
    }
});

// DELETE supprimer un véhicule
app.delete('/api/vehicules/:immatriculation', (req, res) => {
    try {
        const immatriculation = decodeURIComponent(req.params.immatriculation);
        console.log('🗑️ DELETE véhicule:', immatriculation);

        // Vérifier si le véhicule existe
        db.get('SELECT * FROM vehicules WHERE immatriculation = ?', [immatriculation], (err, row) => {
            if (err) {
                console.error('❌ Erreur vérification:', err.message);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur base de données: ' + err.message
                });
            }

            if (!row) {
                console.log('❌ Véhicule non trouvé pour suppression');
                return res.status(404).json({
                    success: false,
                    message: 'Véhicule non trouvé'
                });
            }

            // Supprimer de la base de données
            db.run('DELETE FROM vehicules WHERE immatriculation = ?', [immatriculation], function(err) {
                if (err) {
                    console.error('❌ Erreur DELETE:', err.message);
                    res.status(500).json({
                        success: false,
                        message: 'Erreur lors de la suppression: ' + err.message        
                    });
                } else {
                    console.log('✅ Véhicule supprimé, lignes affectées:', this.changes);
                    res.json({
                        success: true,
                        message: 'Véhicule supprimé avec succès'
                    });
                }
            });
        });
    } catch (error) {
        console.error('❌ Erreur générale:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur: ' + error.message
        });
    }
});

// ========== ROUTES CHAUFFEURS ==========

// GET tous les chauffeurs
app.get('/api/chauffeurs', (req, res) => {
    db.all('SELECT * FROM chauffeurs ORDER BY nom, prenom', (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, chauffeurs: rows });
        }
    });
});

// POST créer un chauffeur
app.post('/api/chauffeurs', (req, res) => {
    console.log('POST /api/chauffeurs', req.body);
    const { nom, prenom, telephone, permis_numero, statut } = req.body;

    if (!nom || !prenom || !telephone || !permis_numero) {
        return res.status(400).json({
            success: false,
            error: 'Tous les champs sont requis'
        });
    }

    db.run(`
        INSERT INTO chauffeurs (nom, prenom, telephone, permis_numero, statut)
        VALUES (?, ?, ?, ?, ?)
    `, [nom, prenom, telephone, permis_numero, statut || 'actif'],
    function(err) {
        if (err) {
            console.error('Erreur création chauffeur:', err.message);
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

// GET un chauffeur spécifique
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

// PUT modifier un chauffeur
app.put('/api/chauffeurs/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const data = req.body;
    console.log('✏️ Modification chauffeur:', id, data);

    // Validation selon ta structure
    if (!data.nom || !data.prenom || !data.permis_numero || !data.telephone) {
        return res.status(400).json({
            success: false,
            message: 'Nom, prénom, téléphone et numéro de permis sont obligatoires'     
        });
    }

    // Vérifier si le numéro de permis existe déjà (sauf pour ce chauffeur)
    db.get('SELECT id FROM chauffeurs WHERE permis_numero = ? AND id != ?',
           [data.permis_numero, id], (err, row) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur vérification permis: ' + err.message
            });
        }

        if (row) {
            return res.status(409).json({
                success: false,
                message: 'Ce numéro de permis est déjà utilisé par un autre chauffeur', 
                code: 'DUPLICATE_PERMIS'
            });
        }

        // Mettre à jour selon ta structure
        const sql = `
            UPDATE chauffeurs
            SET nom = ?, prenom = ?, telephone = ?,
                permis_numero = ?, statut = ?
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
                console.error('❌ Erreur UPDATE chauffeur:', err.message);
                res.status(500).json({
                    success: false,
                    message: 'Erreur modification: ' + err.message
                });
            } else if (this.changes > 0) {
                console.log('✅ Chauffeur modifié');
                res.json({
                    success: true,
                    message: 'Chauffeur modifié avec succès'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Chauffeur non trouvé'
                });
            }
        });
    });
});

// DELETE supprimer un chauffeur
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

// ========== ROUTES CATÉGORIES ==========

// GET toutes les catégories
app.get('/api/categories', (req, res) => {
    db.all('SELECT * FROM categories ORDER BY type, nom', (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, categories: rows });
        }
    });
});

// POST créer une catégorie
app.post('/api/categories', (req, res) => {
    console.log('POST /api/categories', req.body);
    const { nom, type, description } = req.body;

    if (!nom || !type) {
        return res.status(400).json({
            success: false,
            error: 'Nom et type requis'
        });
    }

    db.run(`
        INSERT INTO categories (nom, type, description)
        VALUES (?, ?, ?)
    `, [nom, type, description || ''],
    function(err) {
        if (err) {
            console.error('Erreur création catégorie:', err.message);
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

// GET une catégorie spécifique
app.get('/api/categories/:id', (req, res) => {
    const id = parseInt(req.params.id);

    db.get('SELECT * FROM categories WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else if (row) {
            res.json({ success: true, categorie: row });
        } else {
            res.status(404).json({ success: false, message: 'Catégorie non trouvée' }); 
        }
    });
});

// PUT modifier une catégorie
app.put('/api/categories/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const data = req.body;
    console.log('✏️ Modification catégorie:', id, data);

    // Validation selon ta structure
    if (!data.nom || !data.type) {
        return res.status(400).json({
            success: false,
            message: 'Nom et type sont obligatoires'
        });
    }

    // Vérifier si le nom existe déjà (sauf pour cette catégorie)
    db.get('SELECT id FROM categories WHERE nom = ? AND id != ?',
           [data.nom, id], (err, row) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur vérification nom: ' + err.message
            });
        }

        if (row) {
            return res.status(409).json({
                success: false,
                message: 'Ce nom de catégorie existe déjà',
                code: 'DUPLICATE_CATEGORY'
            });
        }

        // Mettre à jour selon ta structure
        const sql = `
            UPDATE categories
            SET nom = ?, type = ?, description = ?
            WHERE id = ?
        `;

        const params = [
            data.nom,
            data.type,
            data.description || '',
            id
        ];

        db.run(sql, params, function(err) {
            if (err) {
                console.error('❌ Erreur UPDATE catégorie:', err.message);
                res.status(500).json({
                    success: false,
                    message: 'Erreur modification: ' + err.message
                });
            } else if (this.changes > 0) {
                console.log('✅ Catégorie modifiée');
                res.json({
                    success: true,
                    message: 'Catégorie modifiée avec succès'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Catégorie non trouvée'
                });
            }
        });
    });
});

// DELETE supprimer une catégorie
app.delete('/api/categories/:id', (req, res) => {
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

// ========== ROUTES CATÉGORIES ==========

// GET toutes les catégories
app.get('/api/categories', (req, res) => {
    db.all('SELECT * FROM categories ORDER BY type, nom', (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, categories: rows });
        }
    });
});

// POST créer une catégorie
app.post('/api/categories', (req, res) => {
    console.log('POST /api/categories', req.body);
    const { nom, type, description } = req.body;

    if (!nom || !type) {
        return res.status(400).json({
            success: false,
            error: 'Nom et type requis'
        });
    }

    db.run(`
        INSERT INTO categories (nom, type, description)
        VALUES (?, ?, ?)
    `, [nom, type, description || ''],
    function(err) {
        if (err) {
            console.error('Erreur création catégorie:', err.message);
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

// GET une catégorie spécifique
app.get('/api/categories/:id', (req, res) => {
    const id = parseInt(req.params.id);

    db.get('SELECT * FROM categories WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else if (row) {
            res.json({ success: true, categorie: row });
        } else {
            res.status(404).json({ success: false, message: 'Catégorie non trouvée' }); 
        }
    });
});

// PUT modifier une catégorie
app.put('/api/categories/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const data = req.body;
    console.log('✏️ Modification catégorie:', id, data);

    // Validation selon ta structure
    if (!data.nom || !data.type) {
        return res.status(400).json({
            success: false,
            message: 'Nom et type sont obligatoires'
        });
    }

    // Vérifier si le nom existe déjà (sauf pour cette catégorie)
    db.get('SELECT id FROM categories WHERE nom = ? AND id != ?',
           [data.nom, id], (err, row) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur vérification nom: ' + err.message
            });
        }

        if (row) {
            return res.status(409).json({
                success: false,
                message: 'Ce nom de catégorie existe déjà',
                code: 'DUPLICATE_CATEGORY'
            });
        }

        // Mettre à jour selon ta structure
        const sql = `
            UPDATE categories
            SET nom = ?, type = ?, description = ?
            WHERE id = ?
        `;

        const params = [
            data.nom,
            data.type,
            data.description || '',
            id
        ];

        db.run(sql, params, function(err) {
            if (err) {
                console.error('❌ Erreur UPDATE catégorie:', err.message);
                res.status(500).json({
                    success: false,
                    message: 'Erreur modification: ' + err.message
                });
            } else if (this.changes > 0) {
                console.log('✅ Catégorie modifiée');
                res.json({
                    success: true,
                    message: 'Catégorie modifiée avec succès'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Catégorie non trouvée'
                });
            }
        });
    });
});

// DELETE supprimer une catégorie
app.delete('/api/categories/:id', (req, res) => {
    const id = parseInt(req.params.id);
    console.log('🗑️ Suppression catégorie ID:', id);

    // Supprimer directement
    db.run('DELETE FROM categories WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('❌ Erreur DELETE catégorie:', err.message);
            res.status(500).json({
                success: false,
                message: 'Erreur suppression: ' + err.message
            });
        } else if (this.changes > 0) {
            console.log('✅ Catégorie supprimée, lignes:', this.changes);
            res.json({
                success: true,
                message: 'Catégorie supprimée avec succès'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Catégorie non trouvée'
            });
        }
    });
});

// ========== ROUTES DÉPENSES ==========

// GET toutes les dépenses
app.get('/api/depenses', (req, res) => {
    db.all(`
        SELECT d.*, c.nom as categorie_nom
        FROM depenses d
        LEFT JOIN categories c ON d.categorie_id = c.id
        ORDER BY d.created_at DESC
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, depenses: rows });
        }
    });
});

// POST créer une dépense
app.post('/api/depenses', (req, res) => {
    console.log('POST /api/depenses', req.body);
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
            console.error('Erreur création dépense:', err.message);
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

// GET une dépense spécifique
app.get('/api/depenses/:id', (req, res) => {
    const id = parseInt(req.params.id);
    console.log('📥 GET /api/depenses/:id - ID:', id);

    if (isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID invalide'
        });
    }

    const sql = `
        SELECT d.*, c.nom as categorie_nom
        FROM depenses d
        LEFT JOIN categories c ON d.categorie_id = c.id
        WHERE d.id = ?
    `;

    db.get(sql, [id], (err, row) => {
        if (err) {
            console.error('❌ Erreur GET dépense:', err.message);
            res.status(500).json({
                success: false,
                message: 'Erreur serveur: ' + err.message
            });
        } else if (row) {
            console.log('✅ Dépense trouvée:', row.id);
            res.json({
                success: true,
                depense: row
            });
        } else {
            console.log('❌ Dépense non trouvée ID:', id);
            res.status(404).json({
                success: false,
                message: 'Dépense non trouvée'
            });
        }
    });
});

// PUT modifier une dépense
app.put('/api/depenses/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const data = req.body;
    console.log('✏️ PUT /api/depenses/:id - ID:', id, 'Data:', data);

    if (isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID invalide'
        });
    }

    // Validation
    if (!data.journee_id || !data.categorie_id || !data.montant) {
        return res.status(400).json({
            success: false,
            message: 'Journée, catégorie et montant sont obligatoires'
        });
    }

    const sql = `
        UPDATE depenses
        SET journee_id = ?, categorie_id = ?, montant = ?, description = ?
        WHERE id = ?
    `;

    const params = [
        data.journee_id,
        data.categorie_id,
        data.montant,
        data.description || '',
        id
    ];

    db.run(sql, params, function(err) {
        if (err) {
            console.error('❌ Erreur UPDATE dépense:', err.message);
            res.status(500).json({
                success: false,
                message: 'Erreur modification: ' + err.message
            });
        } else if (this.changes > 0) {
            console.log('✅ Dépense modifiée ID:', id);
            res.json({
                success: true,
                message: 'Dépense modifiée avec succès'
            });
        } else {
            console.log('❌ Dépense non trouvée pour modification ID:', id);
            res.status(404).json({
                success: false,
                message: 'Dépense non trouvée'
            });
        }
    });
});

// DELETE supprimer une dépense
app.delete('/api/depenses/:id', (req, res) => {
    const id = parseInt(req.params.id);
    console.log('🗑️ DELETE /api/depenses/:id - ID:', id);

    if (isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID invalide'
        });
    }

    db.run('DELETE FROM depenses WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('❌ Erreur DELETE dépense:', err.message);
            res.status(500).json({
                success: false,
                message: 'Erreur suppression: ' + err.message
            });
        } else if (this.changes > 0) {
            console.log('✅ Dépense supprimée ID:', id);
            res.json({
                success: true,
                message: 'Dépense supprimée avec succès'
            });
        } else {
            console.log('❌ Dépense non trouvée pour suppression ID:', id);
            res.status(404).json({
                success: false,
                message: 'Dépense non trouvée'
            });
        }
    });
});

// ========== ROUTES STATISTIQUES ==========

// GET statistiques générales
app.get('/api/stats', (req, res) => {
    console.log('GET /api/stats');

    // Journées
    db.all(`
        SELECT j.*, v.immatriculation, v.marque, v.modele,
               c.nom as chauffeur_nom, c.prenom as chauffeur_prenom
        FROM journees j
        LEFT JOIN vehicules v ON j.vehicule_immat = v.immatriculation
        LEFT JOIN chauffeurs c ON j.chauffeur_id = c.id
        ORDER BY j.date DESC
    `, (err, journees) => {
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
                statsVehicule[immat].recette_reelle += ((j.recette_total || 0) - (j.manquant || 0));
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

// ========== ROUTES AVEC FILTRES ==========

// Journées avec filtres (alias)
app.get('/api/journees/filtres', (req, res) => {
    const { vehicule, date_debut, date_fin, tri } = req.query;
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

    // Gestion du tri
    switch(tri) {
        case 'date_asc':
            sql += ' ORDER BY j.date ASC';
            break;
        case 'recette_desc':
            sql += ' ORDER BY j.recette_total DESC';
            break;
        case 'recette_asc':
            sql += ' ORDER BY j.recette_total ASC';
            break;
        default: // date_desc par défaut
            sql += ' ORDER BY j.date DESC';
    }

    // Limiter à 50 résultats maximum
    sql += ' LIMIT 50';

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Erreur journées filtrées:', err.message);
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, journees: rows });
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
            console.error('Erreur dépenses filtrées:', err.message);
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, depenses: rows });
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
            console.error('Erreur stats dépenses:', err.message);
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

// Dépenses par date de journée
app.get('/api/depenses/par-journee-date', (req, res) => {
    const { date_debut, date_fin } = req.query;
    console.log('GET /api/depenses/par-journee-date', { date_debut, date_fin });        

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

    console.log('SQL dépenses par date journée:', sql);
    console.log('Params:', params);

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Erreur dépenses par date journée:', err.message);
            res.status(500).json({ success: false, error: err.message });
        } else {
            console.log(`${rows.length} dépenses trouvées pour la période`);
            res.json({ success: true, depenses: rows });
        }
    });
});

// ========== ROUTES PAGES (pour compatibilité) ==========

// Ces routes servent juste à éviter les erreurs 404
// Le frontend est sur Netlify, donc ces pages sont servies par Netlify

app.get('/nouvelle-depense.html', (req, res) => {
    res.json({
        success: true,
        message: 'Page nouvelle dépense - Frontend sur Netlify',
        frontend_url: 'https://stellular-arithmetic-650ee8.netlify.app/nouvelle-depense.html'
    });
});

app.get('/dashboard.html', (req, res) => {
    res.json({
        success: true,
        message: 'Dashboard - Frontend sur Netlify',
        frontend_url: 'https://stellular-arithmetic-650ee8.netlify.app/dashboard.html'  
    });
});

app.get('/stats.html', (req, res) => {
    res.json({
        success: true,
        message: 'Statistiques - Frontend sur Netlify',
        frontend_url: 'https://stellular-arithmetic-650ee8.netlify.app/stats.html'      
    });
});

app.get('/admin.html', (req, res) => {
    res.json({
        success: true,
        message: 'Admin - Frontend sur Netlify',
        frontend_url: 'https://stellular-arithmetic-650ee8.netlify.app/admin.html'      
    });
});

app.get('/nouvelle-journee.html', (req, res) => {
    res.json({
        success: true,
        message: 'Nouvelle journée - Frontend sur Netlify',
        frontend_url: 'https://stellular-arithmetic-650ee8.netlify.app/nouvelle-journee.html'
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
            'GET  /api/health',
            'GET  /api/test',
            'GET  /api/journees',
            'POST /api/journees',
            'GET  /api/journees/:id',
            'PUT  /api/journees/:id',
            'DEL  /api/journees/:id',
            'GET  /api/vehicules',
            'POST /api/vehicules',
            'GET  /api/vehicules/:immatriculation',
            'PUT  /api/vehicules/:immatriculation',
            'DEL  /api/vehicules/:immatriculation',
            'GET  /api/chauffeurs',
            'POST /api/chauffeurs',
            'GET  /api/chauffeurs/:id',
            'PUT  /api/chauffeurs/:id',
            'DEL  /api/chauffeurs/:id',
            'GET  /api/categories',
            'POST /api/categories',
            'GET  /api/categories/:id',
            'PUT  /api/categories/:id',
            'DEL  /api/categories/:id',
            'GET  /api/depenses',
            'POST /api/depenses',
            'GET  /api/depenses/:id',
            'PUT  /api/depenses/:id',
            'DEL  /api/depenses/:id',
            'GET  /api/stats',
            'GET  /api/depenses/filtres',
            'GET  /api/depenses/stats',
            'GET  /api/depenses/par-journee-date',
            'GET  /api/journees/filtres'
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
        console.log('🚀 API TAXI MANAGER - VERSION COMPLÈTE POUR RENDER');
        console.log('='.repeat(70));
        console.log(`📊 Port: ${PORT}`);
        console.log(`🌐 URL API: http://localhost:${PORT}`);
        console.log(`🔗 URL Render: https://taxi-manager-api.onrender.com`);
        console.log(`🎯 Frontend: https://stellular-arithmetic-650ee8.netlify.app`);    
        console.log(`🔧 CORS: Activé spécifiquement pour votre frontend`);
        console.log(`💾 Database: SQLite (${dbPath})`);
        console.log('='.repeat(70));
        console.log('📋 Routes principales:');
        console.log('  GET  /                    - Page d\'accueil API');
        console.log('  GET  /api/health          - Vérification santé');
        console.log('  GET  /api/test            - Test API');
        console.log('  GET  /api/journees        - Liste des journées (avec filtres)'); 
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
