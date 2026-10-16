import React, { useEffect, useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { treeData } from '../data/treeData';

interface CategoryCascaderProps {
  value: string;
  onChange: (value: string) => void;
  allowAll?: boolean;
  disabledLevels?: [boolean, boolean, boolean];
}

function CustomSelect({ 
  value, 
  onChange, 
  options, 
  disabled = false, 
}: { 
  value: number; 
  onChange: (val: number) => void; 
  options: {value: number, label: string}[]; 
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative flex-1 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} ref={dropdownRef}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="w-full bg-[#1a1b1e]/80 backdrop-blur-md border border-white/10 hover:border-amber-500/30 rounded-xl px-4 py-3.5 text-[14px] text-[#E0E0E0] transition-colors flex justify-between items-center z-10"
      >
        <span className="truncate pr-4 select-none">{selectedOption ? selectedOption.label : "请选择"}</span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 opacity-60 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-[#1a1b1e]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] max-h-60 overflow-y-auto py-1.5 custom-scrollbar origin-top animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`px-4 py-2.5 text-[14px] cursor-pointer transition-colors select-none mx-1.5 rounded-lg
                ${value === opt.value ? 'bg-amber-500/20 text-amber-500 font-medium' : 'text-[#E0E0E0] hover:bg-white/10'}`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoryCascader({ value, onChange, allowAll = false, disabledLevels = [false, false, false] }: CategoryCascaderProps) {
  const [l1Idx, setL1Idx] = useState<number>(allowAll && value === "全部" ? -1 : 0);
  const [l2Idx, setL2Idx] = useState(0);
  const [l3Idx, setL3Idx] = useState(0);

  // 根据传入的 value (如 "健康与精力 / 身体健康 / 运动记录") 回填级联下拉框的状态
  useEffect(() => {
    if (!value) return;
    if (allowAll && value === "全部") {
      setL1Idx(-1);
      setL2Idx(0);
      setL3Idx(0);
      return;
    }
    const parts = value.split(' / ');
    const v1 = parts[0]?.trim();
    const v2 = parts[1]?.trim();
    const v3 = parts[2]?.trim();

    const getName = (label: string) => label.split('(')[0].trim();
    
    let i1 = treeData.findIndex(n => getName(n.label) === v1);
    if (i1 === -1) i1 = 0;
    
    const l1Node = treeData[i1] || treeData[0];
    let i2 = v2 ? l1Node.children?.findIndex(n => getName(n.label) === v2) : (allowAll ? -1 : 0);
    if (i2 === undefined || (i2 === -1 && !allowAll)) i2 = 0;

    const l2Node = i2 !== -1 ? (l1Node.children?.[i2] || l1Node.children?.[0]) : null;
    let i3 = v3 ? l2Node?.children?.findIndex(n => n.label.trim() === v3) : (allowAll ? -1 : 0);
    if (i3 === undefined || (i3 === -1 && !allowAll)) i3 = 0;

    setL1Idx(i1);
    setL2Idx(i2);
    setL3Idx(i3);
  }, [value]);

  const updateValue = (i1: number, i2: number, i3: number) => {
    const getName = (label: string) => label.split('(')[0].trim();
    
    if (i1 === -1) {
      onChange("全部");
      return;
    }
    const l1Node = treeData[i1];
    if (i2 === -1) {
      onChange(getName(l1Node.label));
      return;
    }
    const l2Node = l1Node?.children?.[i2];
    if (i3 === -1) {
      onChange(`${getName(l1Node.label)} / ${getName(l2Node.label)}`);
      return;
    }
    const l3Node = l2Node?.children?.[i3];

    if (l1Node && l2Node && l3Node) {
      const tagValue = `${getName(l1Node.label)} / ${getName(l2Node.label)} / ${l3Node.label.trim()}`;
      onChange(tagValue);
    }
  };

  const handleL1Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value, 10);
    if (idx === -1) {
      setL1Idx(-1);
      onChange("全部");
    } else {
      const nextL2 = allowAll ? -1 : 0;
      const nextL3 = allowAll ? -1 : 0;
      setL1Idx(idx);
      setL2Idx(nextL2);
      setL3Idx(nextL3);
      updateValue(idx, nextL2, nextL3);
    }
  };

  const handleL2Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value, 10);
    const nextL3 = allowAll ? -1 : 0;
    setL2Idx(idx);
    setL3Idx(nextL3);
    updateValue(l1Idx, idx, nextL3);
  };

  const handleL3Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value, 10);
    setL3Idx(idx);
    updateValue(l1Idx, l2Idx, idx);
  };

  const currentL1 = l1Idx === -1 ? null : treeData[l1Idx];
  const currentL2 = l2Idx === -1 ? null : currentL1?.children?.[l2Idx];
  const l1Options = treeData;
  const l2Options = currentL1?.children || [];
  const l3Options = currentL2?.children || [];

  // 构造 L1 Options
  const l1OptData = [];
  if (allowAll) l1OptData.push({ value: -1, label: "全部档案" });
  l1Options.forEach((opt, i) => l1OptData.push({ value: i, label: opt.label.split('(')[0].trim() }));

  // 构造 L2 Options
  const l2OptData = [];
  if (allowAll) l2OptData.push({ value: -1, label: "全部" });
  l2Options.forEach((opt, i) => l2OptData.push({ value: i, label: opt.label.split('(')[0].trim() }));

  // 构造 L3 Options
  const l3OptData = [];
  if (allowAll) l3OptData.push({ value: -1, label: "全部" });
  l3Options.forEach((opt, i) => l3OptData.push({ value: i, label: opt.label.trim() }));

  return (
    <div className="flex flex-col md:flex-row gap-3 w-full">
      <CustomSelect 
        value={l1Idx} 
        onChange={(val) => handleL1Change({ target: { value: String(val) } } as any)} 
        options={l1OptData} 
        disabled={disabledLevels[0]}
      />
      <CustomSelect 
        value={l2Idx} 
        onChange={(val) => handleL2Change({ target: { value: String(val) } } as any)} 
        options={l2OptData} 
        disabled={disabledLevels[1] || l1Idx === -1 || l2Options.length === 0}
      />
      <CustomSelect 
        value={l3Idx} 
        onChange={(val) => handleL3Change({ target: { value: String(val) } } as any)} 
        options={l3OptData} 
        disabled={disabledLevels[2] || l2Idx === -1 || l1Idx === -1 || l3Options.length === 0}
      />
    </div>
  );
}
