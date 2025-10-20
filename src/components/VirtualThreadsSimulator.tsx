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
            <CardContent className="pt-4 pb-4 relative">
              {!isVirtual ? (
                // Platform Threads Animation
                <div className="relative flex items-start justify-center gap-6">
                  {/* Execute Block - left */}
                  {animationStep.showExecuteBlock && (
                    <div className="space-y-1 animate-fade-in text-left">
                      <div className="text-[11px] font-semibold">Execute</div>
                      <div className="bg-muted/50 rounded px-2 py-1 text-[10px] font-mono shadow-sm">
                        run()&#123;...&#125;
                        <br />
                        start()
                      </div>
                      {animationStep.showCreateStack && (
                        <div className="text-[10px] text-muted-foreground animate-fade-in">
                          Create Stack
                        </div>
                      )}
                    </div>
                  )}

                  {/* Thread Object - center */}
                  {animationStep.showThreadObject && (
                    <div className="relative">
                      <div className="w-28 h-28 bg-muted rounded-md flex flex-col items-center justify-center animate-scale-in shadow">
                        <span className="text-[11px] font-semibold">
                          {animationStep.threadObjectLabel}
                        </span>
                        {animationStep.showCreateText && (
                          <span className="text-[9px] mt-0.5 text-muted-foreground animate-fade-in">
                            Create
                          </span>
                        )}
                      </div>

                      {/* Línea punteada hacia abajo */}
                      {animationStep.showDottedLine && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-20 border-l-2 border-dashed border-primary animate-fade-in">
                          {animationStep.showAskText && (
                            <span className="absolute left-3 top-6 text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 whitespace-nowrap animate-fade-in">
                              Ask To Create Native(OS) Thread
                            </span>
                          )}
                        </div>
                      )}

                      {/* Status icon arriba del recuadro */}
                      {animationStep.statusIcon && animationStep.showMappingBox && (
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-lg animate-scale-in">
                          {animationStep.statusIcon}
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
          <Card className="bg-muted/30 relative" style={{ minHeight: "140px" }}>
            <CardHeader className="py-2 border-b">
              <CardTitle className="text-base">OS</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-4 relative">
              {!isVirtual ? (
                <div className="relative flex items-center justify-center">
                  {/* OS Thread */}
                  {animationStep.showOSThread && (
                    <div className="relative">
                      <div className="w-32 h-32 bg-muted rounded flex items-center justify-center animate-scale-in">
                        <span className="text-xs font-semibold">OS Thread</span>
                      </div>
                      
                      {/* Mapping Text */}
                      {animationStep.showMappingText && (
                        <div className="absolute -right-32 top-1/2 -translate-y-1/2 text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 whitespace-nowrap animate-fade-in">
                          One-to-One Mapping
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Mapping Box - conecta visualmente ambos threads */}
                  {animationStep.showMappingBox && animationStep.showThreadObject && animationStep.showOSThread && (
                    <div 
                      className="absolute border-2 border-dashed border-primary rounded animate-fade-in"
                      style={{
                        top: "-120px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "120px",
                        height: "240px"
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
