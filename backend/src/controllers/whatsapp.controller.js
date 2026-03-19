const prisma = require('../config/database');

/**
 * Controller de WhatsApp (simulação)
 */
class WhatsAppController {
  async getConfig(req, res, next) {
    try {
      const config = await prisma.configuracaoWhatsApp.findFirst();
      res.json(config || { mensagemPadrao: '', ativo: false });
    } catch (error) { next(error); }
  }

  async salvarConfig(req, res, next) {
    try {
      const { mensagemPadrao, ativo } = req.body;
      const config = await prisma.configuracaoWhatsApp.findFirst();

      let resultado;
      if (config) {
        resultado = await prisma.configuracaoWhatsApp.update({
          where: { id: config.id },
          data: { mensagemPadrao, ativo },
        });
      } else {
        resultado = await prisma.configuracaoWhatsApp.create({
          data: { mensagemPadrao, ativo: ativo ?? true },
        });
      }

      res.json(resultado);
    } catch (error) { next(error); }
  }

  async enviar(req, res, next) {
    try {
      const { telefone, nome, mensagem, destino, data } = req.body;

      if (!telefone) {
        return res.status(400).json({ error: 'Telefone obrigatório.' });
      }

      // Simulação — em produção integrar com API WhatsApp Business
      const config = await prisma.configuracaoWhatsApp.findFirst();
      let msgFinal = mensagem || config?.mensagemPadrao || 'Olá! Mensagem da Aramé Turismo.';

      // Substitui variáveis na mensagem
      msgFinal = msgFinal
        .replace('{nome}', nome || '')
        .replace('{destino}', destino || '')
        .replace('{data}', data || '');

      console.log('\n📱 [SIMULAÇÃO WHATSAPP]');
      console.log(`Para: ${telefone}`);
      console.log(`Nome: ${nome}`);
      console.log(`Mensagem: ${msgFinal}`);
      console.log('---\n');

      res.json({
        success: true,
        message: 'Mensagem enviada com sucesso (simulação).',
        dados: { telefone, mensagem: msgFinal },
      });
    } catch (error) { next(error); }
  }
}

module.exports = new WhatsAppController();
