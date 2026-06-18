const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

// Ensure public/uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Ensure db.json exists
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve public directory
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer for file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, 'panorama-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // Limit size to 25MB (panoramas can be large)
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const mimeType = allowedTypes.test(file.mimetype);
        const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());

        if (mimeType && extName) {
            return cb(null, true);
        }
        cb(new Error('Solo se permiten imágenes (JPG, JPEG, PNG, WEBP)'));
    }
});

// Helper functions for Database
function getTours() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading db.json:', err);
        return [];
    }
}

function saveTours(tours) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(tours, null, 2));
        return true;
    } catch (err) {
        console.error('Error writing to db.json:', err);
        return false;
    }
}

// API Endpoints

// Upload a panorama image and create a tour
app.post('/api/upload', upload.single('panorama'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No se recibió ninguna imagen' });
        }

        const id = 'clauvr-' + Math.random().toString(36).substring(2, 8);
        const originalName = req.file.originalname;
        const title = req.body.title || originalName.substring(0, originalName.lastIndexOf('.')) || 'Recorrido Virtual';
        
        const relativeImagePath = '/uploads/' + req.file.filename;

        const newTour = {
            id,
            title,
            image: relativeImagePath,
            createdAt: new Date().toISOString()
        };

        const tours = getTours();
        tours.unshift(newTour); // Put newest first
        saveTours(tours);

        res.json({
            success: true,
            tour: newTour
        });
    } catch (error) {
        console.error('Error in upload:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all tours
app.get('/api/tours', (req, res) => {
    res.json(getTours());
});

// Get tour by ID
app.get('/api/tours/:id', (req, res) => {
    const tours = getTours();
    const tour = tours.find(t => t.id === req.params.id);
    if (!tour) {
        return res.status(404).json({ success: false, error: 'Recorrido no encontrado' });
    }
    
    // Normalize format on the fly (legacy format conversion)
    if (!tour.scenes) {
        tour.scenes = {
            "scene_1": {
                title: "Escena Principal",
                image: tour.image,
                hotSpots: []
            }
        };
        tour.defaultScene = "scene_1";
    }
    
    res.json(tour);
});

// Add a scene to an existing tour
app.post('/api/tours/:id/scenes', upload.single('panorama'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No se recibió ninguna imagen' });
        }

        const tours = getTours();
        const tour = tours.find(t => t.id === req.params.id);
        if (!tour) {
            return res.status(404).json({ success: false, error: 'Recorrido no encontrado' });
        }

        // Normalize legacy format first
        if (!tour.scenes) {
            tour.scenes = {
                "scene_1": {
                    title: "Escena Principal",
                    image: tour.image,
                    hotSpots: []
                }
            };
            tour.defaultScene = "scene_1";
        }

        const sceneId = 'scene_' + Math.random().toString(36).substring(2, 8);
        const originalName = req.file.originalname;
        const sceneTitle = req.body.title || originalName.substring(0, originalName.lastIndexOf('.')) || 'Nueva Escena';
        const relativeImagePath = '/uploads/' + req.file.filename;

        tour.scenes[sceneId] = {
            title: sceneTitle,
            image: relativeImagePath,
            hotSpots: []
        };

        saveTours(tours);

        res.json({
            success: true,
            sceneId: sceneId,
            scene: tour.scenes[sceneId],
            tour: tour
        });
    } catch (error) {
        console.error('Error adding scene:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Save updated tour configurations (hotspots, scene updates, etc.)
app.post('/api/tours/:id/save', (req, res) => {
    try {
        const tours = getTours();
        const tourIndex = tours.findIndex(t => t.id === req.params.id);
        
        if (tourIndex === -1) {
            return res.status(404).json({ success: false, error: 'Recorrido no encontrado' });
        }

        const tour = tours[tourIndex];
        const { title, scenes, defaultScene } = req.body;

        if (title) tour.title = title;
        if (scenes) tour.scenes = scenes;
        if (defaultScene) tour.defaultScene = defaultScene;

        // Keep root tour thumbnail image updated to match the default scene
        if (tour.scenes && tour.defaultScene && tour.scenes[tour.defaultScene]) {
            tour.image = tour.scenes[tour.defaultScene].image;
        }

        saveTours(tours);

        res.json({
            success: true,
            tour: tour
        });
    } catch (error) {
        console.error('Error saving tour:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Fallback: Send index.html for client-side routing (if they don't use hash, but we use hash so index.html static is fine)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, error: `Error de carga: ${err.message}` });
    }
    res.status(500).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
    console.log(`ClauVR server running at http://localhost:${PORT}/`);
});
