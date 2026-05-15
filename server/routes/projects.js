import express from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireProjectAdmin, requireProjectMember } from '../utils/access.js';

const router = express.Router();
router.use(requireAuth);

const projectSchema = z.object({
  name: z.string().trim().min(2, 'Project name must be at least 2 characters.').max(80),
  description: z.string().trim().max(500).optional().nullable()
});

const memberSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER')
});

const roleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER'])
});

function projectListDto(project) {
  const role = project.members?.[0]?.role || 'MEMBER';
  const totalTasks = project.tasks?.length || 0;
  const completedTasks = project.tasks?.filter((task) => task.status === 'DONE').length || 0;
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    ownerId: project.ownerId,
    role,
    totalTasks,
    completedTasks,
    progress: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
    updatedAt: project.updatedAt,
    createdAt: project.createdAt
  };
}

router.get('/', async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { members: { some: { userId: req.user.id } } },
      include: {
        members: { where: { userId: req.user.id }, select: { role: true } },
        tasks: { select: { id: true, status: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({ projects: projects.map(projectListDto) });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const input = projectSchema.parse(req.body);
    const project = await prisma.project.create({
      data: {
        name: input.name,
        description: input.description || null,
        ownerId: req.user.id,
        members: {
          create: {
            userId: req.user.id,
            role: 'ADMIN'
          }
        }
      },
      include: {
        members: { where: { userId: req.user.id }, select: { role: true } },
        tasks: { select: { id: true, status: true } }
      }
    });

    res.status(201).json({ project: projectListDto(project) });
  } catch (error) {
    next(error);
  }
});

router.get('/:projectId', async (req, res, next) => {
  try {
    const membership = await requireProjectMember(req, res);
    if (!membership) return;

    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    res.json({ project: { ...project, currentUserRole: membership.role } });
  } catch (error) {
    next(error);
  }
});

router.patch('/:projectId', async (req, res, next) => {
  try {
    const membership = await requireProjectAdmin(req, res);
    if (!membership) return;

    const input = projectSchema.partial().parse(req.body);
    const project = await prisma.project.update({
      where: { id: req.params.projectId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description || null } : {})
      }
    });

    res.json({ project });
  } catch (error) {
    next(error);
  }
});

router.delete('/:projectId', async (req, res, next) => {
  try {
    const membership = await requireProjectAdmin(req, res);
    if (!membership) return;

    await prisma.project.delete({ where: { id: req.params.projectId } });
    res.json({ message: 'Project deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

router.post('/:projectId/members', async (req, res, next) => {
  try {
    const membership = await requireProjectAdmin(req, res);
    if (!membership) return;

    const input = memberSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (!user) {
      return res.status(404).json({ message: 'No registered user found with this email.' });
    }

    const projectMember = await prisma.projectMember.upsert({
      where: { userId_projectId: { userId: user.id, projectId: req.params.projectId } },
      update: { role: input.role },
      create: {
        userId: user.id,
        projectId: req.params.projectId,
        role: input.role
      },
      include: { user: { select: { id: true, name: true, email: true } } }
    });

    res.status(201).json({ member: projectMember });
  } catch (error) {
    next(error);
  }
});

router.patch('/:projectId/members/:userId', async (req, res, next) => {
  try {
    const membership = await requireProjectAdmin(req, res);
    if (!membership) return;

    const input = roleSchema.parse(req.body);
    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (project.ownerId === req.params.userId && input.role !== 'ADMIN') {
      return res.status(400).json({ message: 'Project owner must remain an admin.' });
    }

    const member = await prisma.projectMember.update({
      where: { userId_projectId: { userId: req.params.userId, projectId: req.params.projectId } },
      data: { role: input.role },
      include: { user: { select: { id: true, name: true, email: true } } }
    });

    res.json({ member });
  } catch (error) {
    next(error);
  }
});

router.delete('/:projectId/members/:userId', async (req, res, next) => {
  try {
    const membership = await requireProjectAdmin(req, res);
    if (!membership) return;

    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (project.ownerId === req.params.userId) {
      return res.status(400).json({ message: 'Project owner cannot be removed.' });
    }

    await prisma.projectMember.delete({
      where: { userId_projectId: { userId: req.params.userId, projectId: req.params.projectId } }
    });

    res.json({ message: 'Member removed successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
