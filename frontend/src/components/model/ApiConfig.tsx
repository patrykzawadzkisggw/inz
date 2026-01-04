"use client";
import React, { useState } from 'react';
import Input2 from '../custom/Input2';
import Select2 from '../custom/Select2';

interface ApiConfigProps {
  showInterval?: boolean;
  titleSuffix?: string; 
  initialIntervalValue?: number;
  initialIntervalUnit?: 'm' | 'h' | 'd';
}

export const ApiConfig: React.FC<ApiConfigProps> = ({ showInterval = true, initialIntervalValue, initialIntervalUnit }) => {
  const [intervalValue, setIntervalValue] = useState<number>(initialIntervalValue ?? 5);
  type Unit = 'm'|'h'|'d'
  const [intervalUnit, setIntervalUnit] = useState<Unit>(initialIntervalUnit ?? 'm');

  React.useEffect(() => {
    if (typeof initialIntervalValue === 'number' && initialIntervalValue > 0) setIntervalValue(initialIntervalValue)
  }, [initialIntervalValue])
  React.useEffect(() => {
    if (initialIntervalUnit === 'm' || initialIntervalUnit === 'h' || initialIntervalUnit === 'd') setIntervalUnit(initialIntervalUnit)
  }, [initialIntervalUnit])
  return (
    <div className="grid gap-4">
      <div className={`grid gap-4`}>
        {showInterval && (
          <div className="space-y-2">
            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Interwał pobierania</label>
            <div className="grid grid-cols-3 gap-2 items-end">
              <div className="col-span-2">
                <label className="block mb-1 text-xs text-gray-700 dark:text-gray-300">Wartość</label>
                <Input2 type="number" min={1} name="interval_value" value={intervalValue} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setIntervalValue(Number(e.target.value || 0))} />
              </div>
              <div>
                <label className="block mb-1 text-xs text-gray-700 dark:text-gray-300">Jednostka</label>
                <Select2 name="interval_unit" value={intervalUnit} onChange={(e)=>setIntervalUnit(e.target.value as Unit)}>
                  <option value="m">Minuty</option>
                  <option value="h">Godziny</option>
                  <option value="d">Dni</option>
                </Select2>
              </div>
            </div>
          </div>
        )}
      </div>
      <div>
      </div>
    </div>
  );
};
