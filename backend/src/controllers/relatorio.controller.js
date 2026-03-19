const relatorioService = require('../services/relatorio.service');

/**
 * Controller de Relatórios
 */
class RelatorioController {
  async dashboard(req, res, next) {
    try {
      const { mesReferencia } = req.query;
      const dados = await relatorioService.dashboard(req.usuario, { mesReferencia });
      res.json(dados);
    } catch (error) { next(error); }
  }

  async vendasPorPeriodo(req, res, next) {
    try {
      const { dataInicio, dataFim } = req.query;
      const dados = await relatorioService.vendasPorPeriodo(dataInicio, dataFim, req.usuario);
      res.json(dados);
    } catch (error) { next(error); }
  }

  async vendasPorAgente(req, res, next) {
    try {
      const { dataInicio, dataFim } = req.query;
      const dados = await relatorioService.vendasPorAgente(dataInicio, dataFim, req.usuario);
      res.json(dados);
    } catch (error) { next(error); }
  }

  async contasReceberPendentes(req, res, next) {
    try {
      const dados = await relatorioService.contasReceberPendentes(req.usuario);
      res.json(dados);
    } catch (error) { next(error); }
  }

  async contasPagarPendentes(req, res, next) {
    try {
      const dados = await relatorioService.contasPagarPendentes(req.usuario);
      res.json(dados);
    } catch (error) { next(error); }
  }

  async clientesEmViagem(req, res, next) {
    try {
      const dados = await relatorioService.clientesEmViagem(req.usuario);
      res.json(dados);
    } catch (error) { next(error); }
  }
}

module.exports = new RelatorioController();
