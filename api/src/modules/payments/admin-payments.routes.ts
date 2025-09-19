import { Router } from 'express';

import { requireRole } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validation';
import { adminPaymentService } from './payment.service';
import {
  captureAdminPaymentSchema,
  listAdminPaymentsSchema,
  refundAdminPaymentSchema,
  type CapturePaymentBody,
  type CapturePaymentParams,
  type ListAdminPaymentsQuery,
  type RefundPaymentBody,
  type RefundPaymentParams,
} from './payment.schemas';

const router = Router();

const extractRoles = (roles: unknown): string[] => {
  if (!Array.isArray(roles)) {
    return [];
  }

  return roles
    .map((role) => (typeof role === 'string' ? role.trim() : ''))
    .filter((role) => role.length > 0);
};

router.get(
  '/',
  requireRole('ADMIN', 'EDITOR', 'OPERADOR'),
  validate(listAdminPaymentsSchema),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as ListAdminPaymentsQuery;
      const payments = await adminPaymentService.listPayments(query);

      res.status(200).json({ payments });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/:reservationId/capture',
  requireRole('ADMIN', 'EDITOR', 'OPERADOR'),
  validate(captureAdminPaymentSchema),
  async (req, res, next) => {
    try {
      const params = req.params as unknown as CapturePaymentParams;
      const body = req.body as CapturePaymentBody;
      const actorRoles = extractRoles(req.user?.roles);

      const payment = await adminPaymentService.capturePayment(
        { actorId: req.user?.sub, roles: actorRoles },
        params,
        body,
        { ip: req.ip, userAgent: req.get('user-agent') },
      );

      res.status(200).json({ payment });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/:reservationId/refund',
  requireRole('ADMIN', 'EDITOR', 'OPERADOR'),
  validate(refundAdminPaymentSchema),
  async (req, res, next) => {
    try {
      const params = req.params as unknown as RefundPaymentParams;
      const body = req.body as RefundPaymentBody;
      const actorRoles = extractRoles(req.user?.roles);

      const payment = await adminPaymentService.refundPayment(
        { actorId: req.user?.sub, roles: actorRoles },
        params,
        body,
        { ip: req.ip, userAgent: req.get('user-agent') },
      );

      res.status(200).json({ payment });
    } catch (error) {
      next(error);
    }
  },
);

export const adminPaymentsRouter = router;

