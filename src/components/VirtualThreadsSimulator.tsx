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
  const [activeCarriers, setActiveCarriers] = useState<number[]>([]);

  const colors = ["#4CAF50", "#2196F3", "#FF9800", "#E91E63", "#9C27B0", "#00BCD4"];

  useEffect(() => {
    if (!isVirtual) {
      // Platform Threads: 1:1 mapping with OS threads
      const interval = setInterval(() => {
        setPlatformThreads((prev) => {
          const newThreads = [...prev];
          if (newThreads.length < 4) {
            newThreads.push({
              id: newThreads.length,
              color: colors[newThreads.length % colors.length],
              active: true,
            });
          }
          return newThreads;
        });
      }, 1500);

      return () => clearInterval(interval);
    } else {
      // Virtual Threads: Multiple virtual threads on fewer platform threads
      setPlatformThreads([]);
      
      const interval = setInterval(() => {
        setVirtualThreads((prev) => {
          const newThreads = [...prev];
          if (newThreads.length < 12) {
            newThreads.push({
              id: newThreads.length,
              color: colors[newThreads.length % colors.length],
              active: true,
            });
          }
          return newThreads;
        });

        // Simulate carrier threads (platform threads carrying virtual threads)
        setActiveCarriers((prev) => {
          const carriers = [0, 1, 2, 3];
          const shuffled = carriers.sort(() => Math.random() - 0.5);
          return shuffled.slice(0, 2);
        });
      }, 800);

      return () => clearInterval(interval);
    }
  }, [isVirtual]);

  const handleSwitchChange = (checked: boolean) => {
    setIsVirtual(checked);
    setPlatformThreads([]);
    setVirtualThreads([]);
    setActiveCarriers([]);
  };

  return (
    <div className="flex-1 p-8 overflow-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Java Virtual Threads Simulator</h1>
          <p className="text-lg text-muted-foreground">
            Explore the difference between Platform Threads and Virtual Threads
          </p>
        </div>

        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-4">
              <Label htmlFor="thread-mode" className="text-lg font-semibold">
                Platform Threads
              </Label>
              <Switch
                id="thread-mode"
                checked={isVirtual}
                onCheckedChange={handleSwitchChange}
              />
              <Label htmlFor="thread-mode" className="text-lg font-semibold">
                Virtual Threads
              </Label>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-8">
          {/* Heap Space - Only visible for Virtual Threads */}
          {isVirtual && (
            <Card className="bg-card animate-fade-in">
              <CardHeader className="border-b-2 border-dashed border-primary">
                <CardTitle className="text-2xl">Heap Space</CardTitle>
              </CardHeader>
              <CardContent className="min-h-[150px] pt-6">
                <div className="grid grid-cols-4 gap-4">
                  {virtualThreads.map((thread) => (
                    <div
                      key={thread.id}
                      className="h-20 rounded-lg flex items-center justify-center text-white font-semibold animate-scale-in"
                      style={{
                        backgroundColor: thread.color,
                        animation: "scale-in 0.3s ease-out",
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
            <CardHeader>
              <CardTitle className="text-2xl">JVM</CardTitle>
            </CardHeader>
            <CardContent className="min-h-[200px]">
              {!isVirtual ? (
                // Platform Threads View
                <div className="grid grid-cols-2 gap-4">
                  {platformThreads.map((thread) => (
                    <div
                      key={thread.id}
                      className="h-32 rounded-lg flex items-center justify-center text-white font-semibold text-lg animate-scale-in"
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
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Carrier Threads (Platform Threads managing Virtual Threads)
                  </p>
                  <div className="grid grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map((carrierId) => {
                      const isActive = activeCarriers.includes(carrierId);
                      const assignedVirtualThreads = virtualThreads.filter(
                        (_, idx) => idx % 4 === carrierId
                      );
                      
                      return (
                        <div
                          key={carrierId}
                          className={`h-40 rounded-lg border-2 flex flex-col items-center justify-center font-semibold transition-all duration-300 ${
                            isActive
                              ? "border-primary bg-primary/10 scale-105"
                              : "border-muted bg-muted/5"
                          }`}
                        >
                          <div className="text-sm mb-2">Carrier-{carrierId + 1}</div>
                          <div className="flex flex-wrap gap-1 justify-center px-2">
                            {assignedVirtualThreads.slice(0, 3).map((vt) => (
                              <div
                                key={vt.id}
                                className="w-6 h-6 rounded text-[10px] flex items-center justify-center text-white"
                                style={{ backgroundColor: vt.color }}
                              >
                                {vt.id + 1}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* OS Section */}
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-2xl">OS</CardTitle>
            </CardHeader>
            <CardContent className="min-h-[200px]">
              {!isVirtual ? (
                // Platform Threads: 1:1 mapping with OS threads
                <div className="grid grid-cols-2 gap-4">
                  {platformThreads.map((thread) => (
                    <div
                      key={thread.id}
                      className="h-32 rounded-lg flex items-center justify-center text-white font-semibold text-lg animate-scale-in"
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
                // Virtual Threads: Fixed number of OS threads
                <div className="grid grid-cols-4 gap-4">
                  {[0, 1, 2, 3].map((osThreadId) => {
                    const isActive = activeCarriers.includes(osThreadId);
                    return (
                      <div
                        key={osThreadId}
                        className={`h-32 rounded-lg flex items-center justify-center text-white font-semibold text-lg transition-all duration-300 ${
                          isActive ? "scale-105 shadow-lg" : "opacity-60"
                        }`}
                        style={{
                          backgroundColor: "#666",
                        }}
                      >
                        OS Thread-{osThreadId + 1}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">
                {isVirtual ? "Virtual Threads" : "Platform Threads"}
              </h3>
              {!isVirtual ? (
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Platform Threads:</strong> Traditional Java threads that map 1:1 to OS threads.
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Each Java thread corresponds to one OS thread</li>
                    <li>Limited by OS thread creation overhead</li>
                    <li>High memory consumption (typically ~1MB per thread)</li>
                    <li>Context switching is expensive</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Virtual Threads:</strong> Lightweight threads managed by the JVM.
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Thousands or millions of virtual threads can run on few platform threads</li>
                    <li>Very low memory footprint (few KB per thread)</li>
                    <li>Managed by JVM scheduler - no OS context switching overhead</li>
                    <li>Ideal for I/O-bound operations and high concurrency</li>
                    <li>Virtual threads are mounted/unmounted from carrier threads as needed</li>
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
