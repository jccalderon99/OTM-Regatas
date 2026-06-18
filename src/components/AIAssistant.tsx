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

  // Ollama redundancy states
  const [ollamaEnabled, setOllamaEnabled] = useState(() => localStorage.getItem('crl_ollama_enabled') === 'true');
  const [ollamaModel, setOllamaModel] = useState(() => localStorage.getItem('crl_ollama_model') || 'llama3.2');
  const [ollamaUrl, setOllamaUrl] = useState(() => localStorage.getItem('crl_ollama_url') || 'http://localhost:11434');


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

      // Priority 1: Microsoft Natural Spanish voices (Edge)
      const msNatural = voices.find(v =>
        v.lang.startsWith('es') && v.name.includes('Natural') && v.name.includes('Microsoft')
      );
      if (msNatural) { bestVoiceRef.current = msNatural; return; }

      // Priority 2: Google Spanish voices (Chrome)
      const googleVoice = voices.find(v =>
        v.lang.startsWith('es') && v.name.includes('Google')
      );
      if (googleVoice) { bestVoiceRef.current = googleVoice; return; }

      // Priority 3: Any remote/cloud Spanish voice
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
  const handleSaveSettings = (key: string, simulate: boolean, ollamaOn: boolean, model: string, url: string) => {
    localStorage.setItem('crl_ollama_enabled', String(ollamaOn));
    localStorage.setItem('crl_ollama_model', model.trim());
    localStorage.setItem('crl_ollama_url', url.trim());
    setOllamaEnabled(ollamaOn);
    setOllamaModel(model.trim());
    setOllamaUrl(url.trim());

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

  // Helper to parse arguments from Ollama custom action tags
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

  // Respaldo local usando Ollama
  const runOllamaAPI = async (userText: string): Promise<boolean> => {
    const timestamp = new Date();
    const id = `msg-${Date.now()}`;
    
    const messagesHistory = messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.text
      }));

    const ollamaSystemPrompt = `
Eres el "Asistente de IA CRL Local", un modelo de inteligencia artificial de respaldo corriendo localmente en la laptop del usuario mediante Ollama.
Tu objetivo es dar soporte en la Plataforma de Gestión de Mantenimiento del Club de Regatas Lima (CRL).

PERSONALIDAD Y ESTILO:
- Habla en español de manera atenta, fluida y amigable.
- Sé sumamente conciso. Responde en un máximo de 2 o 3 oraciones, ya que procesas de forma local.
- Agrega emojis amigables.

DATOS DEL USUARIO:
- Nombre: ${user?.full_name}
- Rol: ${user?.role}

CATÁLOGO DEL SISTEMA:
- Áreas válidas: ${JSON.stringify(areas)}
- Ubicaciones válidas: ${JSON.stringify(locations)}
- Especialidades válidas: ${JSON.stringify(specialties)}
- Técnicos activos: ${JSON.stringify(users.filter(u => u.role === 'technician').map(u => ({ id: u.id, name: u.full_name })))}

REGLAS DE ACCIÓN CRÍTICAS (PARA EJECUTAR CAMBIOS EN LA PLATAFORMA):
Si el usuario te pide registrar una acción concreta (crear una OTM, asignar técnicos o finalizar una OTM), debes responder conversando brevemente y obligatoriamente añadir al final de tu mensaje la siguiente línea exacta con corchetes para que el sistema la ejecute:

1. Crear OTM (solo si el usuario tiene rol 'requester' o 'admin'):
[ACCION: createOTM(area='Área', location='Ubicación', description='Descripción de la falla', specialty='Especialidad', priority='Alto|Medio|Bajo')]

2. Asignar OTM (solo si el usuario tiene rol 'supervisor' o 'admin'):
[ACCION: assignOTM(otmId='Código OTM', technicianIds=['ID_TECNICO'], scheduledDate='YYYY-MM-DD', estimatedTime=2)]

3. Finalizar OTM (solo si el usuario tiene rol 'technician'):
[ACCION: finishTechnicianWork(otmId='Código OTM', notes='Notas del técnico')]

Asegúrate de escribir la [ACCION: ...] en una sola línea completa al final, respetando las comillas simples para los textos. Si te falta información obligatoria (por ejemplo, dónde ocurrió la falla), no pongas la marca, pídele los datos faltantes conversando amablemente.
`;

    try {
      const response = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          messages: [
            { role: 'system', content: ollamaSystemPrompt },
            ...messagesHistory,
            { role: 'user', content: userText }
          ],
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error('Servidor de Ollama no responde');
      }

      const data = await response.json();
      let responseText = data.message?.content || '';
      console.log('Ollama Local Response:', responseText);

      let cardType: any = undefined;
      let cardData: any = null;

      // Extract Action Tag if present
      const actionMatch = responseText.match(/\[ACCION:\s*(\w+)\(([^)]*)\)\]/);
      if (actionMatch) {
        const actionName = actionMatch[1];
        const argsStr = actionMatch[2];
        const args = parseActionArgs(argsStr);
        console.log('Action parsed from local Ollama model:', actionName, args);

        // Strip action tag from chat display text
        responseText = responseText.replace(/\[ACCION:[^\]]*\]/g, '').trim();

        if (actionName === 'createOTM') {
          try {
            const newOtm = await createOTM({
              area_sector: args.area || 'General',
              location: args.location || 'Vía Asistente Local',
              exact_location: args.exactLocation || 'Vía Asistente Local',
              failure_type: args.specialty || 'General',
              description: args.description || 'Reporte de falla local',
              urgency: args.priority?.toLowerCase() === 'alto' ? 'high' : args.priority?.toLowerCase() === 'bajo' ? 'low' : 'medium',
              status: 'pending'
            });
            cardType = 'otm-created';
            cardData = {
              code: newOtm.otm_code,
              description: args.description || 'Reporte local',
              location: args.location || 'Vía Local',
              specialty: args.specialty || 'General',
              status: 'Pendiente'
            };
            responseText += ' \n\n*(Ejecutado localmente por Llama: OTM registrada con éxito 👍)*';
          } catch (e: any) {
            responseText += ` \n\n*(Error local: ${e.message})*`;
          }
        }
        else if (actionName === 'assignOTM') {
          if (user?.role !== 'supervisor' && user?.role !== 'admin') {
            responseText += ' \n\n*(Acción rechazada: Tu rol no permite programar asignaciones)*';
          } else {
            try {
              assignOTM(args.otmId, args.technicianIds || [], args.scheduledDate || '', 'Asignado vía Asistente Local', args.estimatedTime || 2);
              const techNames = (args.technicianIds || []).map((tid: string) => users.find(u => u.id === tid)?.full_name || 'Técnico').join(', ');
              cardType = 'otm-assigned';
              cardData = {
                code: args.otmId,
                techName: techNames,
                date: args.scheduledDate,
                notes: 'Asignado vía Asistente Local'
              };
              responseText += ' \n\n*(Ejecutado localmente por Llama: Técnico asignado con éxito 👍)*';
            } catch (e: any) {
              responseText += ` \n\n*(Error local al asignar: ${e.message})*`;
            }
          }
        }
        else if (actionName === 'finishTechnicianWork') {
          if (user?.role !== 'technician') {
            responseText += ' \n\n*(Acción rechazada: Tu rol no permite finalizar tareas)*';
          } else {
            try {
              const targetOtm = otms.find(o => o.otm_code === args.otmId || o.id === args.otmId);
              if (!targetOtm) throw new Error('OTM no encontrada.');
              finishTechnicianWork(targetOtm.id, args.notes || 'Trabajo completado.', []);
              cardType = 'otm-finished';
              cardData = {
                code: args.otmId,
                notes: args.notes || 'Completado localmente.'
              };
              responseText += ' \n\n*(Ejecutado localmente por Llama: OTM finalizada con éxito 👍)*';
            } catch (e: any) {
              responseText += ` \n\n*(Error local: ${e.message})*`;
            }
          }
        }
      }

      setIsLoading(false);
      setMessages(prev => [...prev, {
        id,
        role: 'assistant',
        text: responseText + ' \n\n*(Servicio local activo: Llama 3.2 🏠)*',
        timestamp,
        cardType,
        cardData
      }]);

      // Speak if enabled
      if (voiceEnabled && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const cleanText = responseText.replace(/[*#`_]/g, '').substring(0, 800);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'es-PE';
        if (bestVoiceRef.current) utterance.voice = bestVoiceRef.current;
        utterance.rate = 1.05;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }

      return true;
    } catch (err) {
      console.error('Ollama fetch error:', err);
      return false;
    }
  };

  // ----------------------------------------------------
  // GEMINI LIVE API INTEGRATION (WITH FUNCTION CALLING)
  // ----------------------------------------------------
  const runGeminiAPI = async (userText: string) => {
    setIsLoading(true);
    const timestamp = new Date();
    const id = `msg-${Date.now()}`;

    // OTMs summary for context awareness
    const otmsSummary = otms.slice(0, 30).map(o => ({
      code: o.otm_code,
      status: o.status,
      desc: o.description?.substring(0, 60),
      location: o.location,
      area: o.area_sector
    }));

    const systemPrompt = `
Eres el "Asistente de IA CRL", un agente de inteligencia artificial avanzado, conversacional y empático, integrado en la Plataforma de Gestión de Mantenimiento del Club de Regatas Lima (CRL).

PERSONALIDAD Y ESTILO:
- Habla de manera natural, fluida y cercana, como un compañero de trabajo experto y amigable.
- Usa español latinoamericano profesional pero cálido. Evita sonar robótico o como un bot genérico.
- Sé proactivo: si detectas que el usuario necesita algo más allá de lo que pidió, sugiere opciones.
- Responde de forma CONCISA pero COMPLETA. No uses más de 3-4 oraciones a menos que sea necesario.
- Cuando confirmes una acción exitosa, celebra brevemente (ej: "¡Listo, registrado! 👍").
- Puedes usar emojis con moderación para dar vida a la conversación.

DATOS DEL USUARIO EN SESIÓN:
- Nombre: ${user?.full_name}
- Rol: ${user?.role} (requester=Solicitante, supervisor=Supervisor, technician=Técnico, admin=Administrador)
- Sector: ${user?.area_sector || 'General'}

CONTEXTO DEL SISTEMA (OTMs recientes):
${JSON.stringify(otmsSummary)}

REGLAS CRÍTICAS:
1. SIEMPRE responde en español.
2. Respeta la jerarquía de roles estrictamente:
   - Solicitantes: solo pueden crear OTMs y consultar estado.
   - Supervisores/Admin: pueden asignar, programar y consultar todo.
   - Técnicos: solo pueden registrar finalización de sus trabajos asignados.
   Si alguien pide algo fuera de su rol, explica amablemente por qué no puedes hacerlo.
3. Usa las herramientas (Function Calling) cuando el usuario solicite una ACCIÓN concreta (crear, asignar, finalizar).
4. NUNCA inventes códigos de OTM. Si no tienes el código, pregúntalo.
5. Si el usuario te hace una pregunta sobre la plataforma, el proceso o los datos, responde con conocimiento completo del sistema.
6. Si el usuario te habla de forma informal o te saluda, responde de manera natural y amigable.

CATÁLOGO DEL SISTEMA:
- Áreas: ${JSON.stringify(areas)}
- Ubicaciones: ${JSON.stringify(locations)}
- Especialidades: ${JSON.stringify(specialties)}
- Técnicos activos: ${JSON.stringify(users.filter(u => u.role === 'technician').map(u => ({ id: u.id, name: u.full_name })))}
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
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction: systemPrompt,
          tools: tools as any
        }
      });

      const candidate = response.candidates?.[0];
      const modelParts = candidate?.content?.parts || [];
      
      let aiText = response.text || '';
      let functionCall = null;

      for (const part of modelParts) {
        if (part.functionCall) {
          functionCall = part.functionCall;
        }
      }

      if (functionCall) {
        const { name, args } = functionCall;
        const typedArgs = (args || {}) as any;
        console.log('Gemini Function Call requested:', name, typedArgs);

        let resultData = null;
        let cardType = undefined;
        let cardData = null;

        if (name === 'createOTM') {
          try {
            const newOtm = await createOTM({
              area_sector: typedArgs.area,
              location: typedArgs.location,
              exact_location: typedArgs.exactLocation || 'Vía Asistente IA',
              failure_type: typedArgs.specialty,
              description: typedArgs.description,
              urgency: typedArgs.priority?.toLowerCase() === 'alto' ? 'high' : typedArgs.priority?.toLowerCase() === 'bajo' ? 'low' : 'medium',
              status: 'pending'
            });

            resultData = { status: 'success', code: newOtm.otm_code, details: newOtm };
            cardType = 'otm-created' as const;
            cardData = {
              code: newOtm.otm_code,
              description: typedArgs.description,
              location: typedArgs.location,
              specialty: typedArgs.specialty,
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
              assignOTM(typedArgs.otmId, typedArgs.technicianIds, typedArgs.scheduledDate, 'Asignado vía Asistente de IA', typedArgs.estimatedTime || 2);
              const techNames = typedArgs.technicianIds.map((tid: string) => users.find(u => u.id === tid)?.full_name || 'Técnico').join(', ');
              
              resultData = { status: 'success', message: 'OTM asignada con éxito.' };
              cardType = 'otm-assigned' as const;
              cardData = {
                code: typedArgs.otmId,
                techName: techNames,
                date: typedArgs.scheduledDate,
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
              const targetOtm = otms.find(o => o.otm_code === typedArgs.otmId || o.id === typedArgs.otmId);
              if (!targetOtm) {
                throw new Error(`OTM ${typedArgs.otmId} no encontrada.`);
              }
              finishTechnicianWork(targetOtm.id, typedArgs.notes, []);
              
              resultData = { status: 'success', message: 'OTM finalizada con éxito.' };
              cardType = 'otm-finished' as const;
              cardData = {
                code: typedArgs.otmId,
                notes: typedArgs.notes
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

        const secondResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: secondContents as any,
          config: {
            systemInstruction: systemPrompt
          }
        });

        aiText = secondResponse.text || 'Acción procesada con éxito en la plataforma.';

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
    } catch (err: any) {
      console.error('Gemini SDK Error:', err);
      
      if (ollamaEnabled) {
        console.log('Gemini failed. Attempting failover to local Ollama...');
        const ollamaSuccess = await runOllamaAPI(userText);
        if (ollamaSuccess) {
          return;
        }
      }

      setIsLoading(false);
      
      let errorText = 'Lo siento, no pude conectar con el servidor de IA. Asegúrate de que tu conexión sea estable y tu API Key sea correcta.';
      
      const errMsg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      const isAuthError = errMsg.includes('401') || 
                          errMsg.toLowerCase().includes('unauthenticated') || 
                          errMsg.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') ||
                          errMsg.includes('API_KEY_SERVICE_BLOCKED');
                          
      if (isAuthError) {
        errorText = 'Parece que hay un inconveniente de autenticación con tu API Key. Google requiere agregar una tarjeta de pago para habilitar el uso de las nuevas claves de formato "AQ." en tu proyecto.';
      }

      if (ollamaEnabled) {
        errorText += '\n\n*(También intenté conectar con tu servidor de Ollama local pero falló. Asegúrate de tener Ollama abierto en tu laptop con el modelo cargado mediante: `ollama run ' + ollamaModel + '`)*';
      } else {
        errorText += '\n\n*¿Deseas activar el **Modo Simulado** (en el botón de configuración de arriba) para probar todo el flujo de inmediato?*';
      }

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
                background: useSimulated 
                  ? 'rgba(234, 179, 8, 0.15)' 
                  : (ollamaEnabled ? 'rgba(59, 130, 246, 0.15)' : 'rgba(34, 197, 94, 0.15)'),
                color: useSimulated 
                  ? '#eab308' 
                  : (ollamaEnabled ? '#3b82f6' : '#22c55e'),
                padding: '2px 6px',
                borderRadius: 4,
                fontWeight: 600
              }}>
                {useSimulated ? 'Simulado' : (ollamaEnabled ? 'Gemini + Ollama 🔄' : 'Gemini 2.5 ⚡')}
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

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, marginTop: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', cursor: 'pointer', marginBottom: 8 }}>
              <input 
                type="checkbox" 
                checked={ollamaEnabled}
                onChange={e => setOllamaEnabled(e.target.checked)}
              />
              Redundancia con Ollama Local (Llama 3)
            </label>
            {ollamaEnabled && (
              <div style={{ display: 'flex', gap: 8, flexDirection: 'column', paddingLeft: 16 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: 2 }}>Modelo local:</div>
                    <input 
                      type="text" 
                      value={ollamaModel}
                      onChange={e => setOllamaModel(e.target.value)}
                      placeholder="llama3.2"
                      style={{
                        width: '100%',
                        background: '#0f172a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 6,
                        padding: '4px 8px',
                        color: 'white',
                        fontSize: '0.75rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1.5 }}>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: 2 }}>Dirección API:</div>
                    <input 
                      type="text" 
                      value={ollamaUrl}
                      onChange={e => setOllamaUrl(e.target.value)}
                      placeholder="http://localhost:11434"
                      style={{
                        width: '100%',
                        background: '#0f172a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 6,
                        padding: '4px 8px',
                        color: 'white',
                        fontSize: '0.75rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
                <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                  Si Gemini supera su límite de 15 solicitudes/minuto, las consultas se procesarán localmente mediante Ollama.
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button 
              onClick={() => handleSaveSettings(useSimulated ? '' : apiKey, useSimulated, ollamaEnabled, ollamaModel, ollamaUrl)}
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
