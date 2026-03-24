const DEFAULT_TIMEOUT_MS = 12000;

const normalizarTelefone = (valor) => String(valor || '').replace(/\D/g, '');

const obterPrimeiroValor = (obj, chaves = []) => {
  for (const chave of chaves) {
    const valor = obj?.[chave];
    if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
      return valor;
    }
  }
  return '';
};

const parseJsonSeguro = async (response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (_) {
    return { raw: text };
  }
};

const parseJsonStringSeguro = (texto) => {
  if (!texto || typeof texto !== 'string') return null;
  try {
    return JSON.parse(texto);
  } catch (_) {
    return null;
  }
};

class ChatbotProviderService {
  getConfig() {
    const baseUrl = String(process.env.CHATBOT_API_BASE_URL || '').trim();
    const token = String(process.env.CHATBOT_API_TOKEN || '').trim();
    const timeoutMsRaw = Number.parseInt(process.env.CHATBOT_TIMEOUT_MS, 10);
    const timeoutMs = Number.isInteger(timeoutMsRaw) ? Math.max(timeoutMsRaw, 1000) : DEFAULT_TIMEOUT_MS;

    if (!baseUrl) {
      const err = new Error('CHATBOT_API_BASE_URL nao configurada.');
      err.statusCode = 500;
      throw err;
    }

    if (!token) {
      const err = new Error('CHATBOT_API_TOKEN nao configurado.');
      err.statusCode = 500;
      throw err;
    }

    return { baseUrl: baseUrl.replace(/\/+$/, ''), token, timeoutMs };
  }

  async request(path, { method = 'GET', body } = {}) {
    const { baseUrl, token, timeoutMs } = this.getConfig();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const payload = await parseJsonSeguro(response);
      if (!response.ok) {
        const err = new Error(`Falha na API do ChatBot (${response.status}).`);
        err.statusCode = 502;
        err.upstreamStatus = response.status;
        err.details = payload;
        throw err;
      }

      return payload;
    } catch (error) {
      if (error.name === 'AbortError') {
        const err = new Error('Timeout ao consultar API do ChatBot.');
        err.statusCode = 504;
        throw err;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async buscarContatoPorNumero(number) {
    return this.request('/contact', {
      method: 'POST',
      body: { number },
    });
  }

  async listarTicketsDoCanal(payload = {}) {
    const body = payload && typeof payload === 'object' ? payload : {};
    return this.request('/showallticket', {
      method: 'POST',
      body,
    });
  }

  async buscarTicketPorId(ticketId) {
    return this.request(`/ticket/${encodeURIComponent(String(ticketId))}`, {
      method: 'GET',
    });
  }

  async enviarMensagemTexto({ number, ticketId, body, externalKey } = {}) {
    const mensagem = String(body || '').trim();
    if (!mensagem) {
      const err = new Error('Mensagem obrigatoria para envio no ChatBot.');
      err.statusCode = 400;
      throw err;
    }

    const numeroNormalizado = normalizarTelefone(number);
    const ticketNormalizado = String(ticketId || '').trim();

    if (!numeroNormalizado && !ticketNormalizado) {
      const err = new Error('Informe number ou ticketId para envio no ChatBot.');
      err.statusCode = 400;
      throw err;
    }

    const payload = {
      body: mensagem,
      externalKey: String(externalKey || `crm-${Date.now()}`),
    };

    if (ticketNormalizado) {
      payload.ticketId = ticketNormalizado;
    } else {
      payload.number = numeroNormalizado;
    }

    return this.request('', {
      method: 'POST',
      body: payload,
    });
  }

  extrairContato(payload = {}) {
    const base = Array.isArray(payload)
      ? payload[0] || {}
      : (payload?.data || payload?.contact || payload?.ticket || payload || {});

    const mensagens = Array.isArray(base?.messages)
      ? base.messages
      : (Array.isArray(payload?.messages) ? payload.messages : []);

    const mensagemRef = mensagens.find((m) => !m?.fromMe) || mensagens[0] || null;
    const dataJsonRef = parseJsonStringSeguro(mensagemRef?.dataJson);

    const pushNameMensagem = String(obterPrimeiroValor(dataJsonRef, [
      'pushName',
      'notifyName',
    ]) || '').trim();

    const remoteJidMensagem = String(
      dataJsonRef?.key?.remoteJid
      || dataJsonRef?.key?.sender_pn
      || ''
    ).trim();

    const remotoJid = String(obterPrimeiroValor(base, [
      'remoteJid',
      'remoteJidd',
      'jid',
    ]) || '').trim();
    const remotoNumero = remotoJid
      ? String(remotoJid).split('@')[0]
      : (remoteJidMensagem ? String(remoteJidMensagem).split('@')[0] : '');

    const nome = String(obterPrimeiroValor(base, [
      'name',
      'nome',
      'contactName',
      'pushname',
      'pushName',
      'username',
    ]) || '').trim();

    const telefoneRaw = obterPrimeiroValor(base, [
      'number',
      'telefone',
      'phone',
      'phoneNumber',
      'whatsapp',
      'from',
      'contactNumber',
    ]);

    const telefone = String(telefoneRaw || remotoNumero || '').trim();
    const telefoneNormalizado = normalizarTelefone(telefone);

    return {
      nome: nome || pushNameMensagem,
      telefone: telefone || telefoneNormalizado,
      telefoneNormalizado,
      payloadBruto: payload,
    };
  }

  extrairNumerosDeTickets(payload = {}, limit = 10) {
    const tickets = Array.isArray(payload)
      ? payload
      : (Array.isArray(payload?.data) ? payload.data : []);

    const toTimestamp = (ticket) => {
      const raw = ticket?.lastMessageAt || ticket?.updatedAt || ticket?.createdAt || ticket?.lastInteractionBot;
      if (!raw) return 0;
      const asNumber = Number(raw);
      if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;
      const asDate = new Date(raw).getTime();
      return Number.isFinite(asDate) ? asDate : 0;
    };

    const ordenados = [...tickets].sort((a, b) => toTimestamp(b) - toTimestamp(a));

    const numeros = [];
    const vistos = new Set();
    for (const ticket of ordenados) {
      if (numeros.length >= limit) break;

      const remoteJid = String(ticket?.remoteJid || '').trim();
      const remotoNormalizado = normalizarTelefone(remoteJid.split('@')[0] || '');

      const numeroRaw = obterPrimeiroValor(ticket, [
        'number',
        'telefone',
        'phone',
      ]);
      const numeroNormalizado = normalizarTelefone(numeroRaw);
      const escolhido = remotoNormalizado || numeroNormalizado;
      if (!escolhido || vistos.has(escolhido)) continue;

      vistos.add(escolhido);
      numeros.push(escolhido);
    }

    return numeros;
  }
}

module.exports = new ChatbotProviderService();