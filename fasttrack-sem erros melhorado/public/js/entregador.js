// ==========================================
// entregador.js – Painel do Entregador
// ==========================================

const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
if (!usuario || usuario.tipo !== 'entregador') {
    window.location.href = '/login';
}

const token = localStorage.getItem('token');

// ========== CARREGAR PEDIDOS DISPONÍVEIS ==========
async function carregarPedidos() {
    try {
        const response = await fetch('/api/pedidos/entregador/disponiveis');
        const data = await response.json();
        
        const container = document.getElementById('pedidos-container');
        if (!data.success || data.pedidos.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fa-regular fa-clock"></i> Nenhum pedido disponível</div>`;
            return;
        }
        
        container.innerHTML = data.pedidos.map(p => `
            <div class="pedido-card">
                <div><strong>${p.empresa_nome}</strong></div>
                <div>Código: ${p.codigo_rastreamento}</div>
                <div>Total: R$ ${parseFloat(p.total).toFixed(2)}</div>
                <div>Endereço: ${p.endereco_entrega}</div>
                <button class="btn-aceitar" onclick="aceitarPedido(${p.id})">✅ Aceitar Entrega</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro:', error);
    }
}

// ========== ACEITAR PEDIDO ==========
async function aceitarPedido(pedidoId) {
    try {
        const response = await fetch(`/api/pedidos/${pedidoId}/entregador`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
            alert('✅ Pedido aceito!');
            carregarPedidos();
        }
    } catch (error) {
        alert('❌ Erro ao aceitar pedido');
        console.error(error);
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = '/login';
}

carregarPedidos();