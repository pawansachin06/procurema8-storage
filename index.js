import express from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';

// Helper to get __dirname equivalent in ES modules
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3011;

// Set up Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const folderPath = path.join(__dirname, 'uploads', req.body.folderPath);
        fs.mkdirSync(folderPath, { recursive: true });
        cb(null, folderPath);
    },
    filename: function (req, file, cb) {
        let fileName = req.body.imageName || file.originalname;
        const folderPath = path.join(__dirname, 'uploads', req.body.folderPath);

        // Check if file with the same name exists
        if (fs.existsSync(path.join(folderPath, fileName))) {
            const fileExtension = path.extname(fileName);
            const baseName = path.basename(fileName, fileExtension);
            fileName = `${baseName}-${nanoid()}${fileExtension}`;
        }

        cb(null, fileName);
    }
});

const upload = multer({ storage });

// Handle file upload
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.body.folderPath}/${req.file.filename}`;
    res.json({ imageUrl });
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
