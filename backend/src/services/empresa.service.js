const empresaRepository = require('../repositories/empresa.repository');
const auditoriaService = require('./auditoria.service');
const fs = require('fs');
const path = require('path');

const LOGO_DIR = path.resolve(__dirname, '..', '..', 'uploads', 'empresa');
const LOGO_PREFIX = 'logo_empresa';

class EmpresaService {
  normalizarSubdominio(valor) {
    const base = String(valor || '').trim().toLowerCase();
    if (!base) return null;
    return base
      .normalize('NFD')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/_/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  obterArquivoLogo() {
    if (!fs.existsSync(LOGO_DIR)) return null;
    const arquivos = fs.readdirSync(LOGO_DIR).filter((nome) => nome.startsWith(`${LOGO_PREFIX}.`));
    if (!arquivos.length) return null;
    return arquivos[0];
  }

  getLogoInfo() {
    const arquivo = this.obterArquivoLogo();
    return {
      hasLogo: Boolean(arquivo),
      logoUrl: arquivo ? '/api/empresa/logo' : null,
    };
  }

  sanitize(empresa) {
    if (!empresa) return null;
    const logoInfo = this.getLogoInfo();
    return {
      ...empresa,
      asaasApiKey: empresa.asaasApiKey ? '********' : '',
      hasAsaasApiKey: Boolean(empresa.asaasApiKey),
      ...logoInfo,
    };
  }

  obterLogoPath() {
    const arquivo = this.obterArquivoLogo();
    if (!arquivo) return null;
    return path.join(LOGO_DIR, arquivo);
  }

  async salvarLogo(arquivo, usuario) {
    if (!arquivo) {
      const err = new Error('Arquivo de logo nao enviado.');
      err.statusCode = 400;
      throw err;
    }

    await auditoriaService.registrar({
      entidade: 'EMPRESA',
      acao: 'ATUALIZACAO_LOGO',
      registroId: null,
      usuario,
      metadados: { arquivo: arquivo.filename },
    });

    return this.getLogoInfo();
  }

  async obter(tenant = null) {
    const empresa = tenant?.id
      ? await empresaRepository.findById(tenant.id)
      : await empresaRepository.findFirst();
    return this.sanitize(empresa);
  }

  async salvar(data, usuario, tenant = null) {
    const subdominioNormalizado = this.normalizarSubdominio(data.subdominio);
    const atual = tenant?.id
      ? await empresaRepository.findById(tenant.id)
      : await empresaRepository.findFirst();

    const payload = {
      razaoSocial: data.razaoSocial,
      nomeFantasia: data.nomeFantasia || null,
      cnpj: data.cnpj || null,
      email: data.email || null,
      telefone: data.telefone || null,
      asaasBaseUrl: data.asaasBaseUrl || null,
      asaasSandbox: data.asaasSandbox ?? true,
      ativo: true,
    };

    if (Object.prototype.hasOwnProperty.call(data, 'subdominio')) {
      payload.subdominio = subdominioNormalizado;
    }

    if (data.asaasApiKey && String(data.asaasApiKey).trim().length > 0) {
      payload.asaasApiKey = String(data.asaasApiKey).trim();
    }

    const salvo = atual
      ? await empresaRepository.updateById(atual.id, payload)
      : await empresaRepository.upsertPrincipal(payload);

    await auditoriaService.registrar({
      entidade: 'EMPRESA',
      acao: atual ? 'ATUALIZACAO' : 'CRIACAO',
      registroId: salvo.id,
      usuario,
      antes: atual ? { razaoSocial: atual.razaoSocial, cnpj: atual.cnpj } : null,
      depois: {
        razaoSocial: salvo.razaoSocial,
        cnpj: salvo.cnpj,
        subdominio: salvo.subdominio,
        asaasBaseUrl: salvo.asaasBaseUrl,
      },
    });

    return this.sanitize(salvo);
  }
}

module.exports = new EmpresaService();
