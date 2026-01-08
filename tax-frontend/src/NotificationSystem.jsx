import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, BellOff, X, Check, AlertTriangle, AlertCircle, Clock,
  DollarSign, FileWarning, TrendingUp, Calendar, CheckCircle2,
  XCircle, Info, Zap, Flag, ArrowRight, Eye, Trash2, RefreshCw
} from 'lucide-react';

// Notification Types with Icons and Colors
const NOTIFICATION_TYPES = {
  payment_due: {
    icon: DollarSign,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    title: 'Payment Overdue'
  },
  payment_soon: {
    icon: Clock,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    title: 'Payment Due Soon'
  },
  duplicate_detected: {
    icon: AlertTriangle,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    title: 'Duplicate Bill Detected'
  },
  approval_needed: {
    icon: FileWarning,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    title: 'Approval Required'
  },
  low_confidence: {
    icon: Flag,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    title: 'Low Confidence - Review Needed'
  },
  new_upload: {
    icon: TrendingUp,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    title: 'New Document Uploaded'
  },
  milestone: {
    icon: Zap,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    title: 'Milestone Achieved'
  },
  info: {
    icon: Info,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    title: 'Information'
  }
};

// Smart Notification Generator
const generateNotifications = (invoices) => {
  const notifications = [];
  const now = new Date();

  if (!invoices || invoices.length === 0) return [];

  invoices.forEach(invoice => {
    // 1. Payment Overdue (30+ days unpaid)
    if (invoice.payment_status === 'Unpaid' && invoice.invoice_date) {
      const invoiceDate = new Date(invoice.invoice_date);
      const daysSince = Math.floor((now - invoiceDate) / (1000 * 60 * 60 * 24));
      
      if (daysSince > 30) {
        notifications.push({
          id: `payment_due_${invoice.id}`,
          type: 'payment_due',
          invoiceId: invoice.id,
          message: `Invoice #${invoice.invoice_no || 'N/A'} from ${invoice.vendor_name || 'Unknown'} is ${daysSince} days overdue`,
          amount: invoice.grand_total,
          date: invoiceDate,
          priority: 'high',
          timestamp: now,
          actionable: true,
          actions: ['mark_paid', 'view', 'remind']
        });
      } else if (daysSince > 15) {
        // 2. Payment Due Soon (15-30 days)
        notifications.push({
          id: `payment_soon_${invoice.id}`,
          type: 'payment_soon',
          invoiceId: invoice.id,
          message: `Invoice #${invoice.invoice_no || 'N/A'} payment due in ${30 - daysSince} days`,
          amount: invoice.grand_total,
          date: invoiceDate,
          priority: 'medium',
          timestamp: now,
          actionable: true,
          actions: ['mark_paid', 'view', 'snooze']
        });
      }
    }

    // 3. Duplicate Bills
    if (invoice.gst_status === 'DUPLICATE BILL') {
      notifications.push({
        id: `duplicate_${invoice.id}`,
        type: 'duplicate_detected',
        invoiceId: invoice.id,
        message: `Duplicate bill detected: ${invoice.vendor_name || 'Unknown'} - ₹${invoice.grand_total?.toLocaleString() || 0}`,
        priority: 'high',
        timestamp: new Date(invoice.upload_date || now),
        actionable: true,
        actions: ['review', 'delete', 'ignore']
      });
    }

    // 4. Low Confidence AI Detection
    if (invoice.ai_confidence === 'low' || invoice.confidence_level === 'low') {
      notifications.push({
        id: `low_conf_${invoice.id}`,
        type: 'low_confidence',
        invoiceId: invoice.id,
        message: `AI uncertain about ${invoice.vendor_name || 'Unknown'} - Manual review recommended`,
        priority: 'medium',
        timestamp: new Date(invoice.upload_date || now),
        actionable: true,
        actions: ['review', 'approve', 'reject']
      });
    }

    // 5. Approval Needed
    if (invoice.review_status === 'pending' || invoice.review_status === 'needs_review') {
      notifications.push({
        id: `approval_${invoice.id}`,
        type: 'approval_needed',
        invoiceId: invoice.id,
        message: `${invoice.vendor_name || 'Invoice'} waiting for approval - ₹${invoice.grand_total?.toLocaleString() || 0}`,
        priority: 'medium',
        timestamp: new Date(invoice.upload_date || now),
        actionable: true,
        actions: ['approve', 'reject', 'review']
      });
    }
  });

  // 6. Milestone Notifications
  const totalPaid = invoices.filter(i => i.payment_status === 'Paid').length;
  const totalDocs = invoices.length;

  if (totalDocs > 0 && totalDocs % 100 === 0) {
    notifications.push({
      id: `milestone_${totalDocs}`,
      type: 'milestone',
      message: `🎉 Congratulations! ${totalDocs} documents processed!`,
      priority: 'low',
      timestamp: now,
      actionable: false,
      actions: []
    });
  }

  // 7. Weekly Summary
  const thisWeek = invoices.filter(i => {
    const date = new Date(i.upload_date || i.invoice_date);
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    return date >= weekAgo;
  });

  if (thisWeek.length > 5) {
    notifications.push({
      id: 'weekly_summary',
      type: 'info',
      message: `${thisWeek.length} documents uploaded this week`,
      priority: 'low',
      timestamp: now,
      actionable: false,
      actions: []
    });
  }

  // Sort by priority and timestamp
  return notifications.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
};

// Main Notification Center Component
export const NotificationCenter = ({ invoices, onAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // all, high, medium, low
  const [readIds, setReadIds] = useState(new Set());

  // Generate notifications from invoices
  useEffect(() => {
    const generated = generateNotifications(invoices);
    setNotifications(generated);
  }, [invoices]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    let result = notifications;
    if (filter !== 'all') {
      result = result.filter(n => n.priority === filter);
    }
    return result;
  }, [notifications, filter]);

  // Unread count
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !readIds.has(n.id)).length;
  }, [notifications, readIds]);

  // Mark as read
  const markAsRead = (id) => {
    setReadIds(prev => new Set([...prev, id]));
  };

  // Mark all as read
  const markAllAsRead = () => {
    setReadIds(new Set(notifications.map(n => n.id)));
  };

  // Dismiss notification
  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    markAsRead(id);
  };

  // Handle notification action
  const handleAction = (notification, action) => {
    markAsRead(notification.id);
    
    if (onAction) {
      onAction(notification, action);
    }

    // Default actions
    switch (action) {
      case 'mark_paid':
        // Mark invoice as paid
        alert(`Marking invoice ${notification.invoiceId} as paid`);
        dismissNotification(notification.id);
        break;
      case 'view':
        // View invoice details
        console.log('View invoice:', notification.invoiceId);
        break;
      case 'delete':
        // Delete invoice
        if (confirm('Delete this invoice?')) {
          dismissNotification(notification.id);
        }
        break;
      case 'approve':
        // Approve document
        alert(`Approved document ${notification.invoiceId}`);
        dismissNotification(notification.id);
        break;
      case 'reject':
        // Reject document
        if (confirm('Reject this document?')) {
          dismissNotification(notification.id);
        }
        break;
      default:
        console.log('Action:', action, notification);
    }
  };

  // Priority badge
  const PriorityBadge = ({ priority }) => {
    const styles = {
      high: 'bg-red-500/20 text-red-400 border-red-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      low: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${styles[priority]}`}>
        {priority}
      </span>
    );
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 hover:bg-white/10 rounded-xl transition-colors group"
      >
        <AnimatePresence>
          {unreadCount > 0 ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Bell className="w-5 h-5 text-yellow-400" />
            </motion.div>
          ) : (
            <BellOff className="w-5 h-5 text-gray-400 group-hover:text-gray-300" />
          )}
        </AnimatePresence>

        {/* Badge */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-96 max-h-[600px] bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-900/20 to-blue-900/20">
              <div>
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Bell className="w-5 h-5 text-purple-400" />
                  Notifications
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {unreadCount} unread, {notifications.length} total
                </p>
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="p-2 border-b border-white/5 flex gap-2">
              {['all', 'high', 'medium', 'low'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${
                    filter === f
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {f}
                  {f !== 'all' && (
                    <span className="ml-1">
                      ({notifications.filter(n => n.priority === f).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Notifications List */}
            <div className="max-h-[450px] overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3 opacity-50" />
                  <p className="text-white font-bold mb-1">All caught up!</p>
                  <p className="text-gray-400 text-sm">No {filter !== 'all' ? filter + ' priority ' : ''}notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  <AnimatePresence>
                    {filteredNotifications.map((notif) => {
                      const typeConfig = NOTIFICATION_TYPES[notif.type];
                      const Icon = typeConfig.icon;
                      const isUnread = !readIds.has(notif.id);

                      return (
                        <motion.div
                          key={notif.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className={`p-4 hover:bg-white/5 transition-colors ${
                            isUnread ? 'bg-purple-500/5' : ''
                          }`}
                          onClick={() => markAsRead(notif.id)}
                        >
                          <div className="flex gap-3">
                            {/* Icon */}
                            <div className={`p-2 rounded-lg ${typeConfig.bg} ${typeConfig.border} border flex-shrink-0`}>
                              <Icon className={`w-4 h-4 ${typeConfig.color}`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="text-sm font-bold text-white">
                                  {typeConfig.title}
                                </h4>
                                <PriorityBadge priority={notif.priority} />
                              </div>

                              <p className="text-xs text-gray-300 mb-2 leading-relaxed">
                                {notif.message}
                              </p>

                              {notif.amount && (
                                <p className="text-sm font-bold text-yellow-400 mb-2">
                                  ₹{notif.amount.toLocaleString()}
                                </p>
                              )}

                              {/* Timestamp */}
                              <p className="text-[10px] text-gray-500">
                                {new Date(notif.timestamp).toLocaleDateString()} {new Date(notif.timestamp).toLocaleTimeString()}
                              </p>

                              {/* Actions */}
                              {notif.actionable && notif.actions.length > 0 && (
                                <div className="flex gap-2 mt-3">
                                  {notif.actions.map(action => (
                                    <button
                                      key={action}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAction(notif, action);
                                      }}
                                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition-colors capitalize"
                                    >
                                      {action.replace('_', ' ')}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Dismiss */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                dismissNotification(notif.id);
                              }}
                              className="p-1 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                            >
                              <X className="w-3 h-3 text-gray-500" />
                            </button>
                          </div>

                          {/* Unread indicator */}
                          {isUnread && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-purple-500 rounded-r-full" />
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-white/10 bg-white/5 flex justify-between items-center">
                <button
                  onClick={() => setNotifications([])}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear all
                </button>
                <button
                  onClick={() => {
                    const generated = generateNotifications(invoices);
                    setNotifications(generated);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
