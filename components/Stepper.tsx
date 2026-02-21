// components/Stepper.tsx
"use client";

export default function Stepper({
  steps,
  activeIndex,
}: {
  steps: string[];
  activeIndex: number;
}) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-2">
        {steps.map((label, idx) => {
          const isActive = idx === activeIndex;
          const isDone = idx < activeIndex;

          return (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium",
                  isDone
                    ? "border-[#6F8373] bg-[#6F8373] text-white"
                    : isActive
                    ? "border-[#6F8373] bg-white text-[#1F1F1F]"
                    : "border-[#EAEAEA] bg-white text-[#6A6A6A]",
                ].join(" ")}
              >
                {isDone ? "✓" : idx + 1}
              </div>

              <div
                className={[
                  "text-xs sm:text-sm",
                  isActive ? "text-[#1F1F1F] font-medium" : "text-[#6A6A6A]",
                ].join(" ")}
              >
                {label}
              </div>

              {idx !== steps.length - 1 && (
                <div className="ml-2 hidden h-[2px] flex-1 rounded bg-[#EAEAEA] sm:block">
                  <div
                    className="h-[2px] rounded bg-[#6F8373]"
                    style={{
                      width: isDone ? "100%" : isActive ? "50%" : "0%",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile progress bar */}
      <div className="mt-3 h-[3px] w-full rounded bg-[#EAEAEA] sm:hidden">
        <div
          className="h-[3px] rounded bg-[#6F8373]"
          style={{
            width: `${Math.round(((activeIndex + 1) / steps.length) * 100)}%`,
          }}
        />
      </div>
    </div>
  );
}