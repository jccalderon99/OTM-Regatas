import React, { useState, useEffect, useRef, useMemo } from 'react';
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
    specialties
  } = useOTM();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const defaultApiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('crl_gemini_api_key') || defaultApiKey);
  const [useSimulated, setUseSimulated] = useState(() => {
    const stored = localStorage.getItem('crl_gemini_api_key');
    if (stored) return false;
    return !defaultApiKey;
  });


  // Voice States
  const [voiceEnabled, setVoiceEnabled] = useState(() => localStorage.getItem('crl_ai_voice_enabled') === 'true');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Load welcome message when chat is opened and empty
  useEffect(() => {
    if (isOpen && messages.length === 0 && user) {
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

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Text to Speech
  const speakText = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // stop current speech
      
      // Clean markdown formatting so the voice doesn't read symbols
      let cleanText = text
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/#/g, '')
        .replace(/`{1,3}[^`]*`{1,3}/g, '') // remove code blocks
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // keep text inside markdown links
        .trim();

      // Limit length to avoid browser speech timeout
      if (cleanText.length > 600) {
        cleanText = cleanText.substring(0, 600) + '...';
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'es-PE'; // Spanish - Peru

      // Find a suitable Spanish voice
      const voices = window.speechSynthesis.getVoices();
      const esVoice = voices.find(v => v.lang.startsWith('es'));
      if (esVoice) {
        utterance.voice = esVoice;
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
    switch (currentUser.role) {
      case 'requester':
        return `¡Hola ${name}! Soy tu Asistente de Mantenimiento CRL. ¿En qué te puedo ayudar hoy? Puedes hacerme preguntas sobre la plataforma o simplemente decirme qué falla tienes (por ejemplo: *"Se rompió un caño en los vestuarios de tenis"*) y yo crearé el requerimiento por ti. Puedes usar el micrófono para hablarme si lo prefieres.`;
      case 'supervisor':
      case 'admin':
        return `Hola ${name}. Estoy listo para apoyarte en la gestión. Puedes preguntarme el estado de los requerimientos, o pedirme directamente que programe y asigne trabajos, por ejemplo: *"Asigna la OTM2703-0003 a Ciro Diaz para mañana"* o *"Cancela la OTM2703-0004"*.`;
      case 'technician':
        return `Hola Técnico ${name}. Estoy aquí para agilizar tu registro. Cuando termines un trabajo, puedes decírmelo en lenguaje natural y yo lo registraré por ti, por ejemplo: *"Ya finalicé el trabajo OTM2703-0003, usé pernos y silicona y tardó 3 horas"*. ¿Qué actividad registramos hoy?`;
      default:
        return `¡Hola! Soy tu asistente de mantenimiento con IA. ¿En qué te puedo ayudar hoy?`;
    }
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
  const handleSaveSettings = (key: string, simulate: boolean) => {
    if (key.trim()) {
      localStorage.setItem('crl_gemini_api_key', key.trim());
      setApiKey(key.trim());
      setUseSimulated(false);
    } else {
      localStorage.removeItem('crl_gemini_api_key');
      const defaultKey = import.meta.env.VITE_GEMINI_API_KEY || '';
      setApiKey(defaultKey);
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

  // ----------------------------------------------------
  // SIMULATION ENGINE (DEMO FALLBACK)
  // ----------------------------------------------------
  const runSimulation = async (userText: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1200));

    const cleanText = userText.toLowerCase().trim();
    const timestamp = new Date();
    const id = `msg-${Date.now()}`;

    // A. FAQ / Platform questions
    if (cleanText.includes('como funciona') || cleanText.includes('proceso') || cleanText.includes('ayuda') || cleanText.includes('guia')) {
      setIsLoading(false);
      setMessages(prev => [...prev, {
        id,
        role: 'assistant',
        text: 'La plataforma CRL Mantenimiento funciona bajo un flujo de 4 fases:\n\n1. **Solicitud:** Cualquier empleado (Solicitante) registra una OTM detallando la falla.\n2. **Programación:** El supervisor evalúa la prioridad, asigna técnicos y fecha de programación.\n3. **Ejecución:** El técnico asignado inicia, pausa y finaliza la tarea en su calendario, registrando tiempo y materiales.\n4. **Cierre y Conformidad:** El solicitante evalúa de 1 a 5 estrellas la calidad del trabajo cerrado.',
        timestamp
      }]);
      return;
    }

    // B. Requester Flow: Create OTM
    if (user?.role === 'requester' && (cleanText.includes('registrar') || cleanText.includes('falla') || cleanText.includes('crear') || cleanText.includes('roto') || cleanText.includes('dañ') || cleanText.includes('problema') || cleanText.includes('caño') || cleanText.includes('fuga'))) {
      const detectedSpecialty = specialties.find(s => cleanText.includes(s.toLowerCase().replace(/^\d+\.\s*/, ''))) || 'Otros';
      const detectedLocation = locations.find(l => cleanText.includes(l.toLowerCase().replace(/^\d+\.\s*/, ''))) || locations[0] || 'Instalaciones';
      
      const isMissingDetails = !cleanText.includes('baño') && !cleanText.includes('oficina') && !cleanText.includes('tuber') && !cleanText.includes('puerta') && !cleanText.includes('luz') && !cleanText.includes('caño') && !cleanText.includes('fuga');

      if (isMissingDetails) {
        setIsLoading(false);
        setMessages(prev => [...prev, {
          id,
          role: 'assistant',
          text: `Entendido. Para reportar una falla, por favor indícame:\n\n1. **¿Qué está fallando?** (ej: fuga de agua, luz quemada, puerta rota).\n2. **¿En qué parte?** (ej: ${detectedLocation}).\n3. **¿Cuál es la especialidad aproximada?** (ej: Gasfitería, Electricidad, Carpintería).`,
          timestamp
        }]);
        return;
      }

      try {
        const cleanDesc = userText.charAt(0).toUpperCase() + userText.slice(1);
        const newOtm = await createOTM({
          area_sector: user?.area_sector || '13. DEPORTES',
          location: detectedLocation,
          exact_location: 'Reportado vía Asistente IA',
          failure_type: detectedSpecialty,
          description: cleanDesc,
          urgency: 'medium',
          status: 'pending'
        });

        setIsLoading(false);
        setMessages(prev => [...prev, {
          id,
          role: 'assistant',
          text: `¡Listo! Acabo de registrar el requerimiento en el sistema de manera automática.`,
          timestamp,
          cardType: 'otm-created',
          cardData: {
            code: newOtm.otm_code,
            description: cleanDesc,
            location: detectedLocation,
            specialty: detectedSpecialty,
            status: 'Pendiente'
          }
        }]);
      } catch (err) {
        setIsLoading(false);
        setMessages(prev => [...prev, {
          id,
          role: 'assistant',
          text: 'Lo siento, ocurrió un problema al registrar la orden de trabajo.',
          timestamp,
          cardType: 'error'
        }]);
      }
      return;
    }

    // C. Supervisor/Admin Flow: Assign OTM
    if ((user?.role === 'supervisor' || user?.role === 'admin') && (cleanText.includes('asigna') || cleanText.includes('programa') || cleanText.includes('tecnico'))) {
      const code = extractOtmCode(userText);
      const tech = findTechnicianByName(userText);

      if (!code) {
        setIsLoading(false);
        setMessages(prev => [...prev, {
          id,
          role: 'assistant',
          text: 'Por favor, indícame el código de la OTM que deseas asignar (ej. OTM2703-0003).',
          timestamp
        }]);
        return;
      }

      if (!tech) {
        setIsLoading(false);
        setMessages(prev => [...prev, {
          id,
          role: 'assistant',
          text: `No logré identificar al técnico en tu mensaje. Aquí tienes los técnicos activos:\n${users.filter(u => u.role === 'technician').map(u => `• ${u.full_name}`).join('\n')}\n\nPor favor, dime: *"Asigna ${code} a [Nombre del Técnico]"*.`,
          timestamp
        }]);
        return;
      }

      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().slice(0, 10); // YYYY-MM-DD

        assignOTM(code, [tech.id], dateStr, 'Asignado automáticamente por Asistente de IA', 2);

        setIsLoading(false);
        setMessages(prev => [...prev, {
          id,
          role: 'assistant',
          text: `Entendido. He procesado la asignación en el plan de actividades.`,
          timestamp,
          cardType: 'otm-assigned',
          cardData: {
            code,
            techName: tech.full_name,
            date: dateStr,
            notes: 'Asignado vía Asistente de IA'
          }
        }]);
      } catch (err) {
        setIsLoading(false);
        setMessages(prev => [...prev, {
          id,
          role: 'assistant',
          text: `Ocurrió un error al asignar la OTM. Verifica que el código "${code}" exista y esté pendiente.`,
          timestamp,
          cardType: 'error'
        }]);
      }
      return;
    }

    // D. Technician Flow: Finish OTM
    if (user?.role === 'technician' && (cleanText.includes('termine') || cleanText.includes('finalice') || cleanText.includes('complete') || cleanText.includes('cerrar'))) {
      const code = extractOtmCode(userText);
      
      if (!code) {
        setIsLoading(false);
        setMessages(prev => [...prev, {
          id,
          role: 'assistant',
          text: 'Para registrar la finalización, por favor menciona el código de la OTM (ej. OTM2703-0003) en tu mensaje.',
          timestamp
        }]);
        return;
      }

      const targetOtm = otms.find(o => o.otm_code === code || o.id === code);
      if (!targetOtm) {
        setIsLoading(false);
        setMessages(prev => [...prev, {
          id,
          role: 'assistant',
          text: `No encontré la orden de trabajo ${code} en el sistema. Asegúrate de que el código sea correcto.`,
          timestamp
        }]);
        return;
      }

      try {
        const notes = userText.replace(new RegExp(code, 'gi'), '').replace(/(termine|finalice|complete|cerrar|el|trabajo)/gi, '').trim();
        const cleanNotes = notes ? notes.charAt(0).toUpperCase() + notes.slice(1) : 'Trabajo completado satisfactoriamente.';
        
        finishTechnicianWork(targetOtm.id, cleanNotes, []);

        setIsLoading(false);
        setMessages(prev => [...prev, {
          id,
          role: 'assistant',
          text: `Excelente labor. La orden ha sido completada en el sistema.`,
          timestamp,
          cardType: 'otm-finished',
          cardData: {
            code,
            notes: cleanNotes
          }
        }]);
      } catch (err) {
        setIsLoading(false);
        setMessages(prev => [...prev, {
          id,
          role: 'assistant',
          text: 'Ocurrió un problema al guardar la finalización. Verifica el estado de la OTM.',
          timestamp,
          cardType: 'error'
        }]);
      }
      return;
    }

    // Default Fallback
    setIsLoading(false);
    setMessages(prev => [...prev, {
      id,
      role: 'assistant',
      text: `Entendido. He tomado nota de tu consulta. En el modo Demo, puedo ayudarte a:\n\n${
        user?.role === 'requester' 
          ? '• **Crear OTMs**: reportando fallas (ej: *"fuga de agua en vestuarios"*).\n• **Pedir Ayuda**: consultando sobre la plataforma.'
          : user?.role === 'technician'
          ? '• **Finalizar OTMs**: registrando materiales y tiempos (ej: *"finalicé OTM2703-0003"*).\n• **Preguntar**: por tus tareas asignadas.'
          : '• **Asignar OTMs**: programando a técnicos (ej: *"asigna OTM2703-0003 a Ciro Diaz"*).\n• **Pedir reportes**: consultando prioridades y retrasos.'
      }`,
      timestamp
    }]);
  };

  // ----------------------------------------------------
  // GEMINI LIVE API INTEGRATION (WITH FUNCTION CALLING)
  // ----------------------------------------------------
  const runGeminiAPI = async (userText: string) => {
    setIsLoading(true);
    const timestamp = new Date();
    const id = `msg-${Date.now()}`;

    const systemPrompt = `
Eres el "Asistente de IA CRL", el agente inteligente integrado en la Plataforma de Mantenimiento del Club de Regatas Lima (CRL).
Tu misión es facilitar la gestión operativa de mantenimiento respondiendo consultas de soporte o llamando a herramientas (Function Calling) para automatizar el sistema.

DATOS DEL USUARIO ACTUAL EN SESIÓN:
- Nombre: ${user?.full_name}
- Rol: ${user?.role} (Solicitante=requester, Supervisor=supervisor, Técnico=technician, Administrador=admin)
- Sector: ${user?.area_sector || 'General'}

RESTRICCIONES Y REGLAS CLAVE:
1. Sé extremadamente educado, conciso y profesional en español.
2. Si el usuario te pide realizar una acción que no corresponde a su rol (ej. un requester pidiendo asignar técnicos, o un técnico cancelando OTMs), declina amablemente explicando la jerarquía de roles.
3. Utiliza las herramientas (Function Calling) provistas cuando el usuario te lo solicite explícitamente en su mensaje. No inventes códigos de OTM ni IDs, usa los provistos en las respuestas de las herramientas.

CATÁLOGO DE DATOS DISPONIBLES EN EL SISTEMA:
- Áreas Solicitantes válidas: ${JSON.stringify(areas)}
- Ubicaciones válidas: ${JSON.stringify(locations)}
- Especialidades (failure_types) válidos: ${JSON.stringify(specialties)}
- Lista de Técnicos activos (Nombre e ID): ${JSON.stringify(users.filter(u => u.role === 'technician').map(u => ({ id: u.id, name: u.full_name })))}
    `;

    const tools = [
      {
        functionDeclarations: [
          {
            name: "createOTM",
            description: "Crea un nuevo requerimiento u Orden de Trabajo de Mantenimiento (OTM) en el sistema.",
            parameters: {
              type: "OBJECT",
              properties: {
                area: { type: "STRING", description: "El área que solicita el trabajo (debe coincidir o ser similar a las áreas válidas)." },
                location: { type: "STRING", description: "Ubicación del problema (debe coincidir con ubicaciones válidas)." },
                exactLocation: { type: "STRING", description: "Detalle específico de la ubicación (ej: Baño de damas, Cancha 2)." },
                description: { type: "STRING", description: "Detalle de lo que ocurre o lo que se necesita reparar." },
                specialty: { type: "STRING", description: "Especialidad técnica (debe ser similar a las especialidades válidas)." },
                priority: { type: "STRING", enum: ["Alto", "Medio", "Bajo"], description: "Prioridad requerida." }
              },
              required: ["area", "location", "description", "specialty"]
            }
          },
          {
            name: "assignOTM",
            description: "Programa y asigna una OTM pendiente a técnicos (Solo disponible para Supervisor y Admin).",
            parameters: {
              type: "OBJECT",
              properties: {
                otmId: { type: "STRING", description: "Código o ID de la OTM a asignar (ej. OTM2703-0003)." },
                technicianIds: { type: "ARRAY", items: { type: "STRING" }, description: "Lista de IDs de los técnicos asignados (usa los IDs del catálogo)." },
                scheduledDate: { type: "STRING", description: "Fecha de programación en formato YYYY-MM-DD." },
                estimatedTime: { type: "NUMBER", description: "Tiempo estimado en horas para la ejecución." }
              },
              required: ["otmId", "technicianIds", "scheduledDate"]
            }
          },
          {
            name: "finishTechnicianWork",
            description: "Registra la finalización del trabajo de una OTM por parte de un Técnico (Solo disponible para Técnicos).",
            parameters: {
              type: "OBJECT",
              properties: {
                otmId: { type: "STRING", description: "Código o ID de la OTM finalizada." },
                notes: { type: "STRING", description: "Detalle del trabajo realizado, materiales usados u observaciones finales." }
              },
              required: ["otmId", "notes"]
            }
          }
        ]
      }
    ];

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
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          tools
        })
      });

      if (!response.ok) {
        throw new Error('Error en llamada a Gemini API');
      }

      const resData = await response.json();
      const candidate = resData.candidates?.[0];
      const modelParts = candidate?.content?.parts || [];
      
      let aiText = '';
      let functionCall = null;

      for (const part of modelParts) {
        if (part.text) {
          aiText += part.text;
        }
        if (part.functionCall) {
          functionCall = part.functionCall;
        }
      }

      if (functionCall) {
        const { name, args } = functionCall;
        console.log('Gemini Function Call requested:', name, args);

        let resultData = null;
        let cardType = undefined;
        let cardData = null;

        if (name === 'createOTM') {
          try {
            const newOtm = await createOTM({
              area_sector: args.area,
              location: args.location,
              exact_location: args.exactLocation || 'Vía Asistente IA',
              failure_type: args.specialty,
              description: args.description,
              urgency: args.priority?.toLowerCase() === 'alto' ? 'high' : args.priority?.toLowerCase() === 'bajo' ? 'low' : 'medium',
              status: 'pending'
            });

            resultData = { status: 'success', code: newOtm.otm_code, details: newOtm };
            cardType = 'otm-created' as const;
            cardData = {
              code: newOtm.otm_code,
              description: args.description,
              location: args.location,
              specialty: args.specialty,
              status: 'Pendiente'
            };
          } catch (e: any) {
            resultData = { status: 'error', message: e.message };
          }
        } 
        else if (name === 'assignOTM') {
          if (user?.role !== 'supervisor' && user?.role !== 'admin') {
            resultData = { status: 'error', message: 'Permiso denegado. Solo supervisores pueden asignar tareas.' };
          } else {
            try {
              assignOTM(args.otmId, args.technicianIds, args.scheduledDate, 'Asignado vía Asistente de IA', args.estimatedTime || 2);
              const techNames = args.technicianIds.map((tid: string) => users.find(u => u.id === tid)?.full_name || 'Técnico').join(', ');
              
              resultData = { status: 'success', message: 'OTM asignada con éxito.' };
              cardType = 'otm-assigned' as const;
              cardData = {
                code: args.otmId,
                techName: techNames,
                date: args.scheduledDate,
                notes: 'Asignado vía Asistente de IA'
              };
            } catch (e: any) {
              resultData = { status: 'error', message: e.message };
            }
          }
        } 
        else if (name === 'finishTechnicianWork') {
          if (user?.role !== 'technician') {
            resultData = { status: 'error', message: 'Permiso denegado. Solo técnicos pueden finalizar tareas.' };
          } else {
            try {
              const targetOtm = otms.find(o => o.otm_code === args.otmId || o.id === args.otmId);
              if (!targetOtm) {
                throw new Error(`OTM ${args.otmId} no encontrada.`);
              }
              finishTechnicianWork(targetOtm.id, args.notes, []);
              
              resultData = { status: 'success', message: 'OTM finalizada con éxito.' };
              cardType = 'otm-finished' as const;
              cardData = {
                code: args.otmId,
                notes: args.notes
              };
            } catch (e: any) {
              resultData = { status: 'error', message: e.message };
            }
          }
        }

        const secondContents = [
          ...contents,
          {
            role: 'model',
            parts: [{ functionCall }]
          },
          {
            role: 'user',
            parts: [{
              functionResponse: {
                name,
                response: resultData
              }
            }]
          }
        ];

        const secondResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: secondContents,
            systemInstruction: { parts: [{ text: systemPrompt }] }
          })
        });

        if (secondResponse.ok) {
          const secondData = await secondResponse.json();
          const secondCandidate = secondData.candidates?.[0];
          aiText = secondCandidate?.content?.parts?.[0]?.text || 'Acción procesada con éxito en la plataforma.';
        } else {
          aiText = resultData.status === 'success' 
            ? `Acción realizada con éxito: ${name}.` 
            : `Ocurrió un inconveniente al realizar la acción: ${resultData.message}`;
        }

        setIsLoading(false);
        setMessages(prev => [...prev, {
          id,
          role: 'assistant',
          text: aiText,
          timestamp,
          cardType,
          cardData
        }]);
      } else {
        setIsLoading(false);
        setMessages(prev => [...prev, {
          id,
          role: 'assistant',
          text: aiText || 'Entendido, ¿deseas realizar otra consulta?',
          timestamp
        }]);
      }
    } catch (err) {
      console.error(err);
      setIsLoading(false);
      setMessages(prev => [...prev, {
        id,
        role: 'assistant',
        text: 'Lo siento, no pude conectar con el servidor de IA. Asegúrate de que tu conexión sea estable y tu API Key sea correcta.',
        timestamp,
        cardType: 'error'
      }]);
    }
  };

  // ----------------------------------------------------
  // MESSAGE HANDLER
  // ----------------------------------------------------
  const handleSendMessage = (textToSend?: string) => {
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
        title="Asistente de IA CRL"
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
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)'
          }}>
            🤖
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              Asistente de IA
              <span style={{ 
                fontSize: '0.65rem', 
                background: useSimulated ? 'rgba(234, 179, 8, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                color: useSimulated ? '#eab308' : '#22c55e',
                padding: '2px 6px',
                borderRadius: 4,
                fontWeight: 600
              }}>
                {useSimulated ? 'Simulado' : 'Gemini 1.5'}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Mantenimiento CRL • {user?.role === 'admin' ? 'Admin' : user?.role === 'supervisor' ? 'Supervisor' : user?.role === 'technician' ? 'Técnico' : 'Solicitante'}
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
      {showSettings && (
        <div style={{
          padding: '16px 20px',
          background: 'rgba(30, 41, 59, 0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            ⚙️ Configuración del Agente de IA
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
                  {import.meta.env.VITE_GEMINI_API_KEY ? 'Se ha cargado una API Key global (.env). Puedes ingresar una clave diferente aquí para sobrescribirla:' : 'Ingresa tu Gemini API Key para conectar con el modelo real en vivo:'}
                </div>
                <input 
                  type="password" 
                  placeholder={import.meta.env.VITE_GEMINI_API_KEY ? "Configurada de forma global (.env)" : "AIzaSy..."}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
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
                <div style={{ fontSize: '0.65rem', color: '#3b82f6' }}>
                  Puedes obtener una clave gratuita en <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>Google AI Studio</a>.
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button 
              onClick={() => handleSaveSettings(useSimulated ? '' : apiKey, useSimulated)}
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
              <span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', display: 'inline-block', animation: 'bounce 1.4s infinite ease-in-out both' }} />
              <span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', display: 'inline-block', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.2s' }} />
              <span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', display: 'inline-block', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.4s' }} />
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
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
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
