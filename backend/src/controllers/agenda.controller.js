const vendaRepository = require('../repositories/venda.repository');

/**
 * Controller de Agenda de Viagens
 */
class AgendaController {
  async agenda(req, res, next) {
    try {
      const { dataInicio, dataFim } = req.query;

      const [viajandoHoje, viagensFuturas] = await Promise.all([
        vendaRepository.findViagensHoje(),
        vendaRepository.findViagensFuturas(
          dataInicio ? new Date(dataInicio) : null,
          dataFim ? new Date(dataFim) : null
        ),
      ]);

      res.json({
        viajandoHoje: {
          total: viajandoHoje.length,
          viagens: viajandoHoje,
        },
        viagensFuturas: {
          total: viagensFuturas.length,
          viagens: viagensFuturas,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AgendaController();
