'use client';

import React from 'react';
import { SummaryOrderGroup } from '../hooks/use-stock-transfer-summary';
import { CompanyData, ProductRow } from '../../types/stock-transfer.types';

interface PrintTemplateProps {
  group: SummaryOrderGroup;
  companyData: CompanyData | null;
  getBranchName: (id: number | null) => string;
  getUserName: (id: number | null | undefined) => string;
  getUnitName: (id: unknown) => string;
}

export const PrintTemplate = React.forwardRef<HTMLDivElement, PrintTemplateProps>(({
  group,
  companyData,
  getBranchName,
  getUserName,
  getUnitName,
}, ref) => {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    try {
      return new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  const grandTotal = group.totalAmount;

  return (
    <div 
      ref={ref}
      style={{ 
        width: '210mm', // A4 width
        minHeight: '297mm', // A4 height
        padding: '15mm',
        backgroundColor: 'white',
        color: 'black',
        fontFamily: 'Arial, sans-serif',
        position: 'relative',
        fontSize: '12px',
        lineHeight: '1.4'
      }}
    >
      {/* Corporate Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10mm', borderBottom: '2px solid black', paddingBottom: '5mm' }}>
        {companyData?.company_logo && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img 
            src={companyData.company_logo} 
            alt="Logo" 
            crossOrigin="anonymous"
            style={{ width: '100px', height: 'auto', marginRight: '15px' }} 
          />
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase' }}>
            {companyData?.company_name || 'VOS WEB SUPPLY CHAIN'}
          </h1>
          <p style={{ margin: '2px 0', fontSize: '10px', color: '#444' }}>
            {companyData?.company_address}, {companyData?.company_brgy}, {companyData?.company_city}, {companyData?.company_province}
          </p>
          <p style={{ margin: '2px 0', fontSize: '10px', color: '#444' }}>
            Contact: {companyData?.company_contact} | Email: {companyData?.company_email}
          </p>
        </div>
      </div>

      {/* Document Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '5mm' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>STOCK TRANSFER SLIP</h2>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>NO: {group.orderNo}</p>
        </div>
      </div>

      {/* Info Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '0', 
        border: '1px solid #ccc', 
        borderRadius: '4px', 
        marginBottom: '10mm',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '8px', borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
          <label style={{ fontSize: '9px', color: '#666', fontWeight: 'bold', display: 'block', textTransform: 'uppercase' }}>Source Branch</label>
          <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{getBranchName(group.sourceBranch)}</span>
        </div>
        <div style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>
          <label style={{ fontSize: '9px', color: '#666', fontWeight: 'bold', display: 'block', textTransform: 'uppercase' }}>Target Branch</label>
          <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{getBranchName(group.targetBranch)}</span>
        </div>
        <div style={{ padding: '8px', borderRight: '1px solid #ccc' }}>
          <label style={{ fontSize: '9px', color: '#666', fontWeight: 'bold', display: 'block', textTransform: 'uppercase' }}>Date Requested</label>
          <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{formatDate(group.dateRequested)}</span>
        </div>
        <div style={{ padding: '8px' }}>
          <label style={{ fontSize: '9px', color: '#666', fontWeight: 'bold', display: 'block', textTransform: 'uppercase' }}>Status</label>
          <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{(group.status || 'PENDING').toUpperCase()}</span>
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15mm' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid black', backgroundColor: '#f9f9f9' }}>
            <th style={{ textAlign: 'left', padding: '8px', fontSize: '10px', textTransform: 'uppercase' }}>Brand</th>
            <th style={{ textAlign: 'left', padding: '8px', fontSize: '10px', textTransform: 'uppercase' }}>Product Name</th>
            <th style={{ textAlign: 'center', padding: '8px', fontSize: '10px', textTransform: 'uppercase' }}>Unit</th>
            <th style={{ textAlign: 'center', padding: '8px', fontSize: '10px', textTransform: 'uppercase' }}>Qty</th>
            <th style={{ textAlign: 'right', padding: '8px', fontSize: '10px', textTransform: 'uppercase' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {group.items.map((item, idx) => {
             const product = typeof item.product_id === 'object' ? (item.product_id as ProductRow) : null;
             const brand = typeof product?.product_brand === 'object' ? product.product_brand?.brand_name : 'N/A';
             const unit = getUnitName(product?.unit_of_measurement);
             
             return (
               <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                 <td style={{ padding: '8px', fontSize: '11px' }}>{brand}</td>
                 <td style={{ padding: '8px', fontSize: '11px' }}>{product?.product_name || `ID: ${item.product_id}`}</td>
                 <td style={{ padding: '8px', fontSize: '11px', textAlign: 'center' }}>{unit}</td>
                 <td style={{ padding: '8px', fontSize: '11px', textAlign: 'center' }}>{item.ordered_quantity}</td>
                 <td style={{ padding: '8px', fontSize: '11px', textAlign: 'right', fontWeight: 'bold' }}>
                   PHP {Number(item.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                 </td>
               </tr>
             );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} style={{ padding: '15px 8px 8px' }}></td>
            <td style={{ padding: '15px 8px 8px', textAlign: 'right', fontSize: '10px', fontWeight: 'bold', borderTop: '2px solid #333' }}>GRAND TOTAL</td>
            <td style={{ padding: '15px 8px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold', borderTop: '2px solid #333', color: '#059669' }}>
              PHP {grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Signature Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '10mm' }}>
        {[
          { label: 'PREPARED BY', value: getUserName(group.encoderId), date: group.dateRequested },
          { label: 'APPROVED BY', value: group.dateApproved ? getUserName(group.approverId) : '', date: group.dateApproved },
          { label: 'RECEIVED BY', value: group.dateReceived ? getUserName(group.receiverId) : '', date: group.dateReceived },
        ].map((sig, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ borderBottom: '1px solid black', height: '30px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontWeight: 'bold' }}>
              {sig.value}
            </div>
            <div style={{ fontSize: '9px', fontWeight: 'bold', marginTop: '5px' }}>{sig.label}</div>
            <div style={{ fontSize: '8px', color: '#666', marginTop: '2px' }}>Date: {formatDate(sig.date as string)}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: '10mm', left: '15mm', right: '15mm', borderTop: '1px solid #eee', paddingTop: '5mm', textAlign: 'center', fontSize: '9px', color: '#999' }}>
        Printed: {new Date().toLocaleString('en-PH')} · VOS Web Supply Chain Management System
      </div>
    </div>
  );
});

PrintTemplate.displayName = 'PrintTemplate';
