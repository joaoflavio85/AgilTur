const auditoriaQueryService = require('../services/auditoria.query.service');

class AuditoriaController {
  async listar(req, res, next) {
    try {
      const { entidade, acao, usuarioId, dataInicio, dataFim, page, pageSize } = req.query;
      const resultado = await auditoriaQueryService.listar({
        entidade,
        acao,
        usuarioId,
        dataInicio,
        dataFim,
        page,
        pageSize,
      });
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuditoriaController();
