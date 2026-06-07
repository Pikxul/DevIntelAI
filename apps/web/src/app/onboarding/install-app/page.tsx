'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Github, CheckCircle2, AlertCircle, ArrowRight, Server, Shield, Zap } from 'lucide-react';
import { completeOnboarding } from '@/lib/api';

export default function InstallAppPage() {
  const router = useRouter();
  const [appName, setAppName] = useState('');
  
  useEffect(() => {
    // We get this from the env variable exposed to the frontend
    setAppName(process.env.NEXT_PUBLIC_GITHUB_APP_NAME || 'devintelai');
  }, []);

  const handleInstallClick = () => {
    // The callback will hit our /api/github/callback route
    // which handles the installation_id and marks onboarding as complete
    const installUrl = `https://github.com/apps/${appName}/installations/new`;
    window.location.href = installUrl;
  };

  const handleSkip = async () => {
    try {
      // If they skip, mark onboarding as complete manually
      await completeOnboarding();
      router.push('/dashboard');
    } catch (e) {
      console.error(e);
      // Fallback
      router.push('/dashboard');
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background embellishments */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-2xl bg-surface border border-border/50 p-1 rounded-2xl shadow-2xl relative z-10 backdrop-blur-xl flex flex-col md:flex-row overflow-hidden">
        
        <div className="p-8 md:w-3/5 flex flex-col justify-center">
          <div className="w-12 h-12 rounded-xl bg-[#24292e] flex items-center justify-center shadow-lg mb-6 border border-white/10">
            <Github className="text-white" size={24} />
          </div>
          
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400 mb-2">
            Connect GitHub
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Install the DevIntelAI GitHub App to enable automated pipeline reviews, AI anomaly detection, and CI/CD monitoring.
          </p>

          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-emerald-400 bg-emerald-400/10 p-1 rounded-full"><Zap size={14} /></div>
              <div>
                <p className="text-sm font-medium text-gray-200">Real-time Sync</p>
                <p className="text-xs text-gray-500">Automated ingestion of commits and PRs</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-indigo-400 bg-indigo-400/10 p-1 rounded-full"><Shield size={14} /></div>
              <div>
                <p className="text-sm font-medium text-gray-200">Secure AI Reviews</p>
                <p className="text-xs text-gray-500">LLM-powered code scanning on every commit</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-amber-400 bg-amber-400/10 p-1 rounded-full"><Server size={14} /></div>
              <div>
                <p className="text-sm font-medium text-gray-200">Zero-Config Deployments</p>
                <p className="text-xs text-gray-500">We automatically track deployments via webhooks</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleInstallClick}
            className="w-full bg-[#2ea44f] hover:bg-[#2c974b] text-white font-medium rounded-xl py-3 px-4 flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/25"
          >
            <Github size={18} /> Install GitHub App
          </button>
          
          <button
            onClick={handleSkip}
            className="w-full mt-3 bg-transparent text-gray-500 hover:text-gray-300 font-medium rounded-xl py-2 px-4 transition-all text-sm"
          >
            Skip for now
          </button>
        </div>

        {/* Right side illustration */}
        <div className="hidden md:flex md:w-2/5 bg-gradient-to-br from-gray-900 to-black border-l border-border/50 items-center justify-center p-6 relative">
           <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
           
           <div className="relative flex flex-col gap-4 w-full">
             <div className="bg-surface/80 border border-border/50 rounded-lg p-3 flex items-center gap-3 shadow-lg transform -rotate-2 hover:rotate-0 transition-all">
                <div className="w-8 h-8 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400"><CheckCircle2 size={16} /></div>
                <div className="flex-1">
                  <div className="h-2 w-16 bg-gray-600 rounded mb-1.5"></div>
                  <div className="h-1.5 w-24 bg-gray-700 rounded"></div>
                </div>
             </div>
             
             <div className="bg-surface/80 border border-border/50 rounded-lg p-3 flex items-center gap-3 shadow-lg transform translate-x-4 hover:translate-x-0 transition-all z-10">
                <div className="w-8 h-8 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400"><Server size={16} /></div>
                <div className="flex-1">
                  <div className="h-2 w-20 bg-gray-600 rounded mb-1.5"></div>
                  <div className="h-1.5 w-16 bg-gray-700 rounded"></div>
                </div>
             </div>
             
             <div className="bg-surface/80 border border-border/50 rounded-lg p-3 flex items-center gap-3 shadow-lg transform rotate-2 hover:rotate-0 transition-all">
                <div className="w-8 h-8 rounded bg-amber-500/20 flex items-center justify-center text-amber-400"><AlertCircle size={16} /></div>
                <div className="flex-1">
                  <div className="h-2 w-12 bg-gray-600 rounded mb-1.5"></div>
                  <div className="h-1.5 w-20 bg-gray-700 rounded"></div>
                </div>
             </div>
           </div>
        </div>

      </div>
      
      {/* Stepper indicator */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex justify-center items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-gray-700"></div>
        <div className="h-2 w-8 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
      </div>
    </div>
  );
}
