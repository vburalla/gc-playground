import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (!isVirtual) {
      // Platform Threads animation sequence
      setAnimationStep({});
      
      const timeouts: NodeJS.Timeout[] = [];
      
      // Paso 1: Thread Object aparece (0.3s)
      timeouts.push(setTimeout(() => {
        setAnimationStep({ showThreadObject: true, threadObjectLabel: "Thread Object" });
      }, 300));
      
      // Paso 2: Texto "Create" (1.3s)
      timeouts.push(setTimeout(() => {
        setAnimationStep(prev => ({ ...prev, showCreateText: true }));
      }, 1300));
      
      // Paso 3: Execute y run() block (3.3s)
      timeouts.push(setTimeout(() => {
        setAnimationStep(prev => ({ ...prev, showExecuteBlock: true }));
      }, 3300));
      
      // Paso 4: Línea punteada (6.3s)
      timeouts.push(setTimeout(() => {
        setAnimationStep(prev => ({ ...prev, showDottedLine: true }));
      }, 6300));
      
      // Paso 5: OS Thread aparece (7.3s)
      timeouts.push(setTimeout(() => {
        setAnimationStep(prev => ({ ...prev, showOSThread: true }));
      }, 7300));
      
      // Paso 6: Texto "Ask To Create..." (8.3s)
      timeouts.push(setTimeout(() => {
        setAnimationStep(prev => ({ ...prev, showAskText: true }));
      }, 8300));
      
      // Paso 7: Recuadro punteado (11.3s)
      timeouts.push(setTimeout(() => {
        setAnimationStep(prev => ({ ...prev, showMappingBox: true }));
      }, 11300));
      
      // Paso 8: "One-to-One Mapping" (12.3s)
      timeouts.push(setTimeout(() => {
        setAnimationStep(prev => ({ ...prev, showMappingText: true }));
      }, 12300));
      
      // Paso 9: "Create Stack" (14.3s)
      timeouts.push(setTimeout(() => {
        setAnimationStep(prev => ({ ...prev, showCreateStack: true }));
      }, 14300));
      
      // Paso 10: Cambiar a "Platform Thread" (16.3s)
      timeouts.push(setTimeout(() => {
        setAnimationStep(prev => ({ ...prev, threadObjectLabel: "Platform Thread" }));
      }, 16300));
      
      // Paso 11: Íconos de progreso
      // ⏳ (17.3s)
      timeouts.push(setTimeout(() => {
        setAnimationStep(prev => ({ ...prev, statusIcon: "⏳" }));
      }, 17300));
      
      // 🔄 (18.3s)
      timeouts.push(setTimeout(() => {
        setAnimationStep(prev => ({ ...prev, statusIcon: "🔄" }));
      }, 18300));
      
      // ✅ (19.3s)
      timeouts.push(setTimeout(() => {
        setAnimationStep(prev => ({ ...prev, statusIcon: "✅" }));
      }, 19300));

      return () => {
        timeouts.forEach(timeout => clearTimeout(timeout));
      };
    } else {
      // Virtual Threads - simple animation
      setAnimationStep({});
      // TODO: Implementar animación de Virtual Threads cuando me proporciones el flujo detallado
    }
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

        <div className="grid grid-cols-1 gap-3">
          {/* JVM Section */}
          <Card className="bg-card relative" style={{ minHeight: "200px" }}>
            <CardHeader className="py-2 border-b">
              <CardTitle className="text-base">JVM</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 pb-6 relative min-h-[300px]">
              {!isVirtual ? (
                // Platform Threads Animation
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* Thread Object - centro absoluto */}
                  {animationStep.showThreadObject && (
                    <div className="absolute left-1/2 top-12 -translate-x-1/2">
                      <div className="w-32 h-32 bg-muted/80 rounded-lg flex flex-col items-center justify-center animate-scale-in shadow-md border border-border/50">
                        <span className="text-sm font-semibold">
                          {animationStep.threadObjectLabel}
                        </span>
                        {animationStep.showCreateText && (
                          <span className="text-[11px] mt-1 text-muted-foreground animate-fade-in">
                            Create
                          </span>
                        )}
                      </div>

                      {/* Status icon arriba del thread */}
                      {animationStep.statusIcon && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-2xl animate-scale-in">
                          {animationStep.statusIcon}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Execute Block - izquierda del thread */}
                  {animationStep.showExecuteBlock && animationStep.showThreadObject && (
                    <div className="absolute left-1/2 top-12 -translate-x-full -ml-8 space-y-1 animate-fade-in text-left">
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
                  )}

                  {/* Línea punteada hacia abajo */}
                  {animationStep.showDottedLine && animationStep.showThreadObject && (
                    <div className="absolute left-1/2 top-44 -translate-x-1/2 w-0.5 border-l-2 border-dashed border-primary animate-fade-in" style={{ height: "200px" }}>
                      {animationStep.showAskText && (
                        <div className="absolute left-4 top-24 animate-fade-in">
                          <span className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/30 whitespace-nowrap shadow-sm">
                            Ask To Native(OS) Thread
                          </span>
                        </div>
                      )}
                    </div>
                  )}
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
            <CardContent className="pt-8 pb-8 relative min-h-[160px]">
              {!isVirtual ? (
                <div className="relative w-full h-full flex items-start justify-center">
                  {/* OS Thread - centrado */}
                  {animationStep.showOSThread && (
                    <div className="relative mt-4">
                      <div className="w-32 h-32 bg-muted/80 rounded-lg flex items-center justify-center animate-scale-in shadow-md border border-border/50">
                        <span className="text-sm font-semibold">OS Thread</span>
                      </div>
                      
                      {/* Mapping Text */}
                      {animationStep.showMappingText && (
                        <div className="absolute -right-36 top-1/2 -translate-y-1/2 animate-fade-in">
                          <span className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/30 whitespace-nowrap shadow-sm">
                            One-to-One Mapping
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Mapping Box - conecta visualmente ambos threads */}
                  {animationStep.showMappingBox && animationStep.showThreadObject && animationStep.showOSThread && (
                    <div 
                      className="absolute border-2 border-dashed border-primary/60 rounded-lg animate-fade-in"
                      style={{
                        top: "-310px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "144px",
                        height: "475px"
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
