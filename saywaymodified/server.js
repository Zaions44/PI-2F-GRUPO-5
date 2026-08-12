const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./database/db');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

const JWT_SECRET = process.env.JWT_SECRET || 'fasttrack_secret_2024';

function autenticar(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: "Token não fornecido" });

    jwt.verify(token, JWT_SECRET, (err, usuario) => {
        if (err) return res.status(403).json({ success: false, message: "Token inválido" });
        req.usuario = usuario;
        next();
    });
}

// ========== ROTAS DE AUTENTICAÇÃO ==========

// ========== ROTAS DE AUTENTICAÇÃO ==========
app.post('/api/auth/login', async (req, res) => {
    const { email, senha } = req.body;
    console.log('📝 Tentativa de login:', email);
    
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            console.log('❌ Usuário não encontrado:', email);
            return res.status(401).json({ success: false, message: "Email ou senha incorretos" });
        }
        
        const usuario = result.rows[0];
        console.log('👤 Usuário encontrado:', usuario.nome);
        console.log('🔑 Senha no banco:', usuario.senha);
        console.log('🔑 Senha digitada:', senha);
        
        let senhaValida = false;
        
        // ⚠️ VERIFICA SE A SENHA É HASH OU TEXTO PURO
        if (usuario.senha && usuario.senha.startsWith('$2b$')) {
            // É um hash do bcrypt
            console.log('🔐 Senha é hash, usando bcrypt...');
            senhaValida = await bcrypt.compare(senha, usuario.senha);
        } else {
            // É texto puro
            console.log('📝 Senha é texto puro, comparando diretamente...');
            senhaValida = (senha === usuario.senha);
        }
        
        console.log('✅ Senha válida?', senhaValida);
        
        if (senhaValida) {
            await pool.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1', [usuario.id]);
            
            const token = jwt.sign(
                { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo },
                JWT_SECRET,
                { expiresIn: '7d' }
            );
            
            console.log('✅ Login sucesso:', usuario.nome);
            res.json({ 
                success: true, 
                token,
                usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo }
            });
        } else {
            console.log('❌ Senha incorreta para:', email);
            res.status(401).json({ success: false, message: "Email ou senha incorretos" });
        }
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        res.status(500).json({ success: false, message: "Erro interno" });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: "Email ou senha incorretos" });
        }

        const usuario = result.rows[0];
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(401).json({ success: false, message: "Email ou senha incorretos" });
        }

        await pool.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1', [usuario.id]);
        const token = jwt.sign({ id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo, is_dev: usuario.is_dev }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ success: true, token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo, is_dev: usuario.is_dev } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Erro interno" });
    }
});

// ========== ROTAS DE EMPRESAS ==========
app.get('/api/empresas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM empresas WHERE ativo = true');
        res.json({ success: true, empresas: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao buscar empresas" });
    }
});

// ========== ROTA DE PRODUTOS (SEM IMAGEM) ==========
app.post('/api/produtos', autenticar, async (req, res) => {
    console.log('📦 Recebendo produto:', req.body);

    const { empresa_id, nome, descricao, preco, estoque } = req.body;

    if (!empresa_id) {
        return res.status(400).json({ success: false, message: 'empresa_id é obrigatório' });
    }
    if (!nome) {
        return res.status(400).json({ success: false, message: 'nome é obrigatório' });
    }
    if (!preco || isNaN(preco) || preco <= 0) {
        return res.status(400).json({ success: false, message: 'preco deve ser maior que zero' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO produtos (empresa_id, nome, descricao, preco, estoque) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [empresa_id, nome, descricao || '', preco, estoque || 0]
        );

        console.log('✅ Produto criado:', result.rows[0]);
        res.json({ success: true, produto: result.rows[0] });

    } catch (error) {
        console.error('❌ Erro no banco:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao salvar produto: ' + error.message
        });
    }
});

app.get('/api/produtos/empresa/:empresa_id', async (req, res) => {
    const { empresa_id } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM produtos WHERE empresa_id = $1 AND disponivel = true',
            [empresa_id]
        );
        res.json({ success: true, produtos: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao buscar produtos" });
    }
});

// ========== ROTAS DE PEDIDOS ==========
app.post('/api/pedidos', autenticar, async (req, res) => {
    const { empresa_id, items, endereco_entrega, forma_pagamento, taxa_entrega } = req.body;

    if (req.usuario.tipo !== 'cliente') {
        return res.status(403).json({ success: false, message: "Apenas clientes" });
    }

    try {
        let total = items.reduce((sum, item) => sum + (item.preco * item.quantidade), 0) + (taxa_entrega || 0);
        const codigo = 'FT' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();

        const result = await pool.query(
            `INSERT INTO pedidos (cliente_id, empresa_id, total, codigo_rastreamento, endereco_entrega, forma_pagamento, taxa_entrega)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [req.usuario.id, empresa_id, total, codigo, endereco_entrega, forma_pagamento, taxa_entrega]
        );

        const pedido = result.rows[0];

        for (let item of items) {
            await pool.query(
                'INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_unitario, subtotal) VALUES ($1, $2, $3, $4, $5)',
                [pedido.id, item.produto_id, item.quantidade, item.preco, item.preco * item.quantidade]
            );
        }

        io.to(`empresa_${empresa_id}`).emit('novo_pedido', pedido);
        res.json({ success: true, pedido });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Erro ao criar pedido" });
    }
});

app.get('/api/pedidos/cliente', autenticar, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.*, e.nome as empresa_nome 
             FROM pedidos p
             JOIN empresas e ON p.empresa_id = e.id
             WHERE p.cliente_id = $1
             ORDER BY p.data_pedido DESC`,
            [req.usuario.id]
        );
        res.json({ success: true, pedidos: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao buscar pedidos" });
    }
});

app.put('/api/pedidos/:id/status', autenticar, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await pool.query('UPDATE pedidos SET status = $1 WHERE id = $2', [status, id]);
        const pedido = await pool.query('SELECT cliente_id FROM pedidos WHERE id = $1', [id]);
        io.to(`cliente_${pedido.rows[0].cliente_id}`).emit('status_atualizado', { pedido_id: id, status });
        res.json({ success: true, message: "Status atualizado" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao atualizar status" });
    }
});

// ========== ROTA DE PEDIDOS DA EMPRESA ==========
app.get('/api/pedidos/empresa', autenticar, async (req, res) => {
    // Verifica se é uma empresa
    if (req.usuario.tipo !== 'empresa') {
        return res.status(403).json({ success: false, message: "Apenas empresas" });
    }

    try {
        // Busca a empresa do usuário logado
        const empresa = await pool.query(
            'SELECT id FROM empresas WHERE usuario_id = $1',
            [req.usuario.id]
        );

        if (empresa.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Empresa não encontrada" });
        }

        const empresaId = empresa.rows[0].id;

        // Busca os pedidos da empresa
        const result = await pool.query(
            `SELECT p.*, u.nome as cliente_nome 
             FROM pedidos p
             JOIN usuarios u ON p.cliente_id = u.id
             WHERE p.empresa_id = $1
             ORDER BY p.data_pedido DESC`,
            [empresaId]
        );

        res.json({ success: true, pedidos: result.rows });
    } catch (error) {
        console.error('Erro ao buscar pedidos da empresa:', error);
        res.status(500).json({ success: false, message: "Erro ao buscar pedidos" });
    }
});

// ========== ROTAS DE ENTREGADOR ==========
app.get('/api/pedidos/entregador/disponiveis', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT p.*, e.nome as empresa_nome FROM pedidos p JOIN empresas e ON p.empresa_id = e.id WHERE p.status = 'pronto' AND p.entregador_id IS NULL"
        );
        res.json({ success: true, pedidos: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao buscar pedidos" });
    }
});

app.put('/api/pedidos/:id/entregador', autenticar, async (req, res) => {
    const { id } = req.params;
    if (req.usuario.tipo !== 'entregador') {
        return res.status(403).json({ success: false, message: "Apenas entregadores" });
    }
    try {
        await pool.query('UPDATE pedidos SET entregador_id = $1 WHERE id = $2', [req.usuario.id, id]);
        res.json({ success: true, message: "Pedido aceito" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao aceitar pedido" });
    }
});

// ========== SERVIR PÁGINAS ==========
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/cliente/pedidos', (req, res) => res.sendFile(path.join(__dirname, 'public', 'cliente-pedidos.html')));
app.get('/empresa/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'empresa-dashboard.html')));
app.get('/entregador/pedidos', (req, res) => res.sendFile(path.join(__dirname, 'public', 'entregador-pedidos.html')));

// ========== WEBSOCKET ==========
io.on('connection', (socket) => {
    console.log('📡 Cliente conectado');
    socket.on('entrar_sala', (sala) => {
        socket.join(sala);
        console.log(`🔊 Entrou na sala: ${sala}`);
    });
});

// ========== ROTA DE CADASTRO ==========



// ========== INICIAR ==========
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║     🚀 FASTTRACK - SERVIDOR INICIADO                ║
╠══════════════════════════════════════════════════════╣
║  📡 Servidor: http://localhost:${PORT}                ║
║  🗄️  Banco: PostgreSQL                              ║
║  🔐 Login: burger@fasttrack.com / 123456            ║
║  🔐 Login: joao@email.com / 123456                  ║
╚══════════════════════════════════════════════════════╝
    `);
});