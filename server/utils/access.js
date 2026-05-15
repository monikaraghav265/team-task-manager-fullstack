import { prisma } from '../prisma.js';

export async function getProjectMembership(projectId, userId) {
  return prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
    include: { project: true }
  });
}

export async function requireProjectMember(req, res) {
  const projectId = req.params.projectId || req.params.id;
  const membership = await getProjectMembership(projectId, req.user.id);

  if (!membership) {
    res.status(403).json({ message: 'You do not have access to this project.' });
    return null;
  }

  return membership;
}

export async function requireProjectAdmin(req, res) {
  const membership = await requireProjectMember(req, res);
  if (!membership) return null;

  if (membership.role !== 'ADMIN') {
    res.status(403).json({ message: 'Admin access required.' });
    return null;
  }

  return membership;
}
