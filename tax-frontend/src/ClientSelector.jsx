import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Search, X, Edit2, User } from 'lucide-react';

// Client Selector Modal Component
export const ClientSelectorModal = ({ clients, onSelect, onClose, search, setSearch }) => {
  const filteredClients = clients.filter(c =>
    c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.gstin?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-6 h-6 text-purple-400" />
              Select Client
            </h3>
            <p className="text-sm text-gray-400 mt-1">Choose a client to upload documents</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name, GSTIN, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Client List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredClients.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No clients found</p>
            </div>
          )}

          {filteredClients.map((client) => (
            <motion.button
              key={client.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => {
                onSelect(client);
                onClose();
              }}
              className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-all group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-white group-hover:text-purple-400 transition-colors">
                    {client.company_name}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">{client.gstin || 'No GSTIN'}</p>
                  {client.phone && (
                    <p className="text-xs text-gray-500 mt-0.5">📱 {client.phone}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                    {client.status}
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5">
          <button className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold transition-colors">
            + Add New Client
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Client Selector Bar Component
export const ClientSelectorBar = ({ selectedClient, onOpenSelector, onOpenProfile, selectedDocType, setSelectedDocType }) => {
  return (
    <div className="p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-b border-white/10">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-purple-400" />
          <span className="text-sm text-gray-400">Selected Client:</span>
        </div>

        {selectedClient ? (
          <div className="flex items-center gap-3 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg">
            <div>
              <div className="text-white font-semibold">{selectedClient.company_name}</div>
              <div className="text-xs text-gray-400">{selectedClient.gstin || 'No GSTIN'}</div>
            </div>
            <button
              onClick={onOpenProfile}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              title="View Client Profile"
            >
              <User className="w-4 h-4 text-purple-400" />
            </button>
            <button
              onClick={onOpenSelector}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              title="Change Client"
            >
              <Edit2 className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenSelector}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-semibold transition-colors"
          >
            📋 Select Client to Start
          </button>
        )}

        {/* Document Type Selector */}
        {selectedClient && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-400">Document Type:</span>
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:border-purple-500 outline-none"
            >
              <option value="gst_invoice">📄 GST Invoice</option>
              <option value="bank_statement">🏦 Bank Statement</option>
              <option value="payment_receipt">💰 Payment Receipt</option>
              <option value="expense_bill">🧾 Expense Bill</option>
              <option value="credit_note">↩️ Credit Note</option>
              <option value="debit_note">↪️ Debit Note</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
