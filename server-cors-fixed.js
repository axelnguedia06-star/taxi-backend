// server-cors-fixed.js - Version ultra-simple avec CORS
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();

// ========== CORS ULTRA-PERMISSIF (pour test) ==========
app.use(cors({
    origin: '*', // Autoriser TOUT pour le moment
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.options('*', cors()); // Pré-vols

// ========== MIDDLEWARE ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Origin:', req.headers.origin);
    next();
});

// ========== DB SIMPLE ==========
const db = new sqlite3.Database(':memory:'); // DB en mémoire pour test

// Créer tables simples
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS journees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            vehicule_immat TEXT,
            chauffeur_id INTEGER,
            recette_total REAL,
            manquant REAL,
            notes TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS vehicules (
            immatriculation TEXT PRIMARY KEY,
            marque TEXT,
            modele TEXT,
            statut TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS chauffeurs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom TEXT,
            prenom TEXT,
            telephone TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS depenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            montant REAL,
            description TEXT,
            categorie_id INTEGER
        )
    `);

    // Données de test
    db.run(`INSERT OR IGNORE INTO vehicules VALUES ('AB-123-CD', 'Toyota', 'Corolla', 'actif')`);
    db.run(`INSERT OR IGNORE INTO chauffeurs VALUES (1, 'Dupont', 'Jean', '0123456789')`);
});

// ========== ROUTES SIMPLES ==========

// Route racine
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🚖 API Taxi Manager - CORS Fixed',
        version: '1.0.0',
        cors: 'enabled',
        frontend: 'https://stellular-arithmetic-650ee8.netlify.app',
        endpoints: ['/api/health', '/api/journees', '/api/vehicules', '/api/chauffeurs', '/api/depenses']
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: '✅ API en ligne - CORS activé',
        timestamp: new Date().toISOString(),
        origin: req.headers.origin || 'unknown',
        cors: 'permissive'
    });
});

// Journées
app.get('/api/journees', (req, res) => {
    db.all('SELECT * FROM journees ORDER BY date DESC LIMIT 10', (err, rows) => {       
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, journees: rows || [] });
        }
    });
});

app.post('/api/journees', (req, res) => {
    const { date, vehicule_immat, chauffeur_id } = req.body;
    db.run(
        'INSERT INTO journees (date, vehicule_immat, chauffeur_id) VALUES (?, ?, ?)',   
        [date || new Date().toISOString(), vehicule_immat || 'AB-123-CD', chauffeur_id || 1],
        function(err) {
            if (err) {
                res.status(500).json({ success: false, error: err.message });
            } else {
                res.json({ success: true, id: this.lastID });
            }
        }
    );
});

// Véhicules
app.get('/api/vehicules', (req, res) => {
    db.all('SELECT * FROM vehicules', (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, vehicules: rows || [] });
        }
    });
});

// Chauffeurs
app.get('/api/chauffeurs', (req, res) => {
    db.all('SELECT * FROM chauffeurs', (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, chauffeurs: rows || [] });
        }
    });
});

// Dépenses
app.get('/api/depenses', (req, res) => {
    db.all('SELECT * FROM depenses ORDER BY id DESC LIMIT 10', (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, depenses: rows || [] });
        }
    });
});

app.post('/api/depenses', (req, res) => {
    const { montant, description } = req.body;
    db.run(
        'INSERT INTO depenses (montant, description) VALUES (?, ?)',
        [montant || 0, description || 'Test'],
        function(err) {
            if (err) {
                res.status(500).json({ success: false, error: err.message });
            } else {
                res.json({ success: true, id: this.lastID });
            }
        }
    );
});

// ========== DÉMARRAGE ==========
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log(`🚀 API Taxi Manager avec CORS`);
    console.log(`🌐 Port: ${PORT}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`🎯 Frontend: https://stellular-arithmetic-650ee8.netlify.app`);        
    console.log(`🔧 CORS: Activé pour toutes les origines`);
    console.log('='.repeat(60));
});