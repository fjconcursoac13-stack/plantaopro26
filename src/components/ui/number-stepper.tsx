import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  suffix?: string;
  disabled?: boolean;
}

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  className,
  size = "md",
  showValue = true,
  suffix = "",
  disabled = false,
}: NumberStepperProps) {
  const [isAnimating, setIsAnimating] = React.useState<"up" | "down" | null>(null);
  const [displayValue, setDisplayValue] = React.useState(value);

  React.useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const handleDecrement = () => {
    const newValue = Math.max(min, value - step);
    setIsAnimating("down");
    onChange(Number(newValue.toFixed(2)));
    setTimeout(() => setIsAnimating(null), 200);
  };

  const handleIncrement = () => {
    const newValue = Math.min(max, value + step);
    setIsAnimating("up");
    onChange(Number(newValue.toFixed(2)));
    setTimeout(() => setIsAnimating(null), 200);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue)) {
      onChange(Math.min(max, Math.max(min, newValue)));
    }
  };

  const sizeClasses = {
    sm: {
      container: "h-8",
      button: "h-8 w-8",
      icon: "h-3 w-3",
      input: "w-12 text-sm",
      value: "text-sm",
    },
    md: {
      container: "h-10",
      button: "h-10 w-10",
      icon: "h-4 w-4",
      input: "w-16 text-base",
      value: "text-base",
    },
    lg: {
      container: "h-12",
      button: "h-12 w-12",
      icon: "h-5 w-5",
      input: "w-20 text-lg",
      value: "text-lg font-semibold",
    },
  };

  const classes = sizeClasses[size];

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-xl border border-slate-600 bg-gradient-to-b from-slate-700 to-slate-800 overflow-hidden shadow-lg",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className={cn(
          classes.button,
          "rounded-none border-r border-slate-600 text-slate-300",
          "hover:bg-red-500/20 hover:text-red-400 active:scale-95",
          "transition-all duration-150 ease-out",
          "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        )}
      >
        <Minus className={cn(classes.icon, "transition-transform duration-150", isAnimating === "down" && "scale-125")} />
      </Button>

      {showValue && (
        <div className="flex items-center justify-center px-3 min-w-[70px] relative overflow-hidden">
          <div
            className={cn(
              "flex items-center transition-all duration-200 ease-out",
              isAnimating === "up" && "animate-slide-up",
              isAnimating === "down" && "animate-slide-down"
            )}
          >
            <input
              type="number"
              value={value}
              onChange={handleInputChange}
              disabled={disabled}
              min={min}
              max={max}
              step={step}
              className={cn(
                classes.input,
                "bg-transparent text-center font-medium text-amber-400 border-none outline-none focus:ring-0",
                "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                "transition-colors duration-150"
              )}
            />
            {suffix && (
              <span className="text-slate-400 text-sm ml-0.5">{suffix}</span>
            )}
          </div>
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        className={cn(
          classes.button,
          "rounded-none border-l border-slate-600 text-slate-300",
          "hover:bg-green-500/20 hover:text-green-400 active:scale-95",
          "transition-all duration-150 ease-out",
          "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        )}
      >
        <Plus className={cn(classes.icon, "transition-transform duration-150", isAnimating === "up" && "scale-125")} />
      </Button>

      <style>{`
        @keyframes slide-up {
          0% { transform: translateY(8px); opacity: 0.5; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes slide-down {
          0% { transform: translateY(-8px); opacity: 0.5; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.2s ease-out; }
        .animate-slide-down { animation: slide-down 0.2s ease-out; }
      `}</style>
    </div>
  );
}
