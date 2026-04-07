import prisma from './client';
import { logger } from '../utils/logger';

// ─────────────────────────────────────────
// USER QUERIES
// ─────────────────────────────────────────

export async function getOrCreateUser(waNumber: string) {
  try {
    const user = await prisma.user.upsert({
      where: { waNumber },
      update: {},
      create: { waNumber },
    });
    return user;
  } catch (err) {
    logger.error({ err }, 'getOrCreateUser failed');
    throw err;
  }
}

export async function getUserByNumber(waNumber: string) {
  return prisma.user.findUnique({ where: { waNumber } });
}

export async function updateUserSession(waNumber: string, sessionState: string, activeDraftId?: string) {
  return prisma.user.update({
    where: { waNumber },
    data: {
      sessionState,
      ...(activeDraftId !== undefined && { activeDraftId }),
    },
  });
}

export async function checkMonthlyFormLimit(waNumber: string, max: number): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { waNumber } });
  if (!user) return false;

  // Reset counter if new month
  const now = new Date();
  const lastReset = user.lastFormReset;
  if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    await prisma.user.update({
      where: { waNumber },
      data: { formsThisMonth: 0, lastFormReset: now },
    });
    return true;
  }

  return user.formsThisMonth < max;
}

export async function incrementFormCount(waNumber: string) {
  return prisma.user.update({
    where: { waNumber },
    data: { formsThisMonth: { increment: 1 } },
  });
}

// ─────────────────────────────────────────
// DRAFT QUERIES
// ─────────────────────────────────────────

export async function createDraft(userId: string) {
  return prisma.draft.create({
    data: { userId, currentStep: 1, status: 'DRAFT' },
  });
}

export async function updateDraftField(draftId: string, field: string, value: string) {
  return prisma.draft.update({
    where: { id: draftId },
    data: { [field]: value } as any,
  });
}

export async function updateDraftStep(draftId: string, step: number) {
  return prisma.draft.update({
    where: { id: draftId },
    data: { currentStep: step },
  });
}

export async function getDraftById(draftId: string) {
  return prisma.draft.findUnique({ where: { id: draftId } });
}

export async function submitDraftForReview(draftId: string) {
  return prisma.draft.update({
    where: { id: draftId },
    data: { status: 'PENDING' },
  });
}

export async function getUserDrafts(userId: string) {
  return prisma.draft.findMany({
    where: { userId, status: { in: ['DRAFT', 'PENDING'] } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
}

export async function getPendingDrafts() {
  return prisma.draft.findMany({
    where: { status: 'PENDING' },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  });
}

// ─────────────────────────────────────────
// POST QUERIES
// ─────────────────────────────────────────

export async function createPost(draftId: string, userId: string, groupMessageId?: string) {
  await prisma.draft.update({
    where: { id: draftId },
    data: { status: 'APPROVED' },
  });
  return prisma.post.create({
    data: { draftId, userId, groupMessageId },
  });
}

export async function getPostById(postId: string) {
  return prisma.post.findUnique({
    where: { id: postId },
    include: { draft: true, user: true },
  });
}

export async function getUserActivePosts(userId: string) {
  return prisma.post.findMany({
    where: { userId, isActive: true },
    include: { draft: true },
    orderBy: { postedAt: 'desc' },
    take: 10,
  });
}

export async function deactivatePost(postId: string) {
  return prisma.post.update({
    where: { id: postId },
    data: { isActive: false },
  });
}

export async function incrementViewCount(postId: string) {
  return prisma.post.update({
    where: { id: postId },
    data: { viewCount: { increment: 1 } },
  });
}

// ─────────────────────────────────────────
// LEAD QUERIES
// ─────────────────────────────────────────

export async function createLead(postId: string, interestedUserId: string) {
  // Prevent duplicate lead from same user for same post
  const existing = await prisma.lead.findFirst({
    where: { postId, interestedUserId },
  });
  if (existing) return null; // Already interested

  return prisma.lead.create({
    data: { postId, interestedUserId },
  });
}

export async function markLeadContacted(leadId: string) {
  return prisma.lead.update({
    where: { id: leadId },
    data: { contactSent: true, ownerNotified: true, adminNotified: true },
  });
}

export async function getTodayLeads() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return prisma.lead.findMany({
    where: { createdAt: { gte: today } },
    include: { post: { include: { draft: true } }, interestedUser: true },
  });
}

// ─────────────────────────────────────────
// LOG QUERIES
// ─────────────────────────────────────────

export async function createLog(action: string, userId?: string, details?: string) {
  return prisma.log.create({
    data: { action, userId, details },
  });
}
