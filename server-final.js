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
// Dans server.js, au début après la connexion à la base de données
db.serialize(() => {
  // Créer la table chauffeurs si elle n'existe pas
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

  // Créer la table vehicules si elle n'existe pas
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

  // Créer la table journees si elle n'existe pas
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

  // Créer la table categories si elle n'existe pas
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

  // Créer la table depenses si elle n'existe pas
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
});

console.log('🚖 Taxi Yaoundé - Version minimaliste');

/*db.serialize(() => {
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
    `);*/

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
/*app.get('/api/journees', (req, res) => {
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
});*/



// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// ----------------ROUTE PUR L'AUTHENTIFICATION------------------


// ========== ROUTES API (simples) ==========

// Test
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'API OK', time: new Date().toISOString() });
});

// Route pour Journées
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

// ==================== ROUTES JOURNÉES MANQUANTES ====================
// GET une journée spécifique (ROUTE MANQUANTE)
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

// PUT modifier une journée (ROUTE MANQUANTE)
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

// DELETE supprimer une journée (ROUTE MANQUANTE)
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


// Véhicules
app.get('/api/vehicules', (req, res) => {
  db.all('SELECT * FROM vehicules ORDER BY immatriculation', (err, rows) => {  
    if (err) {
      res.status(500).json({ success: false, error: err.message });
    } else {
      res.json({ success: true, vehicules: rows });
    }
  });
});

// Créer un chauffeur
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

// Chauffeurs
app.get('/api/chauffeurs', (req, res) => {
  db.all('SELECT * FROM chauffeurs ORDER BY nom, prenom', (err, rows) => {     
    if (err) {
      res.status(500).json({ success: false, error: err.message });
    } else {
      res.json({ success: true, chauffeurs: rows });
    }
  });
});

// Catégories
app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories ORDER BY type, nom', (err, rows) => {       
    if (err) {
      res.status(500).json({ success: false, error: err.message });
    } else {
      res.json({ success: true, categories: rows });
    }
  });
});

// Dépenses
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

// Statistiques
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

// ==================== ROUTES DÉPENSES MANQUANTES ====================

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

// ========== JOURNEES AVEC FILTRES ==========

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

// ========== ROUTES VÉHICULES ==========

// Liste des véhicules
app.get('/api/vehicules', (req, res) => {
  db.all('SELECT * FROM vehicules ORDER BY immatriculation', (err, rows) => {
    if (err) {
      res.status(500).json({ success: false, error: err.message });
    } else {
      res.json({ success: true, vehicules: rows });
    }
  });
});

// Créer un véhicule
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

// GET un véhicule spécifique
// ==================== ROUTES SQLite POUR VÉHICULES ====================

// 1. GET un véhicule spécifique
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

// Route PUT avec gestion d'état propre
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
                    return res.status(409).json({  // 409 Conflict au lieu de 400       
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
                return res.status(409).json({  // 409 Conflict
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

// 3. DELETE supprimer un véhicule
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

// Route DELETE pour supprimer
app.delete('/api/vehicules/:immatriculation', (req, res) => {
    try {
        const immatriculation = decodeURIComponent(req.params.immatriculation);

        // Filtre pour supprimer
        const initialLength = taListeDeVehicules.length;
        taListeDeVehicules = taListeDeVehicules.filter(v => v.immatriculation !== immatriculation);

        if (taListeDeVehicules.length < initialLength) {
            res.json({
                success: true,
                message: 'Véhicule supprimé'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Véhicule non trouvé'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== ROUTES CHAUFFEURS ====================
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

// POST ajouter un chauffeur
app.post('/api/chauffeurs', (req, res) => {
    const data = req.body;

    // Validation selon ta structure
    if (!data.nom || !data.prenom || !data.permis_numero || !data.telephone) {
        return res.status(400).json({
            success: false,
            message: 'Nom, prénom, téléphone et numéro de permis sont obligatoires'
        });
    }

    // Vérifier si le numéro de permis existe déjà
    db.get('SELECT id FROM chauffeurs WHERE permis_numero = ?', [data.permis_numero], (err, row) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur vérification: ' + err.message
            });
        }

        if (row) {
            return res.status(409).json({
                success: false,
                message: 'Ce numéro de permis est déjà utilisé',
                code: 'DUPLICATE_PERMIS'
            });
        }

        // Insérer selon ta structure
        const sql = `
            INSERT INTO chauffeurs
            (nom, prenom, telephone, permis_numero, statut)
            VALUES (?, ?, ?, ?, ?)
        `;

        const params = [
            data.nom,
            data.prenom,
            data.telephone,
            data.permis_numero,
            data.statut || 'actif'
        ];

        db.run(sql, params, function(err) {
            if (err) {
                res.status(500).json({ success: false, error: err.message });
            } else {
                res.json({
                    success: true,
                    message: 'Chauffeur ajouté',
                    id: this.lastID
                });
            }
        });
    });
});


// ========== ROUTES CATÉGORIES ==========

// Liste des catégories
app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories ORDER BY type, nom', (err, rows) => {       
    if (err) {
      res.status(500).json({ success: false, error: err.message });
    } else {
      res.json({ success: true, categories: rows });
    }
  });
});

// Créer une catégorie
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

// ==================== ROUTES CATÉGORIES ====================
// GET toutes les catégories
app.get('/api/categories', (req, res) => {
    db.all('SELECT * FROM categories ORDER BY nom', (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, categories: rows });
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
// DELETE supprimer une catégorie - VERSION SIMPLIFIÉE
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


// POST ajouter une catégorie
app.post('/api/categories', (req, res) => {
    const data = req.body;

    // Validation selon ta structure
    if (!data.nom || !data.type) {
        return res.status(400).json({
            success: false,
            message: 'Nom et type sont obligatoires'
        });
    }

    // Vérifier si le nom existe déjà
    db.get('SELECT id FROM categories WHERE nom = ?', [data.nom], (err, row) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur vérification: ' + err.message
            });
        }

        if (row) {
            return res.status(409).json({
                success: false,
                message: 'Ce nom de catégorie existe déjà',
                code: 'DUPLICATE_CATEGORY'
            });
        }

        // Insérer selon ta structure
        const sql = `
            INSERT INTO categories
            (nom, type, description)
            VALUES (?, ?, ?)
        `;

        const params = [
            data.nom,
            data.type,
            data.description || ''
        ];

        db.run(sql, params, function(err) {
            if (err) {
                res.status(500).json({ success: false, error: err.message });
            } else {
                res.json({
                    success: true,
                    message: 'Catégorie ajoutée',
                    id: this.lastID
                });
            }
        });
    });
});

// ========== ROUTES DÉPENSES DÉTAILLÉES ==========
// Route pour la nouvelle page de dépense
app.get('/nouvelle-depense.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'nouvelle-depense.html'));
});

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

// Route spéciale pour le dashboard : dépenses par date de journée
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

// ========== ROUTES PAGES ==========

// Page d'accueil
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route pour le dashboard
app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});


// Page stats
app.get('/stats.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'stats.html'));
});

// Routes nécessaires pour stats.html
app.get('/api/journees', (req, res) => {
    // Doit supporter date_debut et date_fin
});

app.get('/api/depenses/filtres', (req, res) => {
    // Doit retourner toutes les dépenses avec pagination
});

app.get('/api/vehicules', (req, res) => {
    // Doit retourner tous les véhicules
});


// Page admin
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Route pour la nouvelle page nouvelle journee
app.get('/nouvelle-journee.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'nouvelle-journee.html'));       
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
