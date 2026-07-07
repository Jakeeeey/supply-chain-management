import React from 'react';
import { DemoData } from '../types/demo.types';

interface DemoComponentProps {
  data?: DemoData;
}

export const DemoComponent: React.FC<DemoComponentProps> = ({ data }) => {
  return (
    <div className="p-4 border rounded shadow-sm">
      <h2 className="text-xl font-bold mb-2">Demo Module Component</h2>
      {data ? (
        <div>
          <p>ID: {data.id}</p>
          <p>Name: {data.name}</p>
        </div>
      ) : (
        <p>No data provided to DemoComponent.</p>
      )}
    </div>
  );
};
