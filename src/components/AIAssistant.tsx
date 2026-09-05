import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useAuth } from '../context/AuthContext';
import { useOTM } from '../context/OTMContext';
import { useRQ } from '../context/RQContext';
import { OTMRequest, Profile, Urgency, OTMStatus } from '../types';

export interface OTMActionDraft {
  type: 'create' | 'modify';
  targetOtmId?: string;
  targetOtmCode?: string;
  data: {
    area_sector?: string;
    exact_location?: string;
    failure_type?: string;
    description?: string;
    urgency?: Urgency;
    technician_ids?: string[];
    technician_names?: string[];
    scheduled_date?: string;
    status?: OTMStatus;
    supervisor_notes?: string;
    photo_url?: string;
    photo_name?: string;
  };
  missingFields: string[];
  isReadyToConfirm: boolean;
  candidateOtms?: OTMRequest[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: Date;
  cardType?: 'otm-created' | 'otm-assigned' | 'otm-finished' | 'error' | 'help';
  cardData?: any;
}

export default function AIAssistant() {
  const { user } = useAuth();
  const { 
    otms, 
    otis,
    users, 
    createOTM, 
    assignOTM, 
    finishTechnicianWork, 
    submitConformity, 
    cancelOTM,
    updateOTMFields,
    updateOTMStatus,
    areas,
    locations,
    specialties,
    opexBudget,
    capexBudget
  } = useOTM();
  const { rqs } = useRQ();

  if (!user || user.role === 'technician') return null;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const defaultApiKeys = (import.meta.env.VITE_GEMINI_API_KEY || '').split(',').map((k: string) => k.trim()).filter(Boolean);
  const [apiKeys, setApiKeys] = useState<string[]>(() => {
    const stored = localStorage.getItem('crl_gemini_api_keys');
    if (stored) {
      try { return JSON.parse(stored); } catch { return defaultApiKeys; }
    }
    // Migrate old single key if exists
    const oldKey = localStorage.getItem('crl_gemini_api_key');
    if (oldKey) return [oldKey];
    return defaultApiKeys;
  });
  
  const [useSimulated, setUseSimulated] = useState(() => {
    const stored = localStorage.getItem('crl_gemini_api_keys') || localStorage.getItem('crl_gemini_api_key');
    if (stored) return false;
    return apiKeys.length === 0;
  });

  const defaultGroqKey = import.meta.env.VITE_GROQ_API_KEY || '';
  const [groqKey, setGroqKey] = useState(() => localStorage.getItem('crl_groq_api_key') || defaultGroqKey);

  // Active Model Tracking (Gemini primary)
  const [activeModel, setActiveModel] = useState<'gemini' | 'groq'>('gemini');
  const [currentKeyIndex, setCurrentKeyIndex] = useState(0);
  const geminiCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geminiBlockedUntilRef = useRef<number>(0); // timestamp when Gemini becomes available again

  // Voice States
  const [voiceEnabled, setVoiceEnabled] = useState(() => localStorage.getItem('crl_ai_voice_enabled') === 'true');
  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem('crl_ai_selected_voice') || 'es-PE-CamilaNeural');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const bestVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [activeDraft, setActiveDraft] = useState<OTMActionDraft | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Load premium voice asynchronously (Microsoft Natural > Google > any Spanish)
  useEffect(() => {
    const loadBestVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;

      // Priority 1: Specific high-quality Latin American Female voices (Windows/Edge/Chrome/Mac/iOS/Android)
      const premiumFemale = voices.find(v => 
        /(femenino|female|mujer|chica|dalia|sabina|mia|monica|paulina|lucia|gloria|marisol|angelica|victoria|helena|laura|isabel)/i.test(v.name) && v.lang.startsWith('es')
      );
      if (premiumFemale) { bestVoiceRef.current = premiumFemale; return; }

      // Priority 2: Microsoft Natural Spanish voices (Edge) - fallback to any female or natural
      const msNatural = voices.find(v =>
        v.lang.startsWith('es') && v.name.includes('Natural') && v.name.includes('Microsoft') && /(female|mujer)/i.test(v.name)
      ) || voices.find(v =>
        v.lang.startsWith('es') && v.name.includes('Natural') && v.name.includes('Microsoft')
      );
      if (msNatural) { bestVoiceRef.current = msNatural; return; }

      // Priority 3: Google Spanish voices (Chrome)
      const googleVoice = voices.find(v =>
        v.lang.startsWith('es') && v.name.includes('Google')
      );
      if (googleVoice) { bestVoiceRef.current = googleVoice; return; }

      // Priority 4: Any remote/cloud Spanish voice
      const remoteEs = voices.find(v =>
        v.lang.startsWith('es') && !v.localService
      );
      if (remoteEs) { bestVoiceRef.current = remoteEs; return; }

      // Fallback: any Spanish voice
      const anyEs = voices.find(v => v.lang.startsWith('es'));
      if (anyEs) { bestVoiceRef.current = anyEs; }
    };

    if ('speechSynthesis' in window) {
      loadBestVoice();
      window.speechSynthesis.addEventListener('voiceschanged', loadBestVoice);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadBestVoice);
      };
    }
  }, []);

  // Load welcome message when chat is opened and empty, checking for 30 minutes inactivity first
  useEffect(() => {
    if (isOpen && user) {
      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        const lastActiveTime = new Date(lastMsg.timestamp).getTime();
        const now = Date.now();
        const inactivityLimit = 30 * 60 * 1000; // 30 minutes
        
        if (now - lastActiveTime > inactivityLimit) {
          // Clears history due to inactivity
          setMessages([]);
          return;
        }
      } else {
        const welcome = getWelcomeMessage(user);
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            text: welcome,
            timestamp: new Date()
          }
        ]);
      }
    }
  }, [isOpen, messages.length, user]);

  // Trigger text-to-speech only once after streaming/loading completes
  const prevLoadingRef = useRef(false);
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'assistant' && lastMsg.text && lastMsg.id !== 'welcome') {
        speakText(lastMsg.text);
      }
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading, messages, voiceEnabled]);

  // Stop any active audio playback or speech synthesis
  const stopSpeaking = () => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch (e) {}
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Cleanup speech and cooldown timer on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (geminiCooldownRef.current) {
        clearTimeout(geminiCooldownRef.current);
      }
    };
  }, []);

  // Text to Speech: Neural Edge-TTS (Camila/Dalia/etc.) with automatic Browser Speech fallback
  const speakText = async (text: string) => {
    if (!voiceEnabled) return;

    stopSpeaking();

    // Clean markdown formatting so the voice doesn't read symbols
    let cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s?/g, '')
      .replace(/`{1,3}[^`]*`{1,3}/g, '') // remove code blocks
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // keep text inside markdown links
      .replace(/•/g, ',')
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // remove emojis if any
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ', ')
      .trim();

    if (!cleanText) return;

    // If browser voice is explicitly chosen, use Web Speech API directly
    if (selectedVoice === 'browser') {
      speakWithBrowser(cleanText);
      return;
    }

    // Try Neural Edge-TTS via server endpoint (/api/tts)
    try {
      setIsSpeaking(true);
      const textToSpeak = cleanText.length > 700 ? cleanText.substring(0, 700) + '...' : cleanText;
      const audioUrl = `/api/tts?voice=${encodeURIComponent(selectedVoice)}&text=${encodeURIComponent(textToSpeak)}`;

      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => {
        setIsSpeaking(false);
        currentAudioRef.current = null;
      };
      audio.onerror = (e) => {
        console.warn('Neural TTS failed, falling back to browser speech:', e);
        currentAudioRef.current = null;
        speakWithBrowser(cleanText);
      };

      await audio.play();
    } catch (err) {
      console.warn('Audio playback error, falling back to browser speech:', err);
      speakWithBrowser(cleanText);
    }
  };

  // Fallback to local browser Web Speech API
  const speakWithBrowser = (cleanText: string) => {
    if (!('speechSynthesis' in window)) {
      setIsSpeaking(false);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText.substring(0, 600));
      utterance.lang = 'es-PE';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      if (bestVoiceRef.current) {
        utterance.voice = bestVoiceRef.current;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Browser speech error:', err);
      setIsSpeaking(false);
    }
  };

  // Speech to Text (Speech Recognition)
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('La entrada de voz no es compatible con este navegador. Por favor, utiliza Google Chrome o Microsoft Edge.');
      return;
    }

    // Stop speaking if active
    stopSpeaking();

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'es-PE'; // Spanish - Peru
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript && transcript.trim()) {
          handleSendMessage(transcript);
        }
      };

      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Welcome message based on user role
  const getWelcomeMessage = (currentUser: Profile) => {
    const name = currentUser.full_name.split(' ')[0];
    return `Hola ${name}, soy Megan, tu asistente virtual. ¿En qué puedo ayudarte?`;
  };

  // Quick Action pills
  const actionPills = useMemo(() => {
    if (!user) return [];
    switch (user.role) {
      case 'requester':
        return [
          { label: 'Reportar Falla 🛠️', prompt: 'Quiero registrar un problema de mantenimiento' },
          { label: '¿Cómo funciona? ❓', prompt: '¿Cuál es el proceso para que atiendan mi solicitud?' }
        ];
      case 'supervisor':
      case 'admin':
        return [
          { label: 'Asignar OTM 📅', prompt: 'Quiero programar y asignar una OTM a un técnico' },
          { label: 'Alertas de Riesgo ⚠️', prompt: '¿Qué requerimientos están retrasados o con compras pendientes (Con RQ)?' }
        ];
      case 'technician':
        return [
          { label: 'Finalizar OTM 🔧', prompt: 'Quiero registrar los datos de un trabajo terminado' },
          { label: 'Ver mis tareas 📋', prompt: '¿Qué actividades tengo asignadas hoy?' }
        ];
      default:
        return [];
    }
  }, [user]);

  // Update localStorage when settings change
  const handleSaveSettings = (keys: string[], simulate: boolean, gKey: string) => {
    const validKeys = keys.filter(k => k.trim());
    
    localStorage.setItem('crl_groq_api_key', gKey.trim());
    setGroqKey(gKey.trim());

    if (validKeys.length > 0) {
      localStorage.setItem('crl_gemini_api_keys', JSON.stringify(validKeys));
      setApiKeys(validKeys);
      setUseSimulated(false);
      setCurrentKeyIndex(0);
    } else {
      localStorage.removeItem('crl_gemini_api_keys');
      localStorage.removeItem('crl_gemini_api_key');
      const defaultKeys = (import.meta.env.VITE_GEMINI_API_KEY || '').split(',').map((k: string) => k.trim()).filter(Boolean);
      setApiKeys(defaultKeys);
      setUseSimulated(simulate);
    }
    setShowSettings(false);
  };

  // Helper to find technician by name
  const findTechnicianByName = (text: string): Profile | null => {
    const cleanText = text.toLowerCase();
    const technicians = users.filter(u => u.role === 'technician');
    for (const tech of technicians) {
      const nameParts = tech.full_name.toLowerCase().split(' ');
      if (cleanText.includes(tech.full_name.toLowerCase()) || 
          (nameParts[0] && nameParts[1] && cleanText.includes(nameParts[0]) && cleanText.includes(nameParts[1]))) {
        return tech;
      }
    }
    return null;
  };

  // Helper to extract OTM code from text
  const extractOtmCode = (text: string): string | null => {
    const match = text.match(/(OTM[A-Z0-9-]*\d{4})/i);
    return match ? match[1].toUpperCase() : null;
  };

  // Helper to extract and format relevant OTMs for prompt context
  const getRelevantOTMsText = (query: string): string => {
    const q = query.toLowerCase().trim();
    const otmCodeMatch = query.match(/(OTM[A-Z0-9-]*\d{3,4})/i);
    const codeSearched = otmCodeMatch ? otmCodeMatch[1].toUpperCase() : null;

    let selected: OTMRequest[] = [];

    if (codeSearched) {
      selected = otms.filter(o => o.otm_code.toUpperCase().includes(codeSearched));
    }

    if (selected.length === 0) {
      const stopwords = new Set(['de', 'la', 'el', 'en', 'y', 'a', 'los', 'del', 'las', 'por', 'un', 'una', 'con', 'para', 'que', 'esta', 'quien', 'como', 'cual']);
      const words = q.split(/\s+/).map(w => w.replace(/[^a-záéíóúüñ0-9]/gi, '')).filter(w => w.length > 2 && !stopwords.has(w));

      if (words.length > 0) {
        const scored = otms.map(o => {
          let score = 0;
          const desc = (o.description || '').toLowerCase();
          const code = (o.otm_code || '').toLowerCase();
          const loc = (o.location || '').toLowerCase();
          const spec = (o.failure_type || '').toLowerCase();
          const tech = (o.assigned_technicians?.map(t => t.technician?.full_name).join(' ') || '').toLowerCase();

          for (const w of words) {
            if (code.includes(w)) score += 10;
            if (desc.includes(w)) score += 5;
            if (loc.includes(w)) score += 3;
            if (spec.includes(w)) score += 3;
            if (tech.includes(w)) score += 4;
          }
          return { otm: o, score };
        }).filter(item => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 12)
          .map(item => item.otm);

        if (scored.length > 0) selected = scored;
      }
    }

    if (selected.length === 0) {
      selected = otms.slice(0, 10);
    }

    const statusLabels: Record<string, string> = {
      pending: 'Pendiente de Asignación',
      scheduled: 'Programada',
      in_progress: 'En Proceso (Ejecutándose)',
      rq: 'En Espera de Repuestos (RQ)',
      awaiting_supervisor: 'Esperando Aprobación de Supervisor',
      awaiting_conformity: 'Esperando Conformidad del Solicitante',
      closed: 'Completada / Cerrada',
      cancelled: 'Cancelada',
      derived: 'Derivada'
    };

    const lines = selected.map(o => {
      const techNames = o.assigned_technicians?.map(t => t.technician?.full_name).filter(Boolean).join(', ') 
        || users.find(u => u.id === o.technician_id)?.full_name 
        || (o.assignment_type === 'contractor' ? (o.contractor_name || 'Contratista') : 'Sin asignar');
      const sched = o.scheduled_date ? o.scheduled_date.slice(0, 10) : 'Sin fecha definida';
      return `- ${o.otm_code} [${statusLabels[o.status] || o.status}]: "${o.description}". Ubicación: ${o.location || o.area_sector}. Especialidad: ${o.failure_type || 'General'}. Técnico: ${techNames}. Fecha: ${sched}. Urgencia: ${o.urgency}.`;
    });

    const pendingCount = otms.filter(o => o.status === 'pending').length;
    const inProgCount = otms.filter(o => o.status === 'in_progress' || o.status === 'scheduled').length;
    const closedCount = otms.filter(o => o.status === 'closed').length;
    const rqCount = otms.filter(o => o.status === 'rq').length;

    return `
ESTADÍSTICAS GENERALES DE OTMS:
- Total en sistema: ${otms.length} (Pendientes: ${pendingCount}, En Proceso/Programadas: ${inProgCount}, Con RQ pendiente: ${rqCount}, Cerradas: ${closedCount})

DETALLE DE OTMs RELEVANTES PARA ESTA CONSULTA:
${lines.join('\n')}
- Si el usuario te pregunta por alguna de estas órdenes o problemas, responde con exactitud sobre su estado, técnico, fechas y lugar.
`;
  };

  const getRQInfoText = (): string => {
    if (!rqs || rqs.length === 0) return '';
    const inApproval = rqs.filter(r => r.status === 'in_approval').length;
    const inLogistics = rqs.filter(r => r.status === 'in_logistics').length;
    const attended = rqs.filter(r => r.status === 'attended').length;
    const rejected = rqs.filter(r => r.status === 'rejected').length;

    const sample = rqs.slice(0, 6).map(r => {
      const mats = r.materials?.map(m => `${m.name} (${m.quantity} ${m.unit})`).join(', ') || 'Materiales varios';
      return `- RQ #${r.rq_number || r.item_number} [OTM ${r.otm_code}, Estado: ${r.status}]: ${r.description}. Materiales: ${mats}. Solicitante/Sup: ${r.supervisor_name}.`;
    }).join('\n');

    return `
ESTADO DE REQUERIMIENTOS Y REPUESTOS (RQ LOG):
- Resumen global de compras/suministros: ${rqs.length} RQs en total (${inApproval} en Aprobación, ${inLogistics} en Proceso Logístico, ${attended} Atendidas/Entregadas, ${rejected} Rechazadas).
RQs destacadas:
${sample}
- Si el usuario te pregunta por compras, requerimientos, repuestos o materiales pendientes (RQ), responde con estos datos.
`;
  };

  const getOTIInfoText = (): string => {
    if (!otis || otis.length === 0) return '';
    const total = otis.length;
    const completed = otis.filter(o => o.status === 'completed').length;
    const inProgress = otis.filter(o => o.status === 'in_progress').length;
    const scheduled = otis.filter(o => o.status === 'scheduled').length;

    return `
PLAN DE MANTENIMIENTO PREVENTIVO INTERNO (OTIs):
- Total planes OTI: ${total} (${completed} completados, ${inProgress} en proceso, ${scheduled} programados).
`;
  };

  // Helper to process [ACCION_OTM: {...}] in AI responses
  const processActionIntent = (
    rawText: string,
    currentDraft: OTMActionDraft | null
  ): { cleanText: string; updatedDraft: OTMActionDraft | null | undefined; shouldExecuteConfirm: boolean } => {
    const match = rawText.match(/\[ACCION_OTM:\s*(\{[\s\S]*?\})\s*\]/i);
    if (!match) {
      return { cleanText: rawText, updatedDraft: undefined, shouldExecuteConfirm: false };
    }

    const cleanText = rawText.replace(/\[ACCION_OTM:[\s\S]*?\]/gi, '').trim();

    try {
      const action = JSON.parse(match[1]);

      if (action.type === 'cancel') {
        return { cleanText, updatedDraft: null, shouldExecuteConfirm: false };
      }

      if (action.type === 'confirm') {
        return { cleanText, updatedDraft: currentDraft, shouldExecuteConfirm: true };
      }

      if (action.type === 'create') {
        const existingData = currentDraft?.type === 'create' ? currentDraft.data : {};
        const incomingData = action.data || {};

        const mergedData = {
          ...existingData,
          ...incomingData,
          urgency: (incomingData.urgency || existingData.urgency || 'medium') as Urgency
        };

        const missing: string[] = [];
        if (!mergedData.area_sector) missing.push('Área / Sector');
        if (!mergedData.failure_type) missing.push('Especialidad');
        if (!mergedData.description) missing.push('Descripción del trabajo');

        return {
          cleanText,
          updatedDraft: {
            type: 'create',
            data: mergedData,
            missingFields: missing,
            isReadyToConfirm: missing.length === 0
          },
          shouldExecuteConfirm: false
        };
      }

      if (action.type === 'modify') {
        const q = (action.query || action.otm_code || '').toLowerCase().trim();
        let matchedOtm: OTMRequest | undefined;
        let candidates: OTMRequest[] = [];

        if (q) {
          const cleanCode = q.replace(/[^a-z0-9]/gi, '');
          matchedOtm = otms.find(o => o.otm_code.replace(/[^a-z0-9]/gi, '').toLowerCase() === cleanCode);

          if (!matchedOtm) {
            candidates = otms.filter(o => 
              o.otm_code.toLowerCase().includes(q) ||
              (o.description && o.description.toLowerCase().includes(q)) ||
              (o.area_sector && o.area_sector.toLowerCase().includes(q))
            ).slice(0, 5);

            if (candidates.length === 1) {
              matchedOtm = candidates[0];
              candidates = [];
            }
          }
        } else if (currentDraft?.targetOtmId) {
          matchedOtm = otms.find(o => o.id === currentDraft.targetOtmId);
        }

        if (matchedOtm) {
          let techIds = currentDraft?.data?.technician_ids || (matchedOtm.technician_id ? [matchedOtm.technician_id] : []);
          let techNames = currentDraft?.data?.technician_names || [];

          if (action.data?.technician_name) {
            const tName = action.data.technician_name.toLowerCase();
            const foundTech = users.find(u => u.role === 'technician' && u.full_name.toLowerCase().includes(tName));
            if (foundTech) {
              techIds = [foundTech.id];
              techNames = [foundTech.full_name];
            }
          }

          const mergedData = {
            area_sector: action.data?.area_sector || currentDraft?.data?.area_sector || matchedOtm.area_sector,
            exact_location: action.data?.exact_location || currentDraft?.data?.exact_location || matchedOtm.exact_location || undefined,
            failure_type: action.data?.failure_type || currentDraft?.data?.failure_type || matchedOtm.failure_type,
            description: action.data?.description || currentDraft?.data?.description || matchedOtm.description,
            urgency: (action.data?.urgency || currentDraft?.data?.urgency || matchedOtm.urgency) as Urgency,
            scheduled_date: action.data?.scheduled_date || currentDraft?.data?.scheduled_date || (matchedOtm.scheduled_date ? matchedOtm.scheduled_date.slice(0, 10) : undefined),
            status: (action.data?.status || currentDraft?.data?.status || matchedOtm.status) as OTMStatus,
            supervisor_notes: action.data?.supervisor_notes || currentDraft?.data?.supervisor_notes || matchedOtm.supervisor_notes || undefined,
            technician_ids: techIds,
            technician_names: techNames
          };

          return {
            cleanText,
            updatedDraft: {
              type: 'modify',
              targetOtmId: matchedOtm.id,
              targetOtmCode: matchedOtm.otm_code,
              data: mergedData,
              missingFields: [],
              isReadyToConfirm: true
            },
            shouldExecuteConfirm: false
          };
        } else if (candidates.length > 1) {
          return {
            cleanText,
            updatedDraft: {
              type: 'modify',
              candidateOtms: candidates,
              data: action.data || {},
              missingFields: ['Seleccionar orden a modificar'],
              isReadyToConfirm: false
            },
            shouldExecuteConfirm: false
          };
        }
      }

      if (action.type === 'search') {
        const q = (action.query || '').toLowerCase().trim();
        const candidates = otms.filter(o => 
          o.otm_code.toLowerCase().includes(q) ||
          (o.description && o.description.toLowerCase().includes(q)) ||
          (o.area_sector && o.area_sector.toLowerCase().includes(q))
        ).slice(0, 5);

        return {
          cleanText,
          updatedDraft: {
            type: 'modify',
            candidateOtms: candidates,
            data: {},
            missingFields: ['Seleccionar orden'],
            isReadyToConfirm: false
          },
          shouldExecuteConfirm: false
        };
      }
    } catch (err) {
      console.error('Error parsing ACCION_OTM JSON:', err);
    }

    return { cleanText, updatedDraft: undefined, shouldExecuteConfirm: false };
  };

  // Execute confirmed OTM action in real time
  const executeConfirmedAction = async (draftToExecute: OTMActionDraft | null) => {
    if (!draftToExecute) return;

    if (draftToExecute.type === 'create') {
      const { area_sector, exact_location, failure_type, description, urgency, photo_url, photo_name } = draftToExecute.data;
      if (!description || !area_sector || !failure_type) {
        alert('Faltan campos obligatorios para crear la OTM.');
        return;
      }

      try {
        const attachments = photo_url ? [{ file_url: photo_url, file_name: photo_name || 'adjunto-chat.jpg', phase: 'request' }] : [];
        const newOtm = await createOTM({
          area_sector,
          exact_location: exact_location || null,
          failure_type,
          description,
          urgency: urgency || 'medium',
          attachments: attachments as any
        });

        if (draftToExecute.data.technician_ids && draftToExecute.data.technician_ids.length > 0) {
          await assignOTM(
            newOtm.id, 
            draftToExecute.data.technician_ids, 
            draftToExecute.data.scheduled_date || new Date().toISOString().slice(0, 10),
            draftToExecute.data.supervisor_notes
          );
        }

        setMessages(prev => [...prev, {
          id: `sys-${Date.now()}`,
          role: 'assistant',
          text: `Orden ${newOtm.otm_code} creada exitosamente en tiempo real.`,
          timestamp: new Date(),
          cardType: 'otm-created',
          cardData: {
            code: newOtm.otm_code,
            description: newOtm.description,
            location: newOtm.exact_location || newOtm.area_sector,
            specialty: newOtm.failure_type
          }
        }]);

        speakText(`Listo, la orden de trabajo ${newOtm.otm_code} ha sido creada exitosamente.`);
        setActiveDraft(null);
      } catch (err) {
        console.error('Error creating OTM:', err);
        alert('Error al crear la orden de trabajo.');
      }
    } else if (draftToExecute.type === 'modify' && draftToExecute.targetOtmId) {
      try {
        const targetId = draftToExecute.targetOtmId;
        const otm = otms.find(o => o.id === targetId);
        if (!otm) return;

        const fieldsToUpdate: Partial<OTMRequest> = {};
        if (draftToExecute.data.description) fieldsToUpdate.description = draftToExecute.data.description;
        if (draftToExecute.data.area_sector) fieldsToUpdate.area_sector = draftToExecute.data.area_sector;
        if (draftToExecute.data.exact_location) fieldsToUpdate.exact_location = draftToExecute.data.exact_location;
        if (draftToExecute.data.failure_type) fieldsToUpdate.failure_type = draftToExecute.data.failure_type;
        if (draftToExecute.data.urgency) fieldsToUpdate.urgency = draftToExecute.data.urgency;
        if (draftToExecute.data.supervisor_notes) fieldsToUpdate.supervisor_notes = draftToExecute.data.supervisor_notes;

        if (Object.keys(fieldsToUpdate).length > 0) {
          updateOTMFields(targetId, fieldsToUpdate);
        }

        if (draftToExecute.data.status && draftToExecute.data.status !== otm.status) {
          updateOTMStatus(targetId, draftToExecute.data.status, draftToExecute.data.supervisor_notes || 'Actualizado por Megan');
        }

        if (draftToExecute.data.technician_ids && draftToExecute.data.technician_ids.length > 0) {
          const schedDate = draftToExecute.data.scheduled_date || (otm.scheduled_date ? otm.scheduled_date.slice(0, 10) : new Date().toISOString().slice(0, 10));
          await assignOTM(targetId, draftToExecute.data.technician_ids, schedDate, draftToExecute.data.supervisor_notes || undefined);
        } else if (draftToExecute.data.scheduled_date && draftToExecute.data.scheduled_date !== (otm.scheduled_date ? otm.scheduled_date.slice(0, 10) : null)) {
          updateOTMFields(targetId, { scheduled_date: draftToExecute.data.scheduled_date });
        }

        setMessages(prev => [...prev, {
          id: `sys-${Date.now()}`,
          role: 'assistant',
          text: `Orden ${draftToExecute.targetOtmCode || otm.otm_code} actualizada exitosamente en tiempo real.`,
          timestamp: new Date(),
          cardType: 'otm-assigned',
          cardData: {
            code: draftToExecute.targetOtmCode || otm.otm_code,
            techName: draftToExecute.data.technician_names?.join(', ') || 'Sin cambios de técnico',
            date: draftToExecute.data.scheduled_date || (otm.scheduled_date ? otm.scheduled_date.slice(0, 10) : 'Sin fecha'),
            notes: draftToExecute.data.supervisor_notes || 'Modificación realizada por Megan'
          }
        }]);

        speakText(`Listo, la orden ${draftToExecute.targetOtmCode || otm.otm_code} ha sido modificada.`);
        setActiveDraft(null);
      } catch (err) {
        console.error('Error modifying OTM:', err);
        alert('Error al modificar la orden de trabajo.');
      }
    }
  };

  const handleSelectCandidate = (candidate: OTMRequest) => {
    setActiveDraft(prev => ({
      type: 'modify',
      targetOtmId: candidate.id,
      targetOtmCode: candidate.otm_code,
      data: {
        ...(prev?.data || {}),
        area_sector: candidate.area_sector,
        failure_type: candidate.failure_type,
        description: candidate.description,
        urgency: candidate.urgency,
        scheduled_date: candidate.scheduled_date ? candidate.scheduled_date.slice(0, 10) : undefined,
        status: candidate.status
      },
      missingFields: [],
      isReadyToConfirm: true,
      candidateOtms: undefined
    }));
  };

  const handleAttachPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setActiveDraft(prev => prev ? {
        ...prev,
        data: {
          ...prev.data,
          photo_url: base64,
          photo_name: file.name
        }
      } : null);
    };
    reader.readAsDataURL(file);
  };

  const getRolePrompt = (role: string, userQuery = '') => {
    const isMaintMgmt = role === 'supervisor' || role === 'admin' || (role === 'jefatura' && user?.area_sector === '22. MANTENIMIENTO');

    // Calculate budget totals for Mantenimiento Management roles
    let budgetInfo = '';
    let personnelHoursInfo = '';
    let otmsInfo = '';
    let rqInfo = '';
    let otiInfo = '';
    
    if (isMaintMgmt) {
      const totalOpex = opexBudget.reduce((acc, i) => acc + Math.abs(i.importeEEFF || 0), 0);
      const totalCapex = capexBudget.reduce((acc, i) => acc + (i.importe || 0), 0);

      // Summarize by cost center (top 8)
      const opexByCentro = opexBudget.reduce((acc: any, i) => {
        const cc = i.cCosto || 'Otros';
        if (!acc[cc]) acc[cc] = { cc, pres: 0 };
        acc[cc].pres += Math.abs(i.importeEEFF || 0);
        return acc;
      }, {});
      const topOpex = Object.values(opexByCentro)
        .sort((a: any, b: any) => b.pres - a.pres)
        .slice(0, 8)
        .map((x: any) => `- CC ${x.cc}: Presupuesto $${x.pres.toLocaleString()}`)
        .join('\n');

      budgetInfo = `
CONOCIMIENTO DE PRESUPUESTO (INFORMACIÓN CRÍTICA ACTUALIZADA):
- Presupuesto OPEX Total Aprobado: $${totalOpex.toLocaleString()}
- Presupuesto CAPEX Total Aprobado: $${totalCapex.toLocaleString()}
Top Centros de Costo con mayor presupuesto OPEX:
${topOpex}
- Si el usuario te pregunta por presupuestos, montos disponibles, OPEX o CAPEX, responde con total precisión usando estos datos.
`;

      // Compile working hours for technicians
      const technicians = users.filter(u => u.role === 'technician');
      const techHoursList = technicians.map(tech => {
        const techOtms = otms.filter(o => 
          o.technician_id === tech.id || 
          (o.assigned_technicians && o.assigned_technicians.some(at => at.technician_id === tech.id))
        );
        const finishedOtms = techOtms.filter(o => ['closed', 'awaiting_supervisor', 'awaiting_conformity'].includes(o.status));
        const totalFinishedHours = finishedOtms.reduce((sum, o) => {
          let hrs = 0;
          if (o.net_execution_time !== null && o.net_execution_time !== undefined) {
            hrs = o.net_execution_time / 60;
          } else if (o.job_start_time && o.job_end_time) {
            const start = new Date(o.job_start_time).getTime();
            const end = new Date(o.job_end_time).getTime();
            hrs = Math.max(0, (end - start) / 3600000);
          }
          return sum + hrs;
        }, 0);
        const activeOtms = techOtms.filter(o => ['in_progress', 'scheduled'].includes(o.status));
        return {
          name: tech.full_name,
          specialty: tech.position || 'General',
          totalHours: Number(totalFinishedHours.toFixed(1)),
          finishedCount: finishedOtms.length,
          activeCount: activeOtms.length
        };
      });

      const formattedTechHours = techHoursList
        .map(t => `- ${t.name} (${t.specialty}): ${t.totalHours} horas acumuladas en ${t.finishedCount} tareas finalizadas (${t.activeCount} tareas activas/programadas)`)
        .join('\n');

      personnelHoursInfo = `
CONOCIMIENTO DE HORAS DE TRABAJO DEL PERSONAL TÉCNICO (INFORMACIÓN EN TIEMPO REAL):
${formattedTechHours}
- Si el usuario te pregunta sobre las horas de trabajo acumuladas, horas de ejecución, tareas realizadas o pendientes por técnico, responde usando esta información exacta y concisa.
`;

      otmsInfo = getRelevantOTMsText(userQuery);
      rqInfo = getRQInfoText();
      otiInfo = getOTIInfoText();
    }

    if (role === 'requester' || (role === 'jefatura' && user?.area_sector !== '22. MANTENIMIENTO')) {
      // Prompt for requesters and jefaturas of other areas
      const myOtms = otms.filter(o => o.requester_id === user?.id || (userQuery && o.otm_code.toUpperCase().includes(userQuery.toUpperCase())));
      const myOtmsText = myOtms.length > 0 
        ? `Tus Solicitudes Registradas en el Club:\n` + myOtms.slice(0, 8).map(o => `- ${o.otm_code} [Estado: ${o.status}]: "${o.description}". Especialidad: ${o.failure_type || 'General'}. Fecha: ${o.created_at.slice(0, 10)}.`).join('\n')
        : 'El usuario no tiene solicitudes activas registradas aún.';

      return `
Eres Megan, la Asistente de IA de Mantenimiento CRL. Tu objetivo es ayudar a los Solicitantes y Jefaturas de otras áreas a resolver dudas específicas sobre solicitudes de mantenimiento en el club. Debes responder bajo el nombre de Megan (no saludes ni repitas "Hola, soy Megan" en cada respuesta, solo responde la consulta directamente ya que el saludo inicial de bienvenida ya se dio).

REGLAS DE COMPORTAMIENTO ESTRICTAS:
1. SOLO debes responder preguntas relacionadas con:
   - Consultas sobre el estado de sus propias solicitudes registradas (puedes indicarle en qué estado se encuentra su orden basándote en la lista provista abajo).
   - Solicitudes de trabajo de mantenimiento (OTM), el flujo del proceso de solicitudes, o dudas sobre a qué especialidad (Electricidad, Gasfitería, Pintura, Carpintería, Albañilería, Equipos Electromecánicos, Aire Acondicionado) corresponde un problema.
   - Si un trabajo pertenece al área de Servicios Generales / Maestranza (limpieza profunda, traslado de muebles, basura, toldos, desinfección, jardinería). En este caso, debes indicarle textualmente: "Comprendo, pero los trabajos de limpieza o movimiento de mobiliario pertenecen al área de Servicios Generales (Maestranza). Por favor, comunícate directamente con ellos para que te asistan."
2. Si el usuario realiza preguntas de cultura general, chistes, preguntas técnicas complejas no relacionadas al club, o cualquier tema fuera de la solicitud de mantenimiento y sus especialidades, dile con cortesía: "Lo siento, como Megan, tu asistente de mantenimiento, solo puedo responder dudas sobre solicitudes de mantenimiento, asignación de especialidades, o redireccionamiento de trabajos a Servicios Generales/Maestranza."
3. ESTÁ ESTRICTAMENTE PROHIBIDO ejecutar acciones, crear órdenes, prellenar formularios o automatizar el envío de solicitudes. Los usuarios deben rellenar y enviar las solicitudes manualmente por sí mismos. No uses formatos de comando \`[ACCION: ...]\`.
4. Sé una asistente atenta, carismática y amigable en español latino.
5. Nunca uses emojis. Responde de forma muy concisa (máximo 3-4 oraciones).
6. Áreas del Club: ${JSON.stringify(areas)}
7. Ubicaciones: ${JSON.stringify(locations)}
8. Especialidades: ${JSON.stringify(specialties)}

${myOtmsText}
`;
    } else {
      // Prompt for Supervisors/Admins
      const activeDraftContext = activeDraft ? `
ESTADO ACTUAL DEL BORRADOR ACTIVO EN PANTALLA:
Tipo: ${activeDraft.type}
${activeDraft.targetOtmCode ? `OTM Objetivo: ${activeDraft.targetOtmCode}` : ''}
Datos acumulados: ${JSON.stringify(activeDraft.data)}
Campos faltantes: ${JSON.stringify(activeDraft.missingFields)}
Listo para confirmar: ${activeDraft.isReadyToConfirm ? 'SÍ' : 'NO'}
- Si el usuario te proporciona datos adicionales, incorpóralos manteniendo los datos previos y emite el bloque [ACCION_OTM: ...].
` : '';

      return `
Eres Megan, la Asistente de IA de Mantenimiento CRL para el personal de gestión (Supervisores y Administradores). Debes responder bajo el nombre de Megan (no repitas saludos ni "Hola, soy Megan", responde directamente).

CAPACIDADES INTERACTIVAS EN TIEMPO REAL:
Tienes habilitada la capacidad de CREAR, MODIFICAR y ASIGNAR órdenes de trabajo (OTMs) en tiempo real mediante un diálogo asistido y una Tarjeta Viva interactiva.

REGLAS DE ACCIÓN:
1. CREAR NUEVAS OTMs:
   - Si te piden crear o reportar una orden de trabajo (ej: "crea una OTM para reparar la fuga en el baño del gimnasio"):
   - Extrae los campos: area_sector (del catálogo de áreas), failure_type (especialidad del catálogo), description (problema), urgency ('baja'|'media'|'alta'|'critica'), exact_location (opcional).
   - Si falta algún campo obligatorio (área, especialidad o descripción), pídelo amablemente en tu texto.
   - SIEMPRE que haya intención de crear una orden, DEBES incluir al final de tu mensaje un bloque JSON:
     [ACCION_OTM: {"type": "create", "data": {"area_sector": "...", "failure_type": "...", "description": "...", "urgency": "alta|media|baja|critica", "exact_location": "..."}}]

2. MODIFICAR O REPROGRAMAR OTMs EXISTENTES:
   - Si te piden modificar, reprogramar, reasignar técnico o cambiar estado de una orden (ej: "modifica la OTM2901 y cámbiale la fecha al 20 de mayo con el técnico Carlos"):
   - Identifica el código de la OTM (ej: OTM2901) o términos de búsqueda.
   - Extrae los cambios: scheduled_date (formato YYYY-MM-DD), technician_name (nombre de técnico registrado), status ('pending'|'scheduled'|'in_progress'|'closed'|'cancelled'), urgency, supervisor_notes, description, etc.
   - Incluye al final de tu mensaje:
     [ACCION_OTM: {"type": "modify", "query": "OTM2901", "data": {"scheduled_date": "...", "technician_name": "...", "status": "...", "supervisor_notes": "..."}}]

3. BÚSQUEDA Y SELECCIÓN:
   - Si el usuario dice "modifica la orden de la cerradura" y no indica el código:
     [ACCION_OTM: {"type": "search", "query": "cerradura"}]

4. CONFIRMAR O CANCELAR:
   - Si el usuario dice "sí", "confirmo", "guarda", "procede" para el borrador en pantalla:
     [ACCION_OTM: {"type": "confirm"}]
   - Si el usuario dice "cancela", "descarta", "olvídalo":
     [ACCION_OTM: {"type": "cancel"}]

5. CONSULTAS INFORMATIVAS:
   - Si el usuario solo hace una consulta sobre presupuestos, horas trabajadas de técnicos, repuestos RQ o estado de una OTM sin pedir crear ni editar, responde de forma concisa y NO agregues ninguna etiqueta [ACCION_OTM: ...].

6. NUNCA uses emojis. Sé concisa, amable y profesional.

Catálogos y Datos:
- Áreas: ${JSON.stringify(areas)}
- Ubicaciones: ${JSON.stringify(locations)}
- Especialidades: ${JSON.stringify(specialties)}
- Técnicos: ${JSON.stringify(users.filter(u => u.role === 'technician').map(u => ({ id: u.id, name: u.full_name })))}
${activeDraftContext}
${otmsInfo}
${rqInfo}
${otiInfo}
${budgetInfo}
${personnelHoursInfo}
`;
    }
  };

  // ----------------------------------------------------
  // SIMULATION ENGINE (DEMO FALLBACK WITH STREAMING)
  // ----------------------------------------------------
  const runSimulation = async (userText: string, assistantMsgId: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 600));

    const cleanText = userText.toLowerCase().trim();
    let answerText = '';

    const isMaintMgmt = user?.role === 'supervisor' || user?.role === 'admin' || (user?.role === 'jefatura' && user?.area_sector === '22. MANTENIMIENTO');

    // 1. Direct OTM code match
    const codeMatch = userText.match(/(OTM[A-Z0-9-]*\d{3,4})/i);
    if (codeMatch) {
      const code = codeMatch[1].toUpperCase();
      const foundOtm = otms.find(o => o.otm_code.toUpperCase().includes(code));
      if (foundOtm) {
        const techNames = foundOtm.assigned_technicians?.map(t => t.technician?.full_name).filter(Boolean).join(', ') 
          || users.find(u => u.id === foundOtm.technician_id)?.full_name 
          || (foundOtm.assignment_type === 'contractor' ? (foundOtm.contractor_name || 'Contratista') : 'Sin asignar');
        const statusMap: Record<string, string> = {
          pending: 'Pendiente',
          scheduled: 'Programada',
          in_progress: 'En Proceso (Ejecutándose)',
          rq: 'En Espera de Repuestos (RQ)',
          awaiting_supervisor: 'Esperando Aprobación de Supervisor',
          awaiting_conformity: 'Esperando Conformidad',
          closed: 'Culminada / Cerrada',
          cancelled: 'Cancelada'
        };
        const sched = foundOtm.scheduled_date ? foundOtm.scheduled_date.slice(0, 10) : 'por definir';
        answerText = `La orden ${foundOtm.otm_code} sobre "${foundOtm.description}" en ${foundOtm.location || foundOtm.area_sector} se encuentra actualmente en estado "${statusMap[foundOtm.status] || foundOtm.status}". Está asignada al técnico ${techNames} con fecha programada ${sched}.`;
      }
    }

    if (!answerText) {
      if (!isMaintMgmt) {
        // Solicitante / Jefatura externa
        if (cleanText.includes('limpieza') || cleanText.includes('basura') || cleanText.includes('toldo') || cleanText.includes('muebles') || cleanText.includes('traslado') || cleanText.includes('jardin') || cleanText.includes('desinfecc')) {
          answerText = 'Comprendo, pero los trabajos de limpieza o movimiento de mobiliario pertenecen al área de Servicios Generales (Maestranza). Por favor, comunícate directamente con ellos para que te asistan.';
        } else if (cleanText.includes('fuga') || cleanText.includes('agua') || cleanText.includes('tuber') || cleanText.includes('caño') || cleanText.includes('inodoro')) {
          answerText = 'Eso corresponde a la especialidad de Gasfitería. Para registrar la solicitud, por favor dirígete a la sección "Nueva Solicitud" del menú lateral, completa los campos requeridos y adjunta la fotografía obligatoria.';
        } else if (cleanText.includes('luz') || cleanText.includes('toma') || cleanText.includes('cable') || cleanText.includes('electric') || cleanText.includes('lampara') || cleanText.includes('luminaria') || cleanText.includes('enchufe')) {
          answerText = 'Esa incidencia corresponde a la especialidad de Electricidad. Recuerda rellenar el formulario de "Nueva Solicitud" en el menú para reportarlo oficialmente.';
        } else if (cleanText.includes('pintar') || cleanText.includes('pared') || cleanText.includes('pintura')) {
          answerText = 'Eso corresponde a la especialidad de Pintura. Por favor completa la solicitud manualmente para programar la atención.';
        } else if (cleanText.includes('puerta') || cleanText.includes('cerradura') || cleanText.includes('madera') || cleanText.includes('carpinter')) {
          answerText = 'Este requerimiento corresponde a la especialidad de Carpintería. Utiliza el formulario de "Nueva Solicitud" para reportarlo.';
        } else if (cleanText.includes('proceso') || cleanText.includes('como funciona') || cleanText.includes('ayuda') || cleanText.includes('solicitud') || cleanText.includes('crear') || cleanText.includes('otm')) {
          answerText = 'El proceso es sencillo: debes ingresar al apartado "Nueva Solicitud", ingresar la ubicación general y específica, seleccionar la especialidad del trabajo, describir el problema y subir la fotografía obligatoria.';
        } else {
          answerText = 'Lo siento, como Megan, tu asistente de mantenimiento, solo puedo responder dudas sobre solicitudes de mantenimiento, asignación de especialidades, o redireccionamiento de trabajos a Servicios Generales/Maestranza.';
        }
      } else {
        // Supervisor / Admin
        if (cleanText.includes('confirmar') || cleanText.includes('guardar') || cleanText.includes('procede') || cleanText === 'si' || cleanText === 'sí') {
          answerText = '¡Entendido! Procedo a confirmar y guardar la operación en el sistema. [ACCION_OTM: {"type": "confirm"}]';
        } else if (cleanText.includes('cancelar') || cleanText.includes('descartar') || cleanText.includes('olvidalo')) {
          answerText = 'He cancelado el borrador actual. ¿En qué más puedo colaborarte? [ACCION_OTM: {"type": "cancel"}]';
        } else if (cleanText.includes('crear') || cleanText.includes('nueva') || cleanText.includes('reportar')) {
          const matchedArea = areas.find(a => cleanText.includes(a.toLowerCase())) || areas[0] || '01. SEDE PRINCIPAL';
          let matchedSpec = specialties.find(s => cleanText.includes(s.toLowerCase())) || '';
          if (!matchedSpec) {
            if (cleanText.includes('agua') || cleanText.includes('fuga') || cleanText.includes('tuber') || cleanText.includes('inodoro')) matchedSpec = 'Gasfitería';
            else if (cleanText.includes('luz') || cleanText.includes('cable') || cleanText.includes('electric') || cleanText.includes('luminaria')) matchedSpec = 'Electricidad';
            else if (cleanText.includes('puerta') || cleanText.includes('madera') || cleanText.includes('carpinter')) matchedSpec = 'Carpintería';
            else if (cleanText.includes('pint')) matchedSpec = 'Pintura';
            else matchedSpec = 'General';
          }
          let matchedUrg: Urgency = 'medium';
          if (cleanText.includes('alta') || cleanText.includes('urgente') || cleanText.includes('critica')) matchedUrg = 'high';
          else if (cleanText.includes('baja')) matchedUrg = 'low';

          const desc = userText.replace(/crear|nueva|solicitud|otm|por favor|reportar/gi, '').trim() || 'Trabajo de mantenimiento reportado';

          answerText = `He preparado el borrador para la nueva orden de trabajo con la descripción "${desc}". Revisa la tarjeta viva abajo y confirma para registrarla en el sistema en tiempo real. [ACCION_OTM: {"type": "create", "data": {"area_sector": "${matchedArea}", "failure_type": "${matchedSpec}", "description": "${desc}", "urgency": "${matchedUrg}"}}]`;
        } else if (cleanText.includes('modificar') || cleanText.includes('cambiar') || cleanText.includes('asignar') || cleanText.includes('reprogramar')) {
          const codeMatchInText = cleanText.match(/otm\s*(\d+)/i);
          const targetCode = codeMatchInText ? `OTM${codeMatchInText[1]}` : (otms[0]?.otm_code || 'OTM2901');
          const tech = users.find(u => u.role === 'technician' && cleanText.includes(u.full_name.toLowerCase().split(' ')[0]));
          const dateMatch = cleanText.match(/\d{4}-\d{2}-\d{2}/);

          const techPart = tech ? `"technician_name": "${tech.full_name}",` : '';
          const datePart = dateMatch ? `"scheduled_date": "${dateMatch[0]}",` : `"scheduled_date": "${new Date().toISOString().slice(0, 10)}",`;

          answerText = `He ubicado la orden ${targetCode} y actualizado los cambios en la tarjeta viva. ¿Deseas confirmar la actualización? [ACCION_OTM: {"type": "modify", "query": "${targetCode}", "data": {${techPart}${datePart}"supervisor_notes": "Modificado vía Megan"}}]`;
        } else if (cleanText.includes('rq') || cleanText.includes('repuesto') || cleanText.includes('compra') || cleanText.includes('material')) {
          const inApproval = rqs.filter(r => r.status === 'in_approval').length;
          const inLogistics = rqs.filter(r => r.status === 'in_logistics').length;
          const attended = rqs.filter(r => r.status === 'attended').length;
          const rejected = rqs.filter(r => r.status === 'rejected').length;
          answerText = `Actualmente hay ${rqs.length} requerimientos (RQ) registrados: ${inApproval} en Aprobación, ${inLogistics} en Proceso Logístico, ${attended} Atendidas y ${rejected} Rechazadas.`;
        } else if (cleanText.includes('preventiv') || cleanText.includes('oti')) {
          const total = otis.length;
          const completed = otis.filter(o => o.status === 'completed').length;
          const inProg = otis.filter(o => o.status === 'in_progress').length;
          answerText = `En el Plan Preventivo Interno (OTIs) tenemos ${total} planes registrados: ${completed} completados y ${inProg} en ejecución.`;
        } else if (cleanText.includes('presupuesto') || cleanText.includes('monto') || cleanText.includes('opex') || cleanText.includes('capex') || cleanText.includes('disponible') || cleanText.includes('saldo')) {
          const totalOpex = opexBudget.reduce((acc, i) => acc + Math.abs(i.importeEEFF || 0), 0);
          const totalCapex = capexBudget.reduce((acc, i) => acc + (i.importe || 0), 0);
          answerText = `El presupuesto OPEX total aprobado es de $${totalOpex.toLocaleString()} y para CAPEX el monto total es de $${totalCapex.toLocaleString()}. ¿Deseas consultar algún centro de costo específico?`;
        } else if (cleanText.includes('hora') || cleanText.includes('trabajo') || cleanText.includes('tecnico') || cleanText.includes('técnico') || cleanText.includes('personal')) {
          const technicians = users.filter(u => u.role === 'technician');
          const techHoursList = technicians.slice(0, 6).map(tech => {
            const techOtms = otms.filter(o => o.technician_id === tech.id || (o.assigned_technicians && o.assigned_technicians.some(at => at.technician_id === tech.id)));
            const finishedOtms = techOtms.filter(o => ['closed', 'awaiting_supervisor', 'awaiting_conformity'].includes(o.status));
            const totalFinishedHours = finishedOtms.reduce((sum, o) => {
              if (o.net_execution_time !== null && o.net_execution_time !== undefined) return sum + (o.net_execution_time / 60);
              return sum + 1.5;
            }, 0);
            return `• ${tech.full_name}: ${totalFinishedHours.toFixed(1)} hrs (${finishedOtms.length} tareas completadas)`;
          });
          answerText = `Las horas acumuladas de ejecución registradas por técnico son:\n\n${techHoursList.join('\n')}\n\n¿Deseas consultar el detalle de algún técnico en particular?`;
        } else {
          const total = otms.length;
          const pending = otms.filter(o => o.status === 'pending').length;
          const scheduled = otms.filter(o => o.status === 'scheduled' || o.status === 'in_progress').length;
          const closed = otms.filter(o => o.status === 'closed').length;
          answerText = `Actualmente en el sistema hay registradas ${total} OTMs en total: ${pending} se encuentran Pendientes por revisar, ${scheduled} están Programadas/En Progreso y ${closed} han sido Completadas. ¿Deseas consultar alguna orden específica o detalle de personal?`;
        }
      }
    }

    const { cleanText: cleanSimText, updatedDraft, shouldExecuteConfirm } = processActionIntent(answerText, activeDraft);
    const textToStream = cleanSimText;

    // Simulate word-by-word streaming effect
    const words = textToStream.split(' ');
    let current = '';
    for (let i = 0; i < words.length; i++) {
      current += (i === 0 ? '' : ' ') + words[i];
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, text: current } : m));
      if (words.length > 1 && i % 2 === 0) {
        await new Promise(r => setTimeout(r, 20));
      }
    }

    if (updatedDraft !== undefined) {
      setActiveDraft(updatedDraft);
    }
    if (shouldExecuteConfirm) {
      await executeConfirmedAction(updatedDraft || activeDraft);
    }

    setIsLoading(false);
  };

  // ----------------------------------------------------
  // GROQ CLOUD FALLBACK (LLAMA 3.3 70B FAST STREAMING)
  // ----------------------------------------------------
  const runGroqAPI = async (userText: string, assistantMsgId: string): Promise<boolean> => {
    if (!groqKey) {
      console.log('No Groq key configured. Skipping fallback.');
      return false;
    }

    setIsLoading(true);
    
    const messagesHistory = messages
      .filter(m => m.id !== 'welcome' && m.id !== assistantMsgId)
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.text
      }));

    const groqSystemPrompt = getRolePrompt(user?.role || '', userText);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: groqSystemPrompt },
            ...messagesHistory,
            { role: 'user', content: userText }
          ],
          temperature: 0.3,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error('Groq API Error: ' + response.statusText);
      }

      if (!response.body) {
        throw new Error('No response body from Groq stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const delta = json.choices?.[0]?.delta?.content || '';
              if (delta) {
                accumulatedText += delta;
                setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, text: accumulatedText } : m));
              }
            } catch (e) {
              // ignore partial chunk
            }
          }
        }
      }

      setIsLoading(false);
      setActiveModel('groq');

      const { cleanText: cleanGroqText, updatedDraft: groqDraft, shouldExecuteConfirm: groqConfirm } = processActionIntent(accumulatedText, activeDraft);
      if (cleanGroqText !== accumulatedText) {
        setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, text: cleanGroqText } : m));
      }
      if (groqDraft !== undefined) {
        setActiveDraft(groqDraft);
      }
      if (groqConfirm) {
        await executeConfirmedAction(groqDraft || activeDraft);
      }

      return true;
    } catch (err) {
      console.error('Groq fetch error:', err);
      return false;
    }
  };

  // ----------------------------------------------------
  // GEMINI LIVE API INTEGRATION (STREAMING WITH FALLBACK)
  // ----------------------------------------------------
  const runGeminiAPI = async (userText: string, assistantMsgId: string, retryCount = 0) => {
    setIsLoading(true);

    if (apiKeys.length === 0) {
      setIsLoading(false);
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? {
        ...m,
        text: 'No hay API Keys de Gemini configuradas.',
        cardType: 'error'
      } : m));
      return;
    }

    const currentKey = apiKeys[currentKeyIndex];
    const systemPrompt = getRolePrompt(user?.role || '', userText);

    const contents = messages
      .filter(m => m.id !== 'welcome' && m.id !== assistantMsgId)
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }]
      }));

    contents.push({
      role: 'user',
      parts: [{ text: userText }]
    });

    try {
      const ai = new GoogleGenAI({ apiKey: currentKey });
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction: systemPrompt
        }
      });

      setActiveModel('gemini');
      geminiBlockedUntilRef.current = 0;
      if (geminiCooldownRef.current) {
        clearTimeout(geminiCooldownRef.current);
        geminiCooldownRef.current = null;
      }

      let accumulatedText = '';
      for await (const chunk of responseStream) {
        const textChunk = chunk.text || '';
        if (textChunk) {
          accumulatedText += textChunk;
          setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, text: accumulatedText } : m));
        }
      }

      if (!accumulatedText) {
        accumulatedText = 'Entendido, ¿deseas realizar otra consulta?';
        setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, text: accumulatedText } : m));
      }

      setIsLoading(false);

      const { cleanText: cleanGemText, updatedDraft: gemDraft, shouldExecuteConfirm: gemConfirm } = processActionIntent(accumulatedText, activeDraft);
      if (cleanGemText !== accumulatedText) {
        setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, text: cleanGemText } : m));
      }
      if (gemDraft !== undefined) {
        setActiveDraft(gemDraft);
      }
      if (gemConfirm) {
        await executeConfirmedAction(gemDraft || activeDraft);
      }
    } catch (err: any) {
      console.error('Gemini SDK Error:', err);
      
      const errMsg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      const isAuthError = errMsg.includes('401') || 
                          errMsg.toLowerCase().includes('unauthenticated') || 
                          errMsg.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') ||
                          errMsg.includes('API_KEY_SERVICE_BLOCKED');

      // Si no hemos agotado las llaves, intentamos con la siguiente
      if (retryCount < apiKeys.length - 1) {
        const nextIndex = (currentKeyIndex + 1) % apiKeys.length;
        console.log(`⚡ Gemini Key ${currentKeyIndex + 1} falló. Rotando a la llave ${nextIndex + 1}...`);
        setCurrentKeyIndex(nextIndex);
        runGeminiAPI(userText, assistantMsgId, retryCount + 1);
        return;
      }

      // Si todas las llaves fallaron, pasamos a Groq Cloud con streaming
      console.log('⚡ Todas las llaves de Gemini fallaron. Pasando a Groq Cloud (Llama 3.3 70B)...');
      setActiveModel('groq');
      const groqSuccess = await runGroqAPI(userText, assistantMsgId);
      if (groqSuccess) return;

      geminiBlockedUntilRef.current = Date.now() + 60000;
      if (geminiCooldownRef.current) clearTimeout(geminiCooldownRef.current);
      geminiCooldownRef.current = setTimeout(() => {
        console.log('🔄 Gemini cooldown expired. Rehabilitando llaves.');
        setCurrentKeyIndex(0);
        geminiBlockedUntilRef.current = 0;
      }, 60000);

      setIsLoading(false);
      let errorText = 'Lo siento, no pude conectar con el servidor de IA (ni Gemini ni Groq respondieron). Asegúrate de que tu conexión sea estable y tus API Keys sean correctas.';
      if (isAuthError) {
        errorText = `Parece que hay un inconveniente de autenticación con la API Key actual (Llave ${currentKeyIndex + 1}). Verifica que la clave sea válida en Google AI Studio.`;
      }
      errorText += '\n\n*¿Deseas activar el **Modo Simulado** (en el botón de configuración de arriba) para probar el flujo sin usar la API?*';

      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, text: errorText, cardType: 'error' } : m));
    }
  };

  // ----------------------------------------------------
  // MESSAGE HANDLER
  // ----------------------------------------------------
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text || isLoading) return;

    // Immediately stop speech playback when user sends a new message
    stopSpeaking();

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date()
    };

    const assistantMsgId = `asst-${Date.now()}`;
    const assistantPlaceholder: Message = {
      id: assistantMsgId,
      role: 'assistant',
      text: '',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg, assistantPlaceholder]);
    setInputVal('');

    if (useSimulated) {
      runSimulation(text, assistantMsgId);
    } else {
      const isGeminiBlocked = geminiBlockedUntilRef.current > Date.now();
      
      if (isGeminiBlocked) {
        console.log('⏳ Gemini still in cooldown. Routing to Groq Cloud (Llama 3.3 70B)...');
        setActiveModel('groq');
        const groqSuccess = await runGroqAPI(text, assistantMsgId);
        if (groqSuccess) return;
        
        setMessages(prev => prev.map(m => m.id === assistantMsgId ? {
          ...m,
          text: '⚠️ Las cuentas de Gemini siguen en periodo de enfriamiento y Groq no respondió. Por favor, espera.',
          cardType: 'error'
        } : m));
        setIsLoading(false);
        return;
      }
      
      setActiveModel('gemini');
      runGeminiAPI(text, assistantMsgId);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4), 0 0 0 2px rgba(255, 255, 255, 0.1)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          color: 'white',
          fontSize: '1.75rem'
        }}
        onMouseOver={e => {
          e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 24px rgba(37, 99, 235, 0.5), 0 0 0 4px rgba(37, 99, 235, 0.2)';
        }}
        onMouseOut={e => {
          e.currentTarget.style.transform = 'scale(1) translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(37, 99, 235, 0.4), 0 0 0 2px rgba(255, 255, 255, 0.1)';
        }}
        title="Megan - Asistente de IA CRL"
      >
        💬
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      width: '100%',
      maxWidth: 400,
      height: 580,
      borderRadius: 24,
      background: 'rgba(15, 23, 42, 0.92)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 9999,
      overflow: 'hidden',
      color: '#f8fafc',
      fontFamily: '"Inter", sans-serif'
    }} className="fade-in">
      
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(30, 41, 59, 0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4285f4 0%, #1a73e8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            boxShadow: '0 0 10px rgba(66, 133, 244, 0.4)',
            transition: 'all 0.4s ease'
          }}>
            ✨
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              Megan
              <span style={{
                fontSize: '0.6rem',
                fontWeight: 600,
                padding: '2px 7px',
                borderRadius: 8,
                background: activeModel === 'gemini' 
                  ? 'linear-gradient(135deg, #4285f4, #34a853, #fbbc04, #ea4335)'
                  : 'linear-gradient(135deg, #f97316, #ea580c)',
                color: '#fff',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                lineHeight: 1,
                animation: 'pulse 2s ease-in-out infinite',
                transition: 'all 0.4s ease'
              }}>
                {activeModel === 'gemini' ? `GEMINI ${apiKeys.length > 1 ? `(${currentKeyIndex + 1}/${apiKeys.length})` : ''}` : 'GROQ 70B ⚡'}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Mantenimiento CRL • {user?.role === 'admin' ? 'Admin' : user?.role === 'supervisor' ? 'Supervisor' : 'Solicitante'}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Speaker Toggle Button (TTS) */}
          <button 
            onClick={() => {
              const nextVal = !voiceEnabled;
              setVoiceEnabled(nextVal);
              localStorage.setItem('crl_ai_voice_enabled', String(nextVal));
              if (!nextVal) {
                stopSpeaking();
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: voiceEnabled ? '#3b82f6' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '1.2rem',
              padding: 4,
              borderRadius: 6,
              transition: 'background 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={voiceEnabled ? "Desactivar voz de la IA" : "Activar voz de la IA"}
          >
            {voiceEnabled ? (isSpeaking ? '🔊' : '🔈') : '🔇'}
          </button>

          {user?.role === 'admin' && (
            <button 
              onClick={() => setShowSettings(!showSettings)}
              style={{
                background: 'none',
                border: 'none',
                color: showSettings ? '#3b82f6' : '#94a3b8',
                cursor: 'pointer',
                fontSize: '1.2rem',
                padding: 4,
                borderRadius: 6,
                transition: 'background 0.2s'
              }}
              title="Configuración de IA"
            >
              ⚙️
            </button>
          )}
          <button 
            onClick={() => {
              stopSpeaking();
              setIsOpen(false);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '1.2rem',
              padding: 4,
              borderRadius: 6
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && user?.role === 'admin' && (
        <div style={{
          padding: '16px 20px',
          background: 'rgba(30, 41, 59, 0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            ⚙️ Configuración de Megan (IA)
          </h3>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', cursor: 'pointer', marginBottom: 8 }}>
              <input 
                type="checkbox" 
                checked={useSimulated}
                onChange={e => setUseSimulated(e.target.checked)}
              />
              Usar modo Simulado (Sin API Key / Demo local)
            </label>
            {!useSimulated && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  Ingresa tus Gemini API Keys (una por línea). El sistema rotará automáticamente si una llega al límite.
                </div>
                <textarea 
                  placeholder={"AIzaSy...\nAIzaSy...\nAIzaSy..."}
                  value={apiKeys.join('\n')}
                  onChange={e => setApiKeys(e.target.value.split('\n'))}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: 'white',
                    fontSize: '0.8rem',
                    boxSizing: 'border-box',
                    minHeight: '80px',
                    fontFamily: 'monospace'
                  }}
                />
                <div style={{ fontSize: '0.65rem', color: '#3b82f6' }}>
                  Puedes obtener una clave gratuita en <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>Google AI Studio</a>.
                </div>
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, marginTop: 4 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                Respaldo con Groq Cloud (Llama 3 Ultra rápido). Solo se usará si todas las llaves de Gemini están agotadas.
              </div>
              <input 
                type="password" 
                placeholder="gsk_..."
                value={groqKey}
                onChange={e => setGroqKey(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: 'white',
                  fontSize: '0.8rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, marginTop: 4 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                🎙️ Voz Neuronal de Megan (Voz Realista IA)
                <span style={{ fontSize: '0.62rem', background: '#059669', color: 'white', padding: '1px 6px', borderRadius: 4 }}>GRATIS</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                Voz natural ultra realista para cualquier navegador y celular (Chrome, Edge, Safari, Android).
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select 
                  value={selectedVoice}
                  onChange={e => {
                    const v = e.target.value;
                    setSelectedVoice(v);
                    localStorage.setItem('crl_ai_selected_voice', v);
                  }}
                  style={{
                    flex: 1,
                    background: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: 'white',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value="es-PE-CamilaNeural">🇵🇪 Camila Neural (Perú - Femenina) [Recomendada]</option>
                  <option value="es-MX-DaliaNeural">🇲🇽 Dalia Neural (México - Femenina)</option>
                  <option value="es-CO-SalomeNeural">🇨🇴 Salomé Neural (Colombia - Femenina)</option>
                  <option value="es-ES-ElviraNeural">🇪🇸 Elvira Neural (España - Femenina)</option>
                  <option value="es-PE-AlexNeural">🇵🇪 Alex Neural (Perú - Masculina)</option>
                  <option value="browser">🌐 Voz local del navegador (Estándar)</option>
                </select>
                <button
                  type="button"
                  onClick={() => speakText("Hola, soy Megan. Esta es mi nueva voz natural.")}
                  style={{
                    background: '#334155',
                    color: '#f8fafc',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                  title="Escuchar muestra de voz"
                >
                  ▶ Probar
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button 
              onClick={() => handleSaveSettings(useSimulated ? [] : apiKeys, useSimulated, groqKey)}
              style={{
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Guardar y Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }} className="hide-scrollbar">
        {messages.map(msg => (
          <div key={msg.id} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            gap: 6
          }}>
            {/* Balloon */}
            <div style={{
              maxWidth: '85%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.role === 'user' ? '#2563eb' : 'rgba(255,255,255,0.04)',
              border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.06)',
              fontSize: '0.85rem',
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
              color: '#f1f5f9'
            }}>
              {msg.text}
            </div>

            {/* Special Action Cards */}
            {msg.cardType && (
              <div style={{
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
                padding: 14,
                width: '85%',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                fontSize: '0.78rem',
                borderLeft: msg.cardType === 'error' ? '4px solid #ef4444' : '4px solid #10b981'
              }}>
                {msg.cardType === 'otm-created' && (
                  <>
                    <div style={{ fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>✅</span> OTM Registrada Exitosamente
                    </div>
                    <div style={{ color: '#cbd5e1' }}>
                      <strong>Código:</strong> <span style={{ color: '#60a5fa', fontWeight: 700 }}>{msg.cardData.code}</span><br />
                      <strong>Falla:</strong> {msg.cardData.description}<br />
                      <strong>Área/Ubicación:</strong> {msg.cardData.location}<br />
                      <strong>Especialidad:</strong> {msg.cardData.specialty}
                    </div>
                  </>
                )}

                {msg.cardType === 'otm-assigned' && (
                  <>
                    <div style={{ fontWeight: 700, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>📅</span> OTM Programada y Asignada
                    </div>
                    <div style={{ color: '#cbd5e1' }}>
                      <strong>Código:</strong> <span style={{ color: '#60a5fa', fontWeight: 700 }}>{msg.cardData.code}</span><br />
                      <strong>Técnico:</strong> {msg.cardData.techName}<br />
                      <strong>Fecha Programada:</strong> {msg.cardData.date}<br />
                      <strong>Nota:</strong> {msg.cardData.notes}
                    </div>
                  </>
                )}

                {msg.cardType === 'otm-finished' && (
                  <>
                    <div style={{ fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>🔧</span> Orden Finalizada
                    </div>
                    <div style={{ color: '#cbd5e1' }}>
                      <strong>OTM:</strong> <span style={{ color: '#60a5fa', fontWeight: 700 }}>{msg.cardData.code}</span><br />
                      <strong>Informe de Cierre:</strong> {msg.cardData.notes}
                    </div>
                  </>
                )}

                {msg.cardType === 'error' && (
                  <div style={{ color: '#fca5a5' }}>
                    <strong>Error:</strong> No se pudo completar la acción. Por favor revisa los datos provistos.
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem'
            }}>
              🤖
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              padding: '10px 14px',
              borderRadius: '14px 14px 14px 4px',
              display: 'flex',
              gap: 4
            }}>
              <span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', display: 'inline-block', animation: 'jumping-dots 1.2s infinite ease-in-out' }} />
              <span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', display: 'inline-block', animation: 'jumping-dots 1.2s infinite ease-in-out', animationDelay: '0.2s' }} />
              <span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', display: 'inline-block', animation: 'jumping-dots 1.2s infinite ease-in-out', animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Hidden File Input for attaching photo to OTM Draft */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        style={{ display: 'none' }} 
        onChange={handleAttachPhoto} 
      />

      {/* Candidate OTMs Picker (Disambiguation) */}
      {activeDraft?.candidateOtms && activeDraft.candidateOtms.length > 0 && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderTop: '1px solid rgba(59, 130, 246, 0.3)',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            🔍 Encontré varias órdenes relacionadas. Selecciona cuál deseas modificar:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }} className="hide-scrollbar">
            {activeDraft.candidateOtms.map(cand => (
              <div 
                key={cand.id}
                onClick={() => handleSelectCandidate(cand)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#38bdf8'}
                onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
              >
                <div>
                  <span style={{ fontWeight: 700, color: '#60a5fa', fontSize: '0.8rem' }}>{cand.otm_code}</span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: 8 }}>{cand.area_sector}</span>
                  <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: 2 }}>{cand.description?.slice(0, 60)}...</div>
                </div>
                <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: 6, background: '#1e3a8a', color: '#93c5fd', fontWeight: 600 }}>
                  Elegir ➔
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Interactive Action Card (Draft Preview & Real-Time Confirmation) */}
      {activeDraft && (!activeDraft.candidateOtms || activeDraft.candidateOtms.length === 0) && (
        <div style={{
          padding: '12px 16px',
          background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))',
          borderTop: '2px solid #3b82f6',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: 6,
                background: activeDraft.type === 'create' ? '#059669' : '#d97706',
                color: 'white'
              }}>
                {activeDraft.type === 'create' ? 'Nueva OTM (Borrador)' : `Modificando ${activeDraft.targetOtmCode || 'OTM'}`}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f8fafc' }}>
                Tarjeta Viva en Tiempo Real
              </span>
            </div>
            <button
              onClick={() => setActiveDraft(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '0.9rem',
                padding: 2
              }}
              title="Descartar borrador"
            >
              ✕
            </button>
          </div>

          {/* Fields Preview */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 6,
            fontSize: '0.72rem'
          }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.65rem' }}>Área / Sector:</span>
              <strong style={{ color: activeDraft.data.area_sector ? '#38bdf8' : '#f59e0b' }}>
                {activeDraft.data.area_sector || '⚠️ Falta indicar'}
              </strong>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.65rem' }}>Especialidad:</span>
              <strong style={{ color: activeDraft.data.failure_type ? '#a78bfa' : '#f59e0b' }}>
                {activeDraft.data.failure_type || '⚠️ Falta indicar'}
              </strong>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.65rem' }}>Urgencia:</span>
              <strong style={{
                color: activeDraft.data.urgency === 'high' ? '#ef4444' : activeDraft.data.urgency === 'medium' ? '#f59e0b' : '#10b981',
                textTransform: 'capitalize'
              }}>
                {activeDraft.data.urgency === 'high' ? 'Alta' : activeDraft.data.urgency === 'low' ? 'Baja' : 'Media'}
              </strong>
            </div>

            {activeDraft.data.technician_names && activeDraft.data.technician_names.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.65rem' }}>Técnico:</span>
                <strong style={{ color: '#34d399' }}>{activeDraft.data.technician_names.join(', ')}</strong>
              </div>
            )}

            {activeDraft.data.scheduled_date && (
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.65rem' }}>Fecha Prog.:</span>
                <strong style={{ color: '#60a5fa' }}>{activeDraft.data.scheduled_date}</strong>
              </div>
            )}
          </div>

          {/* Description snippet */}
          {activeDraft.data.description && (
            <div style={{ fontSize: '0.72rem', color: '#cbd5e1', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: 6, borderLeft: '3px solid #3b82f6' }}>
              <strong>Problema:</strong> {activeDraft.data.description}
            </div>
          )}

          {/* Optional Photo & Missing warning */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <div>
              {activeDraft.data.photo_url ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <img 
                    src={activeDraft.data.photo_url} 
                    alt="Adjunto" 
                    style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', border: '1px solid #3b82f6' }} 
                  />
                  <span style={{ fontSize: '0.68rem', color: '#38bdf8' }}>📷 Foto adjuntada</span>
                  <button
                    onClick={() => setActiveDraft(prev => prev ? { ...prev, data: { ...prev.data, photo_url: undefined, photo_name: undefined } } : null)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.7rem' }}
                    title="Quitar foto"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    color: '#94a3b8',
                    border: '1px dashed rgba(255,255,255,0.2)',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontSize: '0.68rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  📷 Adjuntar foto (Opcional)
                </button>
              )}
            </div>

            {activeDraft.missingFields.length > 0 && (
              <div style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 600 }}>
                ⚠️ Falta: {activeDraft.missingFields.join(', ')}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
            <button
              onClick={() => setActiveDraft(null)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: '#94a3b8',
                border: 'none',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: '0.72rem',
                cursor: 'pointer'
              }}
            >
              Descartar
            </button>
            <button
              onClick={() => executeConfirmedAction(activeDraft)}
              disabled={!activeDraft.isReadyToConfirm}
              style={{
                background: activeDraft.isReadyToConfirm ? '#2563eb' : '#334155',
                color: activeDraft.isReadyToConfirm ? 'white' : '#64748b',
                border: 'none',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: activeDraft.isReadyToConfirm ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              ✅ {activeDraft.type === 'create' ? 'Confirmar y Crear OTM' : 'Confirmar Cambios'}
            </button>
          </div>
        </div>
      )}

      {/* Quick Pills */}
      {messages.length > 0 && (
        <div style={{
          padding: '8px 16px',
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          background: 'rgba(15, 23, 42, 0.4)'
        }} className="hide-scrollbar">
          {actionPills.map((pill, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(pill.prompt)}
              style={{
                background: 'rgba(59, 130, 246, 0.12)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 20,
                padding: '6px 12px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.12)';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)';
              }}
            >
              {pill.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        gap: 10,
        background: 'rgba(30, 41, 59, 0.4)'
      }}>
        <textarea
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Escribe un mensaje..."
          disabled={isLoading}
          style={{
            flex: 1,
            height: 40,
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '10px 14px',
            color: 'white',
            fontSize: '0.85rem',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box'
          }}
        />

        {/* Microphone Button (Speech to Text) */}
        <button
          onClick={isListening ? stopListening : startListening}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: isListening ? '#ef4444' : 'rgba(255,255,255,0.05)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.15rem',
            boxShadow: isListening ? '0 0 12px #ef4444' : 'none',
            transition: 'all 0.2s'
          }}
          title={isListening ? "Detener grabación (Escuchando...)" : "Hablar con la IA (Entrada de voz)"}
        >
          {isListening ? '🛑' : '🎤'}
        </button>

        <button
          onClick={() => handleSendMessage()}
          disabled={isLoading || !inputVal.trim()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: inputVal.trim() ? '#2563eb' : 'rgba(255,255,255,0.05)',
            color: 'white',
            border: 'none',
            cursor: inputVal.trim() && !isLoading ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            transition: 'background 0.2s'
          }}
        >
          ➔
        </button>
      </div>

      <style>{`
        @keyframes jumping-dots {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
