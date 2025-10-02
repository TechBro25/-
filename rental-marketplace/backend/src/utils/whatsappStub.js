/**
 * WhatsApp Stub Module
 * 
 * This is a stub/mock implementation for WhatsApp Business API integration.
 * In production, replace these functions with actual API calls to:
 * - Twilio WhatsApp API: https://www.twilio.com/whatsapp
 * - 360dialog: https://www.360dialog.com/
 * - WhatsApp Business API directly
 * 
 * For testing, use the webhook endpoint to simulate incoming messages.
 */

const db = require('../db');

const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || '09154609327';
const WHATSAPP_NUMBER_FORMATTED = process.env.WHATSAPP_NUMBER_FORMATTED || '+2349154609327';

/**
 * Simulate sending a WhatsApp message
 * In production, this would make an API call to WhatsApp Business API
 */
async function sendWhatsAppMessage(to, message) {
  console.log('📱 [WhatsApp Stub] Sending message:');
  console.log(`   To: ${to}`);
  console.log(`   From: ${WHATSAPP_NUMBER}`);
  console.log(`   Message: ${message}`);
  
  // In production, replace with actual API call:
  // const response = await twilioClient.messages.create({
  //   from: `whatsapp:${WHATSAPP_NUMBER_FORMATTED}`,
  //   to: `whatsapp:${to}`,
  //   body: message
  // });
  
  return {
    success: true,
    messageId: `stub_${Date.now()}`,
    to,
    message
  };
}

/**
 * Generate and send verification code via WhatsApp
 */
async function sendVerificationCode(userId, userPhone) {
  try {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code in database
    await db.runAsync(
      `INSERT INTO kyc_documents (user_id, verification_code, code_sent_at, status)
       VALUES (?, ?, datetime('now'), 'code_sent')
       ON CONFLICT(user_id) DO UPDATE SET
       verification_code = ?,
       code_sent_at = datetime('now'),
       status = 'code_sent'`,
      [userId, code, code]
    );
    
    const message = `Your RentalHub verification code is: ${code}\n\nPlease send this code to WhatsApp number ${WHATSAPP_NUMBER} to complete your verification.`;
    
    await sendWhatsAppMessage(userPhone, message);
    
    console.log(`✅ Verification code ${code} sent to user ${userId}`);
    
    return {
      success: true,
      code, // In production, don't return the code
      message: 'Verification code sent. Please check WhatsApp and send the code to our number to verify.'
    };
  } catch (error) {
    console.error('Error sending verification code:', error);
    throw error;
  }
}

/**
 * Process incoming WhatsApp message (webhook handler)
 * This simulates receiving a message from WhatsApp Business API
 */
async function processIncomingMessage(from, body, messageId = null) {
  try {
    console.log('📨 [WhatsApp Webhook] Received message:');
    console.log(`   From: ${from}`);
    console.log(`   Body: ${body}`);
    
    // Store message in database
    await db.runAsync(
      `INSERT INTO messages (sender_phone, channel, body, created_at)
       VALUES (?, 'whatsapp', ?, datetime('now'))`,
      [from, body]
    );
    
    // Check if message contains a verification code (6 digits)
    const codeMatch = body.match(/\b\d{6}\b/);
    if (codeMatch) {
      const code = codeMatch[0];
      
      // Look for matching verification code
      const kycRecord = await db.getAsync(
        `SELECT id, user_id FROM kyc_documents 
         WHERE verification_code = ? AND status = 'code_sent'
         AND datetime(code_sent_at, '+1 hour') > datetime('now')`,
        [code]
      );
      
      if (kycRecord) {
        // Mark as verified
        await db.runAsync(
          `UPDATE kyc_documents 
           SET status = 'verified', verified_at = datetime('now')
           WHERE id = ?`,
          [kycRecord.id]
        );
        
        await db.runAsync(
          `UPDATE users SET is_verified = 1 WHERE id = ?`,
          [kycRecord.user_id]
        );
        
        console.log(`✅ User ${kycRecord.user_id} verified successfully with code ${code}`);
        
        // Send confirmation message
        await sendWhatsAppMessage(
          from,
          'Thank you! Your account has been verified successfully. You can now access all features on RentalHub.'
        );
        
        return {
          success: true,
          verified: true,
          userId: kycRecord.user_id
        };
      }
    }
    
    // Store as general support message
    return {
      success: true,
      verified: false,
      message: 'Message received and logged'
    };
  } catch (error) {
    console.error('Error processing WhatsApp message:', error);
    throw error;
  }
}

/**
 * Send payment confirmation request
 */
async function requestPaymentConfirmation(bookingId, userPhone, amount) {
  const message = `Please send proof of payment for booking #${bookingId} (Amount: ₦${amount.toLocaleString()}) to this WhatsApp number. You can send a screenshot or photo of the bank transfer receipt.`;
  
  return await sendWhatsAppMessage(userPhone, message);
}

/**
 * Send booking notification
 */
async function sendBookingNotification(userPhone, bookingDetails) {
  const message = `Your booking request has been received!\n\nBooking #${bookingDetails.id}\nItem: ${bookingDetails.itemTitle}\nDates: ${bookingDetails.startDate} to ${bookingDetails.endDate}\nTotal: ₦${bookingDetails.totalPrice.toLocaleString()}\n\nWe'll notify you once the owner responds.`;
  
  return await sendWhatsAppMessage(userPhone, message);
}

module.exports = {
  sendWhatsAppMessage,
  sendVerificationCode,
  processIncomingMessage,
  requestPaymentConfirmation,
  sendBookingNotification,
  WHATSAPP_NUMBER,
  WHATSAPP_NUMBER_FORMATTED
};
