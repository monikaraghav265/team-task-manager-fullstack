import express from 'express';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireProjectMember } from '../utils/access.js';

const router = express.Router();
router.use(requireAuth);

router.get('/project/:projectId', async (req, res, next) => {
  try {
    req.params.id = req.params.projectId;
    const membership = await requireProjectMember(req, res);
    if (!membership) return;

    const where = { projectId: req.params.projectId };
    if (membership.role !== 'ADMIN') {
      where.assigneeId = req.user.id;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: { assignee: { select: { id: true, name: true, email: true } } }
    });

    const statusCounts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
    const tasksPerUserMap = new Map();
    const now = new Date();
    const overdueTasks = [];

    for (const task of tasks) {
      statusCounts[task.status] += 1;
      const key = task.assignee?.id || 'unassigned';
      const label = task.assignee?.name || 'Unassigned';
      tasksPerUserMap.set(key, {
        userId: key,
        name: label,
        count: (tasksPerUserMap.get(key)?.count || 0) + 1
      });

      if (task.status !== 'DONE' && task.dueDate < now) {
        overdueTasks.push({
          id: task.id,
          title: task.title,
          dueDate: task.dueDate,
          assignee: task.assignee,
          status: task.status,
          priority: task.priority
        });
      }
    }

    res.json({
      summary: {
        totalTasks: tasks.length,
        completedTasks: statusCounts.DONE,
        overdueTasks: overdueTasks.length,
        completionRate: tasks.length ? Math.round((statusCounts.DONE / tasks.length) * 100) : 0
      },
      statusCounts,
      tasksPerUser: Array.from(tasksPerUserMap.values()).sort((a, b) => b.count - a.count),
      overdueTasks: overdueTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 8),
      role: membership.role
    });
  } catch (error) {
    next(error);
  }
});

export default router;
