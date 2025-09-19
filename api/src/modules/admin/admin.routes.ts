import { Router } from 'express';

import { authenticate } from '../../middlewares/auth';
import { adminCitiesRouter } from '../geo/admin-cities.routes';
import { adminParksRouter } from '../geo/admin-parks.routes';
import { adminStatesRouter } from '../geo/admin-states.routes';
import { adminGuidesRouter } from '../guides/admin-guides.routes';
import { adminUsersRouter } from '../users/admin-users.routes';
import { adminTrailsRouter } from '../trails/admin-trails.routes';
import { adminMediaRouter } from '../media/admin-media.routes';
import { adminExpeditionsRouter } from '../expeditions/admin-expeditions.routes';
import { adminReservationsRouter } from '../reservations/admin-reservations.routes';
import { adminPaymentsRouter } from '../payments/admin-payments.routes';
import { adminDashboardRouter } from '../dashboard/admin-dashboard.routes';
import { adminReviewsRouter } from '../reviews/admin-reviews.routes';

const router = Router();
router.use(authenticate());

router.use('/users', adminUsersRouter);
router.use('/guides', adminGuidesRouter);
router.use('/states', adminStatesRouter);
router.use('/cities', adminCitiesRouter);
router.use('/parks', adminParksRouter);
router.use('/trails', adminTrailsRouter);
router.use('/media', adminMediaRouter);
router.use('/expeditions', adminExpeditionsRouter);
router.use('/reservations', adminReservationsRouter);
router.use('/payments', adminPaymentsRouter);
router.use('/dashboard', adminDashboardRouter);
router.use('/reviews', adminReviewsRouter);

export const adminRouter = router;
