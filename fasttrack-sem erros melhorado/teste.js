
function validarProduto(dados) {
    if (!dados.nome || dados.nome.length < 2) {
        return 'Nome deve ter pelo menos 2 caracteres';
    }
    if (!dados.preco || dados.preco <= 0) {
        return 'Preço deve ser maior que zero';
    }
    return null;
}


console.log('=== TESTE 1 - Produto Válido ===');
const resultado1 = validarProduto({ nome: 'X-Bacon', preco: 34.90 });
console.log('Resultado:', resultado1); 

console.log('\n=== TESTE 2 - Nome Curto ===');
const resultado2 = validarProduto({ nome: 'X', preco: 34.90 });
console.log('Resultado:', resultado2); 

console.log('\n=== TESTE 3 - Preço Zero ===');
const resultado3 = validarProduto({ nome: 'X-Bacon', preco: 0 });
console.log('Resultado:', resultado3); 