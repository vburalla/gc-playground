import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface AnimationStep {
  showThreadObject?: boolean;
  showCreateText?: boolean;
  showExecuteBlock?: boolean;
  showDottedLine?: boolean;
  showOSThread?: boolean;
  showAskText?: boolean;
  showMappingBox?: boolean;
  showMappingText?: boolean;
  showCreateStack?: boolean;
  threadObjectLabel?: string;
  statusIcon?: string;
}

export const VirtualThreadsSimulator = () => {
  const [isVirtual, setIsVirtual] = useState(false);
  const [animationStep, setAnimationStep] = useState<AnimationStep>({});
  
  // Overlay positioning refs/state
  const containerRef = useRef<HTMLDivElement | null>(null);
  const threadAnchorRef = useRef<HTMLDivElement | null>(null);
  const osAnchorRef = useRef<HTMLDivElement | null>(null);
  const [overlayPos, setOverlayPos] = useState<{
    line: null | { x: number; y1: number; y2: number };
    rect: null | { x: number; y: number; w: number; h: number };
    ask: null | { x: number; y: number };
    mapping: null | { x: number; y: number };
  }>({ line: null, rect: null, ask: null, mapping: null });

// Refs and looping sequence handling
const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
const isVirtualRef = useRef(isVirtual);

useEffect(() => {
  isVirtualRef.current = isVirtual;
}, [isVirtual]);

const clearAllTimers = () => {
  timeoutsRef.current.forEach((t) => clearTimeout(t));
  timeoutsRef.current = [];
};

const runPlatformSequence = () => {
  clearAllTimers();
  setAnimationStep({});
  const push = (ms: number, fn: () => void) => {
    const t = setTimeout(fn, ms);
    timeoutsRef.current.push(t);
  };

  // Sequence
  push(300, () => setAnimationStep({ showThreadObject: true, threadObjectLabel: "Thread Object" }));
  push(1300, () => setAnimationStep(prev => ({ ...prev, showCreateText: true })));
  push(3300, () => setAnimationStep(prev => ({ ...prev, showExecuteBlock: true })));
  push(6300, () => setAnimationStep(prev => ({ ...prev, showDottedLine: true })));
  push(7300, () => setAnimationStep(prev => ({ ...prev, showOSThread: true })));
  push(8300, () => setAnimationStep(prev => ({ ...prev, showAskText: true })));
  push(11300, () => setAnimationStep(prev => ({ ...prev, showMappingBox: true })));
  push(12300, () => setAnimationStep(prev => ({ ...prev, showMappingText: true })));
  push(14300, () => setAnimationStep(prev => ({ ...prev, showCreateStack: true })));
  push(16300, () => setAnimationStep(prev => ({ ...prev, threadObjectLabel: "Platform Thread" })));
  push(17300, () => setAnimationStep(prev => ({ ...prev, statusIcon: "⏳" })));
  push(18300, () => setAnimationStep(prev => ({ ...prev, statusIcon: "🔄" })));
  push(19300, () => setAnimationStep(prev => ({ ...prev, statusIcon: "✅" })));

  // Restart after 5s pause
  push(19300 + 5000, () => {
    if (!isVirtualRef.current) {
      runPlatformSequence();
    }
  });
};

useEffect(() => {
  if (!isVirtual) {
    runPlatformSequence();
  } else {
    clearAllTimers();
    setAnimationStep({});
    // TODO: Virtual Threads sequence to be implemented when flow is defined
  }
  return () => clearAllTimers();
}, [isVirtual]);

  const handleSwitchChange = (checked: boolean) => {
    setIsVirtual(checked);
    setAnimationStep({});
  };

  return (
    <div className="flex-1 p-4 overflow-auto">
      <div className="max-w-5xl mx-auto space-y-3">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Java Virtual Threads Simulator</h1>
          <p className="text-xs text-muted-foreground">
            Explore the difference between Platform Threads and Virtual Threads
          </p>
        </div>

        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center justify-center gap-4">
              <Label htmlFor="thread-mode" className="text-sm font-semibold">
                Platform Threads
              </Label>
              <Switch
                id="thread-mode"
                checked={isVirtual}
                onCheckedChange={handleSwitchChange}
              />
              <Label htmlFor="thread-mode" className="text-sm font-semibold">
                Virtual Threads
              </Label>
            </div>
          </CardContent>
        </Card>

        <div className="relative grid grid-cols-1 gap-3" ref={containerRef}>
          {/* JVM Section */}
          <Card className="bg-card relative" style={{ minHeight: "200px" }}>
            <CardHeader className="py-2 border-b">
              <CardTitle className="text-base">JVM</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 pb-6 relative" style={{ minHeight: "400px" }}>
              {!isVirtual ? (
                // Platform Threads Animation
                <div className="relative w-full" style={{ height: "380px" }}>
                  {/* Thread Object - centro superior */}
                  {animationStep.showThreadObject && (
                    <div 
                      className="absolute animate-scale-in"
                      style={{ 
                        left: "50%", 
                        top: "80px",
                        transform: "translateX(-50%)"
                      }}
                    >
                      {/* Status icon arriba del thread */}
                      {animationStep.statusIcon && (
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-3xl animate-scale-in">
                          {animationStep.statusIcon}
                        </div>
                      )}
                      
                      <div className="w-36 h-36 bg-muted/80 rounded-lg flex flex-col items-center justify-center shadow-md border border-border/50">
                        <span className="text-sm font-semibold">
                          {animationStep.threadObjectLabel}
                        </span>
                        {animationStep.showCreateText && (
                          <span className="text-[11px] mt-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 animate-fade-in">
                            Create
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Execute Block - izquierda del thread */}
                  {animationStep.showExecuteBlock && animationStep.showThreadObject && (
                    <div 
                      className="absolute animate-fade-in"
                      style={{ 
                        left: "50%", 
                        top: "80px",
                        transform: "translateX(calc(-100% - 180px))"
                      }}
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-semibold">Execute</div>
                        <div className="bg-muted/70 rounded px-3 py-2 text-[11px] font-mono shadow-sm border border-border/50">
                          run()&#123;...&#125;
                          <br />
                          start()
                        </div>
                        {animationStep.showCreateStack && (
                          <div className="text-[11px] text-muted-foreground animate-fade-in pt-1">
                            Create Stack
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Dotted line handled by overlay */}
                </div>
              ) : (
                // Virtual Threads - TODO
                <div className="text-center text-sm text-muted-foreground">
                  Virtual Threads animation - Coming soon
                </div>
              )}
            </CardContent>
          </Card>

          {/* OS Section */}
          <Card className="bg-muted/30 relative" style={{ minHeight: "180px" }}>
            <CardHeader className="py-2 border-b">
              <CardTitle className="text-base">OS</CardTitle>
            </CardHeader>
            <CardContent className="pt-8 pb-8 relative" style={{ minHeight: "280px" }}>
              {!isVirtual ? (
                <div className="relative w-full" style={{ height: "260px" }}>
                  {/* OS Thread - centro */}
                  {animationStep.showOSThread && (
                    <div 
                      className="absolute animate-scale-in"
                      style={{ 
                        left: "50%", 
                        top: "60px",
                        transform: "translateX(-50%)"
                      }}
                    >
                      <div className="w-36 h-36 bg-muted/80 rounded-lg flex items-center justify-center shadow-md border border-border/50">
                        <span className="text-sm font-semibold">OS Thread</span>
                      </div>
                      
                      {/* Mapping Text a la derecha */}
                      {animationStep.showMappingText && (
                        <div 
                          className="absolute animate-fade-in whitespace-nowrap"
                          style={{
                            left: "calc(100% + 16px)",
                            top: "50%",
                            transform: "translateY(-50%)"
                          }}
                        >
                          <span className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/30 shadow-sm">
                            One-to-One Mapping
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Mapping Box - conecta visualmente ambos threads */}
                  {animationStep.showMappingBox && animationStep.showThreadObject && animationStep.showOSThread && (
                    <div 
                      className="absolute border-2 border-dashed border-primary/60 rounded-lg animate-fade-in pointer-events-none"
                      style={{
                        left: "50%",
                        top: "-272px",
                        transform: "translateX(-50%)",
                        width: "152px",
                        height: "520px"
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  Virtual Threads - OS layer
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-3 pb-3">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">
                {isVirtual ? "Virtual Threads" : "Platform Threads"}
              </h3>
              {!isVirtual ? (
                <div className="space-y-1 text-[11px]">
                  <p>
                    <strong>Platform Threads:</strong> Traditional Java threads that map 1:1 to OS threads.
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li>Each Java thread corresponds to one OS thread</li>
                    <li>Limited by OS thread creation overhead</li>
                    <li>High memory consumption (typically ~1MB per thread)</li>
                    <li>Context switching is expensive</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-1 text-[11px]">
                  <p>
                    <strong>Virtual Threads:</strong> Lightweight threads managed by the JVM.
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li>Thousands or millions of virtual threads can run on few carrier threads</li>
                    <li>Very low memory footprint (few KB per thread)</li>
                    <li>Carrier threads are platform threads that execute virtual threads</li>
                    <li>Ideal for I/O-bound operations and high concurrency</li>
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
