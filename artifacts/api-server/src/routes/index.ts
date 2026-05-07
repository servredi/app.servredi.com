import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import customersRouter from "./customers";
import jobsRouter from "./jobs";
import timeTrackingRouter from "./time-tracking";
import quotesRouter from "./quotes";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import scheduleRouter from "./schedule";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(customersRouter);
router.use(jobsRouter);
router.use(timeTrackingRouter);
router.use(quotesRouter);
router.use(dashboardRouter);
router.use(reportsRouter);
router.use(scheduleRouter);

export default router;
