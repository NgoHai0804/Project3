// email.service.js - gửi email sử dụng Resend API
const { Resend } = require('resend');
const logger = require('../utils/logger');

const resend = new Resend(process.env.RESEND_API_KEY || 're_KNYhA68D_EhJZTqoRDqML2qSkytcDmuSH');

// Gửi email chứa mật khẩu mới khi quên mật khẩu
async function sendPasswordResetEmail(to, newPassword, username) {
  try {
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
            padding: 15px;
            text-align: center;
            margin: 20px 0;
            font-size: 18px;
            font-weight: bold;
            color: #1e40af;
            letter-spacing: 2px;
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
            
            <p>Mật khẩu mới của bạn là:</p>
            
            <div class="password-box">
              ${newPassword}
            </div>
            
            <p>Vui lòng sử dụng mật khẩu này để đăng nhập và thay đổi mật khẩu sau khi đăng nhập thành công.</p>
            
            <div class="warning">
              <strong>Lưu ý bảo mật:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Không chia sẻ mật khẩu này với bất kỳ ai</li>
                <li>Thay đổi mật khẩu ngay sau khi đăng nhập</li>
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

Mật khẩu mới của bạn là: ${newPassword}

Vui lòng sử dụng mật khẩu này để đăng nhập và thay đổi mật khẩu sau khi đăng nhập thành công.

Lưu ý bảo mật:
- Không chia sẻ mật khẩu này với bất kỳ ai
- Thay đổi mật khẩu ngay sau khi đăng nhập
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
      subject: 'Mật khẩu mới - Caro Online',
      html: htmlContent,
      text: textContent,
    });

    logger.info(`Password reset email sent to ${to}. Email ID: ${data.id || data.data?.id}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send password reset email to ${to}: ${error.message}`);
    throw error;
  }
}

module.exports = {
  sendPasswordResetEmail,
};
