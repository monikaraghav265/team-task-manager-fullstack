import express from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireProjectAdmin, requireProjectMember } from '../utils/access.js';

const router = express.Router();
router.use(requireAuth);

const createTaskSchema = z.object({
  title: z.string().trim().min(2, 'Task title must be at least 2 characters.').max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  dueDate: z.string().datetime().or(z.string().min(8)),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).default('TODO'),
  assigneeId: z.string().optional().nullable()
});

const updateTaskSchema = createTaskSchema.partial().extend({
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional()
});

function taskInclude() {
  return {
    assignee: { select: { id: true, name: true, email: true } },
    createdBy: { select: { id: true, name: true, email: true } }
  };
}

async function ensureAssigneeInProject(projectId, assigneeId) {
  if (!assigneeId) return true;
  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: assigneeId, projectId } }
  });
  return Boolean(member);
}

router.get('/projects/:projectId/tasks', async (req, res, next) => {
  try {
    const membership = await requireProjectMember(req, res);
    if (!membership) return;

    const where = { projectId: req.params.projectId };
    if (membership.role !== 'ADMIN') {
      where.assigneeId = req.user.id;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: taskInclude(),
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }]
    });

    res.json({ tasks, role: membership.role });
  } catch (error) {
    next(error);
  }
});

router.post('/projects/:projectId/tasks', async (req, res, next) => {
  try {
    const membership = await requireProjectAdmin(req, res);
    if (!membership) return;

    const input = createTaskSchema.parse(req.body);
    const dueDate = new Date(input.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      return res.status(400).json({ message: 'Enter a valid due date.' });
    }

    if (input.assigneeId && !(await ensureAssigneeInProject(req.params.projectId, input.assigneeId))) {
      return res.status(400).json({ message: 'Assignee must be a member of this project.' });
    }

    const task = await prisma.task.create({
      data: {
        title: input.title,
        description: input.description || null,
        dueDate,
        priority: input.priority,
        status: input.status,
        projectId: req.params.projectId,
        assigneeId: input.assigneeId || null,
        createdById: req.user.id
      },
      include: taskInclude()
    });

    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
});

router.patch('/tasks/:taskId', async (req, res, next) => {
  try {
    const input = updateTaskSchema.parse(req.body);
    const existing = await prisma.task.findUnique({
      where: { id: req.params.taskId },
      include: {
        project: {
          include: {
            members: { where: { userId: req.user.id } }
          }
        }
      }
    });

    if (!existing || existing.project.members.length === 0) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const role = existing.project.members[0].role;
    const isAdmin = role === 'ADMIN';
    const isAssignedMember = existing.assigneeId === req.user.id;

    if (!isAdmin) {
      const keys = Object.keys(req.body || {});
      if (!isAssignedMember || keys.some((key) => key !== 'status')) {
        return res.status(403).json({ message: 'Members can only update status of their own assigned tasks.' });
      }
    }

    if (input.assigneeId && !(await ensureAssigneeInProject(existing.projectId, input.assigneeId))) {
      return res.status(400).json({ message: 'Assignee must be a member of this project.' });
    }

    const data = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description || null;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.status !== undefined) data.status = input.status;
    if (input.assigneeId !== undefined) data.assigneeId = input.assigneeId || null;
    if (input.dueDate !== undefined) {
      const dueDate = new Date(input.dueDate);
      if (Number.isNaN(dueDate.getTime())) {
        return res.status(400).json({ message: 'Enter a valid due date.' });
      }
      data.dueDate = dueDate;
    }

    const task = await prisma.task.update({
      where: { id: req.params.taskId },
      data,
      include: taskInclude()
    });

    res.json({ task });
  } catch (error) {
    next(error);
  }
});

router.delete('/tasks/:taskId', async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const membership = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: req.user.id, projectId: task.projectId } }
    });

    if (!membership || membership.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Admin access required.' });
    }

    await prisma.task.delete({ where: { id: req.params.taskId } });
    res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
