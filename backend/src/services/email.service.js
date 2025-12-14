// email.service.js - gửi email sử dụng Resend API
const { Resend } = require('resend');
const logger = require('../utils/logger');

const resend = new Resend(process.env.RESEND_API_KEY || 're_KNYhA68D_EhJZTqoRDqML2qSkytcDmuSH');

// Gửi email chứa mã xác nhận 6 số khi quên mật khẩu
async function sendPasswordResetEmail(to, resetCode, username) {
  try {
    // Kiểm tra mã xác nhận phải là 6 chữ số
    if (!resetCode || typeof resetCode !== 'string') {
      throw new Error('Reset code must be a string');
    }
    
    // Đảm bảo mã là đúng 6 chữ số
    const codeStr = resetCode.toString().trim();
    if (!/^\d{6}$/.test(codeStr)) {
      logger.error(`Định dạng mã xác nhận không hợp lệ: ${resetCode}`);
      throw new Error('Reset code must be exactly 6 digits');
    }
    
    // Sử dụng mã đã được validate
    const validatedCode = codeStr;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 30px;
            border: 1px solid #e0e0e0;
          }
          .header {
            text-align: center;
            color: #2563eb;
            margin-bottom: 30px;
          }
          .content {
            background-color: white;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .password-box {
            background-color: #f3f4f6;
            border: 2px solid #2563eb;
            border-radius: 5px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
            font-size: 32px;
            font-weight: bold;
            color: #1e40af;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
          }
          .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Khôi Phục Mật Khẩu</h1>
          </div>
          
          <div class="content">
            <p>Xin chào <strong>${username}</strong>,</p>
            
            <p>Chúng tôi đã nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn.</p>
            
            <p>Mã xác nhận 6 số của bạn là:</p>
            
            <div class="password-box">
              ${validatedCode}
            </div>
            
            <p style="text-align: center; font-size: 14px; color: #6b7280; margin-top: 10px;">
              Mã này có hiệu lực trong <strong>15 phút</strong>
            </p>
            
            <p>Vui lòng sử dụng mã này để đặt lại mật khẩu mới trên trang web.</p>
            
            <div class="warning">
              <strong>Lưu ý bảo mật:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Không chia sẻ mã này với bất kỳ ai</li>
                <li>Mã này chỉ có hiệu lực trong 15 phút</li>
                <li>Nếu bạn không yêu cầu khôi phục mật khẩu, vui lòng bỏ qua email này</li>
              </ul>
            </div>
            
            <p>Trân trọng,<br><strong>Đội ngũ Caro Online</strong></p>
          </div>
          
          <div class="footer">
            <p>Email này được gửi tự động, vui lòng không trả lời email này.</p>
            <p>© ${new Date().getFullYear()} Caro Online.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Khôi Phục Mật Khẩu - Caro Online

Xin chào ${username},

Chúng tôi đã nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn.

Mã xác nhận của bạn là: ${validatedCode}

Vui lòng sử dụng mã này để đặt lại mật khẩu mới. Mã này có hiệu lực trong 15 phút.

Lưu ý bảo mật:
- Không chia sẻ mã này với bất kỳ ai
- Mã này chỉ có hiệu lực trong 15 phút
- Nếu bạn không yêu cầu khôi phục mật khẩu, vui lòng bỏ qua email này

Trân trọng,
Đội ngũ Caro Online

---
Email này được gửi tự động, vui lòng không trả lời email này.
© ${new Date().getFullYear()} Caro Online.
    `;

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    const data = await resend.emails.send({
      from: fromEmail,
      to: to,
      subject: 'Mã xác nhận khôi phục mật khẩu - Caro Online',
      html: htmlContent,
      text: textContent,
    });

    logger.info(`Đã gửi email khôi phục mật khẩu đến ${to}. Email ID: ${data.id || data.data?.id}`);
    return true;
  } catch (error) {
    logger.error(`Gửi email khôi phục mật khẩu thất bại đến ${to}: ${error.message}`);
    throw error;
  }
}

module.exports = {
  sendPasswordResetEmail,
};
