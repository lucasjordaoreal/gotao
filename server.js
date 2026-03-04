const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'users.json');
const PRODUCTS_FILE = path.join(__dirname, 'data', 'products.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');

// Ensure data directory and files exist
if (!fs.existsSync(DATA_FILE)) {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, '[]');
}
if (!fs.existsSync(PRODUCTS_FILE)) {
    fs.writeFileSync(PRODUCTS_FILE, '[]');
}
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Helper: Read/Write JSON
const readJSON = (filePath) => {
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
    catch { return []; }
};
const writeJSON = (filePath, data) => fs.writeFileSync(filePath, JSON.stringify(data, null, 4));

// Shortcuts
const readUsers = () => readJSON(DATA_FILE);
const writeUsers = (users) => writeJSON(DATA_FILE, users);
const readProducts = () => readJSON(PRODUCTS_FILE);
const writeProducts = (products) => writeJSON(PRODUCTS_FILE, products);

// Helper: Hash Password (using native crypto.scryptSync)
const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
};

// Helper: Verify Password
const verifyPassword = (password, storedHash) => {
    const [salt, hash] = storedHash.split(':');
    const key = crypto.scryptSync(password, salt, 64).toString('hex');
    return key === hash;
};

// Helper: Generic response
const sendJSON = (res, status, data) => {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
};

// Helper: Verify admin role by username (backend security layer)
const isAdmin = (username) => {
    const users = readUsers();
    const user = users.find(u => u.username === username);
    return user && user.role === 'admin';
};

// Helper: Parse multipart form data (native, no dependencies)
const parseMultipart = (req, callback) => {
    const boundary = req.headers['content-type'].split('boundary=')[1];
    if (!boundary) return callback(new Error('No boundary'), null);

    const chunks = [];
    let totalSize = 0;
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB limit

    req.on('data', chunk => {
        totalSize += chunk.length;
        if (totalSize > MAX_SIZE) {
            req.destroy();
            return callback(new Error('File too large (max 2MB)'), null);
        }
        chunks.push(chunk);
    });

    req.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const bodyStr = buffer.toString('latin1');
        const parts = bodyStr.split('--' + boundary).slice(1, -1);

        const fields = {};
        let fileData = null;

        parts.forEach(part => {
            const [rawHeaders, ...rawBodyParts] = part.split('\r\n\r\n');
            const rawBody = rawBodyParts.join('\r\n\r\n');
            const body = rawBody.replace(/\r\n$/, '');

            const nameMatch = rawHeaders.match(/name="([^"]+)"/);
            const filenameMatch = rawHeaders.match(/filename="([^"]+)"/);

            if (nameMatch) {
                if (filenameMatch) {
                    const contentTypeMatch = rawHeaders.match(/Content-Type:\s*(\S+)/i);
                    // Reconstruct binary data from latin1 string
                    const fileBuffer = Buffer.from(body, 'latin1');
                    fileData = {
                        fieldName: nameMatch[1],
                        fileName: filenameMatch[1],
                        contentType: contentTypeMatch ? contentTypeMatch[1] : 'application/octet-stream',
                        data: fileBuffer
                    };
                } else {
                    fields[nameMatch[1]] = body;
                }
            }
        });

        callback(null, { fields, file: fileData });
    });

    req.on('error', err => callback(err, null));
};

// Main Request Handler
const server = http.createServer((req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    // ==========================================
    // AUTH API
    // ==========================================
    if (req.url === '/api/register' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const { username, email, password } = JSON.parse(body);
                if (!username || !email || !password) return sendJSON(res, 400, { error: 'All fields required.' });

                const allowedDomains = ['@gmail.com', '@outlook.com', '@hotmail.com', '@yahoo.com'];
                if (!allowedDomains.some(d => email.toLowerCase().endsWith(d))) {
                    return sendJSON(res, 400, { error: 'Invalid email domain.' });
                }

                const users = readUsers();
                const encryptedEmail = Buffer.from(email).toString('base64');

                if (users.find(u => u.username === username || u.email === encryptedEmail)) {
                    return sendJSON(res, 400, { error: 'User already exists.' });
                }

                const newUser = {
                    id: Date.now().toString(),
                    username,
                    email: encryptedEmail,
                    password: hashPassword(password),
                    role: 'user',
                    avatar: 'default',
                    createdAt: new Date().toISOString()
                };

                users.push(newUser);
                writeUsers(users);
                sendJSON(res, 201, { message: 'Registration successful!' });
            } catch (err) {
                sendJSON(res, 500, { error: 'Server error during registration.' });
            }
        });
        return;
    }

    if (req.url === '/api/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const { email, password } = JSON.parse(body);
                if (!email || !password) return sendJSON(res, 400, { error: 'Fields required.' });

                const users = readUsers();
                const encryptedEmail = Buffer.from(email).toString('base64');
                const user = users.find(u => u.email === encryptedEmail);

                if (!user || !verifyPassword(password, user.password)) {
                    return sendJSON(res, 401, { error: 'Invalid credentials.' });
                }

                sendJSON(res, 200, {
                    message: 'Login successful!',
                    username: user.username,
                    role: user.role || 'user',
                    avatar: user.avatar || 'default'
                });
            } catch (err) {
                sendJSON(res, 500, { error: 'Server error during login.' });
            }
        });
        return;
    }

    if (req.url === '/api/updateUser' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const { username, avatar } = JSON.parse(body);
                if (!username || !avatar) return sendJSON(res, 400, { error: 'Username and avatar required.' });

                const users = readUsers();
                const userIndex = users.findIndex(u => u.username === username);
                if (userIndex === -1) return sendJSON(res, 404, { error: 'User not found.' });

                users[userIndex].avatar = avatar;
                writeUsers(users);
                sendJSON(res, 200, { message: 'Profile updated successfully!', avatar: users[userIndex].avatar });
            } catch (err) {
                sendJSON(res, 500, { error: 'Server error during profile update.' });
            }
        });
        return;
    }

    // ==========================================
    // PRODUCTS API (Public)
    // ==========================================
    if (req.url === '/api/products' && req.method === 'GET') {
        const products = readProducts();
        return sendJSON(res, 200, products);
    }

    // ==========================================
    // ADMIN API (Role-Protected)
    // ==========================================

    // Save full product list
    if (req.url === '/api/admin/products' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const { username, products } = JSON.parse(body);

                // SECURITY: Backend role verification
                if (!username || !isAdmin(username)) {
                    return sendJSON(res, 403, { error: 'Acesso negado. Permissão de administrador necessária.' });
                }

                if (!Array.isArray(products)) {
                    return sendJSON(res, 400, { error: 'Formato de produtos inválido.' });
                }

                // Validate each product
                for (const p of products) {
                    if (!p.id || !p.title || typeof p.price !== 'number' || p.price < 0) {
                        return sendJSON(res, 400, { error: `Produto inválido: ${p.title || p.id || 'desconhecido'}` });
                    }
                }

                writeProducts(products);
                sendJSON(res, 200, { message: 'Produtos atualizados com sucesso!' });
            } catch (err) {
                sendJSON(res, 500, { error: 'Erro ao salvar produtos.' });
            }
        });
        return;
    }

    // Upload product image
    if (req.url === '/api/admin/upload' && req.method === 'POST') {
        parseMultipart(req, (err, result) => {
            if (err) return sendJSON(res, 400, { error: err.message });

            const { fields, file } = result;

            // SECURITY: Backend role verification
            if (!fields.username || !isAdmin(fields.username)) {
                return sendJSON(res, 403, { error: 'Acesso negado.' });
            }

            if (!file) return sendJSON(res, 400, { error: 'Nenhum arquivo enviado.' });

            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.contentType)) {
                return sendJSON(res, 400, { error: 'Tipo de arquivo inválido. Use JPG, PNG ou WebP.' });
            }

            // Generate unique filename
            const ext = path.extname(file.fileName) || '.png';
            const safeName = `product_${Date.now()}${ext}`;
            const destPath = path.join(UPLOADS_DIR, safeName);

            fs.writeFileSync(destPath, file.data);
            sendJSON(res, 200, { message: 'Upload concluído!', imgSrc: `uploads/${safeName}` });
        });
        return;
    }

    // ==========================================
    // STATIC FILE SERVER
    // ==========================================
    let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
    const extname = path.extname(filePath);

    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err, indexContent) => {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(indexContent, 'utf-8');
                });
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`GOTAO.net Server (Native) running at http://localhost:${PORT}`);
});
