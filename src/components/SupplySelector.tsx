import React, { useState, useMemo } from 'react';
import { SupplyUsed } from '../types';
import inventoryData from '../lib/mockInventoryData.json';

interface SupplySelectorProps {
  supplies: SupplyUsed[];
  onChange: (supplies: SupplyUsed[]) => void;
}

export default function SupplySelector({ supplies, onChange }: SupplySelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState<number | ''>('');
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredInventory = useMemo(() => {
    if (!searchTerm) return [];
    return inventoryData
      .filter((item: any) => 
        item.Descripción && item.Descripción.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 50);
  }, [searchTerm]);

  const handleAddSupply = (item: any) => {
    const qty = Number(selectedQuantity);
    if (!qty || qty <= 0) {
      alert("Por favor ingrese una cantidad válida");
      return;
    }
    
    const newSupply: SupplyUsed = {
      itemCode: item['Item No.'],
      name: item['Descripción'],
      unit: item['Unidad'],
      unitPrice: item['Precio'],
      quantity: qty,
      totalCost: item['Precio'] * qty
    };

    onChange([...supplies, newSupply]);
    setSearchTerm('');
    setSelectedQuantity('');
    setShowDropdown(false);
  };

  const handleRemoveSupply = (index: number) => {
    onChange(supplies.filter((_, i) => i !== index));
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.5)', padding: 16, borderRadius: 8, border: '1px solid var(--border)', marginBottom: 20 }}>
      <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>🔧</span> Suministros Usados del Almacén
      </label>
      
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'relative', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 180px', position: 'relative', minWidth: 0 }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="🔍 Buscar material..." 
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            style={{ width: '100%' }}
          />
          
          {showDropdown && filteredInventory.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4, zIndex: 10, maxHeight: 200, overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
              {filteredInventory.map((item: any) => (
                <div 
                  key={item['Item No.']}
                  style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => {
                    setSearchTerm(item['Descripción']);
                    setShowDropdown(false);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                >
                  <div style={{ fontSize: '0.85rem', color: '#0f172a' }}>{item['Descripción']}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', flexShrink: 0, marginLeft: 8 }}>{item['Unidad']} - S/ {item['Precio']}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ width: 75 }}>
          <input 
            type="number" 
            className="form-input" 
            placeholder="Cant." 
            min="0.01" 
            step="0.01"
            value={selectedQuantity}
            onChange={e => setSelectedQuantity(e.target.value === '' ? '' : Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
        <button 
          type="button" 
          className="btn btn-secondary" 
          style={{ padding: '0 12px', height: 40, fontSize: '0.85rem', whiteSpace: 'nowrap' }}
          onClick={() => {
            const item = inventoryData.find((i: any) => i['Descripción'] === searchTerm);
            if (item) handleAddSupply(item);
            else alert("Seleccione un material válido de la lista");
          }}
        >
          + Agregar
        </button>
      </div>

      {supplies.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '8px 4px' }}>Código</th>
                <th style={{ padding: '8px 4px' }}>Descripción</th>
                <th style={{ padding: '8px 4px' }}>Cant.</th>
                <th style={{ padding: '8px 4px' }}>Costo Unit.</th>
                <th style={{ padding: '8px 4px' }}>Total</th>
                <th style={{ padding: '8px 4px', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {supplies.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 4px', color: '#64748b' }}>{s.itemCode}</td>
                  <td style={{ padding: '8px 4px', fontWeight: 500 }}>{s.name}</td>
                  <td style={{ padding: '8px 4px' }}>{s.quantity} {s.unit}</td>
                  <td style={{ padding: '8px 4px' }}>S/ {s.unitPrice?.toFixed(2)}</td>
                  <td style={{ padding: '8px 4px', fontWeight: 600 }}>S/ {s.totalCost?.toFixed(2)}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                    <button type="button" onClick={() => handleRemoveSupply(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>🗑</button>
                  </td>
                </tr>
              ))}
              <tr style={{ background: '#f8fafc', fontWeight: 600 }}>
                <td colSpan={4} style={{ padding: '8px 4px', textAlign: 'right' }}>Costo Total Suministros:</td>
                <td colSpan={2} style={{ padding: '8px 4px', color: '#8b5cf6' }}>
                  S/ {supplies.reduce((sum, s) => sum + (s.totalCost || 0), 0).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
