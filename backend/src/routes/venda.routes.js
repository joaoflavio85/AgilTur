const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const vendaController = require('../controllers/venda.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const uploadDir = path.resolve(__dirname, '../../uploads/vendas');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, uploadDir),
	filename: (req, file, cb) => {
		const unique = Date.now();
		cb(null, `venda-${req.params.id}-${unique}.pdf`);
	},
});

const uploadPdf = multer({
	storage,
	limits: { fileSize: 10 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		const isPdfMime = file.mimetype === 'application/pdf';
		const isPdfExt = file.originalname.toLowerCase().endsWith('.pdf');
		if (!isPdfMime && !isPdfExt) {
			const err = new Error('Apenas arquivos PDF sao permitidos.');
			err.statusCode = 400;
			return cb(err);
		}
		return cb(null, true);
	},
});

router.use(authMiddleware);

router.get('/', vendaController.listar.bind(vendaController));
router.get('/:id', vendaController.buscarPorId.bind(vendaController));
router.get('/:id/anexo-pdf', vendaController.baixarAnexoPdf.bind(vendaController));
router.post('/:id/anexo-pdf', uploadPdf.single('arquivo'), vendaController.anexarPdf.bind(vendaController));
router.delete('/:id/anexo-pdf', vendaController.removerAnexoPdf.bind(vendaController));
router.post('/', vendaController.criar.bind(vendaController));
router.put('/:id', vendaController.atualizar.bind(vendaController));
router.delete('/:id', vendaController.excluir.bind(vendaController));

module.exports = router;
