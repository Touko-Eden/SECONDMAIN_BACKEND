const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Annonce = require('../models/Annonce');

const AANGARAA_API_URL = process.env.AANGARAA_API_URL || 'https://api.aangaraa.com/api';
const AANGARAA_APP_KEY = process.env.AANGARAA_APP_KEY || 'APP_KEY_A_REMPLACER';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const NOTIFY_URL = process.env.NOTIFY_URL || `${BASE_URL}/api/payments/webhook`;
const RETURN_URL = process.env.RETURN_URL || `${BASE_URL}/api/payments/return`;
const CANCEL_URL = process.env.CANCEL_URL || `${BASE_URL}/api/payments/return`;

exports.initiateRedirectPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findByPk(orderId);
    if (!order || order.buyerId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Commande déjà traitée' });
    }
    const payment = await Payment.create({
      orderId: order.id,
      method: order.paymentMethod,
      amount: order.totalAmount,
      status: 'initiated'
    });
    const transactionId = `ORD-${order.id}-${Date.now()}`;
    payment.providerReference = transactionId;
    await payment.save();

    const operatorFromClient = req.body?.operator;
    const operator = operatorFromClient || (order.paymentMethod === 'mobile_money' ? 'Orange_Cameroon'
      : order.paymentMethod === 'card' ? 'Orange_Cameroon'
      : 'Orange_Cameroon');
    const payload = {
      amount: Number(order.totalAmount),
      description: `Paiement pour annonce ${order.annonceId}`,
      app_key: AANGARAA_APP_KEY,
      transaction_id: transactionId,
      return_url: RETURN_URL,
      notify_url: NOTIFY_URL,
      cancel_url: CANCEL_URL,
      operator,
      devise_id: 'XAF'
    };

    const resp = await fetch(`${AANGARAA_API_URL}/payments/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const err = await resp.text();
      return res.status(502).json({ success: false, message: 'AANGARAA indisponible', error: err });
    }
    let data;
    try {
      data = await resp.json();
    } catch (_) {
      data = await resp.text();
    }
    const redirectUrl = typeof data === 'string'
      ? data
      : data.redirect_url || data.payment_url || data.url || data.data?.redirectUrl;
    if (!redirectUrl) {
      return res.status(500).json({ success: false, message: 'URL de paiement non fournie par AANGARAA' });
    }
    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        paymentId: payment.id,
        transactionId,
        redirectUrl
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erreur initiation paiement', error: e.message });
  }
};

exports.webhook = async (req, res) => {
  try {
    const { transaction_id, status } = req.body || {};
    if (!transaction_id) {
      return res.status(400).json({ success: false, message: 'transaction_id manquant' });
    }
    const payment = await Payment.findOne({ where: { providerReference: transaction_id } });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Paiement non trouvé' });
    }
    const order = await Order.findByPk(payment.orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    }
    if (status === 'succeeded' || status === 'success' || status === 'paid') {
      payment.status = 'succeeded';
      await payment.save();
      order.status = 'paid';
      await order.save();
      const annonce = await Annonce.findByPk(order.annonceId);
      if (annonce && annonce.status === 'active') {
        annonce.status = 'vendu';
        await annonce.save();
      }
    } else if (status === 'failed' || status === 'canceled') {
      payment.status = 'failed';
      await payment.save();
      order.status = 'canceled';
      await order.save();
    }
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erreur webhook', error: e.message });
  }
};

exports.returnPage = async (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Paiement</title>
        <style>body{font-family:Arial;margin:2rem} .ok{color:#2e7d32}</style>
      </head>
      <body>
        <h2 class="ok">Paiement en cours de finalisation…</h2>
        <p>Vous pouvez maintenant revenir à l’application. Votre commande sera automatiquement mise à jour.</p>
      </body>
    </html>
  `);
};

exports.getStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findByPk(orderId);
    if (!order || (order.buyerId !== req.user.id && order.sellerId !== req.user.id)) {
      return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    }
    const payment = await Payment.findOne({ where: { orderId }, order: [['createdAt', 'DESC']] });
    res.status(200).json({
      success: true,
      data: {
        orderStatus: order.status,
        paymentStatus: payment?.status || 'initiated'
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erreur statut', error: e.message });
  }
};
