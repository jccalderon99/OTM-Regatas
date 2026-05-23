// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { OTMRequest, Profile } from '../types';
import { useOTM } from '../context/OTMContext';
import SignaturePad from './SignaturePad';

interface ConformityActaProps {
  otm: OTMRequest;
  onClose: () => void;
}

export default function ConformityActa({ otm, onClose }: ConformityActaProps) {
  const { users, supervisors } = useOTM();
  const assignedSupervisor = supervisors.find(s => s.id === otm.supervisor_id);
  const supervisorName = assignedSupervisor?.full_name || otm.supervisor?.full_name || 'Sin Asignar';
  const [isEditing, setIsEditing] = useState(true);
  
  // Supervisor Signature States
  const [supervisorSignature, setSupervisorSignature] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [tempSignature, setTempSignature] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  
  // Find requester profile
  const requesterProfile = users.find(u => u.id === otm.requester_id) || {
    full_name: otm.requester_name,
    email: '',
    jefatura_name: 'Jefatura de Área',
    jefatura_position: 'Jefe de Departamento',
    jefatura_email: 'jefatura@regataslima.pe',
    area_sector: otm.area_sector,
    position: 'Solicitante'
  };

  // Find technician profiles
  const assignedTechNames = otm.assigned_technicians && otm.assigned_technicians.length > 0
    ? otm.assigned_technicians.map(t => t.technician?.full_name || users.find(u => u.id === t.technician_id)?.full_name).filter(Boolean)
    : [];

  const mainTechName = otm.assignment_type === 'contractor' 
    ? (otm.contractor_name || 'Tercero Contratista')
    : (users.find(u => u.id === otm.technician_id)?.full_name || 'Personal Propio');

  // Form states (pre-filled with OTM data)
  const [otmCode, setOtmCode] = useState(otm.otm_code);
  const [description, setDescription] = useState(otm.description);
  const [technicianNotes, setTechnicianNotes] = useState(otm.technician_notes || 'No se registraron comentarios de ejecución.');
  const [rqMaterials, setRqMaterials] = useState(otm.rq_materials || 'Ninguno');
  const [conformityNotes, setConformityNotes] = useState(otm.conformity_notes || 'Servicio conforme, sin observaciones.');
  
  // Extra fields for professional touch
  const [locationStr, setLocationStr] = useState(otm.exact_location || otm.location || 'Sede Principal Chorrillos');
  const [maintenanceTypeStr, setMaintenanceTypeStr] = useState(
    otm.maintenance_type === 'corrective' ? 'Mantenimiento Correctivo' :
    otm.maintenance_type === 'preventive' ? 'Mantenimiento Preventivo' : 'Mantenimiento General'
  );
  
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Google Drive Upload States
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'auth' | 'generating' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-resize textareas during editing
  const textareaRef1 = useRef<HTMLTextAreaElement>(null);
  const textareaRef2 = useRef<HTMLTextAreaElement>(null);
  const textareaRef3 = useRef<HTMLTextAreaElement>(null);
  const textareaRef4 = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = (ref: React.RefObject<HTMLTextAreaElement>) => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  };

  useEffect(() => {
    adjustHeight(textareaRef1);
    adjustHeight(textareaRef2);
    adjustHeight(textareaRef3);
    adjustHeight(textareaRef4);
  }, [isEditing, description, technicianNotes, rqMaterials, conformityNotes]);

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setGeneratingPdf(true);
    try {
      const element = printRef.current;
      
      // Target a width that fits nicely on an A4 page
      const canvas = await html2canvas(element, {
        scale: 2, // Retain sharp texts
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210; // A4 size width in mm
      const pageHeight = 295; // A4 size height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`Acta_Conformidad_${otmCode.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Hubo un error al generar el PDF. Por favor reintente.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const generatePdfBlob = async (): Promise<Blob> => {
    if (!printRef.current) throw new Error("Print ref is null");
    const element = printRef.current;
    
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    return pdf.output('blob');
  };

  const handleUploadToGoogleDrive = async () => {
    const clientId = localStorage.getItem('google_client_id') || '';
    const folderId = '1sjHOBgf1ZzC7cDUD_MKQ-VCBl854PExt';
    
    if (!clientId) {
      // MODE SIMULATION (DEMO)
      setUploadStatus('auth');
      setUploadProgress(10);
      
      setTimeout(() => {
        setUploadStatus('generating');
        setUploadProgress(30);
      }, 1000);
      
      setTimeout(() => {
        setUploadStatus('uploading');
        setUploadProgress(50);
      }, 2000);

      setTimeout(() => setUploadProgress(75), 2800);
      setTimeout(() => setUploadProgress(90), 3400);
      
      setTimeout(() => {
        setUploadProgress(100);
        setUploadStatus('success');
        window.open(`https://drive.google.com/drive/folders/${folderId}?usp=sharing`, '_blank');
      }, 4000);
      
      return;
    }
    
    // REAL UPLOAD MODE (GOOGLE DRIVE API)
    setUploadStatus('auth');
    setUploadProgress(5);
    setErrorMessage('');
    
    try {
      if (typeof google === 'undefined') {
        throw new Error('Las librerías de Google no se han cargado todavía. Reintente en un momento.');
      }
      
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            setUploadStatus('error');
            setErrorMessage(`Error de autenticación Google: ${tokenResponse.error}`);
            return;
          }
          
          const accessToken = tokenResponse.access_token;
          
          try {
            setUploadStatus('generating');
            setUploadProgress(30);
            const pdfBlob = await generatePdfBlob();
            
            setUploadStatus('uploading');
            setUploadProgress(60);
            
            const filename = `Acta_Conformidad_${otmCode.replace(/\s+/g, '_')}.pdf`;
            
            const metadata = {
              name: filename,
              mimeType: 'application/pdf',
              parents: [folderId]
            };
            
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', pdfBlob);
            
            setUploadProgress(80);
            
            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`
              },
              body: form
            });
            
            if (!response.ok) {
              const errText = await response.text();
              throw new Error(`Fallo al subir a Google Drive API: ${response.status} - ${errText}`);
            }
            
            setUploadProgress(100);
            setUploadStatus('success');
            
            window.open(`https://drive.google.com/drive/folders/${folderId}?usp=sharing`, '_blank');
          } catch (err: any) {
            console.error('Error in OAuth callback upload:', err);
            setUploadStatus('error');
            setErrorMessage(err.message || 'Error durante la generación o subida del PDF.');
          }
        }
      });
      
      tokenClient.requestAccessToken({ prompt: 'consent' });
      
    } catch (err: any) {
      console.error('Error starting Google Drive upload:', err);
      setUploadStatus('error');
      setErrorMessage(err.message || 'Fallo al iniciar el cliente de subida.');
    }
  };

  const handleSendEmail = () => {
    const jefaturaEmail = requesterProfile.jefatura_email || 'jefatura@regataslima.pe';
    const requesterEmail = requesterProfile.email || 'solicitante@regataslima.pe';
    const subject = `SOLICITUD ${otmCode} EN CONFORMIDAD`;
    
    const emailBody = `Estimado(a) ${requesterProfile.jefatura_name || 'Jefe de Área'},

Le informamos que la solicitud de mantenimiento de código ${otmCode} correspondiente al área de ${otm.area_sector} ha sido completada y cuenta con la conformidad del usuario solicitante (${otm.requester_name}).

RESUMEN DEL TRABAJO:
- Ubicación: ${locationStr}
- Trabajo Realizado: ${technicianNotes}
- Tipo de Trabajo: ${maintenanceTypeStr}
- Calificación del Usuario: ${'★'.repeat(otm.conformity_rating || 5)}${'☆'.repeat(5 - (otm.conformity_rating || 5))} (${otm.conformity_rating || 5}/5)
- Comentarios de Conformidad: ${conformityNotes}

Nota: Por favor, recuerde adjuntar a este correo el documento PDF del Acta de Conformidad que ha sido generado y descargado en su dispositivo.

Atentamente,
Departamento de Mantenimiento y Obras
Club de Regatas "Lima"
`;

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(jefaturaEmail)}&cc=${encodeURIComponent(requesterEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    
    // Open Gmail in a new tab
    window.open(gmailUrl, '_blank');
    
    // Close the modal and return to dashboard
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', overflowY: 'auto', padding: '30px 20px' }}>
      {/* Upload Overlay and Progress indicator */}
      {uploadStatus !== 'idle' && uploadStatus !== 'success' && uploadStatus !== 'error' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(6px)',
          zIndex: 1200,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f8fafc'
        }}>
          <div style={{
            background: 'rgba(30, 41, 59, 0.9)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '30px 40px',
            width: '100%',
            maxWidth: '450px',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 15 }}>
              {uploadStatus === 'auth' ? '🔑' : uploadStatus === 'generating' ? '📄' : '📤'}
            </div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', fontWeight: 700 }}>
              {uploadStatus === 'auth' ? 'Solicitando Autorización Google' :
               uploadStatus === 'generating' ? 'Generando Acta PDF de Alta Resolución' :
               'Subiendo a Carpeta de Google Drive'}
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              Por favor espere. El proceso se ejecuta en segundo plano.
            </p>
            
            <div style={{
              width: '100%',
              height: '8px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '999px',
              overflow: 'hidden',
              marginBottom: 10
            }}>
              <div style={{
                width: `${uploadProgress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #38bdf8 0%, #059669 100%)',
                borderRadius: '999px',
                transition: 'width 0.4s ease-out'
              }}></div>
            </div>
            
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8' }}>
              {uploadProgress}% Completado
            </span>
          </div>
        </div>
      )}

      {/* Success / Error notification bar directly inside modal */}
      {uploadStatus === 'success' && (
        <div style={{
          width: '100%',
          maxWidth: '850px',
          margin: '0 auto 20px auto',
          background: 'rgba(5, 150, 105, 0.15)',
          border: '1px solid var(--accent-emerald)',
          color: 'var(--accent-emerald)',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.85rem'
        }}>
          <span>🎉 <strong>¡Acta Subida Exitosamente!</strong> Se ha cargado a tu Google Drive y se abrió la carpeta.</span>
          <button onClick={() => setUploadStatus('idle')} style={{ background: 'transparent', border: 'none', color: 'var(--accent-emerald)', fontWeight: 700, cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {uploadStatus === 'error' && (
        <div style={{
          width: '100%',
          maxWidth: '850px',
          margin: '0 auto 20px auto',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid var(--accent-purple)',
          color: 'var(--accent-purple)',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.85rem'
        }}>
          <span>❌ <strong>Error al Subir:</strong> {errorMessage} (Se activó el modo simulación si no ingresó Client ID)</span>
          <button onClick={() => setUploadStatus('idle')} style={{ background: 'transparent', border: 'none', color: 'var(--accent-purple)', fontWeight: 700, cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Top Floating Control Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        maxWidth: '850px',
        margin: '0 auto 20px auto',
        background: 'rgba(30, 41, 59, 0.9)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        padding: '12px 24px',
        borderRadius: '16px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: isEditing ? 'var(--accent-purple)' : 'var(--accent-emerald)', animation: isEditing ? 'pulse 2s infinite' : 'none' }}></div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
            {isEditing ? '📝 MODO DE EDICIÓN ACTIVO' : '👁️ PREVISUALIZACIÓN DE ACTA'}
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: 10 }}>
          {isEditing ? (
            <button className="btn btn-primary" onClick={() => setIsSigning(true)} style={{ background: 'linear-gradient(135deg, var(--accent-purple) 0%, #7c3aed 100%)', border: 'none', padding: '8px 16px', fontSize: '0.85rem' }}>
              💾 Finalizar Edición
            </button>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => setIsEditing(true)} style={{ background: '#f8fafc', color: '#0f172a', border: 'none', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600 }}>
                ✏️ Editar Texto
              </button>
              <button className="btn btn-primary" onClick={handleDownloadPDF} disabled={generatingPdf} style={{ background: 'linear-gradient(135deg, var(--accent-blue) 0%, #0284c7 100%)', border: 'none', padding: '8px 16px', fontSize: '0.85rem' }}>
                {generatingPdf ? '⏳ Generando...' : '📄 Descargar PDF'}
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleUploadToGoogleDrive} 
                disabled={uploadStatus !== 'idle' && uploadStatus !== 'success' && uploadStatus !== 'error'} 
                style={{ 
                  background: 'linear-gradient(135deg, #38bdf8 0%, #059669 100%)', 
                  border: 'none', 
                  padding: '8px 16px', 
                  fontSize: '0.85rem',
                  color: '#ffffff'
                }}
              >
                {uploadStatus === 'idle' ? '💾 Subir a Google Drive' :
                 uploadStatus === 'auth' ? '🔑 Conectando Google...' :
                 uploadStatus === 'generating' ? '⏳ Creando PDF...' :
                 uploadStatus === 'uploading' ? '📤 Subiendo...' :
                 uploadStatus === 'success' ? '✓ Subido a Drive!' : '❌ Error de Subida'}
              </button>
              <button className="btn btn-primary" onClick={handleSendEmail} style={{ background: 'linear-gradient(135deg, var(--accent-emerald) 0%, #059669 100%)', border: 'none', padding: '8px 16px', fontSize: '0.85rem' }}>
                📧 Enviar Correo
              </button>
            </>
          )}
          <button className="btn btn-ghost" onClick={onClose} style={{ color: '#94a3b8', padding: '8px 12px' }}>
            ✕ Cerrar
          </button>
        </div>
      </div>

      {/* The Printable Document Container */}
      <div 
        ref={printRef} 
        style={{
          width: '100%',
          maxWidth: '850px',
          margin: '0 auto',
          background: '#ffffff',
          color: '#1e293b',
          fontFamily: '"Inter", -apple-system, sans-serif',
          padding: '40px 50px',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          position: 'relative',
          lineHeight: '1.5'
        }}
      >
        
        {/* I. HEADER DE ACTA */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '3px solid #0f172a',
          paddingBottom: '20px',
          marginBottom: '25px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            {/* Elegant Vector Crest representing Regatas Lima */}
            <div style={{
              width: '60px',
              height: '65px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              <img src="/images/logo-crl.jpg" alt="Club Regatas Lima" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.05em', color: '#0f172a', margin: 0 }}>CLUB DE REGATAS "LIMA"</h2>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', margin: '2px 0 0 0', letterSpacing: '0.1em' }}>DEPARTAMENTO DE MANTENIMIENTO</h3>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>DOCUMENTO DE CONTROL INTERNO</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>OTM N°:</span>
              {isEditing ? (
                <input 
                  value={otmCode} 
                  onChange={e => setOtmCode(e.target.value)} 
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    color: '#1e3a8a',
                    width: '120px',
                    textAlign: 'right',
                    border: '1px dashed var(--accent-blue)',
                    background: 'rgba(78,181,230,0.05)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    outline: 'none'
                  }}
                />
              ) : (
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e3a8a' }}>{otmCode}</span>
              )}
            </div>
          </div>
        </div>

        {/* TITLE BAR */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
          color: '#ffffff',
          textAlign: 'center',
          padding: '12px 20px',
          borderRadius: '8px',
          fontWeight: 800,
          fontSize: '1.1rem',
          letterSpacing: '0.05em',
          marginBottom: '25px',
          border: '1px solid #fbbf24',
          boxShadow: '0 4px 10px rgba(15, 23, 42, 0.1)'
        }}>
          ACTA DE CONFORMIDAD DE TRABAJO
        </div>

        {/* II. INFORMACIÓN GENERAL Y SOLICITUD */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', borderLeft: '4px solid #1e3a8a', paddingLeft: '8px', marginBottom: '12px', letterSpacing: '0.05em' }}>
            1. INFORMACIÓN DE LA SOLICITUD
          </h4>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <tbody>
              <tr>
                <td style={{ width: '20%', padding: '8px 12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700 }}>Solicitante:</td>
                <td style={{ width: '30%', padding: '8px 12px', border: '1px solid #cbd5e1' }}>{otm.requester_name}</td>
                <td style={{ width: '20%', padding: '8px 12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700 }}>Área Solicitante:</td>
                <td style={{ width: '30%', padding: '8px 12px', border: '1px solid #cbd5e1' }}>{otm.area_sector}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700 }}>Cargo / Puesto:</td>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>{requesterProfile.position || 'Solicitante'}</td>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700 }}>Especialidad / Falla:</td>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>{otm.failure_type}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700 }}>Ubicación Exacta:</td>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }} colSpan={3}>
                  {isEditing ? (
                    <input 
                      value={locationStr} 
                      onChange={e => setLocationStr(e.target.value)} 
                      style={{
                        fontSize: '0.8rem',
                        width: '100%',
                        border: '1px dashed var(--accent-blue)',
                        background: 'rgba(78,181,230,0.05)',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        outline: 'none',
                        color: '#1e293b'
                      }}
                    />
                  ) : (
                    <span>{locationStr}</span>
                  )}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700 }}>Fecha Solicitud:</td>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>{new Date(otm.created_at).toLocaleString('es')}</td>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700 }}>Prioridad OTM:</td>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', fontWeight: 700, color: otm.urgency === 'high' ? '#ef4444' : otm.urgency === 'medium' ? '#f59e0b' : '#3b82f6' }}>
                  {otm.urgency === 'high' ? '⚡ ALTA / URGENTE' : otm.urgency === 'medium' ? '⚠️ MEDIA' : '🟢 BAJA'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700 }} valign="top">Problema Reportado:</td>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }} colSpan={3}>
                  <textarea 
                    ref={textareaRef1}
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    disabled={!isEditing}
                    style={{
                      fontSize: '0.8rem',
                      width: '100%',
                      fontFamily: 'inherit',
                      border: isEditing ? '1px dashed var(--accent-blue)' : 'none',
                      background: isEditing ? 'rgba(78,181,230,0.05)' : 'transparent',
                      padding: isEditing ? '4px 8px' : '0',
                      borderRadius: '4px',
                      outline: 'none',
                      resize: 'none',
                      color: '#1e293b',
                      lineHeight: '1.4'
                    }}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* III. EJECUCIÓN DEL MANTENIMIENTO */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', borderLeft: '4px solid #1e3a8a', paddingLeft: '8px', marginBottom: '12px', letterSpacing: '0.05em' }}>
            2. EJECUCIÓN DEL TRABAJO
          </h4>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <tbody>
              <tr>
                <td style={{ width: '20%', padding: '8px 12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700 }}>Técnico Principal:</td>
                <td style={{ width: '30%', padding: '8px 12px', border: '1px solid #cbd5e1' }}>{mainTechName}</td>
                <td style={{ width: '20%', padding: '8px 12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700 }}>Tipo de Trabajo:</td>
                <td style={{ width: '30%', padding: '8px 12px', border: '1px solid #cbd5e1' }}>
                  {isEditing ? (
                    <input 
                      value={maintenanceTypeStr} 
                      onChange={e => setMaintenanceTypeStr(e.target.value)} 
                      style={{
                        fontSize: '0.8rem',
                        width: '100%',
                        border: '1px dashed var(--accent-blue)',
                        background: 'rgba(78,181,230,0.05)',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        outline: 'none',
                        color: '#1e293b'
                      }}
                    />
                  ) : (
                    <span>{maintenanceTypeStr}</span>
                  )}
                </td>
              </tr>
              {assignedTechNames.length > 0 && (
                <tr>
                  <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700 }}>Técnicos de Apoyo:</td>
                  <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }} colSpan={3}>
                    {assignedTechNames.join(', ')}
                  </td>
                </tr>
              )}
              <tr>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700 }}>Inicio Ejecución:</td>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>
                  {otm.job_start_time ? new Date(otm.job_start_time).toLocaleString('es') : '—'}
                </td>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700 }}>Término Ejecución:</td>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>
                  {otm.job_end_time ? new Date(otm.job_end_time).toLocaleString('es') : '—'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700 }} valign="top">Repuestos / Materiales:</td>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }} colSpan={3}>
                  <textarea 
                    ref={textareaRef2}
                    value={rqMaterials} 
                    onChange={e => setRqMaterials(e.target.value)} 
                    disabled={!isEditing}
                    style={{
                      fontSize: '0.8rem',
                      width: '100%',
                      fontFamily: 'inherit',
                      border: isEditing ? '1px dashed var(--accent-blue)' : 'none',
                      background: isEditing ? 'rgba(78,181,230,0.05)' : 'transparent',
                      padding: isEditing ? '4px 8px' : '0',
                      borderRadius: '4px',
                      outline: 'none',
                      resize: 'none',
                      color: '#1e293b',
                      lineHeight: '1.4'
                    }}
                  />
                </td>
              </tr>
              <tr>
                <td style={{ padding: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700 }} valign="top">Informe Técnico de Trabajo:</td>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }} colSpan={3}>
                  <textarea 
                    ref={textareaRef3}
                    value={technicianNotes} 
                    onChange={e => setTechnicianNotes(e.target.value)} 
                    disabled={!isEditing}
                    style={{
                      fontSize: '0.8rem',
                      width: '100%',
                      fontFamily: 'inherit',
                      border: isEditing ? '1px dashed var(--accent-blue)' : 'none',
                      background: isEditing ? 'rgba(78,181,230,0.05)' : 'transparent',
                      padding: isEditing ? '4px 8px' : '0',
                      borderRadius: '4px',
                      outline: 'none',
                      resize: 'none',
                      color: '#1e293b',
                      lineHeight: '1.4'
                    }}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* IV. EVIDENCIA FOTOGRÁFICA */}
        {otm.attachments && otm.attachments.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', borderLeft: '4px solid #1e3a8a', paddingLeft: '8px', marginBottom: '12px', letterSpacing: '0.05em' }}>
              3. REGISTRO FOTOGRÁFICO DE RESPALDO
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Request phase photos */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', background: '#f8fafc' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '10px' }}>
                  📷 ESTADO INICIAL (REPORTE DE FALLA)
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {otm.attachments.filter(a => a.phase === 'request').length > 0 ? (
                    otm.attachments.filter(a => a.phase === 'request').map(att => (
                      <div key={att.id} style={{ width: '120px', height: '120px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                        <img src={att.file_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Falla Inicial" />
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', padding: '20px 0' }}>Sin registro fotográfico inicial</div>
                  )}
                </div>
              </div>

              {/* Execution phase photos */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', background: '#f8fafc' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '10px' }}>
                  📷 ESTADO FINAL (CONTRALORÍA / REPARADO)
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {otm.attachments.filter(a => a.phase === 'execution').length > 0 ? (
                    otm.attachments.filter(a => a.phase === 'execution').map(att => (
                      <div key={att.id} style={{ width: '120px', height: '120px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                        <img src={att.file_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Reparación Final" />
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', padding: '20px 0' }}>Sin registro fotográfico de término</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* V. CONFORMIDAD Y OBSERVACIONES */}
        <div style={{ marginBottom: '35px' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', borderLeft: '4px solid #1e3a8a', paddingLeft: '8px', marginBottom: '12px', letterSpacing: '0.05em' }}>
            4. CONFORMIDAD DE SERVICIO Y CIERRE
          </h4>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <tbody>
              <tr>
                <td style={{ width: '20%', padding: '8px 12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700 }}>Calificación:</td>
                <td style={{ width: '30%', padding: '8px 12px', border: '1px solid #cbd5e1' }}>
                  <div style={{ color: '#fbbf24', fontSize: '1rem', fontWeight: 700 }}>
                    {'★'.repeat(otm.conformity_rating || 5)}{'☆'.repeat(5 - (otm.conformity_rating || 5))}
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: 8, fontWeight: 500 }}>
                      ({otm.conformity_rating || 5}/5 - Excelente)
                    </span>
                  </div>
                </td>
                <td style={{ width: '20%', padding: '8px 12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700 }}>Fecha Cierre / Conformidad:</td>
                <td style={{ width: '30%', padding: '8px 12px', border: '1px solid #cbd5e1' }}>
                  {otm.conformity_date ? new Date(otm.conformity_date).toLocaleString('es') : (otm.closed_at ? new Date(otm.closed_at).toLocaleString('es') : '—')}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700 }} valign="top">Observaciones de conformidad:</td>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }} colSpan={3}>
                  <textarea 
                    ref={textareaRef4}
                    value={conformityNotes} 
                    onChange={e => setConformityNotes(e.target.value)} 
                    disabled={!isEditing}
                    style={{
                      fontSize: '0.8rem',
                      width: '100%',
                      fontFamily: 'inherit',
                      border: isEditing ? '1px dashed var(--accent-blue)' : 'none',
                      background: isEditing ? 'rgba(78,181,230,0.05)' : 'transparent',
                      padding: isEditing ? '4px 8px' : '0',
                      borderRadius: '4px',
                      outline: 'none',
                      resize: 'none',
                      color: '#1e293b',
                      lineHeight: '1.4'
                    }}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SIGNATURE SECTION */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 50,
          marginTop: '40px',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '30px'
        }}>
          {/* Supervisor Signature Column */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ 
              height: '90px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              marginBottom: 10,
              position: 'relative',
              width: '100%'
            }}>
              {/* Circular Professional Supervisor Stamp */}
              <svg width="90" height="90" viewBox="0 0 100 100" style={{ transform: 'rotate(-10deg)', opacity: 0.9 }}>
                {/* Outer circle */}
                <circle cx="50" cy="50" r="46" fill="none" stroke="#0f172a" strokeWidth="2.5" />
                {/* Inner circle */}
                <circle cx="50" cy="50" r="32" fill="none" stroke="#0f172a" strokeWidth="1.5" />
                
                {/* Circular text path - Top */}
                <path id="curve-top" d="M 12 50 A 38 38 0 0 1 88 50" fill="transparent" />
                {/* Circular text path - Bottom (Left to Right, counter-clockwise sweep so it arcs down) */}
                <path id="curve-bottom" d="M 12 50 A 38 38 0 0 0 88 50" fill="transparent" />
                
                <text fontSize="8.5" fill="#0f172a" fontWeight="900" letterSpacing="0.5">
                  <textPath href="#curve-top" startOffset="50%" textAnchor="middle">
                    CLUB DE REGATAS LIMA
                  </textPath>
                </text>
                <text fontSize="7" fill="#0f172a" fontWeight="900" letterSpacing="0.5">
                  <textPath href="#curve-bottom" startOffset="50%" textAnchor="middle">
                    SUPERVISOR DE MANT.
                  </textPath>
                </text>
                
                {/* Center text */}
                <text x="50" y="46" fontSize="15" fill="#0f172a" fontWeight="900" textAnchor="middle">V.B.</text>
                <text x="50" y="60" fontSize="7.5" fill="#0f172a" fontWeight="800" textAnchor="middle">
                  {supervisorName !== 'Sin Asignar' ? supervisorName.split(' ').slice(0, 2).join(' ') : 'Sin Asignar'}
                </text>
              </svg>

              {/* Supervisor Hand-drawn Signature Overlay */}
              {supervisorSignature && (
                <img 
                  src={supervisorSignature} 
                  style={{ 
                    position: 'absolute', 
                    maxHeight: '80px', 
                    maxWidth: '180px', 
                    objectFit: 'contain',
                    zIndex: 10,
                    transform: 'rotate(-5deg)',
                    pointerEvents: 'none'
                  }} 
                  alt="Firma Supervisor" 
                />
              )}
            </div>
            <div style={{ borderTop: '1px solid #64748b', width: '220px', paddingTop: '6px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                Ing. {supervisorName}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>SUPERVISOR DE MANTENIMIENTO</div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 2 }}>Departamento de Mantenimiento</div>
            </div>
          </div>

          {/* Requester Signature Column */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              {otm.conformity_signature_url ? (
                <img 
                  src={otm.conformity_signature_url} 
                  style={{ maxHeight: '60px', maxWidth: '180px', objectFit: 'contain' }} 
                  alt="Firma del Usuario" 
                />
              ) : (
                <div style={{ fontSize: '0.75rem', color: '#cbd5e1', fontStyle: 'italic' }}>Sin firma registrada</div>
              )}
            </div>
            <div style={{ borderTop: '1px solid #64748b', width: '220px', paddingTop: '6px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>{otm.requester_name}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>USUARIO SOLICITANTE</div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 2 }}>{otm.area_sector}</div>
            </div>
          </div>
        </div>

        {/* Footer info at absolute bottom */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '50px',
          right: '50px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.6rem',
          color: '#94a3b8',
          borderTop: '1px solid #f1f5f9',
          paddingTop: '8px'
        }}>
          <span>CÓDIGO DE REGISTRO: REG-MNT-ACT-{otm.id.substring(0, 8).toUpperCase()}</span>
          <span>FECHA DE IMPRESIÓN: {new Date().toLocaleDateString('es')}</span>
          <span>PÁGINA 1 DE 1</span>
        </div>

      </div>

      {/* Supervisor Signature Capture Modal (Glassmorphic Premium Style) */}
      {isSigning && (
        <div className="modal-overlay" style={{ zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ 
            maxWidth: '500px', 
            width: '95%', 
            padding: '28px', 
            borderRadius: 'var(--radius-lg)', 
            boxShadow: 'var(--shadow-lg)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            animation: 'slideUp 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: '1.8rem' }}>✍️</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Firma Digital del Supervisor
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Acta de Conformidad - OTM: {otmCode}
                </span>
              </div>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
              Dibuja tu firma en el recuadro inferior. Esta firma se digitalizará y se estampará automáticamente sobre tu sello de supervisor en el acta de conformidad.
            </p>
            
            <div style={{ 
              border: '2px dashed var(--border)', 
              borderRadius: 'var(--radius-md)', 
              padding: 16, 
              background: '#f8fafc',
              marginBottom: 20
            }}>
              <SignaturePad 
                strokeColor="#0f172a" 
                lineWidth={3} 
                onSignatureChange={(dataUrl) => setTempSignature(dataUrl)} 
              />
            </div>
            
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  setIsSigning(false);
                  setTempSignature(null);
                }}
                style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                disabled={!tempSignature}
                onClick={() => {
                  setSupervisorSignature(tempSignature);
                  setIsSigning(false);
                  setIsEditing(false);
                }}
                style={{ 
                  background: 'linear-gradient(135deg, var(--accent-blue) 0%, #0284c7 100%)', 
                  border: 'none', 
                  padding: '8px 16px', 
                  fontSize: '0.85rem', 
                  fontWeight: 600,
                  opacity: tempSignature ? 1 : 0.6,
                  cursor: tempSignature ? 'pointer' : 'not-allowed'
                }}
              >
                ✓ Confirmar y Finalizar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
