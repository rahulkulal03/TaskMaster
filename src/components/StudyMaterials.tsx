import React, { useState } from 'react';
import { ChevronLeft, Plus, Folder, FileText, Upload, Trash2, Download, X, Eye, Share2, MoreVertical } from 'lucide-react';
import { t } from '../translations';

interface StudyMaterialsProps {
  isDark: boolean;
  language: string;
  onBack: () => void;
}

interface NoteFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: number;
}

interface Module {
  id: string;
  name: string;
  files: NoteFile[];
}

interface Subject {
  id: string;
  name: string;
  modules: Module[];
  files?: NoteFile[];
}

export function StudyMaterials({ isDark, language, onBack }: StudyMaterialsProps) {
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem('study_materials');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  const [viewingFile, setViewingFile] = useState<NoteFile | null>(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setActiveActionMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  const [showAddModule, setShowAddModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');

  const saveSubjects = (newSubjects: Subject[]) => {
    setSubjects(newSubjects);
    localStorage.setItem('study_materials', JSON.stringify(newSubjects));
  };

  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return;
    const newSubject: Subject = {
      id: Date.now().toString(),
      name: newSubjectName.trim(),
      modules: []
    };
    saveSubjects([...subjects, newSubject]);
    setNewSubjectName('');
    setShowAddSubject(false);
  };

  const handleDeleteSubject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this subject and all its materials?')) {
      const updated = subjects.filter(s => s.id !== id);
      saveSubjects(updated);
      if (activeSubjectId === id) setActiveSubjectId(null);
    }
  };

  const handleAddModule = () => {
    if (!newModuleName.trim() || !activeSubjectId) return;
    const updated = subjects.map(s => {
      if (s.id === activeSubjectId) {
        return {
          ...s,
          modules: [...s.modules, {
            id: Date.now().toString(),
            name: newModuleName.trim(),
            files: []
          }]
        };
      }
      return s;
    });
    saveSubjects(updated);
    setNewModuleName('');
    setShowAddModule(false);
  };

  const handleDeleteModule = (e: React.MouseEvent, subjectId: string, moduleId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this module?')) {
      const updated = subjects.map(s => {
        if (s.id === subjectId) {
          return {
            ...s,
            modules: s.modules.filter(m => m.id !== moduleId)
          };
        }
        return s;
      });
      saveSubjects(updated);
      if (activeModuleId === moduleId) setActiveModuleId(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, subjectId: string, moduleId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB for local storage');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Str = reader.result as string;
      const newFile: NoteFile = {
        id: Date.now().toString(),
        name: file.name,
        url: base64Str,
        type: file.type,
        size: file.size,
        uploadedAt: Date.now()
      };

      const updated = subjects.map(s => {
        if (s.id === subjectId) {
          return {
            ...s,
            modules: s.modules.map(m => {
              if (m.id === moduleId) {
                return { ...m, files: [...m.files, newFile] };
              }
              return m;
            })
          };
        }
        return s;
      });
      saveSubjects(updated);
    };
    reader.readAsDataURL(file);
  };

  const handleSubjectFileUpload = (e: React.ChangeEvent<HTMLInputElement>, subjectId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB for local storage');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Str = reader.result as string;
      const newFile: NoteFile = {
        id: Date.now().toString(),
        name: file.name,
        url: base64Str,
        type: file.type,
        size: file.size,
        uploadedAt: Date.now()
      };

      const updated = subjects.map(s => {
        if (s.id === subjectId) {
          return {
            ...s,
            files: [...(s.files || []), newFile]
          };
        }
        return s;
      });
      saveSubjects(updated);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteSubjectFile = (subjectId: string, fileId: string) => {
    if (confirm('Delete this file?')) {
      const updated = subjects.map(s => {
        if (s.id === subjectId) {
          return {
            ...s,
            files: (s.files || []).filter(f => f.id !== fileId)
          };
        }
        return s;
      });
      saveSubjects(updated);
    }
  };

  const getBlobUrl = (dataUrl: string) => {
    const byteString = atob(dataUrl.split(',')[1]);
    const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    return URL.createObjectURL(blob);
  };

  const isMedianApp = () => ((typeof window !== 'undefined' && (window as any).median) || navigator.userAgent.toLowerCase().includes('median'));

  const handleFileClick = (file: NoteFile) => {
    if (file.type.startsWith('image/')) {
      setViewingFile(file);
    } else {
      if (isMedianApp()) {
        window.location.href = `median://share/sharePage?url=${encodeURIComponent(file.url)}&title=${encodeURIComponent(file.name)}`;
        return;
      }

      try {
        const blobUrl = getBlobUrl(file.url);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.target = '_blank';
        a.click();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } catch (err) {
        console.error('Error opening file:', err);
      }
    }
  };

  const handleDownloadFile = (e: React.MouseEvent, file: NoteFile) => {
    e.stopPropagation();
    if (isMedianApp()) {
      window.location.href = `median://share/sharePage?url=${encodeURIComponent(file.url)}&title=${encodeURIComponent(file.name)}`;
      return;
    }

    try {
      const blobUrl = getBlobUrl(file.url);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
      console.error('Error downloading file:', err);
    }
  };

  const handleShareButton = async (e: React.MouseEvent, file: NoteFile) => {
    e.stopPropagation();
    if (isMedianApp()) {
      window.location.href = `median://share/sharePage?url=${encodeURIComponent(file.url)}&title=${encodeURIComponent(file.name)}`;
      return;
    }

    try {
      const byteString = atob(file.url.split(',')[1]);
      const mimeString = file.url.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      
      if (navigator.canShare) {
        const fileObj = new File([blob], file.name, { type: file.type });
        if (navigator.canShare({ files: [fileObj] })) {
          await navigator.share({
            files: [fileObj],
            title: file.name
          });
          return;
        }
      }
      alert('Sharing files is not fully supported on this browser.');
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const handleDeleteFile = (subjectId: string, moduleId: string, fileId: string) => {
    if (confirm('Delete this file?')) {
      const updated = subjects.map(s => {
        if (s.id === subjectId) {
          return {
            ...s,
            modules: s.modules.map(m => {
              if (m.id === moduleId) {
                return { ...m, files: m.files.filter(f => f.id !== fileId) };
              }
              return m;
            })
          };
        }
        return s;
      });
      saveSubjects(updated);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className={`absolute inset-0 z-20 flex flex-col ${isDark ? 'bg-[#0B1120] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      <div className={`flex items-center gap-3 p-4 border-b ${isDark ? 'border-slate-800 bg-[#0B1120]' : 'border-slate-200 bg-white'}`}>
        <button
          onClick={onBack}
          className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold flex-1">
          {activeModuleId && activeSubjectId ? (
            subjects.find(s => s.id === activeSubjectId)?.modules.find(m => m.id === activeModuleId)?.name || 'Module'
          ) : activeSubjectId ? (
            subjects.find(s => s.id === activeSubjectId)?.name || 'Subject'
          ) : (
            'Study Materials'
          )}
        </h2>
        {activeModuleId ? (
          <button
            onClick={() => {
               document.getElementById(`file-upload-${activeModuleId}`)?.click();
            }}
            className={`p-2 rounded-full ${isDark ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}
          >
            <Upload className="w-5 h-5" />
          </button>
        ) : activeSubjectId ? (
          <div className="flex gap-2">
            <button
              onClick={() => {
                 document.getElementById(`file-upload-subject-${activeSubjectId}`)?.click();
              }}
              className={`p-2 rounded-full ${isDark ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}
            >
              <Upload className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowAddModule(true)}
              className={`p-2 rounded-full ${isDark ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddSubject(true)}
            className={`p-2 rounded-full ${isDark ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeModuleId && activeSubjectId ? (
          // Render Files
          <div className="space-y-3 max-w-2xl mx-auto">
            {subjects.find(s => s.id === activeSubjectId)?.modules.find(m => m.id === activeModuleId)?.files.length === 0 ? (
              <div className="text-center py-12">
                <FileText className={`w-12 h-12 mx-auto mb-3 opacity-20`} />
                <p className="opacity-50">No files in this module yet.</p>
                <p className="text-sm opacity-50 mt-1">Click the upload button to add notes.</p>
              </div>
            ) : (
              subjects.find(s => s.id === activeSubjectId)?.modules.find(m => m.id === activeModuleId)?.files.map(file => (
                <div key={file.id} className={`flex items-center justify-between p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-white shadow-sm'}`}>
                  <div 
                    className="flex items-center gap-3 overflow-hidden cursor-pointer flex-1"
                    onClick={() => handleFileClick(file)}
                  >
                    <div className={`p-3 rounded-lg flex-shrink-0 ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate hover:underline">{file.name}</p>
                      <p className="text-xs opacity-50">{formatSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="relative flex items-center flex-shrink-0 ml-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveActionMenuId(activeActionMenuId === file.id ? null : file.id); }}
                      className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                    >
                      <MoreVertical className="w-5 h-5 opacity-70 hover:opacity-100" />
                    </button>
                    {activeActionMenuId === file.id && (
                      <div className={`absolute right-0 top-full mt-1 w-48 rounded-xl shadow-lg border z-50 overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} animate-in fade-in zoom-in-95 duration-100`}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveActionMenuId(null); handleShareButton(e, file); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}
                        >
                          <Share2 className="w-4 h-4 opacity-70" />
                          <span>Share</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveActionMenuId(null); handleDownloadFile(e, file); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}
                        >
                          <Download className="w-4 h-4 opacity-70" />
                          <span>Download</span>
                        </button>
                        <div className={`h-px w-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveActionMenuId(null); handleDeleteFile(activeSubjectId, activeModuleId, file.id); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}
                        >
                          <Trash2 className="w-4 h-4 opacity-70" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <input 
              id={`file-upload-${activeModuleId}`}
              type="file"
              className="hidden"
              onChange={(e) => handleFileUpload(e, activeSubjectId, activeModuleId)}
            />
          </div>
        ) : activeSubjectId ? (
          // Render Modules
          <div className="space-y-3 max-w-2xl mx-auto">
            {subjects.find(s => s.id === activeSubjectId)?.modules.length === 0 && (!subjects.find(s => s.id === activeSubjectId)?.files || subjects.find(s => s.id === activeSubjectId)?.files?.length === 0) ? (
              <div className="text-center py-12">
                <Folder className={`w-12 h-12 mx-auto mb-3 opacity-20`} />
                <p className="opacity-50">Nothing here yet.</p>
                <p className="text-sm opacity-50 mt-1">Create a module or start adding notes.</p>
              </div>
            ) : (
              <>
                {subjects.find(s => s.id === activeSubjectId)?.modules.map(module => (
                  <button
                    key={module.id}
                    onClick={() => setActiveModuleId(module.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${isDark ? 'bg-slate-800/80 hover:bg-slate-800' : 'bg-white hover:bg-slate-50 shadow-sm'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg flex-shrink-0 ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                        <Folder className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-lg">{module.name}</p>
                        <p className="text-sm opacity-60">{module.files.length} files</p>
                      </div>
                    </div>
                    <div 
                      onClick={(e) => handleDeleteModule(e, activeSubjectId, module.id)}
                      className="p-2 -mr-2 rounded-full hover:bg-red-500/10 text-red-500/50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </div>
                  </button>
                ))}
                
                {subjects.find(s => s.id === activeSubjectId)?.files?.map(file => (
                  <div key={file.id} className={`flex items-center justify-between p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-white shadow-sm'}`}>
                    <div 
                      className="flex items-center gap-3 overflow-hidden cursor-pointer flex-1"
                      onClick={() => handleFileClick(file)}
                    >
                      <div className={`p-3 rounded-lg flex-shrink-0 ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate hover:underline">{file.name}</p>
                        <p className="text-xs opacity-50">{formatSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="relative flex items-center flex-shrink-0 ml-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveActionMenuId(activeActionMenuId === file.id ? null : file.id); }}
                        className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                      >
                        <MoreVertical className="w-5 h-5 opacity-70 hover:opacity-100" />
                      </button>
                      {activeActionMenuId === file.id && (
                        <div className={`absolute right-0 top-full mt-1 w-48 rounded-xl shadow-lg border z-50 overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} animate-in fade-in zoom-in-95 duration-100`}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveActionMenuId(null); handleShareButton(e, file); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}
                          >
                            <Share2 className="w-4 h-4 opacity-70" />
                            <span>Share</span>
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveActionMenuId(null); handleDownloadFile(e, file); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}
                          >
                            <Download className="w-4 h-4 opacity-70" />
                            <span>Download</span>
                          </button>
                          <div className={`h-px w-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveActionMenuId(null); handleDeleteSubjectFile(activeSubjectId, file.id); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}
                          >
                            <Trash2 className="w-4 h-4 opacity-70" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
            <input 
              id={`file-upload-subject-${activeSubjectId}`}
              type="file"
              className="hidden"
              onChange={(e) => handleSubjectFileUpload(e, activeSubjectId)}
            />
          </div>
        ) : (
          // Render Subjects
          <div className="space-y-3 max-w-2xl mx-auto">
            {subjects.length === 0 ? (
              <div className="text-center py-12">
                <Folder className={`w-12 h-12 mx-auto mb-3 opacity-20`} />
                <p className="opacity-50">Your study materials are empty.</p>
                <p className="text-sm opacity-50 mt-1">Add a subject to get started.</p>
              </div>
            ) : (
              subjects.map(subject => (
                <button
                  key={subject.id}
                  onClick={() => setActiveSubjectId(subject.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${isDark ? 'bg-slate-800/80 hover:bg-slate-800' : 'bg-white hover:bg-slate-50 shadow-sm'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xl shadow-inner">
                      {subject.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-lg">{subject.name}</p>
                      <p className="text-sm opacity-60">{subject.modules.length} modules</p>
                    </div>
                  </div>
                  <div 
                    onClick={(e) => handleDeleteSubject(e, subject.id)}
                    className="p-2 -mr-2 rounded-full hover:bg-red-500/10 text-red-500/50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Add Subject Modal */}
      {showAddSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-sm rounded-2xl p-5 ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
            <h3 className="font-bold mb-4">Add Subject</h3>
            <input
              type="text"
              autoFocus
              value={newSubjectName}
              onChange={e => setNewSubjectName(e.target.value)}
              placeholder="e.g. Mathematics"
              className={`w-full p-3 rounded-xl mb-4 ${isDark ? 'bg-slate-800 text-white placeholder-slate-500' : 'bg-slate-100 text-slate-900 placeholder-slate-400'} outline-none focus:ring-2 focus:ring-blue-500`}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowAddSubject(false)} className={`flex-1 py-2.5 rounded-xl font-medium ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-800'}`}>
                Cancel
              </button>
              <button onClick={handleAddSubject} className="flex-1 py-2.5 rounded-xl font-medium bg-blue-600 text-white">
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Module Modal */}
      {showAddModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-sm rounded-2xl p-5 ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
            <h3 className="font-bold mb-4">Add Module</h3>
            <input
              type="text"
              autoFocus
              value={newModuleName}
              onChange={e => setNewModuleName(e.target.value)}
              placeholder="e.g. Chapter 1: Introduction"
              className={`w-full p-3 rounded-xl mb-4 ${isDark ? 'bg-slate-800 text-white placeholder-slate-500' : 'bg-slate-100 text-slate-900 placeholder-slate-400'} outline-none focus:ring-2 focus:ring-blue-500`}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowAddModule(false)} className={`flex-1 py-2.5 rounded-xl font-medium ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-800'}`}>
                Cancel
              </button>
              <button onClick={handleAddModule} className="flex-1 py-2.5 rounded-xl font-medium bg-blue-600 text-white">
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Viewer Modal */}
      {viewingFile && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/90 p-4">
          <div className="flex justify-between items-center mb-4 text-white">
            <h3 className="font-medium truncate px-2">{viewingFile.name}</h3>
            <button onClick={() => setViewingFile(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            {viewingFile.type.startsWith('image/') ? (
              <img src={viewingFile.url} alt={viewingFile.name} className="max-w-full max-h-full object-contain" />
            ) : viewingFile.type === 'application/pdf' ? (
               <iframe src={viewingFile.url} className="w-full h-full bg-white rounded-xl border-0" />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
