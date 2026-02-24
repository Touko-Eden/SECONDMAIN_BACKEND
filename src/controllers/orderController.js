const { Op } = require('sequelize');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Annonce = require('../models/Annonce');
const User = require('../models/User');

const generateRef = () => 'ORD-' + Math.random().toString(36).slice(2, 10).toUpperCase();

exports.createOrder = async (req, res) => {
  try {
    const { annonceId, quantity = 1, paymentMethod } = req.body;
    if (!annonceId || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'annonceId et paymentMethod requis' });
    }
    const annonce = await Annonce.findByPk(annonceId, { include: [{ model: User, as: 'seller' }] });
    if (!annonce || annonce.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Annonce non disponible' });
    }
    if (annonce.userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Impossible d’acheter votre propre annonce' });
    }
    const qty = parseInt(quantity) || 1;
    const totalAmount = (Number(annonce.price) * qty).toFixed(2);
    const order = await Order.create({
      buyerId: req.user.id,
      sellerId: annonce.userId,
      annonceId: annonce.id,
      quantity: qty,
      totalAmount,
      paymentMethod,
      status: 'pending',
      reference: generateRef()
    });
    const created = await Order.findByPk(order.id, {
      include: [
        { model: User, as: 'buyer', attributes: ['id', 'fullName', 'phone'] },
        { model: User, as: 'seller', attributes: ['id', 'fullName', 'phone'] },
        { model: Annonce, as: 'annonce', attributes: ['id', 'title', 'price'] }
      ]
    });
    res.status(201).json({ success: true, data: created });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erreur création commande', error: e.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { [Op.or]: [{ buyerId: req.user.id }, { sellerId: req.user.id }] },
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'buyer', attributes: ['id', 'fullName'] },
        { model: User, as: 'seller', attributes: ['id', 'fullName'] },
        { model: Annonce, as: 'annonce', attributes: ['id', 'title', 'price'] }
      ]
    });
    res.status(200).json({ success: true, data: orders });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erreur récupération commandes', error: e.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: User, as: 'buyer', attributes: ['id', 'fullName'] },
        { model: User, as: 'seller', attributes: ['id', 'fullName'] },
        { model: Annonce, as: 'annonce', attributes: ['id', 'title', 'price'] }
      ]
    });
    if (!order || (order.buyerId !== req.user.id && order.sellerId !== req.user.id)) {
      return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    }
    res.status(200).json({ success: true, data: order });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erreur', error: e.message });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order || order.buyerId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Commande non annulable' });
    }
    order.status = 'canceled';
    await order.save();
    res.status(200).json({ success: true, data: order });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erreur annulation', error: e.message });
  }
};
