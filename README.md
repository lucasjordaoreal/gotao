# GOTAO.net — Software Premium Dashboard
GOTAO.net é uma plataforma de dashboard premium com foco em experiência do usuário (UX), design glassmorphism e animações fluidas. Desenvolvido para administração de produtos digitais com um visual moderno e temática "Mercado Negro" (Purple/Green Neon).

## ✨ Principais Recursos

- **Visual Glassmorphism**: Interface ultra-moderna baseada em transparências e desfoque de fundo (backdrop-filter).
- **Dashboard Administrativo**: Gerenciamento de produtos, edição de metadados e controle de estoque.
- **Reposicionamento de Imagem**: Sistema estilo Twitter para ajuste de crop de imagens de produtos via Drag & Drop.
- **Checkout 3D Interativo**: Sistema de pagamento simulado com um cartão de crédito que gira em 3D e validação em tempo real.
- **Sistema de Favoritos**: Filtro global de produtos favoritos no storefront.
- **Carrinho Dinâmico**: Cálculos automáticos de parcelamento (3x sem juros ou 12x para planos vitalícios).

## 🚀 Tecnologias Utilizadas

- **HTML5 / Semântica**
- **Vanilla CSS (Pure)**: Sem frameworks, garantindo performance máxima de 60fps.
- **JavaScript (Vanilla JS)**: Lógica de estado e animações sem dependências externas pesadas.
- **Node.js**: Servidor nativo para persistência de dados JSON.

## 🛠️ Como Instalar e Rodar

1. Clone o repositório:
   ```bash
   git clone https://github.com/lucasjordaoreal/gotao.git
   ```
2. Inicie o servidor:
   ```bash
   node server.js
   ```
3. Acesse no navegador:
   `http://localhost:3000`

## 🔒 Segurança

As senhas dos usuários são armazenadas em `data/users.json` (Ignorado no Git por padrão) utilizando hash seguro para simulação de ambiente de produção.

---
Desenvolvido por **Lucas Jordão**.
