import { WASocket } from '@whiskeysockets/baileys';
import { User } from '@prisma/client';
import {
  createDraft, updateDraftField, updateDraftStep,
  getDraftById, submitDraftForReview, updateUserSession,
  incrementFormCount, getUserByNumber, createLog
} from '../db/queries.js';
import { FORM_STEPS, config } from '../config/index.js';
import {
  validatePropertyType, validatePurpose, validatePhoneNumber,
  isSkip, isCancel, isConfirm, isEdit
} from '../utils/validator.js';
import { formatDraftPreview, formatAdminModerationMsg } from '../utils/formatter.js';
import { logger } from '../utils/logger.js';

// Helper: send with delay (human-like)
async function sendWithDelay(sock: WASocket, jid: string, text: string, delayMs = 1000) {
  await new Promise(r => setTimeout(r, delayMs + Math.random() * 1000));
  await sock.sendMessage(jid, { text });
}

// ─────────────────────────────────────────
// MAIN FORM STEP HANDLER
// ─────────────────────────────────────────
export async function handleFormStep(
  sock: WASocket,
  jid: string,
  waNumber: string,
  user: User,
  input: string,
  activeDraftId: string | null
) {
  // ─── CANCEL ───
  if (isCancel(input)) {
    await updateUserSession(waNumber, 'IDLE', undefined);
    await sendWithDelay(sock, jid, `❌ *Form cancel kar diya gaya.*\n\nKisi bhi waqt *post* likh ke naya form shuru karein.`);
    return;
  }

  // ─── START FORM ───
  if (input === 'START') {
    const draft = await createDraft(user.id);
    await updateUserSession(waNumber, 'FORM_STEP_1', draft.id);
    await sendWithDelay(sock, jid, `✅ *Naya Property Listing Shuru!*\n\n_Aap kisi bhi waqt *cancel* likh ke form band kar sakte hain._\n_Optional steps ke liye *skip* likhein._\n\n` + FORM_STEPS[0].question.en);
    return;
  }

  // ─── AWAITING CONFIRM ───
  if (user.sessionState === 'AWAITING_CONFIRM') {
    if (isConfirm(input)) {
      await handleConfirm(sock, jid, waNumber, activeDraftId!);
    } else if (isEdit(input)) {
      // Go back to step 1
      await updateDraftStep(activeDraftId!, 1);
      await updateUserSession(waNumber, 'FORM_STEP_1');
      await sendWithDelay(sock, jid, `✏️ *Edit Mode — Step 1 se dobara shuru karein:*\n\n` + FORM_STEPS[0].question.en, 500);
    } else {
      await sendWithDelay(sock, jid, `⚠️ *confirm*, *edit*, ya *cancel* likhein.`, 500);
    }
    return;
  }

  // ─── FORM STEP ───
  const stepMatch = user.sessionState.match(/FORM_STEP_(\d+)/);
  if (!stepMatch) return;

  const currentStep = parseInt(stepMatch[1]);
  const stepDef = FORM_STEPS[currentStep - 1];
  if (!stepDef) return;

  // Validate input
  let value: string | null = null;

  if (isSkip(input) && stepDef.skipable) {
    // Skip optional step
    await goToNextStep(sock, jid, waNumber, activeDraftId!, currentStep);
    return;
  }

  if (!isSkip(input)) {
    value = await validateStep(currentStep, input);
    if (value === null && !stepDef.skipable) {
      await sendWithDelay(sock, jid, `⚠️ *Galat jawab.* Please sahi jawab dein ya *cancel* likhein.\n\n` + stepDef.question.en, 500);
      return;
    }
    if (value === null) {
      // Invalid but skipable - ask again
      await sendWithDelay(sock, jid, `⚠️ *Sahi jawab dein ya *skip* likhein.*\n\n` + stepDef.question.en, 500);
      return;
    }
  }

  // Save to DB
  if (value && activeDraftId) {
    if (currentStep === 3) {
      // Location: If user uses commas, store parts. Otherwise, store exactly as typed.
      const parts = input.split(',').map((p: string) => p.trim());
      if (activeDraftId) {
        if (parts.length > 1) {
          await updateDraftField(activeDraftId, 'city', parts[0] || '');
          await updateDraftField(activeDraftId, 'area', parts[1] || '');
          await updateDraftField(activeDraftId, 'street', parts[2] || '');
        } else {
          // No commas? Store the whole thing in area to keep it 100% raw
          await updateDraftField(activeDraftId, 'city', '');
          await updateDraftField(activeDraftId, 'area', input);
          await updateDraftField(activeDraftId, 'street', '');
        }
      }
    } else {
      await updateDraftField(activeDraftId, stepDef.field, value);
    }
  }

  await goToNextStep(sock, jid, waNumber, activeDraftId!, currentStep);
}

// ─────────────────────────────────────────
// Go to next step or show preview
// ─────────────────────────────────────────
async function goToNextStep(
  sock: WASocket,
  jid: string,
  waNumber: string,
  draftId: string,
  currentStep: number
) {
  const nextStep = currentStep + 1;

  if (nextStep > FORM_STEPS.length) {
    // All steps done — show preview
    await updateUserSession(waNumber, 'AWAITING_CONFIRM');
    const draft = await getDraftById(draftId);
    if (!draft) return;

    const preview = formatDraftPreview(draft);
    await sendWithDelay(sock, jid, `✅ *Form Complete!*\n\n*Aap ka draft preview:*\n\n${preview}`, 1000);
    return;
  }

  // Go to next step
  await updateDraftStep(draftId, nextStep);
  await updateUserSession(waNumber, `FORM_STEP_${nextStep}`);
  const nextStepDef = FORM_STEPS[nextStep - 1];
  await sendWithDelay(sock, jid, nextStepDef.question.en, 800);
}

// ─────────────────────────────────────────
// Handle confirm — submit to admin
// ─────────────────────────────────────────
async function handleConfirm(sock: WASocket, jid: string, waNumber: string, draftId: string) {
  const draft = await getDraftById(draftId);
  if (!draft) return;

  // Submit for review
  await submitDraftForReview(draftId);
  await incrementFormCount(waNumber);
  await updateUserSession(waNumber, 'IDLE', undefined);

  // Notify user
  await sendWithDelay(sock, jid,
    `🎉 *Post submit ho gaya!*\n\n✅ Admin review ke baad aap ka post WhatsApp group mein post ho jayega.\n📲 Aap ko approval pe notification milega.\n\n_Rabbi Estate Bot — Shukriya!_`,
    800
  );

  // Notify admin
  const adminJid = config.adminNumber;
  const adminMsg = formatAdminModerationMsg(draft);
  await sock.sendMessage(adminJid, { text: adminMsg });

  // Log
  const user = await getUserByNumber(waNumber);
  if (user) await createLog('FORM_SUBMITTED', user.id, `Draft ID: ${draftId}`);

  logger.info({ waNumber, draftId }, 'Form submitted for review');
}

// ─────────────────────────────────────────
// Validate step input
// ─────────────────────────────────────────
async function validateStep(step: number, input: string): Promise<string | null> {
  const clean = input.trim();
  switch (step) {
    case 1: return validatePropertyType(clean);
    case 2: return validatePurpose(clean);
    case 3: return clean.length >= 3 ? clean : null; // Location
    case 4: return clean; // Price: No normalization, use exactly what user types
    case 5: return clean; // Size
    case 6: // Bedrooms: only numbers
    case 7: // Bathrooms: only numbers
      return /^\d+$/.test(clean) ? clean : null;
    case 8: return clean.length >= 2 ? clean : null; // Description
    case 9: return clean; // Media
    case 10: return validatePhoneNumber(clean) ? clean : null; // Contact
    default: return clean;
  }
}
