const prisma = require('../config/database');
const auditoriaService = require('../services/auditoria.service');
const chatbotProviderService = require('../services/chatbot.provider.service');

const normalizarTelefone = (telefone) => String(telefone || '').replace(/\D/g, '');

const obterPrimeiroValor = (obj, chaves = []) => {
  for (const chave of chaves) {
    const valor = obj?.[chave];
    if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
      return valor;
    }
  }
  return '';
};

const parseMetadados = (json) => {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch (_) {
    return null;
  }
};

const gerarVariacoesNumero = (numeroInformado) => {
  const digitos = String(numeroInformado || '').replace(/\D/g, '');
  if (!digitos) return [];

  const candidatos = [digitos];

  if (!digitos.startsWith('55')) {
    candidatos.push(`55${digitos}`);
  }

  if (digitos.startsWith('55') && digitos.length > 2) {
    candidatos.push(digitos.slice(2));
  }

  return Array.from(new Set(candidatos));
};

/**
 * Controller de WhatsApp (simulação)
 */
class WhatsAppController {
  async buscarContatoChatbotComFallback(number) {
    const variacoes = gerarVariacoesNumero(number);
    let ultimoErro = null;

    for (const candidato of variacoes) {
      try {
        return await chatbotProviderService.buscarContatoPorNumero(candidato);
      } catch (error) {
        ultimoErro = error;
        if (error?.upstreamStatus !== 404) {
          throw error;
        }
      }
    }

    if (ultimoErro) throw ultimoErro;
    return null;
  }

  async registrarContatoAtivoChatbot({ payload, usuario, ticketId = null }) {
    const contato = chatbotProviderService.extrairContato(payload);
    const telefoneFinal = contato.telefone || null;

    if (!telefoneFinal) {
      const err = new Error('Nao foi possivel extrair telefone do retorno do ChatBot.');
      err.statusCode = 422;
      throw err;
    }

    await auditoriaService.registrar({
      entidade: 'CHATBOT',
      acao: 'CONTATO_ATIVO',
      usuario,
      metadados: {
        origem: 'chatbot-api',
        telefone: telefoneFinal,
        nome: contato.nome || null,
        ticketId: ticketId || null,
      },
      depois: {
        providerPayload: contato.payloadBruto,
      },
    });

    return {
      nome: contato.nome || null,
      telefone: telefoneFinal,
      telefoneNormalizado: contato.telefoneNormalizado || null,
    };
  }

  async importarContatoChatbot(req, res, next) {
    try {
      const number = String(req.body?.number || req.body?.telefone || '').trim();
      const ticketId = String(req.body?.ticketId || '').trim();

      if (!number && !ticketId) {
        return res.status(400).json({ error: 'Informe number/telefone ou ticketId.' });
      }

      let payload = null;
      if (ticketId) {
        payload = await chatbotProviderService.buscarTicketPorId(ticketId);
      } else {
        payload = await this.buscarContatoChatbotComFallback(number);
      }

      const contatoRegistrado = await this.registrarContatoAtivoChatbot({
        payload,
        usuario: req.usuario,
        ticketId,
      });

      return res.json({
        success: true,
        contato: contatoRegistrado,
      });
    } catch (error) {
      return next(error);
    }
  }

  async sincronizarConversasRecentes(req, res, next) {
    try {
      const limiteInformado = Number.parseInt(req.body?.limit ?? req.query?.limit, 10);
      const horasInformadas = Number.parseInt(req.body?.horas ?? req.query?.horas, 10);

      const limit = Number.isInteger(limiteInformado) ? Math.min(Math.max(limiteInformado, 1), 30) : 10;
      const horas = Number.isInteger(horasInformadas) ? Math.min(Math.max(horasInformadas, 1), 720) : 168;
      const dataMinima = new Date(Date.now() - horas * 60 * 60 * 1000);

      let numeros = [];
      let fonte = 'chatbot-showallticket';
      try {
        const tickets = await chatbotProviderService.listarTicketsDoCanal(req.body?.chatbotFilter || {});
        numeros = chatbotProviderService.extrairNumerosDeTickets(tickets, limit);
      } catch (_) {
        fonte = 'fallback-auditoria-local';
      }

      if (!numeros.length) {
        const eventos = await prisma.auditoriaEvento.findMany({
          where: {
            OR: [
              { entidade: 'CHATBOT', acao: 'CONTATO_ATIVO' },
              { entidade: 'WHATSAPP', acao: 'MENSAGEM_ENVIADA' },
            ],
            dataEvento: { gte: dataMinima },
          },
          orderBy: { dataEvento: 'desc' },
          take: limit * 15,
          select: {
            metadadosJson: true,
          },
        });

        const vistos = new Set();
        for (const evento of eventos) {
          if (numeros.length >= limit) break;
          const metadados = parseMetadados(evento.metadadosJson) || {};
          const telefone = String(obterPrimeiroValor(metadados, ['telefone', 'phone', 'phoneNumber']) || '').trim();
          const normalizado = normalizarTelefone(telefone);
          if (!normalizado || vistos.has(normalizado)) continue;
          vistos.add(normalizado);
          numeros.push(normalizado);
        }
      }

      const sucesso = [];
      const falhas = [];

      for (const numero of numeros) {
        try {
          const payload = await this.buscarContatoChatbotComFallback(numero);
          const contato = await this.registrarContatoAtivoChatbot({ payload, usuario: req.usuario });
          sucesso.push(contato);
        } catch (error) {
          falhas.push({
            numero,
            erro: error?.message || 'Falha ao sincronizar contato.',
          });
        }
      }

      return res.json({
        success: true,
        fonte,
        requested: limit,
        candidatos: numeros.length,
        importados: sucesso.length,
        falhas,
      });
    } catch (error) {
      return next(error);
    }
  }

  async webhookChatbot(req, res, next) {
    try {
      const tokenEsperado = String(process.env.CHATBOT_WEBHOOK_TOKEN || '').trim();
      const tokenRecebido = String(req.headers['x-chatbot-token'] || req.headers['x-webhook-token'] || '').trim();

      if (tokenEsperado && tokenRecebido !== tokenEsperado) {
        return res.status(401).json({ error: 'Token do webhook invalido.' });
      }

      const payload = req.body || {};
      const contato = payload.contato || payload.contact || payload.data || payload;

      const telefone = String(obterPrimeiroValor(contato, [
        'telefone',
        'phone',
        'phoneNumber',
        'whatsapp',
        'from',
      ]) || '').trim();

      if (!telefone) {
        return res.status(400).json({ error: 'Webhook sem telefone no payload.' });
      }

      const nome = String(obterPrimeiroValor(contato, [
        'nome',
        'name',
        'contactName',
      ]) || '').trim();

      const mensagem = String(obterPrimeiroValor(contato, [
        'mensagem',
        'message',
        'lastMessage',
      ]) || '').trim();

      await auditoriaService.registrar({
        entidade: 'CHATBOT',
        acao: 'CONTATO_ATIVO',
        metadados: {
          origem: payload.origem || payload.provider || 'chatbot',
          telefone,
          nome,
          mensagem,
          conversationId: payload.conversationId || payload.sessionId || payload.chatId || null,
          recebidoEm: new Date().toISOString(),
        },
      });

      return res.status(202).json({ success: true });
    } catch (error) {
      return next(error);
    }
  }

  async listarConversasAtivas(req, res, next) {
    try {
      const horas = Number.parseInt(req.query?.horas, 10);
      const limite = Number.parseInt(req.query?.limit, 10);

      const janelaHoras = Number.isInteger(horas) ? Math.min(Math.max(horas, 1), 720) : 72;
      const maxItens = Number.isInteger(limite) ? Math.min(Math.max(limite, 1), 100) : 20;
      const dataMinima = new Date(Date.now() - janelaHoras * 60 * 60 * 1000);

      const eventos = await prisma.auditoriaEvento.findMany({
        where: {
          OR: [
            { entidade: 'WHATSAPP', acao: 'MENSAGEM_ENVIADA' },
            { entidade: 'CHATBOT', acao: 'CONTATO_ATIVO' },
          ],
          dataEvento: { gte: dataMinima },
        },
        orderBy: { dataEvento: 'desc' },
        take: maxItens * 10,
        select: {
          id: true,
          entidade: true,
          dataEvento: true,
          metadadosJson: true,
        },
      });

      const clientesComTelefone = await prisma.cliente.findMany({
        where: { telefone: { not: null } },
        select: { id: true, nome: true, telefone: true },
        orderBy: { dataCadastro: 'desc' },
        take: 2000,
      });

      const clientePorTelefone = new Map();
      for (const cliente of clientesComTelefone) {
        const telefone = normalizarTelefone(cliente.telefone);
        if (!telefone || clientePorTelefone.has(telefone)) continue;
        clientePorTelefone.set(telefone, cliente);
      }

      const vistos = new Set();
      const conversas = [];

      for (const evento of eventos) {
        if (conversas.length >= maxItens) break;

        const metadados = parseMetadados(evento.metadadosJson) || {};
        const telefoneOriginal = String(obterPrimeiroValor(metadados, ['telefone', 'phone', 'phoneNumber']) || '').trim();
        const telefoneNormalizado = normalizarTelefone(telefoneOriginal);
        if (!telefoneNormalizado || vistos.has(telefoneNormalizado)) continue;

        vistos.add(telefoneNormalizado);
        const cliente = clientePorTelefone.get(telefoneNormalizado);

        conversas.push({
          id: `${telefoneNormalizado}-${evento.id}`,
          nome: String(obterPrimeiroValor(metadados, ['nome', 'name', 'contactName']) || '').trim() || cliente?.nome || 'Contato sem nome',
          telefone: telefoneOriginal || telefoneNormalizado,
          telefoneNormalizado,
          ultimaInteracaoEm: evento.dataEvento,
          origem: evento.entidade,
          clienteId: cliente?.id || null,
          clienteNome: cliente?.nome || null,
        });
      }

      return res.json({
        items: conversas,
        total: conversas.length,
        janelaHoras,
      });
    } catch (error) {
      return next(error);
    }
  }

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

  async enviarMensagemChatbot(req, res, next) {
    try {
      const number = String(req.body?.number || req.body?.telefone || '').trim();
      const ticketId = String(req.body?.ticketId || '').trim();
      const mensagem = String(req.body?.mensagem || req.body?.body || '').trim();

      if (!mensagem) {
        return res.status(400).json({ error: 'Mensagem obrigatoria.' });
      }

      if (!number && !ticketId) {
        return res.status(400).json({ error: 'Informe number/telefone ou ticketId.' });
      }

      const telefoneNormalizado = normalizarTelefone(number);
      const respostaProvider = await chatbotProviderService.enviarMensagemTexto({
        number: telefoneNormalizado || undefined,
        ticketId: ticketId || undefined,
        body: mensagem,
        externalKey: `crm-followup-${Date.now()}`,
      });

      await auditoriaService.registrar({
        entidade: 'CHATBOT',
        acao: 'MENSAGEM_ENVIADA',
        usuario: req.usuario,
        metadados: {
          origem: 'chatbot-api-send',
          telefone: telefoneNormalizado || null,
          ticketId: ticketId || null,
          propostaId: req.body?.propostaId || null,
        },
        depois: {
          mensagem,
          providerResponse: respostaProvider,
        },
      });

      return res.json({
        success: true,
        message: 'Mensagem enviada via ChatBot com sucesso.',
        dados: {
          telefone: telefoneNormalizado || null,
          ticketId: ticketId || null,
          mensagem,
        },
      });
    } catch (error) {
      return next(error);
    }
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

      await auditoriaService.registrar({
        entidade: 'WHATSAPP',
        acao: 'MENSAGEM_ENVIADA',
        usuario: req.usuario,
        metadados: {
          telefone,
          nome,
          destino,
          data,
        },
        depois: {
          mensagem: msgFinal,
        },
      });

      res.json({
        success: true,
        message: 'Mensagem enviada com sucesso (simulação).',
        dados: { telefone, mensagem: msgFinal },
      });
    } catch (error) { next(error); }
  }
}

module.exports = new WhatsAppController();
