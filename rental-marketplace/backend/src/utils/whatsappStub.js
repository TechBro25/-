/**
 * WhatsApp Stub Utility
 * 
 * This file provides stub functions for WhatsApp integration.
 * In production, replace these with actual WhatsApp Business API calls.
 */

const { db } = require('../db');

/**
 * Send a WhatsApp message (stub implementation)
 * In production, this would call WhatsApp Business API
 */
async function sendWhatsAppMessage(to, message) {
  try {
    console.log(`📱 [STUB] Sending WhatsApp message to ${to}: ${message}`);
    
    // Store the outgoing message in database
    await db.run(`
      INSERT INTO messages (sender_id, receiver_id, channel, subject, body)
      VALUES (NULL, NULL, 'whatsapp', 'Outgoing WhatsApp', ?)
    `, [`To: ${to}\nMessage: ${message}`]);
    
    // In production, you would call WhatsApp Business API here
    // Example with Twilio:
    // const client = require('twilio')(accountSid, authToken);
    // const message = await client.messages.create({
    //   body: message,
    //   from: 'whatsapp:+14155238886', // Your WhatsApp Business number
    //   to: `whatsapp:${to}`
    // });
    
    return {
      success: true,
      messageId: `stub_${Date.now()}`,
      message: 'WhatsApp message sent (stub)'
    };
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate verification code for KYC
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send KYC verification code via WhatsApp
 */
async function sendKYCVerificationCode(userId, phoneNumber) {
  try {
    const code = generateVerificationCode();
    
    // Store verification code in database
    await db.run(`
      INSERT INTO kyc_documents (user_id, verification_code, status)
      VALUES (?, ?, 'pending')
    `, [userId, code]);
    
    const message = `Your verification code is: ${code}\n\nPlease reply with this code to complete your verification.`;
    
    // Send WhatsApp message
    const result = await sendWhatsAppMessage(phoneNumber, message);
    
    if (result.success) {
      return {
        success: true,
        code,
        message: 'Verification code sent via WhatsApp'
      };
    } else {
      return {
        success: false,
        error: 'Failed to send verification code'
      };
    }
  } catch (error) {
    console.error('Send KYC verification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Process incoming WhatsApp message
 * This would be called by your WhatsApp webhook endpoint
 */
async function processIncomingWhatsAppMessage(from, body, messageId) {
  try {
    console.log(`📱 Processing WhatsApp message from ${from}: ${body}`);
    
    // Store message in database
    const result = await db.run(`
      INSERT INTO messages (sender_id, receiver_id, channel, subject, body)
      VALUES (NULL, NULL, 'whatsapp', 'Incoming WhatsApp', ?)
    `, [`From: ${from}\nMessage: ${body}`]);
    
    // Check if this is a verification code
    const verificationCodeMatch = body.match(/\b\d{6}\b/);
    if (verificationCodeMatch) {
      const code = verificationCodeMatch[0];
      
      // Find pending KYC with this code
      const kyc = await db.get(
        'SELECT * FROM kyc_documents WHERE verification_code = ? AND status = "pending"',
        [code]
      );
      
      if (kyc) {
        // Mark KYC as verified
        await db.run(
          'UPDATE kyc_documents SET status = "verified", verified_at = CURRENT_TIMESTAMP WHERE id = ?',
          [kyc.id]
        );
        
        // Mark user as verified
        await db.run(
          'UPDATE users SET is_verified = 1 WHERE id = ?',
          [kyc.user_id]
        );
        
        console.log(`✅ KYC verified for user ${kyc.user_id} with code ${code}`);
        
        // Send confirmation message
        await sendWhatsAppMessage(from, '✅ Verification successful! Your account has been verified.');
        
        return {
          success: true,
          action: 'kyc_verified',
          userId: kyc.user_id,
          code
        };
      }
    }
    
    return {
      success: true,
      action: 'message_stored',
      messageId: result.id
    };
  } catch (error) {
    console.error('Process WhatsApp message error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get WhatsApp integration instructions for production
 */
function getIntegrationInstructions() {
  return {
    title: 'WhatsApp Business API Integration',
    steps: [
      '1. Register for WhatsApp Business API with Meta Business',
      '2. Choose a WhatsApp Business API provider (Twilio, 360dialog, etc.)',
      '3. Get your WhatsApp Business phone number verified',
      '4. Set up webhook endpoints for incoming messages',
      '5. Replace stub functions with actual API calls',
      '6. Update environment variables with API credentials'
    ],
    providers: [
      {
        name: 'Twilio',
        website: 'https://www.twilio.com/whatsapp',
        features: ['Easy integration', 'Good documentation', 'Pay-per-message']
      },
      {
        name: '360dialog',
        website: 'https://www.360dialog.com/',
        features: ['Official Meta partner', 'Enterprise features', 'High volume']
      },
      {
        name: 'MessageBird',
        website: 'https://www.messagebird.com/whatsapp',
        features: ['Global reach', 'Advanced features', 'Good support']
      }
    ],
    webhookSetup: {
      endpoint: '/api/messages/whatsapp-webhook',
      events: ['message.received', 'message.status'],
      verification: 'Use webhook secret for security'
    }
  };
}

module.exports = {
  sendWhatsAppMessage,
  generateVerificationCode,
  sendKYCVerificationCode,
  processIncomingWhatsAppMessage,
  getIntegrationInstructions
};