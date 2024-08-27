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
const unlink = promisify(fs.unlink);

function slugify(text) {
    return text
        .toLowerCase() // Convert the string to lowercase
        .normalize('NFD') // Normalize to decompose characters with diacritics
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (accents, etc.)
        .replace(/[^a-z0-9\s-.]/g, '') // Remove all non-alphanumeric characters except spaces, hyphens, and dots
        .trim() // Trim leading and trailing whitespace
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with a single hyphen
        .replace(/\.{2,}/g, '.') // Replace multiple dots with a single dot
        .replace(/^-+|-+$/g, '') // Remove leading and trailing hyphens
        .replace(/^\.+|\.+$/g, ''); // Remove leading and trailing dots
}

function truncateFilename(filename, maxLength = 90) {
    if(filename.length <= 90) return filename; // if length already less then return
    const extensionIndex = filename.lastIndexOf('.'); // Find the index of the file extension
    // If there's no extension, return the truncated filename
    if (extensionIndex === -1) {
        return filename.substring(0, maxLength);
    }
    return filename.substring(0, maxLength) + filename.substring(extensionIndex); // Truncate the filename and append the extension
}

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

        let fileName = slugify(req.file.originalname);
        fileName = truncateFilename(fileName);
        let filePath = path.join(folderPathOnDisk, fileName);
        const fileMimeType = req.file.mimetype;
        const fileExtension = path.extname(fileName);

        if (fs.existsSync(filePath)) {
            const baseName = path.basename(fileName, fileExtension);
            fileName = `${baseName}-${nanoid()}${fileExtension}`;
            fileName = slugify(fileName);
            filePath = path.join(folderPathOnDisk, fileName);
        }

        await writeFile(filePath, req.file.buffer);
        await chmod(filePath, 0o664); // Set file permissions to 664

        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${folderPath}/${fileName}`;
        res.json({ fileName, folderPath, fileMimeType, fileExtension, fileUrl });
    } catch (error) {
        next(error);
    }
}, (error, req, res, next) => {
    res.status(400).send({ message: error.message });
});

app.delete('/delete', async (req, res, next) => {
    try {
        const { folderPath, fileName } = req.query;

        if (!folderPath || !fileName) {
            return res.status(400).send({ message: 'Folder path and file name are required' });
        }

        const filePath = path.join(__dirname, 'uploads', folderPath, fileName);

        if (!fs.existsSync(filePath)) {
            return res.status(200).send({ message: 'File not found, already deleted' });
        }

        await unlink(filePath);
        res.status(200).send({ message: 'File deleted successfully' });
    } catch (error) {
        next(error);
    }
}, (error, req, res, next) => {
    res.status(500).send({ message: 'File delete error', error: error.message });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((req, res) => {
    res.status(404).json({ message: 'Not Found' });
});

app.use((err, req, res, next) => {
    res.status(500).json({ message: err.message });
});

app.listen(port, () => {});
