const { z } = require('zod');
const clienteService = require('../services/cliente.service');

const clienteSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres.'),
  cpf: z.string().min(11, 'CPF inválido.'),
  rg: z.string().optional(),
  dataNascimento: z.string().optional().nullable(),
  telefone: z.string().optional(),
  email: z.string().email().optional().nullable(),
  endereco: z.string().optional(),
  observacoes: z.string().optional(),
});

/**
 * Controller de Clientes
 */
class ClienteController {
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
        dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : null,
      });
      res.status(201).json(cliente);
    } catch (error) { next(error); }
  }

  async atualizar(req, res, next) {
    try {
      const data = clienteSchema.partial().parse(req.body);
      const cliente = await clienteService.atualizar(req.params.id, {
        ...data,
        dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : undefined,
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
