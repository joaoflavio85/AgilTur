const express = require('express');
const router = express.Router();
const empresaController = require('../controllers/empresa.controller');
const { authMiddleware, authorize } = require('../middlewares/auth.middleware');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const uploadDir = path.resolve(__dirname, '../../uploads/empresa');
if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, uploadDir),
	filename: (_req, file, cb) => {
		const ext = path.extname(file.originalname || '').toLowerCase() || '.png';

		fs.readdirSync(uploadDir)
			.filter((nome) => nome.startsWith('logo_empresa.'))
			.forEach((nome) => {
				try {
					fs.unlinkSync(path.join(uploadDir, nome));
				} catch (_) {}
			});

		cb(null, `logo_empresa${ext}`);
	},
});

const uploadLogo = multer({
	storage,
	limits: { fileSize: 2 * 1024 * 1024 },
	fileFilter: (_req, file, cb) => {
		if (!file.mimetype || !file.mimetype.startsWith('image/')) {
			return cb(new Error('Arquivo invalido. Envie apenas imagem.'));
		}
		return cb(null, true);
	},
});

router.get('/logo', empresaController.obterLogo.bind(empresaController));

router.use(authMiddleware);
router.use(authorize('ADMIN'));

router.get('/', empresaController.obter.bind(empresaController));
router.put('/', empresaController.salvar.bind(empresaController));
router.post('/logo', uploadLogo.single('arquivo'), empresaController.uploadLogo.bind(empresaController));

module.exports = router;
