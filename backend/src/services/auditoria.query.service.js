const auditoriaRepository = require('../repositories/auditoria.repository');

class AuditoriaQueryService {
  async listar(filtros) {
    const page = filtros?.page ? Math.max(1, Number(filtros.page)) : 1;
    const pageSize = filtros?.pageSize ? Math.min(100, Math.max(1, Number(filtros.pageSize))) : 20;

    return auditoriaRepository.findAll({
      entidade: filtros?.entidade,
      acao: filtros?.acao,
      usuarioId: filtros?.usuarioId,
      dataInicio: filtros?.dataInicio,
      dataFim: filtros?.dataFim,
      page,
      pageSize,
    });
  }
}

module.exports = new AuditoriaQueryService();
