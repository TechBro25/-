/**
 * WhatsApp Integration Stub
 * 
 * This file provides stub functions for WhatsApp integration.
 * In production, replace these with actual WhatsApp Business API calls
 * using services like Twilio, 360dialog, or WhatsApp Cloud API.
 */

const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || '09154609327';

/**
 * Stub function to send WhatsApp message
 * In production, implement actual WhatsApp API call
 */
async function sendWhatsAppMessage(to, message) {
  console.log(`[WhatsApp Stub] Sending message to ${to}:`);
  console.log(`Message: ${message}`);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return {
    success: true,
    messageId: `msg_${Date.now()}`,
    timestamp: new Date().toISOString()
  };
}

/**
 * Stub function to handle incoming WhatsApp webhook
 * In production, this would be called by WhatsApp webhook
 */
async function handleWhatsAppWebhook(req, res, db) {
  try {
    const { from, body, timestamp } = req.body;
    
    console.log(`[WhatsApp Webhook] Received message from ${from}: ${body}`);
    
    // Store the message in database
    await db.run(
      `INSERT INTO messages (channel, message_text, phone_number, created_at) 
       VALUES (?, ?, ?, ?)`,
      ['whatsapp', body, from, timestamp || new Date().toISOString()]
    );
    
    // Check if message contains a verification code (6 digits)
    const codeMatch = body.match(/\b\d{6}\b/);
    if (codeMatch) {
      const code = codeMatch[0];
      
      // Find pending KYC verification with this code
      const kycDocs = await db.query(
        'SELECT * FROM kyc_documents WHERE verification_code = ? AND status = ?',
        [code, 'pending']
      );
      
      if (kycDocs.length > 0) {
        const kycDoc = kycDocs[0];
        
        // Mark KYC as verified
        await db.run(
          'UPDATE kyc_documents SET status = ?, verified_at = ? WHERE id = ?',
          ['verified', new Date().toISOString(), kycDoc.id]
        );
        
        // Mark user as verified
        await db.run(
          'UPDATE users SET is_verified = ? WHERE id = ?',
          [true, kycDoc.user_id]
        );
        
        console.log(`[WhatsApp Webhook] KYC verified for user ${kycDoc.user_id} with code ${code}`);
        
        // Send confirmation message (stub)
        await sendWhatsAppMessage(from, 
          `✅ Verification successful! Your account has been verified. You can now use all features of the rental marketplace.`
        );
      }
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('[WhatsApp Webhook] Error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

/**
 * Generate WhatsApp link for user to contact support
 */
function generateWhatsAppLink(message = '') {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
}

/**
 * Send KYC verification instructions via WhatsApp (stub)
 */
async function sendKYCVerificationMessage(phoneNumber, verificationCode, userName) {
  const message = `Hello ${userName}! 👋

To complete your account verification, please send this code: *${verificationCode}*

Simply reply with just the 6-digit code to verify your account.

Thank you for using our rental marketplace! 🏠`;

  return await sendWhatsAppMessage(phoneNumber, message);
}

/**
 * Send booking notification via WhatsApp (stub)
 */
async function sendBookingNotification(phoneNumber, bookingDetails) {
  const message = `🎉 Booking Update!

Item: ${bookingDetails.itemTitle}
Dates: ${bookingDetails.startDate} to ${bookingDetails.endDate}
Status: ${bookingDetails.status}
Total: ₦${bookingDetails.totalAmount}

For support, contact us on WhatsApp or use our website inbox.`;

  return await sendWhatsAppMessage(phoneNumber, message);
}

module.exports = {
  sendWhatsAppMessage,
  handleWhatsAppWebhook,
  generateWhatsAppLink,
  sendKYCVerificationMessage,
  sendBookingNotification,
  WHATSAPP_NUMBER
};