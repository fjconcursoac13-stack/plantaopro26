import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimePicker } from "@/components/ui/time-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { NumberStepper } from "@/components/ui/number-stepper";
import { Eye, Route, Moon, Clock, Users, Calculator, Save, FolderOpen, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface TimeSlot {
  agent: number;
  start: string;
  end: string;
  duration: string;
}

interface SavedConfig {
  id: string;
  config_name: string;
  config_type: string;
  start_time: string;
  end_time: string;
  agent_count: number;
}

interface ShiftPlannerCardProps {
  agentId?: string;
}

const ShiftPlannerCard = ({ agentId }: ShiftPlannerCardProps) => {
  // Vigilância (Quarto de Hora)
  const [vigilanceStartTime, setVigilanceStartTime] = useState("22:00");
  const [vigilanceEndTime, setVigilanceEndTime] = useState("06:00");
  const [vigilanceAgentCount, setVigilanceAgentCount] = useState(4);
  const [vigilanceSlots, setVigilanceSlots] = useState<TimeSlot[]>([]);

  // Rondas
  const [roundsStartTime, setRoundsStartTime] = useState("19:00");
  const [roundsEndTime, setRoundsEndTime] = useState("07:00");
  const [roundsAgentCount, setRoundsAgentCount] = useState(4);
  const [roundsSlots, setRoundsSlots] = useState<TimeSlot[]>([]);

  // Descanso
  const [restStartTime, setRestStartTime] = useState("00:00");
  const [restEndTime, setRestEndTime] = useState("06:00");
  const [restAgentCount, setRestAgentCount] = useState(4);
  const [restSlots, setRestSlots] = useState<TimeSlot[]>([]);

  // Saved configs
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [configName, setConfigName] = useState("");
  const [configTypeToSave, setConfigTypeToSave] = useState<"vigilance" | "rounds" | "rest">("vigilance");
  const [activeTab, setActiveTab] = useState("vigilance");

  useEffect(() => {
    if (agentId) {
      fetchSavedConfigs();
    }
  }, [agentId]);

  const fetchSavedConfigs = async () => {
    if (!agentId) return;
    try {
      setIsLoadingConfigs(true);
      const { data, error } = await (supabase as any)
        .from('shift_planner_configs')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedConfigs(data || []);
    } catch (error) {
      console.error('Error fetching configs:', error);
    } finally {
      setIsLoadingConfigs(false);
    }
  };

  const saveConfig = async () => {
    if (!agentId || !configName.trim()) {
      toast.error('Digite um nome para a configuração');
      return;
    }

    try {
      setIsSaving(true);
      
      let startTime, endTime, agentCount;
      
      if (configTypeToSave === 'vigilance') {
        startTime = vigilanceStartTime;
        endTime = vigilanceEndTime;
        agentCount = vigilanceAgentCount;
      } else if (configTypeToSave === 'rounds') {
        startTime = roundsStartTime;
        endTime = roundsEndTime;
        agentCount = roundsAgentCount;
      } else {
        startTime = restStartTime;
        endTime = restEndTime;
        agentCount = restAgentCount;
      }

      const { error } = await (supabase as any)
        .from('shift_planner_configs')
        .insert({
          agent_id: agentId,
          config_name: configName.trim(),
          config_type: configTypeToSave,
          start_time: startTime,
          end_time: endTime,
          agent_count: agentCount
        });

      if (error) throw error;

      toast.success('Configuração salva com sucesso!');
      setShowSaveDialog(false);
      setConfigName('');
      fetchSavedConfigs();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setIsSaving(false);
    }
  };

  const loadConfig = (config: SavedConfig) => {
    const startTime = config.start_time.substring(0, 5);
    const endTime = config.end_time.substring(0, 5);
    
    if (config.config_type === 'vigilance') {
      setVigilanceStartTime(startTime);
      setVigilanceEndTime(endTime);
      setVigilanceAgentCount(config.agent_count);
      setActiveTab('vigilance');
    } else if (config.config_type === 'rounds') {
      setRoundsStartTime(startTime);
      setRoundsEndTime(endTime);
      setRoundsAgentCount(config.agent_count);
      setActiveTab('rounds');
    } else {
      setRestStartTime(startTime);
      setRestEndTime(endTime);
      setRestAgentCount(config.agent_count);
      setActiveTab('rest');
    }
    
    toast.success(`Configuração "${config.config_name}" carregada!`);
  };

  const deleteConfig = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('shift_planner_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Configuração excluída!');
      fetchSavedConfigs();
    } catch (error) {
      console.error('Error deleting config:', error);
      toast.error('Erro ao excluir configuração');
    }
  };

  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const formatTime = (minutes: number): string => {
    const normalizedMinutes = ((minutes % 1440) + 1440) % 1440;
    const hours = Math.floor(normalizedMinutes / 60);
    const mins = normalizedMinutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  const calculateSlots = (
    startTime: string,
    endTime: string,
    agentCount: number
  ): TimeSlot[] => {
    if (agentCount <= 0) return [];

    let startMinutes = parseTime(startTime);
    let endMinutes = parseTime(endTime);

    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }

    const totalMinutes = endMinutes - startMinutes;
    const slotDuration = Math.floor(totalMinutes / agentCount);
    const remainder = totalMinutes % agentCount;

    const slots: TimeSlot[] = [];
    let currentStart = startMinutes;

    for (let i = 0; i < agentCount; i++) {
      const extraMinute = i < remainder ? 1 : 0;
      const duration = slotDuration + extraMinute;
      const slotEnd = currentStart + duration;

      slots.push({
        agent: i + 1,
        start: formatTime(currentStart),
        end: formatTime(slotEnd),
        duration: formatDuration(duration),
      });

      currentStart = slotEnd;
    }

    return slots;
  };

  const calculateVigilance = () => {
    setVigilanceSlots(
      calculateSlots(vigilanceStartTime, vigilanceEndTime, vigilanceAgentCount)
    );
  };

  const calculateRounds = () => {
    setRoundsSlots(
      calculateSlots(roundsStartTime, roundsEndTime, roundsAgentCount)
    );
  };

  const calculateRest = () => {
    setRestSlots(calculateSlots(restStartTime, restEndTime, restAgentCount));
  };

  const openSaveDialog = (type: "vigilance" | "rounds" | "rest") => {
    setConfigTypeToSave(type);
    setShowSaveDialog(true);
  };

  const getConfigTypeLabel = (type: string) => {
    switch (type) {
      case 'vigilance': return 'Vigilância';
      case 'rounds': return 'Rondas';
      case 'rest': return 'Descanso';
      default: return type;
    }
  };

  const renderTimeInputs = (
    startTime: string,
    setStartTime: (v: string) => void,
    endTime: string,
    setEndTime: (v: string) => void,
    agentCount: number,
    setAgentCount: (v: number) => void,
    onCalculate: () => void,
    onSave: () => void,
    label: string
  ) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-slate-300">
            <Clock className="h-4 w-4 text-amber-500" />
            Início
          </Label>
          <TimePicker
            value={startTime}
            onChange={setStartTime}
            placeholder="Hora início"
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-slate-300">
            <Clock className="h-4 w-4 text-amber-500" />
            Término
          </Label>
          <TimePicker
            value={endTime}
            onChange={setEndTime}
            placeholder="Hora término"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-slate-300">
          <Users className="h-4 w-4 text-amber-500" />
          Quantidade de Agentes
        </Label>
        <NumberStepper
          value={agentCount}
          onChange={setAgentCount}
          min={1}
          max={20}
          step={1}
          suffix=""
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={onCalculate} className="flex-1 bg-amber-500 hover:bg-amber-600 text-black">
          <Calculator className="h-4 w-4 mr-2" />
          Calcular {label}
        </Button>
        {agentId && (
          <Button onClick={onSave} variant="outline" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10">
            <Save className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  const renderSlots = (slots: TimeSlot[], emptyMessage: string) => {
    if (slots.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="space-y-2 mt-4">
        <div className="text-sm font-medium text-muted-foreground mb-3">
          Distribuição calculada:
        </div>
        {slots.map((slot) => (
          <div
            key={slot.agent}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-slate-700"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-semibold">
                {slot.agent}
              </div>
              <div>
                <div className="font-medium text-white">Agente {slot.agent}</div>
                <div className="text-sm text-slate-400">
                  Duração: {slot.duration}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg font-semibold text-amber-400">
                {slot.start} - {slot.end}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="card-night-amber bg-gradient-to-br from-[hsl(222,60%,3%)] via-[hsl(222,55%,5%)] to-[hsl(38,40%,8%)] border-3 border-amber-500/50 transition-all duration-300 hover:border-amber-400/70 group">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 group-hover:bg-amber-500/30 transition-colors">
              <Calculator className="h-6 w-6 text-amber-400" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
              Planejador de Plantão
            </span>
          </CardTitle>
          
          {/* Saved Configs Dropdown */}
          {agentId && savedConfigs.length > 0 && (
            <Select onValueChange={(id) => {
              const config = savedConfigs.find(c => c.id === id);
              if (config) loadConfig(config);
            }}>
              <SelectTrigger className="w-48 bg-slate-700/80 border-amber-500/30 hover:border-amber-400/50 transition-colors">
                <FolderOpen className="h-4 w-4 mr-2 text-amber-400" />
                <SelectValue placeholder="Carregar config..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-amber-500/30">
                {savedConfigs.map((config) => (
                  <div key={config.id} className="flex items-center justify-between pr-2">
                    <SelectItem value={config.id} className="flex-1">
                      <div className="flex items-center gap-2">
                        <span>{config.config_name}</span>
                        <span className="text-xs text-slate-400">
                          ({getConfigTypeLabel(config.config_type)})
                        </span>
                      </div>
                    </SelectItem>
                  </div>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-700/50 border border-amber-500/20 p-1">
            <TabsTrigger value="vigilance" className="flex items-center gap-2 text-base data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-black data-[state=active]:font-semibold transition-all">
              <Eye className="h-5 w-5" />
              <span className="hidden sm:inline">Vigilância</span>
            </TabsTrigger>
            <TabsTrigger value="rounds" className="flex items-center gap-2 text-base data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-black data-[state=active]:font-semibold transition-all">
              <Route className="h-5 w-5" />
              <span className="hidden sm:inline">Rondas</span>
            </TabsTrigger>
            <TabsTrigger value="rest" className="flex items-center gap-2 text-base data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-black data-[state=active]:font-semibold transition-all">
              <Moon className="h-5 w-5" />
              <span className="hidden sm:inline">Descanso</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vigilance" className="mt-4">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Configure o horário de vigilância e quantidade de agentes para
                calcular o tempo de cada um.
              </div>
              {renderTimeInputs(
                vigilanceStartTime,
                setVigilanceStartTime,
                vigilanceEndTime,
                setVigilanceEndTime,
                vigilanceAgentCount,
                setVigilanceAgentCount,
                calculateVigilance,
                () => openSaveDialog("vigilance"),
                "Vigilância"
              )}
              {renderSlots(
                vigilanceSlots,
                "Clique em 'Calcular Vigilância' para ver a distribuição"
              )}
            </div>
          </TabsContent>

          <TabsContent value="rounds" className="mt-4">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Configure os horários das rondas e quantidade de agentes para
                distribuir os turnos.
              </div>
              {renderTimeInputs(
                roundsStartTime,
                setRoundsStartTime,
                roundsEndTime,
                setRoundsEndTime,
                roundsAgentCount,
                setRoundsAgentCount,
                calculateRounds,
                () => openSaveDialog("rounds"),
                "Rondas"
              )}
              {renderSlots(
                roundsSlots,
                "Clique em 'Calcular Rondas' para ver a distribuição"
              )}
            </div>
          </TabsContent>

          <TabsContent value="rest" className="mt-4">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Configure o período de descanso e quantidade de agentes para
                organizar os intervalos.
              </div>
              {renderTimeInputs(
                restStartTime,
                setRestStartTime,
                restEndTime,
                setRestEndTime,
                restAgentCount,
                setRestAgentCount,
                calculateRest,
                () => openSaveDialog("rest"),
                "Descanso"
              )}
              {renderSlots(
                restSlots,
                "Clique em 'Calcular Descanso' para ver a distribuição"
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Saved Configs List */}
        {agentId && savedConfigs.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-700">
            <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-amber-500" />
              Configurações Salvas
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {savedConfigs.map((config) => (
                <div
                  key={config.id}
                  className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg"
                >
                  <button
                    onClick={() => loadConfig(config)}
                    className="flex-1 text-left hover:text-amber-400 transition-colors"
                  >
                    <span className="font-medium">{config.config_name}</span>
                    <span className="text-xs text-slate-400 ml-2">
                      ({getConfigTypeLabel(config.config_type)})
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteConfig(config.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Save Config Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle>Salvar Configuração</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nome da Configuração</Label>
              <Input
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="Ex: Plantão noturno padrão"
                className="bg-slate-700 border-slate-600"
              />
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg text-sm">
              <p className="text-slate-300">
                <strong>Tipo:</strong> {getConfigTypeLabel(configTypeToSave)}
              </p>
              <p className="text-slate-400 mt-1">
                Esta configuração será salva e poderá ser reutilizada em próximos plantões.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={saveConfig}
              disabled={isSaving || !configName.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ShiftPlannerCard;
