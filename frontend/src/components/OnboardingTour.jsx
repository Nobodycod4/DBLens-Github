import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Database, Layout, Code, Archive, Sparkles, ArrowRight } from 'lucide-react';

const steps = [
  { title: 'Welcome to DBLens', description: 'A modern database management suite built for developers. Let us show you around.', icon: Sparkles, bg: 'bg-[#2563EB]' },
  { title: 'Connect Your Databases', description: 'Add PostgreSQL, MySQL, SQLite, and MongoDB connections with ease.', icon: Database, bg: 'bg-[#0891B2]' },
  { title: 'Explore Your Schema', description: 'View tables, columns, and relationships with our interactive schema diagram.', icon: Layout, bg: 'bg-[#0D9488]' },
  { title: 'Write & Execute Queries', description: 'Powerful query editor with syntax highlighting and auto-complete.', icon: Code, bg: 'bg-[#059669]' },
  { title: 'Backup & Restore', description: 'Schedule automatic backups and restore from point-in-time snapshots.', icon: Archive, bg: 'bg-[#EA580C]' },
];

export default function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('dblens_tour_completed');
    if (!hasSeenTour) {
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem('dblens_tour_completed', 'true');
    setIsOpen(false);
  };

  const handleSkip = () => {
    localStorage.setItem('dblens_tour_completed', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const step = steps[currentStep];
  const Icon = step.icon;
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/95 dark:bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl shadow-black/20 dark:shadow-black/40 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {
}
        <button 
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {
}
        <div className="p-8 text-center">
          {
}
          <div className={`w-20 h-20 rounded-2xl ${step.bg} flex items-center justify-center mx-auto mb-6 shadow-xl`}>
            <Icon className="w-10 h-10 text-white" />
          </div>
          
          {
}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {step.title}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
            {step.description}
          </p>
        </div>

        {
}
        <div className="flex items-center justify-center gap-2 pb-6">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                i === currentStep 
                  ? 'bg-[#2563EB] w-8' 
                  : 'bg-gray-200 dark:bg-white/20 hover:bg-gray-300 dark:hover:bg-white/30'
              }`}
            />
          ))}
        </div>

        {
}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200/50 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
          <button 
            onClick={handleSkip} 
            className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button 
                onClick={() => setCurrentStep(s => s - 1)} 
                className="p-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={isLast ? handleComplete : () => setCurrentStep(s => s + 1)} 
              className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl font-medium transition-all"
            >
              {isLast ? (
                <>
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

