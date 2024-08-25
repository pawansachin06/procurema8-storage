import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3011;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.memoryStorage();
const upload = multer({ storage });

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const chmod = promisify(fs.chmod);

app.post('/upload', upload.single('file'), async (req, res, next) => {
    try {
        const { folderPath } = req.body;
        if (!folderPath) {
            return res.status(400).send({ message: 'Folder path is required' });
        }

        if (!req.file) {
            return res.status(400).send({ message: 'No file uploaded' });
        }

        const folderPathOnDisk = path.join(__dirname, 'uploads', folderPath);
        await mkdir(folderPathOnDisk, { recursive: true });
        await chmod(folderPathOnDisk, 0o775); // Set directory permissions to 775

        let finalFileName = req.file.originalname;
        const filePath = path.join(folderPathOnDisk, finalFileName);

        if (fs.existsSync(filePath)) {
            const fileExtension = path.extname(finalFileName);
            const baseName = path.basename(finalFileName, fileExtension);
            finalFileName = `${baseName}-${nanoid()}${fileExtension}`;
        }

        await writeFile(filePath, req.file.buffer);
        await chmod(filePath, 0o664); // Set file permissions to 664

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
