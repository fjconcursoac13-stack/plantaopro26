import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Trash2, User, Key } from 'lucide-react';
import { formatCPF } from '@/lib/validators';

interface SavedCredential {
  cpf: string;
  name?: string;
  password?: string; // Base64 encoded for basic obfuscation
  savedAt: string;
}

interface SavedCredentialsProps {
  onSelectCredential: (cpf: string, password?: string) => void;
  onSaveChange: (save: boolean) => void;
  saveCredentials: boolean;
}

const STORAGE_KEY = 'plantao_pro_saved_credentials';

// Simple obfuscation (not encryption - just to prevent casual viewing)
function obfuscate(str: string): string {
  return btoa(encodeURIComponent(str));
}

function deobfuscate(str: string): string {
  try {
    return decodeURIComponent(atob(str));
  } catch {
    return '';
  }
}

export function getSavedCredentials(): SavedCredential[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function saveCredential(cpf: string, name?: string, password?: string) {
  const credentials = getSavedCredentials();
  const cleanCpf = cpf.replace(/\D/g, '');
  
  // Check if already exists
  const existingIndex = credentials.findIndex(c => c.cpf === cleanCpf);
  
  const newCredential: SavedCredential = {
    cpf: cleanCpf,
    name,
    password: password ? obfuscate(password) : undefined,
    savedAt: new Date().toISOString(),
  };
  
  if (existingIndex >= 0) {
    // Update existing
    credentials[existingIndex] = newCredential;
  } else {
    // Add new (max 5 saved)
    credentials.unshift(newCredential);
    if (credentials.length > 5) {
      credentials.pop();
    }
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
}

export function removeCredential(cpf: string) {
  const credentials = getSavedCredentials();
  const cleanCpf = cpf.replace(/\D/g, '');
  const filtered = credentials.filter(c => c.cpf !== cleanCpf);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function clearAllCredentials() {
  localStorage.removeItem(STORAGE_KEY);
}

export function SavedCredentials({ onSelectCredential, onSaveChange, saveCredentials }: SavedCredentialsProps) {
  const [credentials, setCredentials] = useState<SavedCredential[]>([]);
  
  useEffect(() => {
    setCredentials(getSavedCredentials());
  }, []);

  const handleRemove = (cpf: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeCredential(cpf);
    setCredentials(getSavedCredentials());
  };

  const handleClearAll = () => {
    clearAllCredentials();
    setCredentials([]);
  };

  const handleSelectCredential = (cred: SavedCredential) => {
    const password = cred.password ? deobfuscate(cred.password) : undefined;
    onSelectCredential(cred.cpf, password);
  };

  return (
    <div className="space-y-3">
      {credentials.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">CPFs Salvos</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-destructive hover:text-destructive"
              onClick={handleClearAll}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Limpar todos
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {credentials.map((cred) => (
              <div
                key={cred.cpf}
                onClick={() => handleSelectCredential(cred)}
                className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 hover:bg-muted rounded-lg cursor-pointer group transition-colors"
              >
                <User className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm font-mono">
                  {formatCPF(cred.cpf).slice(0, 7)}***
                </span>
                {cred.password && (
                  <span title="Senha salva">
                    <Key className="h-3 w-3 text-primary" />
                  </span>
                )}
                {cred.name && (
                  <span className="text-xs text-muted-foreground">
                    ({cred.name.split(' ')[0]})
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => handleRemove(cred.cpf, e)}
                  className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <Checkbox
          id="save-credentials"
          checked={saveCredentials}
          onCheckedChange={(checked) => onSaveChange(!!checked)}
        />
        <Label htmlFor="save-credentials" className="text-xs text-muted-foreground cursor-pointer">
          Lembrar meu CPF e senha neste dispositivo
        </Label>
      </div>
    </div>
  );
}
