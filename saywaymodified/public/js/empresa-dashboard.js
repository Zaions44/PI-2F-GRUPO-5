// ==========================================
// empresa-dashboard.js - VERSÃO FINAL COMPLETA
// ==========================================

const socket = io();
const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
const token = localStorage.getItem('token');

// ===== VERIFICAÇÃO DE LOGIN =====
if (!usuario || usuario.tipo !== 'empresa') {
    alert('❌ Faça login como empresa!');
    window.location.href = '/login';
}

console.log('✅ Usuário logado:', usuario);

// ===== WEBSOCKET =====
socket.emit('entrar_sala', `empresa_${usuario.id}`);

socket.on('novo_pedido', (pedido) => {
    console.log('📦 Novo pedido:', pedido);
    carregarPedidos();
    showNotification('📦 Novo pedido recebido!', 'success');
});

// ==========================================
// VARIÁVEL GLOBAL DA EMPRESA
// ==========================================

let empresaAtual = null;

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function showNotification(message, type) {
    const div = document.createElement('div');
    div.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white; padding: 15px 25px; border-radius: 12px;
        font-weight: 500; z-index: 9999;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    div.innerHTML = message;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = '/login';
}

function abrirModalProduto() {
    document.getElementById('modal-produto').classList.add('active');
}

function fecharModal() {
    document.getElementById('modal-produto').classList.remove('active');
}

// ==========================================
// BUSCAR EMPRESA DO USUÁRIO
// ==========================================

async function buscarEmpresaDoUsuario() {
    try {
        const response = await fetch('/api/empresas');
        const data = await response.json();
        
        if (data.success && data.empresas) {
            // Procura a empresa que pertence ao usuário logado
            const empresa = data.empresas.find(e => e.usuario_id === usuario.id);
            
            if (empresa) {
                empresaAtual = empresa;
                console.log('✅ Empresa encontrada!', empresa);
                return empresa;
            } else {
                console.warn('⚠️ Usuário não tem empresa cadastrada!');
                showNotification('⚠️ Você precisa cadastrar sua empresa primeiro!', 'error');
                return null;
            }
        }
        return null;
    } catch (error) {
        console.error('❌ Erro ao buscar empresa:', error);
        return null;
    }
}

// ==========================================
// TABS
// ==========================================

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    if (tab === 'pedidos') {
        document.querySelector('.tab-btn:first-child').classList.add('active');
        document.getElementById('tab-pedidos').classList.add('active');
    } else {
        document.querySelector('.tab-btn:last-child').classList.add('active');
        document.getElementById('tab-produtos').classList.add('active');
        carregarProdutos();
    }
}

// ==========================================
// CARREGAR PEDIDOS
// ==========================================

async function carregarPedidos() {
    try {
        const response = await fetch('/api/pedidos/cliente', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        const container = document.getElementById('pedidos-container');
        if (!data.success || data.pedidos.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fa-regular fa-clock"></i> Nenhum pedido recebido</div>`;
            return;
        }
        
        container.innerHTML = data.pedidos.map(p => `
            <div class="pedido-item">
                <div>
                    <strong>Pedido #${p.id}</strong> - ${p.codigo_rastreamento}
                    <div style="font-size:0.9rem;color:#6b7280;">Total: R$ ${parseFloat(p.total).toFixed(2)}</div>
                </div>
                <div>
                    <span class="badge badge-${p.status}">${p.status}</span>
                    <select class="status-select" onchange="atualizarStatus(${p.id}, this.value)">
                        <option value="recebido" ${p.status === 'recebido' ? 'selected' : ''}>Recebido</option>
                        <option value="preparando" ${p.status === 'preparando' ? 'selected' : ''}>Preparando</option>
                        <option value="pronto" ${p.status === 'pronto' ? 'selected' : ''}>Pronto</option>
                        <option value="saiu_entrega" ${p.status === 'saiu_entrega' ? 'selected' : ''}>Saiu para entrega</option>
                        <option value="entregue" ${p.status === 'entregue' ? 'selected' : ''}>Entregue</option>
                    </select>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro:', error);
    }
}

async function atualizarStatus(pedidoId, status) {
    try {
        const response = await fetch(`/api/pedidos/${pedidoId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });
        const data = await response.json();
        if (data.success) {
            carregarPedidos();
            showNotification('✅ Status atualizado!', 'success');
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}

// ==========================================
// CARREGAR PRODUTOS - CORRIGIDO!
// ==========================================

async function carregarProdutos() {
    try {
        // Busca a empresa do usuário
        const empresa = await buscarEmpresaDoUsuario();
        
        if (!empresa) {
            document.getElementById('produtos-container').innerHTML = `
                <div class="empty-state">
                    <i class="fa-regular fa-building"></i>
                    <h3>Empresa não encontrada</h3>
                    <p>Entre em contato com o administrador.</p>
                </div>
            `;
            document.getElementById('total-produtos').textContent = '0';
            return;
        }
        
        const empresaId = empresa.id;
        console.log('🔍 Buscando produtos da empresa ID:', empresaId);
        
        const response = await fetch(`/api/produtos/empresa/${empresaId}`);
        const data = await response.json();
        
        const container = document.getElementById('produtos-container');
        if (!data.success || data.produtos.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fa-regular fa-box"></i> Nenhum produto cadastrado</div>`;
            document.getElementById('total-produtos').textContent = '0';
            return;
        }
        
        document.getElementById('total-produtos').textContent = data.produtos.length;
        
        container.innerHTML = data.produtos.map(p => `
            <div class="produto-item">
                <div>
                    <strong>${p.nome}</strong>
                    <div style="font-size:0.8rem;color:#6b7280;">${p.descricao || 'Sem descrição'}</div>
                    <div>R$ ${parseFloat(p.preco).toFixed(2)} - Estoque: ${p.estoque}</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
    }
}

// ==========================================
// CRIAR PRODUTO - CORRIGIDO!
// ==========================================

async function criarProduto(dados) {
    // Busca a empresa do usuário
    const empresa = await buscarEmpresaDoUsuario();
    
    if (!empresa) {
        throw new Error('Empresa não encontrada para este usuário');
    }
    
    const empresaId = empresa.id;
    
    console.log('📦 Criando produto para empresa ID:', empresaId);
    console.log('📦 Dados:', dados);
    
    const response = await fetch('/api/produtos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            empresa_id: empresaId,
            nome: dados.nome,
            descricao: dados.descricao || '',
            preco: dados.preco,
            estoque: dados.estoque || 0
        })
    });
    
    const data = await response.json();
    console.log('📨 Resposta:', data);
    
    if (!response.ok || !data.success) {
        throw new Error(data.message || 'Erro ao criar produto');
    }
    return data;
}

// ==========================================
// FORMULÁRIO - EVENTO DE SUBMIT
// ==========================================

document.getElementById('form-produto').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const dados = {
        nome: document.getElementById('produto-nome').value.trim(),
        descricao: document.getElementById('produto-desc').value.trim() || '',
        preco: parseFloat(document.getElementById('produto-preco').value),
        estoque: parseInt(document.getElementById('produto-estoque').value) || 0
    };
    
    console.log('📝 Dados do formulário:', dados);
    
    if (!dados.nome || dados.nome.length < 2) {
        showNotification('❌ Nome deve ter pelo menos 2 caracteres', 'error');
        return;
    }
    if (!dados.preco || dados.preco <= 0) {
        showNotification('❌ Preço deve ser maior que zero', 'error');
        return;
    }
    
    const btn = e.target.querySelector('button[type="submit"]');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '⏳ Salvando...';
    btn.disabled = true;
    
    try {
        const resultado = await criarProduto(dados);
        showNotification('✅ Produto criado com sucesso!', 'success');
        fecharModal();
        document.getElementById('form-produto').reset();
        carregarProdutos();
        carregarPedidos();
    } catch (error) {
        console.error('❌ Erro:', error);
        showNotification('❌ ' + error.message, 'error');
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
});

// ==========================================
// CSS DA ANIMAÇÃO
// ==========================================

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

// ==========================================
// INICIAR
// ==========================================

// Primeiro, busca a empresa
buscarEmpresaDoUsuario().then(() => {
    carregarPedidos();
    carregarProdutos();
});

console.log('✅ Dashboard da empresa carregado!');
console.log('👤 Usuário:', usuario);