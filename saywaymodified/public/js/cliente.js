// ==========================================
// cliente.js – Página do Cliente
// ==========================================

let cart = [];
let restaurantes = [];
let produtos = {};

// ========== VERIFICAÇÃO DE LOGIN ==========
const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
if (!usuario) {
    window.location.href = '/login';
} else {
    const userName = document.getElementById('user-name');
    if (userName) {
        userName.textContent = usuario.nome.split(' ')[0];
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = '/login';
}

// ========== CARREGAR RESTAURANTES ==========
async function carregarRestaurantes() {
    try {
        const response = await fetch('/api/empresas');
        const data = await response.json();
        if (data.success) {
            restaurantes = data.empresas;
            renderizarRestaurantes(restaurantes);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar restaurantes:', error);
    }
}

function renderizarRestaurantes(lista) {
    const container = document.getElementById('restaurantes-container');
    if (!container) return;
    
    if (lista.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fa-regular fa-store"></i> Nenhum restaurante encontrado</div>`;
        return;
    }

    container.innerHTML = lista.map(r => `
        <div class="restaurante-card" onclick="verRestaurante(${r.id})">
            <h3>${r.nome}</h3>
            <p>${r.endereco || 'Endereço não informado'}</p>
            <span class="categoria">${r.categoria || 'Fast Food'}</span>
        </div>
    `).join('');
}

function filtrarRestaurantes() {
    const termo = document.getElementById('search-input')?.value.toLowerCase() || '';
    const filtrados = restaurantes.filter(r => 
        r.nome.toLowerCase().includes(termo) || 
        (r.categoria && r.categoria.toLowerCase().includes(termo))
    );
    renderizarRestaurantes(filtrados);
}

// ========== VER RESTAURANTE (ABRE O CARDÁPIO) ==========
async function verRestaurante(id) {
    // Redireciona para a página do cardápio com o ID do restaurante
    window.location.href = `/cardapio.html?id=${id}`;
}

// ========== CARRINHO ==========
function addToCart(id, nome, preco, quantidade = 1) {
    const existente = cart.find(item => item.id === id);
    if (existente) {
        existente.quantidade += quantidade;
    } else {
        cart.push({ id, nome, preco, quantidade });
    }
    updateCartUI();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function updateCartUI() {
    const count = document.getElementById('cart-count');
    const items = document.getElementById('cart-items');
    const total = document.getElementById('cart-total');

    if (!count || !items || !total) return;

    count.textContent = cart.reduce((sum, item) => sum + item.quantidade, 0);

    if (cart.length === 0) {
        items.innerHTML = `<div class="empty-state"><i class="fa-regular fa-cart-empty"></i> Seu carrinho está vazio</div>`;
        total.textContent = 'Total: R$ 0,00';
        return;
    }

    items.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div>
                <strong>${item.nome}</strong>
                <div style="font-size:0.8rem;color:#6b7280;">${item.quantidade}x R$ ${item.preco.toFixed(2)}</div>
            </div>
            <div>
                <span style="color:#4fc3f7;font-weight:600;">R$ ${(item.preco * item.quantidade).toFixed(2)}</span>
                <span onclick="removeFromCart(${index})" style="cursor:pointer;color:#ef4444;margin-left:15px;">✕</span>
            </div>
        </div>
    `).join('');

    const totalValor = cart.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
    total.textContent = `Total: R$ ${totalValor.toFixed(2)}`;
}

function toggleCart() {
    document.getElementById('cart-drawer')?.classList.toggle('active');
    document.getElementById('overlay')?.classList.toggle('active');
}

// ========== FINALIZAR PEDIDO ==========
async function finalizarPedido() {
    if (cart.length === 0) {
        alert('🛒 Seu carrinho está vazio!');
        return;
    }

    const endereco = prompt('📍 Digite o endereço de entrega:');
    if (!endereco) return;

    const formaPagamento = prompt('💳 Forma de pagamento (Dinheiro/Cartão/PIX):') || 'Dinheiro';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/pedidos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                empresa_id: 1,
                items: cart.map(item => ({
                    produto_id: item.id,
                    preco: item.preco,
                    quantidade: item.quantidade
                })),
                endereco_entrega: endereco,
                forma_pagamento: formaPagamento,
                taxa_entrega: 5.00
            })
        });

        const data = await response.json();
        if (data.success) {
            alert(`✅ Pedido realizado com sucesso!\nCódigo: ${data.pedido.codigo_rastreamento}`);
            cart = [];
            updateCartUI();
            toggleCart();
        } else {
            alert('❌ Erro ao finalizar pedido');
        }
    } catch (error) {
        alert('❌ Erro ao conectar com o servidor');
        console.error(error);
    }
}

// ========== INICIAR ==========
document.addEventListener('DOMContentLoaded', function() {
    carregarRestaurantes();
});

console.log('✅ cliente.js carregado!');