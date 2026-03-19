const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Criar usuário admin
  const senhaHash = await bcrypt.hash('123456', 10);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@arameturismo.com' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@arameturismo.com',
      senha: senhaHash,
      telefone: '(11) 99999-0000',
      perfil: 'ADMIN',
      ativo: true,
    },
  });

  console.log('✅ Admin criado:', admin.email);

  // Criar agente de exemplo
  const senhaAgenteHash = await bcrypt.hash('123456', 10);

  const agente = await prisma.usuario.upsert({
    where: { email: 'agente@arameturismo.com' },
    update: {},
    create: {
      nome: 'Maria Silva',
      email: 'agente@arameturismo.com',
      senha: senhaAgenteHash,
      telefone: '(11) 98888-1111',
      perfil: 'AGENTE',
      ativo: true,
    },
  });

  console.log('✅ Agente criado:', agente.email);

  // Criar clientes de exemplo
  const cliente1 = await prisma.cliente.upsert({
    where: { cpf: '123.456.789-00' },
    update: {},
    create: {
      nome: 'João Pereira',
      cpf: '123.456.789-00',
      rg: '12.345.678-9',
      dataNascimento: new Date('1985-03-15'),
      telefone: '(11) 97777-2222',
      email: 'joao@email.com',
      endereco: 'Rua das Flores, 100 - São Paulo/SP',
    },
  });

  const cliente2 = await prisma.cliente.upsert({
    where: { cpf: '987.654.321-00' },
    update: {},
    create: {
      nome: 'Ana Costa',
      cpf: '987.654.321-00',
      rg: '98.765.432-1',
      dataNascimento: new Date('1990-07-22'),
      telefone: '(11) 96666-3333',
      email: 'ana@email.com',
      endereco: 'Av. Paulista, 500 - São Paulo/SP',
    },
  });

  console.log('✅ Clientes criados');

  // Criar venda de exemplo
  const hoje = new Date();
  const proxMes = new Date();
  proxMes.setDate(proxMes.getDate() + 30);
  const proxMesFim = new Date();
  proxMesFim.setDate(proxMesFim.getDate() + 37);

  const venda = await prisma.venda.create({
    data: {
      clienteId: cliente1.id,
      agenteId: agente.id,
      tipoServico: 'PACOTE',
      descricao: 'Pacote Cancún 7 noites com aéreo e hotel all inclusive',
      valorTotal: 8500.00,
      valorComissao: 850.00,
      status: 'ABERTA',
      dataViagemInicio: proxMes,
      dataViagemFim: proxMesFim,
      pagamentos: {
        create: [
          { formaPagamento: 'CARTAO', valor: 8500.00 },
        ],
      },
    },
  });

  // Criar conta a receber para a venda
  await prisma.contaReceber.create({
    data: {
      vendaId: venda.id,
      valor: 8500.00,
      dataVencimento: new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000),
      status: 'PENDENTE',
    },
  });

  // Criar conta a pagar de exemplo
  await prisma.contaPagar.create({
    data: {
      descricao: 'Passagens aéreas - Cancún',
      fornecedor: 'LATAM Airlines',
      valor: 4200.00,
      dataVencimento: new Date(hoje.getTime() + 5 * 24 * 60 * 60 * 1000),
      status: 'PENDENTE',
    },
  });

  console.log('✅ Venda, conta a receber e conta a pagar criadas');

  // Configuração WhatsApp padrão
  const config = await prisma.configuracaoWhatsApp.findFirst();
  if (!config) {
    await prisma.configuracaoWhatsApp.create({
      data: {
        mensagemPadrao: 'Olá {nome}! Sua viagem para {destino} está confirmada para {data}. Qualquer dúvida, entre em contato com a Aramé Turismo. Boa viagem! 🌎',
        ativo: true,
      },
    });
    console.log('✅ Configuração WhatsApp criada');
  }

  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('📧 Admin: admin@arameturismo.com | Senha: 123456');
  console.log('📧 Agente: agente@arameturismo.com | Senha: 123456');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
