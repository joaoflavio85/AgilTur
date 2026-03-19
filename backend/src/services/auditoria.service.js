const fs = require('fs');
const path = require('path');
const auditoriaRepository = require('../repositories/auditoria.repository');

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'auditoria.log');

class AuditoriaService {
  constructor() {
    this.dbDisponivel = true;
  }

  serializarJson(valor) {
    if (valor === undefined || valor === null) return null;

    try {
      const texto = JSON.stringify(valor);
      return texto.length > 3900 ? texto.slice(0, 3900) : texto;
    } catch (_) {
      return null;
    }
  }

  async registrarNoArquivo(evento) {
    try {
      if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
      }

      fs.appendFileSync(LOG_FILE, `${JSON.stringify(evento)}\n`, 'utf8');
    } catch (error) {
      console.error('Falha ao registrar auditoria em arquivo:', error.message);
    }
  }

  async registrar({ entidade, acao, registroId, usuario, antes, depois, metadados }) {
    const evento = {
      timestamp: new Date().toISOString(),
      entidade,
      acao,
      registroId,
      usuario: usuario
        ? {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            perfil: usuario.perfil,
          }
        : null,
      antes: antes || null,
      depois: depois || null,
      metadados: metadados || null,
    };

    try {
      if (this.dbDisponivel) {
        await auditoriaRepository.create({
          entidade,
          acao,
          registroId: registroId ? Number(registroId) : null,
          usuarioId: usuario?.id ? Number(usuario.id) : null,
          usuarioNome: usuario?.nome || null,
          usuarioEmail: usuario?.email || null,
          usuarioPerfil: usuario?.perfil || null,
          antesJson: this.serializarJson(antes),
          depoisJson: this.serializarJson(depois),
          metadadosJson: this.serializarJson(metadados),
        });
        return;
      }

      await this.registrarNoArquivo(evento);
    } catch (error) {
      this.dbDisponivel = false;
      console.error('Falha ao registrar auditoria no banco, aplicando fallback em arquivo:', error.message);
      await this.registrarNoArquivo(evento);
    }
  }
}

module.exports = new AuditoriaService();
