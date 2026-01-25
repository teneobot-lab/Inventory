import React, { useState } from 'react';
import { InventoryItem, Transaction, User } from '../types';
import { generateInventoryInsights } from '../services/geminiService';
import { Bot, Settings, Shield, User as UserIcon, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AdminViewProps {
  user: User;
  items: InventoryItem[];
  transactions: Transaction[];
}

export const AdminView: React.FC<AdminViewProps> = ({ user, items, transactions }) => {
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRunAnalysis = async () => {
    setIsLoading(true);
    setAiAnalysis('');
    const result = await generateInventoryInsights(items, transactions);
    setAiAnalysis(result);
    setIsLoading(false);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <div className="bg-slate-800 p-3 rounded-full text-white">
          <Shield size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Administrator Panel</h2>
          <p className="text-slate-500">System settings and AI Insights</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* User Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <UserIcon size={20} /> Current User
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span className="text-slate-500">Name</span>
              <span className="font-medium text-slate-800">{user.name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span className="text-slate-500">Email</span>
              <span className="font-medium text-slate-800">{user.email}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span className="text-slate-500">Role</span>
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-sm font-semibold uppercase">{user.role}</span>
            </div>
            <div className="pt-4">
              <button className="text-blue-600 text-sm hover:underline flex items-center gap-1">
                <Settings size={14} /> Edit Profile Settings
              </button>
            </div>
          </div>
        </div>

        {/* AI Assistant Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col h-full">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-indigo-700">
              <Bot size={20} /> Smart Inventory Advisor
            </h3>
            <button
              onClick={handleRunAnalysis}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isLoading 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={14} /> Analyzing...</span>
              ) : (
                'Generate Report'
              )}
            </button>
          </div>
          
          <div className="flex-1 bg-slate-50 rounded-lg p-4 border border-slate-200 overflow-y-auto max-h-[400px]">
            {aiAnalysis ? (
              <article className="prose prose-sm prose-slate max-w-none">
                {/* We render markdown here. In a real app we'd use 'react-markdown' but standard text works for now if library not present. 
                    However, the request allows popular libraries. I will use a simple whitespace preserve. */}
                <div className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed">
                   {aiAnalysis}
                </div>
              </article>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center">
                <Bot size={48} className="mb-2 opacity-20" />
                <p>Click "Generate Report" to let Gemini AI analyze your stock levels and transaction trends.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};