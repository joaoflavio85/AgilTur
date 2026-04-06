const { z } = require('zod');
const clienteService = require('../services/cliente.service');

const marcarBonificacaoSchema = z.object({
  dataPagamento: z.string().optional().nullable(),
  observacao: z.string().optional().nullable(),
});

const emptyToUndefined = (value) => {
  if (value === undefined || value === null) return undefined;
  const texto = String(value).trim();
  return texto === '' ? undefined : texto;
};

const emptyToNull = (value) => {
  const parsed = emptyToUndefined(value);
  return parsed === undefined ? null : parsed;
};

const somenteDigitos = (value) => String(value || '').replace(/\D/g, '');

const clienteSchema = z.object({
  nome: z.preprocess(emptyToUndefined, z.string().min(2, 'Nome deve ter no minimo 2 caracteres.')),
  cpf: z.preprocess(emptyToUndefined, z.string().min(11, 'CPF invalido.').max(14, 'CPF invalido.').optional()),
  rg: z.preprocess(emptyToUndefined, z.string().optional()),
  dataNascimento: z.preprocess(emptyToNull, z.string().optional().nullable()),
  telefone: z.preprocess(emptyToUndefined, z.string().min(10, 'Telefone invalido.')),
  email: z.preprocess(emptyToNull, z.string().email('Email invalido.').optional().nullable()),
  endereco: z.preprocess(emptyToUndefined, z.string().optional()),
  observacoes: z.preprocess(emptyToUndefined, z.string().optional()),
});

/**
 * Controller de Clientes
 */
class ClienteController {
  async marcarBonificacaoPaga(req, res, next) {
    try {
      const payload = marcarBonificacaoSchema.parse(req.body || {});
      const item = await clienteService.marcarBonificacaoPaga(req.params.indicacaoId, payload, req.usuario);
      res.json(item);
    } catch (error) { next(error); }
  }

  async desfazerBonificacaoPaga(req, res, next) {
    try {
      const payload = marcarBonificacaoSchema.parse(req.body || {});
      const item = await clienteService.desfazerBonificacaoPaga(req.params.indicacaoId, payload, req.usuario);
      res.json(item);
    } catch (error) { next(error); }
  }

  async rankingIndicacoes(req, res, next) {
    try {
      const limit = req.query?.limit;
      const ranking = await clienteService.obterRankingIndicadores(limit);
      res.json(ranking);
    } catch (error) { next(error); }
  }

  async listarIndicacoes(req, res, next) {
    try {
      const itens = await clienteService.listarIndicacoesDoCliente(req.params.id);
      res.json(itens);
    } catch (error) { next(error); }
  }

  async listar(req, res, next) {
    try {
      const { search } = req.query;
      const clientes = await clienteService.listar({ search });
      res.json(clientes);
    } catch (error) { next(error); }
  }

  async buscarPorId(req, res, next) {
    try {
      const cliente = await clienteService.buscarPorId(req.params.id);
      res.json(cliente);
    } catch (error) { next(error); }
  }

  async criar(req, res, next) {
    try {
      const data = clienteSchema.parse(req.body);
      const cliente = await clienteService.criar({
        ...data,
        telefone: somenteDigitos(data.telefone),
        cpf: data.cpf ? somenteDigitos(data.cpf) : undefined,
        dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : null,
      });
      res.status(201).json(cliente);
    } catch (error) { next(error); }
  }

  async atualizar(req, res, next) {
    try {
      const cpfEnviadoNoBody = Object.prototype.hasOwnProperty.call(req.body || {}, 'cpf');
      const data = clienteSchema.partial().parse(req.body);
      const payload = {
        ...data,
        ...(data.telefone !== undefined ? { telefone: somenteDigitos(data.telefone) } : {}),
        ...(cpfEnviadoNoBody ? { cpf: data.cpf ? somenteDigitos(data.cpf) : '' } : {}),
        ...(data.dataNascimento !== undefined ? { dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : null } : {}),
      };

      const cliente = await clienteService.atualizar(req.params.id, {
        ...payload,
      });
      res.json(cliente);
    } catch (error) { next(error); }
  }

  async excluir(req, res, next) {
    try {
      await clienteService.excluir(req.params.id, req.usuario);
      res.json({ message: 'Cliente excluído com sucesso.' });
    } catch (error) { next(error); }
  }
}

module.exports = new ClienteController();
