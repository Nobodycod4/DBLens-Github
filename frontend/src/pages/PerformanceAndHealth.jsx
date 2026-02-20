
import { useState } from 'react';
import { Gauge, HeartPulse } from 'lucide-react';
import Performance from './Performance';
import SystemHealth from './SystemHealth';

export default function PerformanceAndHealth() {
  const [activeTab, setActiveTab] = useState('performance');

  return (
    <div className="min-h-screen bg-primary p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-[#EA580C] text-white shadow-lg">
              <Gauge className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-secondary">
              Performance & System Health
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 ml-12">Query analytics and server health in one place</p>
        </div>

        <div className="flex rounded-xl bg-gray-100 dark:bg-white/5 p-1 border border-gray-200/50 dark:border-white/10">
          <button
            onClick={() => setActiveTab('performance')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'performance'
                ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Gauge className="w-4 h-4" />
            Performance
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'health'
                ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            System Health
          </button>
        </div>
      </div>

      <div className="mt-4">
        {activeTab === 'performance' && <Performance embedded />}
        {activeTab === 'health' && <SystemHealth embedded />}
      </div>
    </div>
  );
}

