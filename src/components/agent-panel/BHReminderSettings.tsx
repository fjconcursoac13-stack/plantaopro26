import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Bell, Sun, Sunset, Moon, Check } from 'lucide-react';
import { toast } from 'sonner';

interface BHReminderSettingsProps {
  agentId: string;
  onReminderHourChange?: (hour: number) => void;
}

type ReminderPeriod = 'morning' | 'afternoon' | 'night';

interface PeriodOption {
  value: ReminderPeriod;
  label: string;
  description: string;
  hour: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  {
    value: 'morning',
    label: 'Manhã',
    description: '8h - Início do dia',
    hour: 8,
    icon: Sun,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20',
  },
  {
    value: 'afternoon',
    label: 'Tarde',
    description: '14h - Após o almoço',
    hour: 14,
    icon: Sunset,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20',
  },
  {
    value: 'night',
    label: 'Noite',
    description: '18h - Fim do expediente',
    hour: 18,
    icon: Moon,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20',
  },
];

const STORAGE_KEY = 'bh_reminder_period';

export function BHReminderSettings({ agentId, onReminderHourChange }: BHReminderSettingsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<ReminderPeriod>('night');

  // Load saved preference
  useEffect(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${agentId}`);
    if (stored) {
      const period = stored as ReminderPeriod;
      if (PERIOD_OPTIONS.some(p => p.value === period)) {
        setSelectedPeriod(period);
        const option = PERIOD_OPTIONS.find(p => p.value === period);
        if (option && onReminderHourChange) {
          onReminderHourChange(option.hour);
        }
      }
    }
  }, [agentId, onReminderHourChange]);

  const handlePeriodChange = (value: ReminderPeriod) => {
    setSelectedPeriod(value);
    localStorage.setItem(`${STORAGE_KEY}_${agentId}`, value);
    
    const option = PERIOD_OPTIONS.find(p => p.value === value);
    if (option) {
      if (onReminderHourChange) {
        onReminderHourChange(option.hour);
      }
      
      toast.success(
        <div className="flex items-center gap-2">
          <option.icon className={`h-4 w-4 ${option.color}`} />
          <span>Lembrete configurado para às <strong>{option.hour}h</strong></span>
        </div>,
        { duration: 3000 }
      );
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <Bell className="h-4 w-4 text-amber-500" />
          Horário do Lembrete de BH
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-slate-500 mb-3">
          Escolha quando deseja receber o lembrete diário para registrar seu BH
        </p>
        
        <RadioGroup
          value={selectedPeriod}
          onValueChange={(value) => handlePeriodChange(value as ReminderPeriod)}
          className="grid grid-cols-3 gap-2"
        >
          {PERIOD_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedPeriod === option.value;
            
            return (
              <Label
                key={option.value}
                htmlFor={`period-${option.value}`}
                className={`
                  relative flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all
                  ${isSelected ? option.bgColor + ' ring-1 ring-offset-0' : 'bg-slate-700/30 border-slate-600/50 hover:bg-slate-700/50'}
                  ${isSelected ? `ring-${option.color.split('-')[1]}-500/50` : ''}
                `}
              >
                <RadioGroupItem
                  value={option.value}
                  id={`period-${option.value}`}
                  className="sr-only"
                />
                
                {isSelected && (
                  <div className="absolute top-1 right-1">
                    <Check className={`h-3 w-3 ${option.color}`} />
                  </div>
                )}
                
                <Icon className={`h-5 w-5 mb-1 ${isSelected ? option.color : 'text-slate-400'}`} />
                <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                  {option.label}
                </span>
                <span className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                  {option.hour}h
                </span>
              </Label>
            );
          })}
        </RadioGroup>

        <div className="mt-3 p-2 bg-slate-700/20 rounded-lg border border-slate-600/30">
          <p className="text-[10px] text-slate-400 text-center">
            📝 O lembrete só aparece se você ainda não registrou BH no dia
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook to get saved reminder hour
export function useBHReminderHour(agentId: string): number {
  const [hour, setHour] = useState(18); // Default: night (6 PM)

  useEffect(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${agentId}`);
    if (stored) {
      const option = PERIOD_OPTIONS.find(p => p.value === stored);
      if (option) {
        setHour(option.hour);
      }
    }
  }, [agentId]);

  return hour;
}
