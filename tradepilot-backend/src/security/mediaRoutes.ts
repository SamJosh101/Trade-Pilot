import {Router} from 'express';
import {authMiddleware} from '../middleware/authMiddleware';
const router=Router();
router.use(authMiddleware,(_q,r,n)=>{r.setHeader('Cache-Control','no-store');n();});
router.get('/capabilities',(_q,r)=>r.json({uploads:false,privateDeliveryVerified:false,reason:'Owned signing, validation, quotas, storage access and cleanup are not externally verified. Existing links are preserved.'}));
router.post('/uploads',(_q,r)=>r.status(503).json({error:'New uploads are disabled. No provider request was made.'}));
export default router;
