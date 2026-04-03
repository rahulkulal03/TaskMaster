import React, { useState, useRef } from 'react';
import { Camera } from 'lucide-react';

interface ProfileSetupModalProps {
  userData: any;
  onComplete: (data: any) => void;
}

export function ProfileSetupModal({ userData, onComplete }: ProfileSetupModalProps) {
  const [name, setName] = useState(userData?.displayName || '');
  const [dob, setDob] = useState(userData?.dob || '');
  const [profileImage, setProfileImage] = useState<string | null>(userData?.photoURL || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!dob) {
      setError('Date of Birth is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const updates: any = {
        displayName: name.trim(),
        dob: dob,
        lastLogin: new Date().toISOString()
      };
      
      if (profileImage) {
        updates.photoURL = profileImage;
      }

      onComplete(updates);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Complete Your Profile</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          Please provide a few details to personalize your experience.
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg flex items-center justify-center bg-slate-200 dark:bg-slate-700">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-slate-400 dark:text-slate-500">
                  {name.charAt(0) || '?'}
                </span>
              )}
            </div>
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 rounded-full shadow-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Profile Photo (Optional)</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
              placeholder="Enter your name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Date of Birth
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 mt-6"
          >
            {loading ? 'Saving...' : 'Save & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
