import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useAuth } from '../context/AuthContext';
import { useOTM } from '../context/OTMContext';
import { OTMRequest, Profile } from '../types';

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
    users, 
    createOTM, 
    assignOTM, 
    finishTechnicianWork, 
    submitConformity, 
    cancelOTM,
    areas,
    locations,
    specialties,
    opexBudget,
    capexBudget
  } = useOTM();

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
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const bestVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

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

  // Trigger text-to-speech for the last assistant message
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'assistant' && lastMsg.id !== 'welcome') {
        speakText(lastMsg.text);
      }
    }
  }, [messages, voiceEnabled]);

  // Cleanup speech synthesis and cooldown timer on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (geminiCooldownRef.current) {
        clearTimeout(geminiCooldownRef.current);
      }
    };
  }, []);

  // Text to Speech (with premium voice selection)
  const speakText = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // stop current speech
      
      // Clean markdown formatting so the voice doesn't read symbols
      let cleanText = text
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/#{1,6}\s?/g, '')
        .replace(/`{1,3}[^`]*`{1,3}/g, '') // remove code blocks
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // keep text inside markdown links
        .replace(/•/g, ',')
        .replace(/\n{2,}/g, '. ')
        .replace(/\n/g, ', ')
        .trim();

      // Limit length to avoid browser speech timeout
      if (cleanText.length > 800) {
        cleanText = cleanText.substring(0, 800) + '...';
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'es-PE';
      utterance.rate = 1.05; // Slightly faster for natural rhythm
      utterance.pitch = 1.0;

      // Use the best pre-selected voice
      if (bestVoiceRef.current) {
        utterance.voice = bestVoiceRef.current;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Speech synthesis error:', err);
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
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

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

  const getRolePrompt = (role: string) => {
    const isMaintMgmt = role === 'supervisor' || role === 'admin' || (role === 'jefatura' && user?.area_sector === '22. MANTENIMIENTO');

    // Calculate budget totals for Mantenimiento Management roles
    let budgetInfo = '';
    let personnelHoursInfo = '';
    
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
Top Centros de Costo (OPEX):
${topOpex}
- Si el usuario te pregunta sobre montos de presupuesto o saldos, responde usando estos datos reales y exactos.
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
    }

    if (role === 'requester' || (role === 'jefatura' && user?.area_sector !== '22. MANTENIMIENTO')) {
      // Prompt for requesters and jefaturas of other areas
      return `
Eres Megan, la Asistente de IA de Mantenimiento CRL. Tu objetivo es ayudar a los Solicitantes y Jefaturas de otras áreas a resolver dudas específicas sobre solicitudes de mantenimiento en el club. Debes responder bajo el nombre de Megan (no saludes ni repitas "Hola, soy Megan" en cada respuesta, solo responde la consulta directamente ya que el saludo inicial de bienvenida ya se dio).

REGLAS DE COMPORTAMIENTO ESTRICTAS:
1. SOLO debes responder preguntas relacionadas con:
   - Solicitudes de trabajo de mantenimiento (OTM), el flujo del proceso de solicitudes, o dudas sobre a qué especialidad (Electricidad, Gasfitería, Pintura, Carpintería, Albañilería, Equipos Electromecánicos, Aire Acondicionado) corresponde un problema.
   - Si un trabajo pertenece al área de Servicios Generales / Maestranza (limpieza profunda, traslado de muebles, basura, toldos, desinfección, jardinería). En este caso, debes indicarle textualmente: "Comprendo, pero los trabajos de limpieza o movimiento de mobiliario pertenecen al área de Servicios Generales (Maestranza). Por favor, comunícate directamente con ellos para que te asistan."
2. Si el usuario realiza preguntas de cultura general, chistes, preguntas técnicas complejas no relacionadas al club, o cualquier tema fuera de la solicitud de mantenimiento y sus especialidades, dile con cortesía: "Lo siento, como Megan, tu asistente de mantenimiento, solo puedo responder dudas sobre solicitudes de mantenimiento, asignación de especialidades, o redireccionamiento de trabajos a Servicios Generales/Maestranza."
3. ESTÁ ESTRICTAMENTE PROHIBIDO ejecutar acciones, crear órdenes, prellenar formularios o automatizar el envío de solicitudes. Los usuarios deben rellenar y enviar las solicitudes manualmente por sí mismos. No uses formatos de comando \`[ACCION: ...]\`.
4. Sé una asistente atenta, carismática y amigable en español latino.
5. Nunca uses emojis. Responde de forma muy concisa (máximo 3-4 oraciones).
6. Áreas del Club: ${JSON.stringify(areas)}
7. Ubicaciones: ${JSON.stringify(locations)}
8. Especialidades: ${JSON.stringify(specialties)}
`;
    } else {
      // Prompt for Supervisors/Admins
      return `
Eres Megan, la Asistente de IA de Mantenimiento CRL. Tu objetivo es dar soporte al personal de gestión de Mantenimiento (Supervisores, Administradores, Jefatura de Mantenimiento). Debes responder bajo el nombre de Megan (no saludes ni repitas "Hola, soy Megan" en cada respuesta, solo responde la consulta directamente ya que el saludo inicial de bienvenida ya se dio).

REGLAS DE COMPORTAMIENTO ESTRICTAS:
1. Tu rol es puramente INFORMATIVO y de CONSULTA.
2. NO debes realizar ninguna acción en el sistema: no puedes asignar OTMs, no puedes crear OTMs, no puedes finalizar trabajos. No uses formatos de comando \`[ACCION: ...]\`. Toda asignación o modificación debe hacerla el supervisor manualmente.
3. Responde a preguntas y consultas sobre el estado de las OTMs, los técnicos asignados, o estadísticas generales del sistema, basándote en la información provista.
4. Tienes acceso completo a la información presupuestaria actualizada (OPEX y CAPEX). Responde consultas financieras sobre saldos, montos asignados o ejecutados con total precisión.
5. Tienes acceso completo a las horas de trabajo del personal técnico. Si te preguntan sobre las horas acumuladas, horas de ejecución o tareas realizadas por técnico, responde con total precisión usando los datos reales.
6. Sé carismática, atenta y profesional. Nunca uses emojis. Responde de forma muy concisa.

Catálogos y Datos:
- Áreas: ${JSON.stringify(areas)}
- Ubicaciones: ${JSON.stringify(locations)}
- Especialidades: ${JSON.stringify(specialties)}
- Técnicos: ${JSON.stringify(users.filter(u => u.role === 'technician').map(u => ({ id: u.id, name: u.full_name })))}
${budgetInfo}
${personnelHoursInfo}
`;
    }
  };

  // ----------------------------------------------------
  // SIMULATION ENGINE (DEMO FALLBACK)
  // ----------------------------------------------------
  const runSimulation = async (userText: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1200));

    const cleanText = userText.toLowerCase().trim();
    const timestamp = new Date();
    const id = `msg-${Date.now()}`;

    // A. Role check: Solicitante (Requester) or Jefaturas de otras áreas
    const isMaintMgmt = user?.role === 'supervisor' || user?.role === 'admin' || (user?.role === 'jefatura' && user?.area_sector === '22. MANTENIMIENTO');

    if (!isMaintMgmt) {
      // 1. Check for Servicios Generales / Maestranza keywords
      if (cleanText.includes('limpieza') || cleanText.includes('basura') || cleanText.includes('toldo') || cleanText.includes('muebles') || cleanText.includes('traslado') || cleanText.includes('jardin') || cleanText.includes('desinfecc')) {
        setIsLoading(false);
        setMessages(prev => [...prev, {
          id,
          role: 'assistant',
          text: 'Comprendo, pero los trabajos de limpieza o movimiento de mobiliario pertenecen al área de Servicios Generales (Maestranza). Por favor, comunícate directamente con ellos para que te asistan.',
          timestamp
        }]);
        return;
      }

      // 2. Check for specialty doubts
      if (cleanText.includes('fuga') || cleanText.includes('agua') || cleanText.includes('tuber') || cleanText.includes('caño') || cleanText.includes('inodoro')) {
        setIsLoading(false);
        setMessages(prev => [...prev, {
          id,
          role: 'assistant',
          text: 'Eso corresponde a la especialidad de Gasfitería. Para registrar la solicitud, por favor dirígete a la sección "Nueva Solicitud" del menú lateral, rellena los campos y adjunta la fotografía obligatoria.',
          timestamp
        }]);
        return;
      }
      if (cleanText.includes('luz') || cleanText.includes('toma') || cleanText.includes('cable') || cleanText.includes('electric') || cleanText.includes('lampara') || cleanText.includes('luminaria') || cleanText.includes('enchufe')) {
        setIsLoading(false);
        setMessages(prev => [...prev, {
          id,
          role: 'assistant',
          text: 'Esa incidencia corresponde a la especialidad de Electricidad. Recuerda rellenar el formulario de "Nueva Solicitud" para reportarlo oficialmente.',
          timestamp
        }]);
        return;
      }
      if (cleanText.includes('pintar') || cleanText.includes('pared') || cleanText.includes('pintura')) {
        setIsLoading(false);
        setMessages(prev => [...prev, {
          id,
          role: 'assistant',
          text: 'Eso corresponde a la especialidad de Pintura. Por favor completa la solicitud manualmente para programar la atención.',
          timestamp
        }]);
        return;
      }
      if (cleanText.includes('puerta') || cleanText.includes('cerradura') || cleanText.includes('madera') || cleanText.includes('mueble roto') || cleanText.includes('carpinter')) {
        setIsLoading(false);
        setMessages(prev => [...prev, {
          id,
          role: 'assistant',
          text: 'Este requerimiento corresponde a la especialidad de Carpintería. Utiliza el formulario de "Nueva Solicitud" para reportarlo.',
          timestamp
        }]);
        return;
      }

      // 3. Fallback check for general/maintenance questions
      if (cleanText.includes('proceso') || cleanText.includes('como funciona') || cleanText.includes('ayuda') || cleanText.includes('solicitud') || cleanText.includes('crear') || cleanText.includes('otm')) {
        setIsLoading(false);
        setMessages(prev => [...prev, {
          id,
          role: 'assistant',
          text: 'El proceso es sencillo: debes ingresar al apartado "Nueva Solicitud", ingresar la ubicación general y específica, seleccionar la especialidad del trabajo, describir el problema y subir la fotografía obligatoria. Los técnicos se encargarán de ejecutarlo una vez el supervisor lo programe.',
          timestamp
        }]);
        return;
      }

      // 4. Deny out-of-scope questions
      setIsLoading(false);
      setMessages(prev => [...prev, {
        id,
        role: 'assistant',
        text: 'Lo siento, como Megan, tu asistente de mantenimiento, solo puedo responder dudas sobre solicitudes de mantenimiento, asignación de especialidades, o redireccionamiento de trabajos a Servicios Generales/Maestranza.',
        timestamp
      }]);
      return;
    } else {
      // B. Supervisor/Admin Flow
      // 1. Budget questions
      if (cleanText.includes('presupuesto') || cleanText.includes('monto') || cleanText.includes('opex') || cleanText.includes('capex') || cleanText.includes('disponible') || cleanText.includes('saldo')) {
        const totalOpex = opexBudget.reduce((acc, i) => acc + Math.abs(i.importeEEFF || 0), 0);
        const totalCapex = capexBudget.reduce((acc, i) => acc + (i.importe || 0), 0);

        setIsLoading(false);
        setMessages(prev => [...prev, {
          id,
          role: 'assistant',
          text: `¡Claro! El presupuesto OPEX total aprobado es de $${totalOpex.toLocaleString()} y para CAPEX el monto total es de $${totalCapex.toLocaleString()}.`,
          timestamp
        }]);
        return;
      }

      // 2. Personnel hours questions
      if (cleanText.includes('hora') || cleanText.includes('trabajo') || cleanText.includes('técnico') || cleanText.includes('tecnico') || cleanText.includes('personal') || cleanText.includes('tiempo')) {
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
          return `- ${tech.full_name} (${tech.position || 'Técnico'}): ${totalFinishedHours.toFixed(1)} horas (${finishedOtms.length} tareas completadas, ${activeOtms.length} en curso)`;
        });

        setIsLoading(false);
        setMessages(prev => [...prev, {
          id,
          role: 'assistant',
          text: `Las horas de trabajo registradas por técnico son:\n\n${techHoursList.join('\n')}\n\n¿Deseas consultar el detalle de algún técnico en particular?`,
          timestamp
        }]);
        return;
      }

      // 3. General OTM stats
      if (cleanText.includes('otm') || cleanText.includes('ordenes') || cleanText.includes('trabajos') || cleanText.includes('retras') || cleanText.includes('pendiente')) {
        const total = otms.length;
        const pending = otms.filter(o => o.status === 'pending').length;
        const scheduled = otms.filter(o => o.status === 'scheduled' || o.status === 'in_progress').length;
        const closed = otms.filter(o => o.status === 'closed').length;

        setIsLoading(false);
        setMessages(prev => [...prev, {
          id,
          role: 'assistant',
          text: `Actualmente en el sistema hay registradas ${total} OTMs en total: ${pending} se encuentran Pendientes por revisar, ${scheduled} están en Programadas/En Progreso de ejecución y ${closed} han sido Completadas/Cerradas de forma exitosa.`,
          timestamp
        }]);
        return;
      }

      // 4. Fallback for Supervisor
      setIsLoading(false);
      setMessages(prev => [...prev, {
        id,
        role: 'assistant',
        text: 'Hola, soy Megan, tu asistente virtual. Puedo brindarte información en tiempo real sobre el estado de las OTMs, el presupuesto OPEX/CAPEX y las horas de trabajo del personal técnico del club. ¿En qué consulta te puedo asistir hoy?',
        timestamp
      }]);
    }
  };

  // Helper to parse arguments from action tags
  const parseActionArgs = (argsStr: string) => {
    const args: any = {};
    const regex = /(\w+)\s*=\s*(?:'([^']*)'|"([^"]*)"|(\[.*?\])|([\w\-.]+))/g;
    let match;
    while ((match = regex.exec(argsStr)) !== null) {
      const key = match[1];
      let val: any = match[2] || match[3] || match[5];
      const arrayVal = match[4];
      
      if (arrayVal) {
        try {
          val = JSON.parse(arrayVal.replace(/'/g, '"'));
        } catch {
          val = [];
        }
      } else if (val === 'true') {
        val = true;
      } else if (val === 'false') {
        val = false;
      } else if (!isNaN(Number(val))) {
        val = Number(val);
      }
      args[key] = val;
    }
    return args;
  };

  // ----------------------------------------------------
  // GROQ CLOUD FALLBACK (LLAMA 3 FAST INFERENCE)
  // ----------------------------------------------------
  const runGroqAPI = async (userText: string): Promise<boolean> => {
    if (!groqKey) {
      console.log('No Groq key configured. Skipping fallback.');
      return false;
    }

    setIsLoading(true);
    const timestamp = new Date();
    const id = `msg-${Date.now()}`;
    
    const messagesHistory = messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.text
      }));

    const groqSystemPrompt = getRolePrompt(user?.role || '');

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: groqSystemPrompt },
            ...messagesHistory,
            { role: 'user', content: userText }
          ],
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error('Groq API Error: ' + response.statusText);
      }

      const data = await response.json();
      let responseText = data.choices[0].message?.content || '';
      console.log('Groq Response:', responseText);

      let cardType: any = undefined;
      let cardData: any = null;

      // Strip action tag if any was generated
      responseText = responseText.replace(/\[ACCION:[^\]]*\]/g, '').trim();

      setIsLoading(false);
      setMessages(prev => [...prev, {
        id,
        role: 'assistant',
        text: responseText,
        timestamp,
        cardType,
        cardData
      }]);
      setActiveModel('groq');
      return true;
    } catch (err) {
      console.error('Groq fetch error:', err);
      return false;
    }
  };

  // ----------------------------------------------------
  // GEMINI LIVE API INTEGRATION (WITH FUNCTION CALLING)
  // ----------------------------------------------------
  const runGeminiAPI = async (userText: string, retryCount = 0) => {
    setIsLoading(true);
    const timestamp = new Date();
    const id = `msg-${Date.now()}`;

    if (apiKeys.length === 0) {
      setIsLoading(false);
      setMessages(prev => [...prev, { id, role: 'assistant', text: 'No hay API Keys de Gemini configuradas.', timestamp, cardType: 'error' }]);
      return;
    }

    const currentKey = apiKeys[currentKeyIndex];

    // OTMs summary for context awareness
    const otmsSummary = otms.slice(0, 30).map(o => ({
      code: o.otm_code,
      status: o.status,
      desc: o.description?.substring(0, 60),
      location: o.location,
      area: o.area_sector
    }));

    const systemPrompt = getRolePrompt(user?.role || '');

    const contents = messages
      .filter(m => m.id !== 'welcome')
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
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction: systemPrompt
        }
      });

      const candidate = response.candidates?.[0];
      const modelParts = candidate?.content?.parts || [];
      
      // Gemini responded successfully — confirm active model and clear any cooldown
      setActiveModel('gemini');
      geminiBlockedUntilRef.current = 0;
      if (geminiCooldownRef.current) {
        clearTimeout(geminiCooldownRef.current);
        geminiCooldownRef.current = null;
      }

      let aiText = response.text || '';
      setIsLoading(false);
      setMessages(prev => [...prev, {
        id,
        role: 'assistant',
        text: aiText || 'Entendido, ¿deseas realizar otra consulta?',
        timestamp
      }]);
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
        // Reintenta automáticamente
        runGeminiAPI(userText, retryCount + 1);
        return;
      }

      // Si todas las llaves fallaron (por Rate Limit, Network Error, etc.), pasamos a Groq
      console.log('⚡ Todas las llaves de Gemini fallaron. Pasando a Groq Cloud (Llama 3)...');
      setActiveModel('groq');
      const groqSuccess = await runGroqAPI(userText);
      if (groqSuccess) return;

      // Si Groq TAMBIÉN falla, bloqueamos Gemini por 60s y mostramos error final
      geminiBlockedUntilRef.current = Date.now() + 60000; // block for 60s
      
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

      setMessages(prev => [...prev, {
        id,
        role: 'assistant',
        text: errorText,
        timestamp,
        cardType: 'error'
      }]);
    }
  };

  // ----------------------------------------------------
  // MESSAGE HANDLER
  // ----------------------------------------------------
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');

    if (useSimulated) {
      runSimulation(text);
    } else {
      // Check if Gemini is currently rate-limited (all keys blocked)
      const isGeminiBlocked = geminiBlockedUntilRef.current > Date.now();
      
      if (isGeminiBlocked) {
        console.log('⏳ Gemini still in cooldown. Routing to Groq Cloud...');
        setActiveModel('groq');
        const groqSuccess = await runGroqAPI(text);
        if (groqSuccess) return;
        
        setMessages(prev => [...prev, {
          id: `sys-${Date.now()}`,
          role: 'assistant',
          text: '⚠️ Las cuentas de Gemini siguen en periodo de enfriamiento y Groq no respondió. Por favor, espera.',
          timestamp: new Date(),
          cardType: 'error'
        }]);
        return;
      }
      
      setActiveModel('gemini');
      runGeminiAPI(text);
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
                {activeModel === 'gemini' ? `GEMINI ${apiKeys.length > 1 ? `(${currentKeyIndex + 1}/${apiKeys.length})` : ''}` : 'GROQ ⚡'}
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
                if ('speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }
                setIsSpeaking(false);
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
            onClick={() => setIsOpen(false)}
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
