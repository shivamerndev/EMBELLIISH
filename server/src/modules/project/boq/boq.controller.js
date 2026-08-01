import BaseController from '../../../core/BaseController.js';
import asyncHandler from '../../../core/asyncHandler.js';
import boqService from './boq.service.js';
import ProjectModel from '../project/project.model.js';
import { consumptionSheetCsv } from '../../../services/excel.service.js';
import { sendSuccess } from '../../../utils/responseHandler.js';

class BOQController extends BaseController {
  constructor() {
    super(boqService, 'Consumption sheet');

    this.preview = asyncHandler(async (req, res) => {
      const data = await boqService.preview(req.params.projectId, req.body || {});
      return sendSuccess(res, 'Consumption preview calculated', data);
    });

    this.generate = asyncHandler(async (req, res) => {
      const data = await boqService.generate(req.params.projectId, req.body || {}, req.user);
      return sendSuccess(res, `Consumption sheet ${data.code} generated`, data, 201);
    });

    this.current = asyncHandler(async (req, res) => {
      const data = await boqService.getCurrent(req.params.projectId);
      return sendSuccess(res, 'Current consumption sheet retrieved', data);
    });

    this.approve = asyncHandler(async (req, res) => {
      const data = await boqService.approve(req.params.id, req.user);
      return sendSuccess(res, 'Consumption sheet approved', data);
    });

    // The office still wants the sheet in a spreadsheet; this is the same
    // numbers, laid out the way the paper one reads.
    this.exportCsv = asyncHandler(async (req, res) => {
      const boq = await boqService.getCurrent(req.params.projectId);
      const project = await ProjectModel.findById(req.params.projectId)
        .populate('client architect', 'name')
        .lean();

      const csv = consumptionSheetCsv(boq, project);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${boq.code}-consumption.csv"`);
      // A BOM so Excel opens the ₹ and en-dashes as UTF-8 rather than mojibake.
      return res.send(`﻿${csv}`);
    });
  }
}

export default new BOQController();
