// ==========================================
// cliente-pedido.js – Histórico de Pedidos
// ==========================================

const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
if (!usuario) {
    window.location.href = '/login';
}

const token = localStorage.getItem('token');

// ========== SOCKET PARA ATUALIZAÇÕES ==========
const socket = io();
socket.emit('entrar_sala', `cliente_${usuario.id}`);

socket.on('status_atualizado', (data) => {
    console.log('🔄 Status atualizado:', data);
    carregarPedidos();
});

socket.on('localizacao_atualizada', (data) => {
    console.log('📍 Entregador:', data);
    // Atualiza o texto de status do pedido
    const pedidoElement = document.querySelector(`[data-pedido="${data.pedido_id}"]`);
    if (pedidoElement) {
        const statusText = pedidoElement.querySelector('.status-text');
        if (statusText) {
            statusText.innerHTML = `📍 Entregador está a caminho!`;
        }
    }
});

// ========== CARREGAR PEDIDOS ==========
async function carregarPedidos() {
    try {
        const response = await fetch('/api/pedidos/cliente', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        const container = document.getElementById('pedidos-container');
        if (!data.success || data.pedidos.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fa-regular fa-clock"></i> Nenhum pedido encontrado</div>`;
            return;
        }
        
        container.innerHTML = data.pedidos.map(p => `
            <div class="pedido-card" data-pedido="${p.id}">
                <div>
                    <strong>${p.empresa_nome}</strong>
                    <span style="font-size:0.8rem;color:#6b7280;">Código: ${p.codigo_rastreamento}</span>
                </div>
                <div>Status: <span class="badge badge-${p.status}">${p.status}</span></div>
                <div>Total: R$ ${parseFloat(p.total).toFixed(2)}</div>
                <div class="status-text">${p.status === 'saiu_entrega' ? '🚴 Seu pedido está a caminho!' : ''}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro:', error);
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = '/login';
}

carregarPedidos();