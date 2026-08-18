import { Router, type IRouter } from "express";
import healthRouter from "./health";
import hamauminRouter from "./hamaumin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(hamauminRouter);

export default router;
