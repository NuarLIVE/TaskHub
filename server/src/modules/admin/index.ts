import express from 'express';
import { adminAuth } from '../../common/middleware/adminAuth';
import * as statsService from './services/statsService';
import * as usersService from './services/usersService';
import * as disputesService from './services/disputesService';

const router = express.Router();

router.use(adminAuth);

router.get('/stats/online-now', async (req, res) => {
  const data = await statsService.getOnlineCount();
  res.json(data);
});

router.get('/stats/orders', async (req, res) => {
  const range = req.query.range as string || '7d';
  const data = await statsService.getOrdersStats(range);
  res.json(data);
});

router.get('/stats/revenue', async (req, res) => {
  const range = req.query.range as string || '7d';
  const data = await statsService.getRevenueStats(range);
  res.json(data);
});

router.get('/stats/boost-usage', async (req, res) => {
  const data = await statsService.getBoostUsage();
  res.json(data);
});

router.get('/users', async (req, res) => {
  try {
    const query = req.query.query as string || '';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const data = await usersService.listUsers(query, page, limit);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const data = await usersService.getUserDetails(req.params.id);
    res.json(data);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/users/:id/mute', async (req, res) => {
  try {
    const until = new Date(req.body.until);
    const data = await usersService.muteUser(req.params.id, until, (req as any).userId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users/:id/ban', async (req, res) => {
  try {
    const data = await usersService.banUser(req.params.id, (req as any).userId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/disputes', async (req, res) => {
  try {
    const status = req.query.status as string || 'open';
    const data = await disputesService.listDisputes(status);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/disputes/:id/resolve', async (req, res) => {
  try {
    const { winner } = req.body;
    const data = await disputesService.resolveDispute(req.params.id, winner, (req as any).userId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
