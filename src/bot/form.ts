import { WASocket, downloadMediaMessage, proto } from '@whiskeysockets/baileys';
import { User } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import {
  createDraft, updateDraftField, updateDraftStep,
  getDraftById, submitDraftForReview, updateUserSession,
  incrementFormCount, getUserByNumber, createLog
} from '../db/queries.js';
import { FORM_STEPS, config } from '../config/index.js';
import {
  validatePropertyType, validatePurpose, validatePhoneNumber,
  validateNumber, validatePrice, validateArea,
  isSkip, isCancel, isConfirm, isEdit
} from '../utils/validator.js';
import { formatDraftPreview, formatAdminModerationMsg } from '../utils/formatter.js';
import { logger } from '../utils/logger.js';

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Helper: send with delay (human-like)
async function sendWithDelay(sock: WASocket, jid: string, text: string, delayMs = 1000, options?: string[]) {
  await new Promise(r => setTimeout(r, delayMs + Math.random() * 1000));
  
  if (options && options.length > 0) {
    // Send as List Message for interactivity
    const sections = [
      {
        title: "Chunaein (Select)",
        rows: options.map((opt, i) => ({
          title: opt,
          rowId: (i + 1).toString(),
          description: `Option ${i + 1}`
        }))
      }
    ];

    await sock.sendMessage(jid, {
      text: text,
      footer: "Rabbi Estate Bot",
      buttonText: "Click here to Select",
      sections
    } as any);
  } else {
    await sock.sendMessage(jid, { text });
  }
}

// Helper: save media from message
async function saveMedia(sock: WASocket, message: proto.IWebMessageInfo): Promise<string | null> {
  try {
    const buffer = await downloadMediaMessage(
      message,
      'buffer',
      {},
      { 
        logger: logger as any,
        reuploadRequest: (sock as any).updateMediaMessage
      }
    );

    const isImage = !!message.message?.imageMessage;
    const extension = isImage ? 'jpg' : 'mp4';
    const fileName = `media_${Date.now()}_${Math.floor(Math.random() * 1000)}.${extension}`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    await fs.promises.writeFile(filePath, buffer);
    logger.info({ fileName }, 'Media saved successfully');
    return fileName;
  } catch (err) {
    logger.error({ err }, 'Error downloading/saving media');
    return null;
  }
}

// ─────────────────────────────────────────
// MAIN FORM HANDLER
// ─────────────────────────────────────────
export async function handleFormStep(
  sock: WASocket,
  jid: string,
  waNumber: string,
  user: User,
  input: string,
  activeDraftId: string | null,
  message?: proto.IWebMessageInfo
) {
  try {
    const cleanInput = input.trim();

    // ─── CANCEL ───
    if (isCancel(cleanInput)) {
      await updateUserSession(waNumber, 'IDLE', undefined);
      await sendWithDelay(sock, jid, `❌ *Form cancel kar diya gaya.*\n\nKisi bhi waqt *post* likh ke naya form shuru karein.`);
      return;
    }

    // ─── START FORM ───
    if (input === 'START') {
      const draft = await createDraft(user.id);
      await updateUserSession(waNumber, 'FORM_STEP_1', draft.id);
      const firstStep = FORM_STEPS[0];
      await sendWithDelay(sock, jid, `✅ *Naya Property Listing Shuru!*\n\n_Aap kisi bhi waqt *cancel* likh ke form band kar sakte hain._\n_Optional steps ke liye *0* likh ke skip karein._\n\n` + firstStep.question.en, 1000, (firstStep as any).options);
      return;
    }

    // ─── AWAITING CONFIRM ───
    if (user.sessionState === 'AWAITING_CONFIRM') {
      if (isConfirm(cleanInput)) {
        await handleConfirm(sock, jid, waNumber, activeDraftId!);
      } else if (isEdit(cleanInput)) {
        // Go back to step 1
        await updateDraftStep(activeDraftId!, 1);
        await updateUserSession(waNumber, 'FORM_STEP_1');
        await sendWithDelay(sock, jid, `✍️ *Edit Mode — Step 1 se dobara shuru karein:*\n\n` + FORM_STEPS[0].question.en, 500);
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

    // Check for Skip (0)
    if (isSkip(cleanInput) && stepDef.skipable) {
      await sendWithDelay(sock, jid, `⏩ *Skipped.* Aglay step par ja rahe hain...`, 300);
      await goToNextStep(sock, jid, waNumber, activeDraftId!, currentStep);
      return;
    }

    // ─── STEP 9: MEDIA SPECIAL HANDLING ───
    if (currentStep === 9) {
      if (cleanInput.toLowerCase() === 'done') {
        await sendWithDelay(sock, jid, `✅ *Media saved.* Moving to next step.`, 500);
        await goToNextStep(sock, jid, waNumber, activeDraftId!, currentStep);
        return;
      }

      // Check for media
      const mediaMsg = message?.message;
      const isImage = !!mediaMsg?.imageMessage;
      const isVideo = !!mediaMsg?.videoMessage;

      if (isImage || isVideo) {
        try {
          const mediaPath = await saveMedia(sock, message!);
          if (mediaPath && activeDraftId) {
            // Append to mediaLinks
            const draft = await getDraftById(activeDraftId);
            const currentLinks = draft?.mediaLinks ? draft.mediaLinks.split(',') : [];
            currentLinks.push(mediaPath);
            await updateDraftField(activeDraftId, 'mediaLinks', currentLinks.join(','));

            await sendWithDelay(sock, jid, `✅ *Received successfully.*\n\nSend more files or type *DONE* to continue.`, 500);
            return;
          }
        } catch (error) {
          logger.error({ error }, 'Media upload failed');
          await sendWithDelay(sock, jid, `❌ *Upload failed.* Please resend the file or type 0 to skip.`, 500);
          return;
        }
      }

      // If text input that isn't DONE or 0
      if (!isImage && !isVideo && cleanInput !== '0') {
        await sendWithDelay(sock, jid, `⚠️ *Please send photos/videos* or type *DONE* if you are finished.\n\nType *0* to skip this step.`, 500);
        return;
      }
    }

    // Validate input
    const value = await validateStep(stepDef, cleanInput);

    if (value === null) {
      // Friendly error messages based on validation type
      let errorMsg = `⚠️ *Galat jawab.* Please sahi jawab dein.`;
      
      if (stepDef.validationType === 'number') {
        errorMsg = `⚠️ *Sirf numbers likhein.* Example: 3`;
      } else if (stepDef.validationType === 'price') {
        errorMsg = `⚠️ *Price sahi format mein likhein.* Example: 1.5 crore, 75 lakh, ya 1500000`;
      } else if (stepDef.validationType === 'area') {
        errorMsg = `⚠️ *Size sahi format mein likhein.* Example: 120 yards ya 5 marla`;
      } else if (stepDef.validationType === 'phone') {
        errorMsg = `⚠️ *Sahi phone number likhein.* Example: 03001234567`;
      }

      if (stepDef.skipable) {
        errorMsg += `\n\n_(Aap *0* likh kar is step ko skip bhi kar sakte hain)_`;
      }

      await sendWithDelay(sock, jid, errorMsg + `\n\n` + stepDef.question.en, 500);
      return;
    }

    // Save to DB
    if (activeDraftId) {
      if (currentStep === 3) {
        // Location processing
        const parts = cleanInput.split(',').map((p: string) => p.trim());
        if (parts.length > 1) {
          await updateDraftField(activeDraftId, 'city', parts[0] || '');
          await updateDraftField(activeDraftId, 'area', parts[1] || '');
          await updateDraftField(activeDraftId, 'street', parts[2] || '');
        } else {
          await updateDraftField(activeDraftId, 'city', '');
          await updateDraftField(activeDraftId, 'area', cleanInput);
          await updateDraftField(activeDraftId, 'street', '');
        }
      } else {
        await updateDraftField(activeDraftId, stepDef.field, value);
      }
    }

    await goToNextStep(sock, jid, waNumber, activeDraftId!, currentStep);

  } catch (error) {
    logger.error({ error, waNumber, activeDraftId }, 'Crash in handleFormStep');
    await sendWithDelay(sock, jid, `⚠️ *Maazrat!* System mein kuch takniki masla hua hai. Dobara koshish karein ya *cancel* likh ke shuru se shuru karein.`);
  }
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
  try {
    const nextStep = currentStep + 1;

    if (nextStep > FORM_STEPS.length) {
      // All steps done — show preview
      await updateUserSession(waNumber, 'AWAITING_CONFIRM');
      const draft = await getDraftById(draftId);
      if (!draft) return;

      const preview = formatDraftPreview(draft);
      await sendWithDelay(sock, jid, `✅ *Form Complete!*\n\n*Aap ka draft preview:*\n\n${preview}\n\n*1*️⃣ Confirm (Submit karein)\n*2*️⃣ Edit (Wapas jayein)\n*cancel* likhein khatam karne ke liye.`, 1000);
      return;
    }

    // Go to next step
    await updateDraftStep(draftId, nextStep);
    await updateUserSession(waNumber, `FORM_STEP_${nextStep}`);
    const nextStepDef = FORM_STEPS[nextStep - 1];
    await sendWithDelay(sock, jid, nextStepDef.question.en, 800, (nextStepDef as any).options);
  } catch (error) {
    logger.error({ error, draftId }, 'Error in goToNextStep');
  }
}

// ─────────────────────────────────────────
// Handle confirm — submit to admin
// ─────────────────────────────────────────
async function handleConfirm(sock: WASocket, jid: string, waNumber: string, draftId: string) {
  try {
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
  } catch (error) {
    logger.error({ error, draftId }, 'Error in handleConfirm');
  }
}

// ─────────────────────────────────────────
// Validate step input
// ─────────────────────────────────────────
async function validateStep(stepDef: any, input: string): Promise<string | null> {
  const clean = input.trim();
  if (!clean) return null;

  try {
    switch (stepDef.validationType) {
      case 'propertyType':
        return validatePropertyType(clean);
      case 'purpose':
        return validatePurpose(clean);
      case 'number':
        return validateNumber(clean);
      case 'price':
        return validatePrice(clean);
      case 'area':
        return validateArea(clean);
      case 'phone':
        return validatePhoneNumber(clean) ? clean : null;
      case 'text':
      default:
        return clean.length >= 2 ? clean : null;
    }
  } catch (error) {
    logger.error({ error, input, type: stepDef.validationType }, 'Validation logic crash');
    return null;
  }
}
