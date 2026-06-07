'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { AlertCircle, Building2, CheckCircle2 } from 'lucide-react';
import { createOrganization, type Organization } from '@/lib/api';

export default function CreateOrganizationPage() {
  const { update } = useSession();
  const [orgName, setOrgName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [organization, setOrganization] = useState<Organization | null>(null);

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setOrgName(newName);
    if (slug === '' || slug === generateSlug(orgName)) {
      setSlug(generateSlug(newName));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!orgName || !slug) {
      setError('Please fill in both fields');
      return;
    }
    
    setLoading(true);
    try {
      const newOrg = await createOrganization({ name: orgName, slug });
      await update({ organizationId: newOrg.id });
      setOrganization(newOrg);
    } catch (err: any) {
      setError(err.message || 'Failed to configure organization');
    } finally {
      setLoading(false);
    }
  };

  if (organization) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="w-full max-w-md bg-surface border border-border/50 p-8 rounded-2xl shadow-2xl relative z-10 backdrop-blur-xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="text-emerald-400" size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Organization created</h1>
              <p className="text-muted-foreground text-sm">{organization.name}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-surface-hover px-4 py-3">
            <p className="text-xs uppercase tracking-[0.08em] text-gray-500 mb-1">Workspace</p>
            <p className="text-gray-100 font-medium break-words">devintel.ai/{organization.slug}</p>
          </div>

          <div className="mt-8 flex justify-center items-center gap-2">
            <div className="h-2 w-8 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
            <div className="h-2 w-2 rounded-full bg-gray-700"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background embellishments */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-surface border border-border/50 p-8 rounded-2xl shadow-2xl relative z-10 backdrop-blur-xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Building2 className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400">
              Welcome to DevIntelAI
            </h1>
            <p className="text-muted-foreground text-sm">Let's set up your workspace</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-200 ml-1">Organization Name</label>
            <input
              type="text"
              value={orgName}
              onChange={handleNameChange}
              placeholder="e.g. Acme Corp"
              className="w-full bg-surface-hover border border-border/60 rounded-xl px-4 py-3 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-200 ml-1">Workspace URL Slug</label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-gray-500 text-sm">devintel.ai/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="acme-corp"
                className="w-full bg-surface-hover border border-border/60 rounded-xl pl-[96px] pr-4 py-3 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !orgName || !slug}
            className="w-full mt-4 bg-gradient-brand text-white font-medium rounded-xl py-3 px-4 flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-indigo-500/25"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Create organization'
            )}
          </button>
        </form>

        <div className="mt-8 flex justify-center items-center gap-2">
          <div className="h-2 w-8 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
          <div className="h-2 w-2 rounded-full bg-gray-700"></div>
        </div>
      </div>
    </div>
  );
}
