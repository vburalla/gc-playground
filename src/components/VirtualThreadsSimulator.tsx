import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Thread {
  id: number;
  color: string;
  active: boolean;
}

export const VirtualThreadsSimulator = () => {
  const [isVirtual, setIsVirtual] = useState(false);
  const [platformThreads, setPlatformThreads] = useState<Thread[]>([]);
  const [virtualThreads, setVirtualThreads] = useState<Thread[]>([]);
  const [carrierThreads, setCarrierThreads] = useState<Thread[]>([]);
  const [osThreads, setOSThreads] = useState<Thread[]>([]);

  const colors = ["#4CAF50", "#2196F3", "#FF9800", "#E91E63", "#9C27B0", "#00BCD4"];

  useEffect(() => {
    if (!isVirtual) {
      // Platform Threads: 1:1 mapping with OS threads
      setPlatformThreads([]);
      setVirtualThreads([]);
      setCarrierThreads([]);
      setOSThreads([]);
      
      const interval = setInterval(() => {
        setPlatformThreads((prev) => {
          if (prev.length < 4) {
            const newThread = {
              id: prev.length,
              color: colors[prev.length % colors.length],
              active: true,
            };
            return [...prev, newThread];
          }
          return prev;
        });
        
        setOSThreads((prev) => {
          if (prev.length < 4) {
            const newThread = {
              id: prev.length,
              color: colors[prev.length % colors.length],
              active: true,
            };
            return [...prev, newThread];
          }
          return prev;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      // Virtual Threads: Multiple virtual threads on fewer carrier threads
      setPlatformThreads([]);
      setVirtualThreads([]);
      setCarrierThreads([]);
      setOSThreads([]);
      
      let threadCount = 0;
      let carrierCount = 0;
      let osCount = 0;
      
      const interval = setInterval(() => {
        // Add virtual threads (up to 12)
        if (threadCount < 12) {
          setVirtualThreads((prev) => [
            ...prev,
            {
              id: threadCount,
              color: colors[threadCount % colors.length],
              active: true,
            }
          ]);
          threadCount++;
        }
        
        // Add carrier threads (up to 4) when we have virtual threads
        if (carrierCount < 4 && threadCount > carrierCount * 3) {
          setCarrierThreads((prev) => [
            ...prev,
            {
              id: carrierCount,
              color: "#666",
              active: true,
            }
          ]);
          carrierCount++;
        }
        
        // Add OS threads (up to 2) when we have carrier threads
        if (osCount < 2 && carrierCount > osCount * 2) {
          setOSThreads((prev) => [
            ...prev,
            {
              id: osCount,
              color: "#888",
              active: true,
            }
          ]);
          osCount++;
        }
      }, 600);

      return () => clearInterval(interval);
    }
  }, [isVirtual]);

  const handleSwitchChange = (checked: boolean) => {
    setIsVirtual(checked);
    setPlatformThreads([]);
    setVirtualThreads([]);
    setCarrierThreads([]);
    setOSThreads([]);
  };

  return (
    <div className="flex-1 p-4 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Java Virtual Threads Simulator</h1>
          <p className="text-sm text-muted-foreground">
            Explore the difference between Platform Threads and Virtual Threads
          </p>
        </div>

        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-center gap-4">
              <Label htmlFor="thread-mode" className="text-base font-semibold">
                Platform Threads
              </Label>
              <Switch
                id="thread-mode"
                checked={isVirtual}
                onCheckedChange={handleSwitchChange}
              />
              <Label htmlFor="thread-mode" className="text-base font-semibold">
                Virtual Threads
              </Label>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          {/* Heap Space - Only visible for Virtual Threads */}
          {isVirtual && (
            <Card className="bg-card animate-fade-in">
              <CardHeader className="border-b border-primary/30 py-3">
                <CardTitle className="text-lg">Heap Space</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-4">
                <div className="grid grid-cols-6 gap-2">
                  {virtualThreads.map((thread) => (
                    <div
                      key={thread.id}
                      className="h-16 rounded flex items-center justify-center text-white font-semibold text-xs animate-scale-in"
                      style={{
                        backgroundColor: thread.color,
                      }}
                    >
                      VT-{thread.id + 1}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* JVM Section */}
          <Card className="bg-card">
            <CardHeader className="py-3">
              <CardTitle className="text-lg">JVM</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-4">
              {!isVirtual ? (
                // Platform Threads View
                <div className="grid grid-cols-4 gap-3">
                  {platformThreads.map((thread) => (
                    <div
                      key={thread.id}
                      className="h-24 rounded flex items-center justify-center text-white font-semibold animate-scale-in"
                      style={{
                        backgroundColor: thread.color,
                      }}
                    >
                      Thread-{thread.id + 1}
                    </div>
                  ))}
                </div>
              ) : (
                // Virtual Threads View - Carrier Threads
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground text-center">
                    Carrier Threads (Platform Threads managing Virtual Threads)
                  </p>
                  <div className="grid grid-cols-4 gap-3">
                    {carrierThreads.map((carrier) => (
                      <div
                        key={carrier.id}
                        className="h-24 rounded flex items-center justify-center text-white font-semibold animate-scale-in"
                        style={{
                          backgroundColor: carrier.color,
                        }}
                      >
                        Carrier-{carrier.id + 1}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* OS Section */}
          <Card className="bg-muted/30">
            <CardHeader className="py-3">
              <CardTitle className="text-lg">OS</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-4">
              {!isVirtual ? (
                // Platform Threads: 1:1 mapping with OS threads
                <div className="grid grid-cols-4 gap-3">
                  {osThreads.map((thread) => (
                    <div
                      key={thread.id}
                      className="h-24 rounded flex items-center justify-center text-white font-semibold animate-scale-in"
                      style={{
                        backgroundColor: thread.color,
                        opacity: 0.8,
                      }}
                    >
                      OS Thread-{thread.id + 1}
                    </div>
                  ))}
                </div>
              ) : (
                // Virtual Threads: Fewer OS threads
                <div className="grid grid-cols-4 gap-3">
                  {osThreads.map((thread) => (
                    <div
                      key={thread.id}
                      className="h-24 rounded flex items-center justify-center text-white font-semibold animate-scale-in"
                      style={{
                        backgroundColor: thread.color,
                      }}
                    >
                      OS Thread-{thread.id + 1}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4 pb-4">
            <div className="space-y-3">
              <h3 className="text-base font-semibold">
                {isVirtual ? "Virtual Threads" : "Platform Threads"}
              </h3>
              {!isVirtual ? (
                <div className="space-y-2 text-xs">
                  <p>
                    <strong>Platform Threads:</strong> Traditional Java threads that map 1:1 to OS threads.
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-3">
                    <li>Each Java thread corresponds to one OS thread</li>
                    <li>Limited by OS thread creation overhead</li>
                    <li>High memory consumption (typically ~1MB per thread)</li>
                    <li>Context switching is expensive</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <p>
                    <strong>Virtual Threads:</strong> Lightweight threads managed by the JVM.
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-3">
                    <li>Thousands or millions of virtual threads can run on few carrier threads</li>
                    <li>Very low memory footprint (few KB per thread)</li>
                    <li>Carrier threads are platform threads that execute virtual threads</li>
                    <li>Only 2 OS threads needed to support 4 carrier threads managing 12 virtual threads</li>
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
