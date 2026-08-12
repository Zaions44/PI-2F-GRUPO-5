// ==========================================
// auth.js – Autenticação (Login + Cadastro)
// ==========================================

// Alterna entre as abas de login e cadastro
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;

        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        document.getElementById(`${tab}-form`).classList.add('active');
    });
});

// ========== LOGIN ==========
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('usuario', JSON.stringify(data.usuario));

            // Redireciona conforme o tipo de usuário
            if (data.usuario.tipo === 'empresa') {
                window.location.href = '/empresa/dashboard';
            } else if (data.usuario.tipo === 'entregador') {
                window.location.href = '/entregador/pedidos';
            } else {
                window.location.href = '/';
            }
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        alert('❌ Erro ao fazer login. Tente novamente.');
        console.error(error);
    }
});

// ========== CADASTRO ==========
document.getElementById('cadastro-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('cadastro-nome').value;
    const email = document.getElementById('cadastro-email').value;
    const telefone = document.getElementById('cadastro-telefone').value;
    const tipo = document.getElementById('cadastro-tipo').value;
    const senha = document.getElementById('cadastro-senha').value;
    const confirmar = document.getElementById('cadastro-confirmar').value;

    if (senha !== confirmar) {
        alert('❌ As senhas não coincidem!');
        return;
    }

    if (senha.length < 4) {
        alert('❌ A senha deve ter no mínimo 4 caracteres.');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/auth/cadastro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha, telefone, tipo })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('usuario', JSON.stringify(data.usuario));

            if (data.usuario.tipo === 'empresa') {
                window.location.href = '/empresa/dashboard';
            } else if (data.usuario.tipo === 'entregador') {
                window.location.href = '/entregador/pedidos';
            } else {
                window.location.href = '/';
            }
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        alert('❌ Erro ao cadastrar. Tente novamente.');
        console.error(error);
    }
});