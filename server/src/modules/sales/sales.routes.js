import { Router } from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import { fetchApprovedLeads, getLeadDetail } from "./sales.controller.js";

const router = Router();

router.use(authMiddleware);
router.get("/leads", fetchApprovedLeads);
router.get("/leads/:id", getLeadDetail);

export default router;
