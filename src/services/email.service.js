// src/services/email.service.js
const nodemailer = require('nodemailer');

// ── Transporter (created once, reused) ───────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,       // farm2marketdev@gmail.com
    pass: process.env.EMAIL_APP_PASS,   // Gmail App Password (not your login password)
  },
});

// Verify connection on startup
transporter.verify((err) => {
  if (err) {
    console.error('[Email] Transporter verification failed:', err.message);
  } else {
    console.log('[Email] Transporter ready ✓');
  }
});

// ── Base template wrapper ─────────────────────────────────────────────────────
const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Farm2Market</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:600px;width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">🌱 Farm2Market</h1>
              <p style="margin:6px 0 0;color:#bbf7d0;font-size:13px;">Connecting Farmers & Buyers</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                © ${new Date().getFullYear()} Farm2Market · This is an automated notification
              </p>
              <p style="margin:6px 0 0;color:#9ca3af;font-size:12px;">
                Do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ── Helper: status badge color ────────────────────────────────────────────────
const statusBadge = (status) => {
  const map = {
    payment_pending:  { bg: '#fef3c7', color: '#92400e', label: 'Awaiting Payment' },
    payment_uploaded: { bg: '#dbeafe', color: '#1e40af', label: 'Proof Uploaded' },
    confirmed:        { bg: '#dcfce7', color: '#166534', label: 'Confirmed' },
    completed:        { bg: '#d1fae5', color: '#065f46', label: 'Completed' },
    cancelled:        { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
  };
  const s = map[status] || { bg: '#f3f4f6', color: '#374151', label: status };
  return `<span style="display:inline-block;background:${s.bg};color:${s.color};padding:4px 12px;border-radius:999px;font-size:12px;font-weight:600;">${s.label}</span>`;
};

// ── Helper: order details table ───────────────────────────────────────────────
const orderDetailsTable = (order) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:20px 0;">
    <tr style="background:#f3f4f6;">
      <td colspan="2" style="padding:12px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Order Details</td>
    </tr>
    <tr>
      <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Order ID</td>
      <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:500;border-bottom:1px solid #e5e7eb;">#${order.id.slice(0, 8).toUpperCase()}</td>
    </tr>
    <tr>
      <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Crop</td>
      <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:500;border-bottom:1px solid #e5e7eb;">${order.cropName}</td>
    </tr>
    <tr>
      <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Quantity</td>
      <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:500;border-bottom:1px solid #e5e7eb;">${order.quantity} ${order.unit}</td>
    </tr>
    <tr>
      <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Total Amount</td>
      <td style="padding:10px 16px;font-size:13px;color:#16a34a;font-weight:700;border-bottom:1px solid #e5e7eb;">LKR ${Number(order.totalPrice).toLocaleString()}</td>
    </tr>
    <tr>
      <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Delivery Location</td>
      <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:500;border-bottom:1px solid #e5e7eb;">${order.location || '—'}</td>
    </tr>
    <tr>
      <td style="padding:10px 16px;font-size:13px;color:#6b7280;">Date</td>
      <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:500;">${new Date(order.createdAt || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
    </tr>
  </table>
`;

// ════════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ════════════════════════════════════════════════════════════════════════════

// ── 1. New order notification → Farmer ───────────────────────────────────────
const sendNewOrderToFarmer = async ({ farmerEmail, farmerName, buyerName, order }) => {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">New Order Received! 🎉</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:15px;">Hi <strong>${farmerName}</strong>, you have a new order from a buyer.</p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0;font-size:14px;color:#166534;">
        <strong>Buyer:</strong> ${buyerName}
      </p>
    </div>

    ${orderDetailsTable(order)}

    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;margin-top:20px;">
      <p style="margin:0;font-size:13px;color:#92400e;">
        <strong>Next Step:</strong> The buyer will transfer the payment and upload the proof. 
        Log in to Farm2Market to review and confirm the payment once received.
      </p>
    </div>
  `);

  return transporter.sendMail({
    from: `"Farm2Market" <${process.env.EMAIL_USER}>`,
    to: farmerEmail,
    subject: `🌱 New Order: ${order.cropName} from ${buyerName}`,
    html,
  });
};

// ── 2. Order confirmation → Buyer ─────────────────────────────────────────────
const sendOrderConfirmationToBuyer = async ({ buyerEmail, buyerName, farmerName, order }) => {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Order Placed Successfully! ✅</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:15px;">Hi <strong>${buyerName}</strong>, your order has been placed and the farmer has been notified.</p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0;font-size:14px;color:#166534;">
        <strong>Seller:</strong> ${farmerName}
      </p>
    </div>

    ${orderDetailsTable(order)}

    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;margin-top:20px;">
      <p style="margin:0;font-size:13px;color:#92400e;">
        <strong>Next Step:</strong> Please transfer <strong>LKR ${Number(order.totalPrice).toLocaleString()}</strong> to the farmer's bank account 
        and upload the payment proof in <strong>My Orders</strong>.
      </p>
    </div>
  `);

  return transporter.sendMail({
    from: `"Farm2Market" <${process.env.EMAIL_USER}>`,
    to: buyerEmail,
    subject: `✅ Order Confirmed: ${order.cropName} — LKR ${Number(order.totalPrice).toLocaleString()}`,
    html,
  });
};

// ── 3. Payment proof uploaded → Farmer ───────────────────────────────────────
const sendPaymentProofToFarmer = async ({ farmerEmail, farmerName, buyerName, order }) => {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Payment Proof Received 📄</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:15px;">Hi <strong>${farmerName}</strong>, <strong>${buyerName}</strong> has uploaded payment proof for their order.</p>

    ${orderDetailsTable(order)}

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px 20px;margin-top:20px;">
      <p style="margin:0;font-size:13px;color:#1e40af;">
        <strong>Action Required:</strong> Log in to Farm2Market, review the payment proof, and click 
        <strong>Confirm Payment</strong> if the transfer is verified.
      </p>
    </div>
  `);

  return transporter.sendMail({
    from: `"Farm2Market" <${process.env.EMAIL_USER}>`,
    to: farmerEmail,
    subject: `📄 Payment Proof Uploaded: ${order.cropName} by ${buyerName}`,
    html,
  });
};

// ── 4. Payment confirmed → Buyer ──────────────────────────────────────────────
const sendPaymentConfirmedToBuyer = async ({ buyerEmail, buyerName, farmerName, order }) => {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Payment Confirmed! 🎉</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:15px;">Hi <strong>${buyerName}</strong>, <strong>${farmerName}</strong> has confirmed your payment.</p>

    ${orderDetailsTable({ ...order, status: 'confirmed' })}

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-top:20px;">
      <p style="margin:0;font-size:13px;color:#166534;">
        Your order is now confirmed and the farmer is preparing your produce. 
        You will be notified once the order is marked as completed.
      </p>
    </div>
  `);

  return transporter.sendMail({
    from: `"Farm2Market" <${process.env.EMAIL_USER}>`,
    to: buyerEmail,
    subject: `🎉 Payment Confirmed: ${order.cropName} — Order #${order.id.slice(0, 8).toUpperCase()}`,
    html,
  });
};

// ── 5. Order completed → Both ─────────────────────────────────────────────────
const sendOrderCompletedToBuyer = async ({ buyerEmail, buyerName, farmerName, order }) => {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Order Completed! ✅</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:15px;">Hi <strong>${buyerName}</strong>, your order has been marked as completed by <strong>${farmerName}</strong>.</p>

    ${orderDetailsTable({ ...order, status: 'completed' })}

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-top:20px;">
      <p style="margin:0;font-size:13px;color:#166534;">
        Thank you for using Farm2Market! We hope you enjoyed fresh produce directly from the farm.
      </p>
    </div>
  `);

  return transporter.sendMail({
    from: `"Farm2Market" <${process.env.EMAIL_USER}>`,
    to: buyerEmail,
    subject: `✅ Order Completed: ${order.cropName} — Thank you!`,
    html,
  });
};

const sendOrderCompletedToFarmer = async ({ farmerEmail, farmerName, buyerName, order }) => {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Order Completed! ✅</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:15px;">Hi <strong>${farmerName}</strong>, the order for <strong>${buyerName}</strong> has been marked as completed.</p>

    ${orderDetailsTable({ ...order, status: 'completed' })}

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-top:20px;">
      <p style="margin:0;font-size:13px;color:#166534;">
        Thank you for supplying fresh produce through Farm2Market!
      </p>
    </div>
  `);

  return transporter.sendMail({
    from: `"Farm2Market" <${process.env.EMAIL_USER}>`,
    to: farmerEmail,
    subject: `✅ Order Completed: ${order.cropName} for ${buyerName}`,
    html,
  });
};

// ── Safe wrapper — never crash the main flow ──────────────────────────────────
const sendSafe = async (fn, args, label) => {
  try {
    await fn(args);
    console.log(`[Email] ✓ ${label} sent to ${args.farmerEmail || args.buyerEmail}`);
  } catch (err) {
    // Email failure must NEVER break order creation or status updates
    console.error(`[Email] ✗ Failed to send ${label}:`, err.message);
  }
};

module.exports = {
  sendNewOrderToFarmer:       (args) => sendSafe(sendNewOrderToFarmer,       args, 'new-order-to-farmer'),
  sendOrderConfirmationToBuyer:(args) => sendSafe(sendOrderConfirmationToBuyer, args, 'order-confirmation-to-buyer'),
  sendPaymentProofToFarmer:   (args) => sendSafe(sendPaymentProofToFarmer,   args, 'payment-proof-to-farmer'),
  sendPaymentConfirmedToBuyer:(args) => sendSafe(sendPaymentConfirmedToBuyer, args, 'payment-confirmed-to-buyer'),
  sendOrderCompletedToBuyer:  (args) => sendSafe(sendOrderCompletedToBuyer,  args, 'order-completed-to-buyer'),
  sendOrderCompletedToFarmer: (args) => sendSafe(sendOrderCompletedToFarmer, args, 'order-completed-to-farmer'),
};