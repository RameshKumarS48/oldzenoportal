"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Fired once the sixth digit lands, so the form can submit itself. */
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
}

/**
 * Six separate boxes backed by one string. Typing advances, backspace retreats,
 * arrows move, and pasting a whole code fills the row in one go — the last of
 * which matters most, because people paste codes far more often than they type
 * them digit by digit.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled,
  invalid,
  autoFocus,
}: OtpInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const focus = (i: number) => {
    const el = inputs.current[Math.max(0, Math.min(length - 1, i))];
    el?.focus();
    el?.select();
  };

  const commit = (next: string) => {
    onChange(next);
    if (next.length === length) onComplete?.(next);
  };

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return;

    // Clamp to the filled length so a click on a far box can't leave a hole
    // mid-code — the value stays a contiguous left-packed string throughout.
    const at = Math.min(index, value.length);

    if (digits.length > 1) {
      // A paste (or an autofilled code) landing in one box — spread it forward.
      const next = (value.slice(0, at) + digits).slice(0, length);
      commit(next);
      focus(next.length);
      return;
    }

    const chars = value.split("");
    chars[at] = digits;
    commit(chars.join("").slice(0, length));
    focus(at + 1);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (!value.length) return;

      // Delete the focused digit, or the one before it when this box is empty.
      // Splicing keeps the string contiguous instead of punching a gap.
      const at = value[index] !== undefined ? index : Math.min(index, value.length) - 1;
      if (at < 0) return;

      const chars = value.split("");
      chars.splice(at, 1);
      onChange(chars.join(""));
      focus(at);
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      focus(index - 1);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      focus(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!digits) return;
    e.preventDefault();
    commit(digits);
    focus(digits.length);
  };

  return (
    <div className="flex items-center justify-between gap-2" role="group" aria-label="One-time code">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={length}
          value={value[i] ?? ""}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={cn(
            "w-full h-14 text-center text-xl font-semibold rounded-lg border bg-white text-slate-900",
            "transition-colors focus:outline-none focus:ring-2 tabular-nums",
            invalid
              ? "border-red-400 focus:ring-red-200 focus:border-red-500"
              : "border-slate-300 focus:ring-zeno-teal/20 focus:border-zeno-teal",
            disabled && "opacity-50 cursor-not-allowed bg-slate-50"
          )}
        />
      ))}
    </div>
  );
}
