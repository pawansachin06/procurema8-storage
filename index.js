import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3011;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res, next) => {
    try {
        const { folderPath } = req.body;
        if (!folderPath) {
            return res.status(400).send({ message: 'Folder path is required' });
        }

        if (!req.file) {
            return res.status(400).send({ message: 'No file uploaded' });
        }

        const folderPathOnDisk = path.join(__dirname, 'uploads', folderPath);
        fs.mkdirSync(folderPathOnDisk, { recursive: true });

        let finalFileName = req.file.originalname;
        const filePath = path.join(folderPathOnDisk, finalFileName);

        if (fs.existsSync(filePath)) {
            const fileExtension = path.extname(finalFileName);
            const baseName = path.basename(finalFileName, fileExtension);
            finalFileName = `${baseName}-${nanoid()}${fileExtension}`;
        }

        fs.writeFileSync(filePath, req.file.buffer);

        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${folderPath}/${finalFileName}`;
        res.json({ imageUrl });
    } catch (error) {
        next(error);
    }
}, (error, req, res, next) => {
    res.status(400).send({ message: error.message });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.listen(port, () => {});
