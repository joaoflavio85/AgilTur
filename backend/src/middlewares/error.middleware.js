/**
 * Middleware global de tratamento de erros
 * Captura todos os erros lançados nas rotas e retorna resposta padronizada
 */
const errorMiddleware = (err, req, res, next) => {
  console.error('❌ Erro:', err);

  // Erro de validação Zod
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Dados inválidos.',
      detalhes: err.errors.map((e) => ({
        campo: e.path.join('.'),
        mensagem: e.message,
      })),
    });
  }

  // Erro do Prisma - registro não encontrado
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Registro não encontrado.' });
  }

  // Erro do Prisma - violação de unique constraint
  if (err.code === 'P2002') {
    const campo = err.meta?.target?.join(', ') || 'campo';
    return res.status(409).json({ error: `Já existe um registro com este ${campo}.` });
  }

  // Erro customizado com statusCode
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Erros do Multer (upload)
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Arquivo excede o limite de 10MB.' });
    }
    return res.status(400).json({ error: 'Erro ao processar upload do arquivo.' });
  }

  // Erro genérico
  return res.status(500).json({
    error: 'Erro interno do servidor.',
    ...(process.env.NODE_ENV === 'development' && { detalhes: err.message }),
  });
};

module.exports = errorMiddleware;
