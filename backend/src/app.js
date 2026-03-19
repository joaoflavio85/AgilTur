require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const usuarioRoutes = require('./routes/usuario.routes');
const clienteRoutes = require('./routes/cliente.routes');
const operadoraRoutes = require('./routes/operadora.routes');
const propostaRoutes = require('./routes/proposta.routes');
const vendaRoutes = require('./routes/venda.routes');
const contaReceberRoutes = require('./routes/contaReceber.routes');
const contaPagarRoutes = require('./routes/contaPagar.routes');
const centroCustoRoutes = require('./routes/centroCusto.routes');
const posVendaRoutes = require('./routes/posVenda.routes');
const modelosPosVendaRoutes = require('./routes/modeloPosVenda.routes');
const agendaRoutes = require('./routes/agenda.routes');
const whatsappRoutes = require('./routes/whatsapp.routes');
const relatorioRoutes = require('./routes/relatorio.routes');
const auditoriaRoutes = require('./routes/auditoria.routes');
const empresaRoutes = require('./routes/empresa.routes');

const errorMiddleware = require('./middlewares/error.middleware');
const tenantMiddleware = require('./middlewares/tenant.middleware');
const { runWithTenant } = require('./config/tenant-context');

const app = express();

// Middlewares globais
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(tenantMiddleware);
app.use((req, res, next) => runWithTenant(req.tenant?.id || null, next));

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/operadoras', operadoraRoutes);
app.use('/api/propostas', propostaRoutes);
app.use('/api/vendas', vendaRoutes);
app.use('/api/contas-receber', contaReceberRoutes);
app.use('/api/contas-pagar', contaPagarRoutes);
app.use('/api/centros-custo', centroCustoRoutes);
app.use('/api/pos-venda', posVendaRoutes);
app.use('/api/modelos-pos-venda', modelosPosVendaRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/empresa', empresaRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Aramé Turismo API funcionando!' });
});

// Middleware de erro global (deve ser o último)
app.use(errorMiddleware);

module.exports = app;
