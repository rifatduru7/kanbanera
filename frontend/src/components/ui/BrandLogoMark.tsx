interface BrandLogoMarkProps {
    className?: string;
    animated?: boolean;
}

export function BrandLogoMark({ className = 'size-8', animated = true }: BrandLogoMarkProps) {
    return (
        <div className={`relative flex items-center justify-center shrink-0 ${className}`.trim()} aria-hidden="true">
            {/* Base Rounded Background with Premium Gradient */}
            <div className={`absolute inset-0 rounded-[26%] bg-gradient-to-br from-primary-light via-primary to-primary-dark shadow-lg shadow-primary/30 overflow-hidden ${animated ? 'animate-logo-pulse' : ''}`}>
                {/* Subtle top gloss for realistic 3D feel */}
                <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/30 to-transparent opacity-80 pointer-events-none" />

                {/* Glassy Sweep Reflection */}
                {animated && (
                    <div className="absolute inset-0 w-[200%] h-[200%] -left-[50%] -top-[50%] bg-gradient-to-tr from-transparent via-white/40 to-transparent rotate-45 animate-logo-sweep pointer-events-none mix-blend-overlay" />
                )}
            </div>

            {/* Kanban Board Inner Elements */}
            <div className="relative z-10 w-[62%] h-[58%]">
                {/* Col 1 */}
                <div className="absolute top-0 left-0 w-[26%] h-[35%] bg-white rounded-[1.5px] shadow-[0_1px_2px_rgba(0,0,0,0.1)]"></div>
                <div className="absolute bottom-0 left-0 w-[26%] h-[15%] bg-white/60 rounded-[1.5px]"></div>

                {/* Col 2 */}
                <div className="absolute top-[15%] left-[37%] w-[26%] h-[28%] bg-white rounded-[1.5px] shadow-[0_1px_2px_rgba(0,0,0,0.1)]"></div>

                {/* Col 3 */}
                <div className="absolute top-0 left-[74%] w-[26%] h-[25%] bg-white rounded-[1.5px] shadow-[0_1px_2px_rgba(0,0,0,0.1)]"></div>
                <div className="absolute bottom-0 left-[74%] w-[26%] h-[30%] bg-white rounded-[1.5px] shadow-[0_1px_2px_rgba(0,0,0,0.1)]"></div>

                {/* Animated Moving Card */}
                {animated && (
                    <div className="absolute top-[45%] left-0 w-[26%] h-[25%] bg-white/95 rounded-[1.5px] shadow-[0_2px_4px_rgba(0,0,0,0.2)] z-20 animate-kanban-card-move"></div>
                )}
            </div>
        </div>
    );
}
