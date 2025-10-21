// File path: D:\my-thesis\backend\src\routes\tables.js
import { Router } from "express";
import * as ctrl from "../controllers/tablesController.js";
import { authRequired } from "../middleware/auth.js";
// Nếu đã có authorize theo role thì bật ở các dòng comment
// import { authorize } from "../middleware/authorize.js";

const router = Router();

// List & detail
router.get("/",    /* authRequired, */ /* authorize(['admin','manager','cashier']) ,*/ ctrl.list);
router.get("/:id", /* authRequired, */ /* authorize(['admin','manager','cashier']) ,*/ ctrl.getOne);

// Create / update / status / delete
router.post("/",             /* authRequired, */ /* authorize(['admin','manager']) ,*/ ctrl.create);
router.put("/:id",           /* authRequired, */ /* authorize(['admin','manager']) ,*/ ctrl.update);
router.patch("/:id/status",  /* authRequired, */ /* authorize(['admin','manager','cashier']) ,*/ ctrl.updateStatus);
router.delete("/:id",        /* authRequired, */ /* authorize(['admin']) ,*/ ctrl.remove);

export default router;
