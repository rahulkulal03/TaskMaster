import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Camera, Globe, Fingerprint, Bell, Info, ChevronRight, Check, Play, Square, Mail, AlertTriangle } from 'lucide-react';
import { auth, db, googleProvider } from '../firebase';
import { linkWithPopup, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firebaseUtils';
import { playAlarmSound } from '../utils/audio';
import { ALARM_SOUNDS, LANGUAGES } from '../constants';

import { t } from '../translations';

interface ProfileProps {
  isDark: boolean;
  user: any;
  userData?: any;
  language: string;
}

export function Profile({ isDark, user, userData, language }: ProfileProps) {
  const [profileImage, setProfileImage] = useState<string | null>(user?.photoURL || null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [alarmSound, setAlarmSound] = useState('default');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDob, setEditDob] = useState('');
  const [showGoogleErrorModal, setShowGoogleErrorModal] = useState(false);
  const [googleErrorCredential, setGoogleErrorCredential] = useState<any>(null);
  const [googleConnectMessage, setGoogleConnectMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewAudioRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (userData) {
      setEditName(userData.displayName || user?.displayName || '');
      setEditDob(userData.dob || '');
    }
  }, [userData, user]);

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.uid) return;
      try {
        const docRef = doc(db, `users/${user.uid}/settings/profile`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.photoUrl) setProfileImage(data.photoUrl);
          if (data.biometricEnabled !== undefined) setBiometricEnabled(data.biometricEnabled);
          if (data.alarmSound) setAlarmSound(data.alarmSound);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}/settings/profile`);
      }
    };
    loadProfile();
  }, [user]);

  const saveProfile = async (updates: any) => {
    if (!user?.uid) return;
    try {
      const docRef = doc(db, `users/${user.uid}/settings/profile`);
      await setDoc(docRef, updates, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/settings/profile`);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setProfileImage(base64String);
        saveProfile({ photoUrl: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleBiometric = () => {
    const newValue = !biometricEnabled;
    setBiometricEnabled(newValue);
    saveProfile({ biometricEnabled: newValue });
  };

  const handleLanguageSelect = (code: string) => {
    saveProfile({ language: code });
    setShowLanguageModal(false);
  };

  const handleAlarmSelect = (id: string) => {
    setAlarmSound(id);
    saveProfile({ alarmSound: id });
    
    if (previewAudioRef.current) {
      previewAudioRef.current.stop();
      previewAudioRef.current = null;
      setPlayingPreview(null);
    }
    
    setShowAlarmModal(false);
  };

  const handlePlayPreview = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent row click
    
    if (playingPreview === id) {
      // Stop current
      if (previewAudioRef.current) {
        previewAudioRef.current.stop();
        previewAudioRef.current = null;
      }
      setPlayingPreview(null);
    } else {
      // Stop previous if any
      if (previewAudioRef.current) {
        previewAudioRef.current.stop();
      }
      
      // Play new
      setPlayingPreview(id);
      previewAudioRef.current = playAlarmSound(id, false);
      
      // Auto stop after 3 seconds
      setTimeout(() => {
        if (playingPreview === id) {
          setPlayingPreview(null);
        }
      }, 3000);
    }
  };

  const handleLogout = () => {
    auth.signOut();
  };

  const handleSaveProfileDetails = async () => {
    if (!user?.uid) return;
    if (!editName.trim() || !editDob) {
      // Don't save if name or dob is empty
      return;
    }
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        displayName: editName.trim(),
        dob: editDob
      }, { merge: true });
      setIsEditingProfile(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleConnectGoogle = async () => {
    if (!auth.currentUser) return;
    setGoogleConnectMessage(null);
    try {
      const result = await linkWithPopup(auth.currentUser, googleProvider);
      
      // Update user document with new Google info
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const updates: any = {
        isAnonymous: false
      };
      if (result.user.email) {
        updates.email = result.user.email;
      }
      if (result.user.displayName || userData?.displayName) {
        updates.displayName = result.user.displayName || userData?.displayName;
      }
      if (result.user.photoURL || userData?.photoURL) {
        updates.photoURL = result.user.photoURL || userData?.photoURL;
      }
      
      await setDoc(userRef, updates, { merge: true });
      
      setGoogleConnectMessage({ type: 'success', text: 'Successfully connected to Google account!' });
    } catch (error: any) {
      console.error('Error connecting to Google:', error);
      if (error.code === 'auth/credential-already-in-use') {
        const credential = GoogleAuthProvider.credentialFromError(error);
        if (credential) {
          setGoogleErrorCredential(credential);
          setShowGoogleErrorModal(true);
        } else {
          setGoogleConnectMessage({ type: 'error', text: 'This Google account is already connected to another user.' });
        }
      } else {
        setGoogleConnectMessage({ type: 'error', text: 'Failed to connect Google account. Please try again.' });
      }
    }
  };

  const handleSwitchGoogleAccount = async () => {
    if (!googleErrorCredential) return;
    try {
      await signInWithCredential(auth, googleErrorCredential);
      setShowGoogleErrorModal(false);
      setGoogleErrorCredential(null);
    } catch (error) {
      console.error('Error switching to Google account:', error);
      setGoogleConnectMessage({ type: 'error', text: 'Failed to switch accounts.' });
      setShowGoogleErrorModal(false);
    }
  };

  const isGoogleConnected = user?.providerData?.some((provider: any) => provider.providerId === 'google.com');

  return (
    <div className={`flex-1 overflow-y-auto p-4 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
      {/* Profile Header */}
      <div className="flex flex-col items-center mb-8 pt-4">
        <div className="relative mb-4">
          <div className={`w-24 h-24 rounded-full overflow-hidden border-4 ${isDark ? 'border-slate-800' : 'border-white'} shadow-lg flex items-center justify-center bg-slate-200`}>
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-slate-400">
                {userData?.displayName?.charAt(0) || user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?'}
              </span>
            )}
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className={`absolute bottom-0 right-0 p-2 rounded-full shadow-md ${isDark ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-500 text-white hover:bg-blue-600'} transition-colors`}
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
        
        {isEditingProfile ? (
          <div className="w-full max-w-xs space-y-3 mt-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Full Name"
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'} focus:ring-2 focus:ring-blue-500 outline-none`}
            />
            <input
              type="date"
              value={editDob}
              onChange={(e) => setEditDob(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'} focus:ring-2 focus:ring-blue-500 outline-none`}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditingProfile(false)}
                className={`flex-1 py-2 rounded-lg font-medium ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfileDetails}
                className="flex-1 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold flex items-center gap-2">
              {userData?.displayName || user?.displayName || 'Guest User'}
              <button onClick={() => setIsEditingProfile(true)} className="text-blue-500 hover:text-blue-600 text-sm font-normal">
                Edit
              </button>
            </h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user?.email || 'Anonymous'}</p>
            {userData?.dob && (
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>DOB: {userData.dob}</p>
            )}
          </>
        )}
      </div>

      {/* Settings List */}
      <div className="space-y-4 max-w-md mx-auto pb-8">
        {/* Language */}
        <button 
          onClick={() => setShowLanguageModal(true)}
          className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors ${isDark ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-white hover:bg-slate-50'} shadow-sm`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
              <Globe className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-medium">{t(language, 'profile.language')}</p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {LANGUAGES.find(l => l.code === language)?.name || 'English'}
              </p>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
        </button>

        {/* Biometric */}
        <div className={`w-full flex items-center justify-between p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-white'} shadow-sm`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
              <Fingerprint className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-medium">{t(language, 'profile.biometric')}</p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t(language, 'profile.biometric_desc')}</p>
            </div>
          </div>
          <button 
            onClick={toggleBiometric}
            className={`w-12 h-6 rounded-full transition-colors relative ${biometricEnabled ? 'bg-blue-500' : (isDark ? 'bg-slate-700' : 'bg-slate-300')}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${biometricEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Alarm Sound */}
        <button 
          onClick={() => setShowAlarmModal(true)}
          className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors ${isDark ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-white hover:bg-slate-50'} shadow-sm`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
              <Bell className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-medium">{t(language, 'profile.alarm_sound')}</p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {ALARM_SOUNDS.find(s => s.id === alarmSound)?.name || 'Default Chime'}
              </p>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
        </button>

        {/* App Version */}
        <div className={`w-full flex items-center justify-between p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-white'} shadow-sm`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
              <Info className="w-5 h-5" />
            </div>
            <p className="font-medium">{t(language, 'profile.about')}</p>
          </div>
          <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t(language, 'profile.version')}</span>
        </div>

        {/* Connect Google Account */}
        <div className="mt-4">
          {googleConnectMessage && (
            <div className={`p-3 mb-3 rounded-lg text-sm flex items-center gap-2 ${
              googleConnectMessage.type === 'error' 
                ? (isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600') 
                : (isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600')
            }`}>
              {googleConnectMessage.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              {googleConnectMessage.text}
            </div>
          )}
          <button 
            onClick={isGoogleConnected ? undefined : handleConnectGoogle}
            disabled={isGoogleConnected}
            className={`w-full flex items-center gap-3 p-4 rounded-xl transition-colors ${isDark ? 'bg-slate-800/50' : 'bg-white'} shadow-sm ${!isGoogleConnected ? (isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50') : 'opacity-90 cursor-default'}`}
          >
            <div className={`p-2 rounded-lg ${
              isGoogleConnected 
                ? (isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600')
                : (isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600')
            }`}>
              <Mail className="w-5 h-5" />
            </div>
            <div className="text-left flex-1">
              <p className="font-medium">
                {isGoogleConnected ? 'Google Account Connected' : 'Connect Google Account'}
              </p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {isGoogleConnected ? 'Your progress is synced to Gmail' : 'Link your Gmail to save progress'}
              </p>
            </div>
            {!isGoogleConnected ? (
              <ChevronRight className={`w-5 h-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            ) : (
              <Check className={`w-5 h-5 ${isDark ? 'text-green-500' : 'text-green-600'}`} />
            )}
          </button>
        </div>

        {/* Logout */}
        <button 
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 p-4 rounded-xl transition-colors mt-8 ${isDark ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
        >
          <div className="p-2 rounded-lg bg-transparent">
            <LogOut className="w-5 h-5" />
          </div>
          <span className="font-medium">{t(language, 'profile.logout')}</span>
        </button>
      </div>

      {/* Language Modal */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-sm max-h-[80vh] overflow-hidden flex flex-col rounded-t-2xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
            <div className={`p-4 border-b flex justify-between items-center ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <h3 className="font-bold text-lg">{t(language, 'profile.select_language')}</h3>
              <button onClick={() => setShowLanguageModal(false)} className={`p-1 rounded-full ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                ✕
              </button>
            </div>
            <div className="overflow-y-auto p-2">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${language === lang.code ? (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50')}`}
                >
                  <span>{lang.name}</span>
                  {language === lang.code && <Check className="w-5 h-5" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Alarm Sound Modal */}
      {showAlarmModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-sm max-h-[80vh] overflow-hidden flex flex-col rounded-t-2xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
            <div className={`p-4 border-b flex justify-between items-center ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <h3 className="font-bold text-lg">{t(language, 'profile.select_alarm_sound')}</h3>
              <button onClick={() => {
                if (previewAudioRef.current) {
                  previewAudioRef.current.stop();
                  setPlayingPreview(null);
                }
                setShowAlarmModal(false);
              }} className={`p-1 rounded-full ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                ✕
              </button>
            </div>
            <div className="overflow-y-auto p-2">
              {ALARM_SOUNDS.map(sound => (
                <div
                  key={sound.id}
                  onClick={() => handleAlarmSelect(sound.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors cursor-pointer ${alarmSound === sound.id ? (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50')}`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => handlePlayPreview(e, sound.id)}
                      className={`p-2 rounded-full transition-colors ${playingPreview === sound.id ? 'bg-blue-500 text-white' : (isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-600 hover:bg-slate-300')}`}
                    >
                      {playingPreview === sound.id ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <span>{sound.name}</span>
                  </div>
                  {alarmSound === sound.id && <Check className="w-5 h-5" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Google Error Modal */}
      {showGoogleErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className={`w-full max-w-sm overflow-hidden flex flex-col rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300 ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
            <div className={`p-6 border-b flex flex-col items-center text-center ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className={`p-3 rounded-full mb-4 ${isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}`}>
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-xl mb-2">Account Already Exists</h3>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                This Google account is already registered to another user. Would you like to log in to that account instead? 
                <br/><br/>
                <span className="font-semibold text-red-500">Warning: Your current guest data will be lost.</span>
              </p>
            </div>
            <div className="p-4 flex gap-3">
              <button
                onClick={() => {
                  setShowGoogleErrorModal(false);
                  setGoogleErrorCredential(null);
                }}
                className={`flex-1 py-3 rounded-xl font-medium transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleSwitchGoogleAccount}
                className="flex-1 py-3 rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                Yes, Log In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
