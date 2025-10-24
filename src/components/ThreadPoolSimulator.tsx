import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type TaskType = "cpu" | "io";

interface Task {
  id: string;
  type: TaskType;
  state: "queue" | "processing" | "blocked";
}

interface Worker {
  id: number;
  status: "idle" | "working" | "blocked" | "stealing";
  currentTask: Task | null;
  queue?: Task[];
}

export const ThreadPoolSimulator = () => {
  const [mode, setMode] = useState<"threadpool" | "forkjoin">("threadpool");
  const [isRunning, setIsRunning] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [sharedQueue, setSharedQueue] = useState<Task[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([
    { id: 1, status: "idle", currentTask: null },
    { id: 2, status: "idle", currentTask: null },
    { id: 3, status: "idle", currentTask: null },
  ]);
  const [fjpWorkers, setFjpWorkers] = useState<Worker[]>([
    { id: 1, status: "working", currentTask: null, queue: [] },
    { id: 2, status: "working", currentTask: null, queue: [] },
    { id: 3, status: "idle", currentTask: null, queue: [] },
  ]);

  const createTask = (id: string, type: TaskType): Task => ({
    id,
    type,
    state: "queue",
  });

  const resetThreadPool = () => {
    setIsRunning(false);
    setStatusText("");
    setSharedQueue([]);
    setWorkers([
      { id: 1, status: "idle", currentTask: null },
      { id: 2, status: "idle", currentTask: null },
      { id: 3, status: "idle", currentTask: null },
    ]);
  };

  const resetForkJoinPool = () => {
    setIsRunning(false);
    setStatusText("");
    setFjpWorkers([
      { id: 1, status: "working", currentTask: null, queue: [] },
      { id: 2, status: "working", currentTask: null, queue: [] },
      { id: 3, status: "idle", currentTask: null, queue: [] },
    ]);
  };

  const startThreadPoolAnimation = async () => {
    setIsRunning(true);
    resetThreadPool();

    // Initialize shared queue with tasks
    const tasks: Task[] = [
      createTask("T1", "cpu"),
      createTask("T2", "io"),
      createTask("T3", "cpu"),
      createTask("T4", "cpu"),
      createTask("T5", "io"),
      createTask("T6", "cpu"),
    ];
    setSharedQueue(tasks);
    setStatusText("Cola compartida creada con 6 tareas (FIFO)");

    await new Promise((r) => setTimeout(r, 2000));

    // Worker 1 takes T1 (CPU)
    setStatusText("Worker 1 toma T1 (CPU) de la cola compartida");
    setSharedQueue((prev) => prev.slice(1));
    setWorkers((prev) =>
      prev.map((w) =>
        w.id === 1
          ? { ...w, status: "working", currentTask: { ...tasks[0], state: "processing" } }
          : w
      )
    );

    await new Promise((r) => setTimeout(r, 2000));

    // Worker 2 takes T2 (I/O) and blocks
    setStatusText("Worker 2 toma T2 (I/O) - SE BLOQUEA esperando respuesta");
    setSharedQueue((prev) => prev.slice(1));
    setWorkers((prev) =>
      prev.map((w) =>
        w.id === 2
          ? { ...w, status: "blocked", currentTask: { ...tasks[1], state: "blocked" } }
          : w
      )
    );

    await new Promise((r) => setTimeout(r, 2000));

    // Worker 3 takes T3 (CPU)
    setStatusText("Worker 3 toma T3 (CPU) mientras Worker 2 sigue bloqueado");
    setSharedQueue((prev) => prev.slice(1));
    setWorkers((prev) =>
      prev.map((w) =>
        w.id === 3
          ? { ...w, status: "working", currentTask: { ...tasks[2], state: "processing" } }
          : w
      )
    );

    await new Promise((r) => setTimeout(r, 2500));

    // Worker 1 finishes and takes T4
    setStatusText("Worker 1 termina T1 y toma T4 (CPU) de la cola");
    setSharedQueue((prev) => prev.slice(1));
    setWorkers((prev) =>
      prev.map((w) =>
        w.id === 1
          ? { ...w, status: "working", currentTask: { ...tasks[3], state: "processing" } }
          : w
      )
    );

    await new Promise((r) => setTimeout(r, 2500));

    // Worker 2 unblocks
    setStatusText("Worker 2 recibe respuesta I/O y termina T2");
    setWorkers((prev) =>
      prev.map((w) => (w.id === 2 ? { ...w, status: "idle", currentTask: null } : w))
    );

    await new Promise((r) => setTimeout(r, 1500));

    // Worker 2 takes T5 (I/O)
    setStatusText("Worker 2 toma T5 (I/O) - SE BLOQUEA nuevamente");
    setSharedQueue((prev) => prev.slice(1));
    setWorkers((prev) =>
      prev.map((w) =>
        w.id === 2
          ? { ...w, status: "blocked", currentTask: { ...tasks[4], state: "blocked" } }
          : w
      )
    );

    await new Promise((r) => setTimeout(r, 2500));

    // Worker 3 finishes and takes T6
    setStatusText("Worker 3 termina T3 y toma T6 (CPU)");
    setSharedQueue((prev) => prev.slice(1));
    setWorkers((prev) =>
      prev.map((w) =>
        w.id === 3
          ? { ...w, status: "working", currentTask: { ...tasks[5], state: "processing" } }
          : w
      )
    );

    await new Promise((r) => setTimeout(r, 2500));

    setStatusText("Animación completada - El pool maneja bien tareas I/O bloqueantes");
    setWorkers((prev) => prev.map((w) => ({ ...w, status: "idle", currentTask: null })));
    setIsRunning(false);
  };

  const startForkJoinAnimation = async () => {
    setIsRunning(true);
    resetForkJoinPool();

    // Initialize worker queues
    const workerATasks = [
      createTask("A1", "cpu"),
      createTask("A2", "cpu"),
      createTask("A3", "cpu"),
      createTask("A4", "cpu"),
    ];
    const workerBTasks = [
      createTask("B1", "cpu"),
      createTask("B2", "cpu"),
      createTask("B3", "cpu"),
      createTask("B4", "cpu"),
    ];
    const workerCTasks = [createTask("C1", "cpu"), createTask("C2", "cpu")];

    setFjpWorkers([
      { id: 1, status: "working", currentTask: null, queue: workerATasks },
      { id: 2, status: "working", currentTask: null, queue: workerBTasks },
      { id: 3, status: "working", currentTask: null, queue: workerCTasks },
    ]);
    setStatusText("10 tareas distribuidas: Worker A (4), Worker B (4), Worker C (2)");

    await new Promise((r) => setTimeout(r, 2000));

    // Workers process LIFO (rightmost task)
    setStatusText("Worker A y B procesan última tarea (LIFO - más nueva)");
    setFjpWorkers((prev) =>
      prev.map((w) => {
        if (w.id === 1 && w.queue) {
          const task = w.queue[w.queue.length - 1];
          return {
            ...w,
            currentTask: { ...task, state: "processing" },
            queue: w.queue.slice(0, -1),
          };
        }
        if (w.id === 2 && w.queue) {
          const task = w.queue[w.queue.length - 1];
          return {
            ...w,
            currentTask: { ...task, state: "processing" },
            queue: w.queue.slice(0, -1),
          };
        }
        return w;
      })
    );

    await new Promise((r) => setTimeout(r, 2500));

    // Worker C processes its tasks faster
    setStatusText("Worker C procesa sus 2 tareas rápidamente");
    setFjpWorkers((prev) =>
      prev.map((w) => {
        if (w.id === 3) {
          return { ...w, queue: [], currentTask: null, status: "idle" };
        }
        return w;
      })
    );

    await new Promise((r) => setTimeout(r, 2000));

    // Worker C steals from Worker A (FIFO - oldest task)
    setStatusText("Worker C roba la tarea más antigua (FIFO) de Worker A");
    setFjpWorkers((prev) => {
      const newWorkers = [...prev];
      const workerA = newWorkers[0];
      if (workerA.queue && workerA.queue.length > 0) {
        const stolenTask = workerA.queue[0];
        workerA.queue = workerA.queue.slice(1);
        newWorkers[2] = {
          ...newWorkers[2],
          status: "stealing",
          currentTask: { ...stolenTask, state: "processing" },
        };
      }
      return newWorkers;
    });

    await new Promise((r) => setTimeout(r, 2500));

    setStatusText("Animación completada - Work Stealing balancea la carga en tareas CPU");
    setFjpWorkers((prev) =>
      prev.map((w) => ({ ...w, status: "idle", currentTask: null, queue: [] }))
    );
    setIsRunning(false);
  };

  const handleToggle = () => {
    setMode((prev) => (prev === "threadpool" ? "forkjoin" : "threadpool"));
    if (mode === "threadpool") {
      resetThreadPool();
    } else {
      resetForkJoinPool();
    }
  };

  return (
    <div className="min-h-screen bg-background w-full">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur w-full">
        <div className="w-full px-6 py-8">
          <h1
            className={`text-4xl font-bold text-center mb-2 font-mono transition-colors ${
              mode === "threadpool" ? "text-orange-500" : "text-green-500"
            }`}
          >
            {mode === "threadpool"
              ? "ThreadPoolTaskExecutor Simulator"
              : "ForkJoinPool Simulator"}
          </h1>
          <p className="text-center text-muted-foreground">
            {mode === "threadpool"
              ? "Modelo clásico para tareas I/O-Bound"
              : "Divide y Conquista para tareas CPU-Bound"}
          </p>

          {/* Toggle Switch */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <span
              className={`font-mono font-bold transition-colors ${
                mode === "threadpool" ? "text-orange-500" : "text-muted-foreground"
              }`}
            >
              ThreadPoolTaskExecutor
            </span>
            <button
              onClick={handleToggle}
              className={`relative inline-flex h-9 w-64 items-center rounded-full transition-colors ${
                mode === "threadpool" ? "bg-orange-500" : "bg-green-500"
              }`}
            >
              <span
                className={`inline-block h-7 w-32 transform rounded-full bg-background transition-transform ${
                  mode === "forkjoin" ? "translate-x-[120px]" : "translate-x-1"
                }`}
              />
              <span className="absolute left-4 font-mono text-sm font-bold text-background">
                ThreadPool
              </span>
              <span className="absolute right-4 font-mono text-sm font-bold text-background">
                ForkJoinPool
              </span>
            </button>
            <span
              className={`font-mono font-bold transition-colors ${
                mode === "forkjoin" ? "text-green-500" : "text-muted-foreground"
              }`}
            >
              ForkJoinPool
            </span>
          </div>
        </div>
      </header>

      <main className="w-full px-6 py-8 flex justify-center">
        <div className="max-w-7xl w-full">
        {/* ThreadPool Content */}
        {mode === "threadpool" && (
          <div>
            <Card className="p-8 mb-8">
              <h2 className="text-2xl font-bold text-orange-500 border-b-2 border-orange-500 pb-2 mb-4 font-mono">
                ¿Qué es el <code className="text-green-400">ThreadPoolTaskExecutor</code>?
              </h2>
              <p className="mb-4">
                El <code className="bg-card px-2 py-1 rounded text-green-400">ThreadPoolTaskExecutor</code> (o su análogo <code className="bg-card px-2 py-1 rounded text-green-400">FixedThreadPool</code>) utiliza un conjunto de hilos de tamaño fijo que trabajan con una <strong>cola de tareas compartida (Shared Queue)</strong>. Es la solución recomendada para cargas de trabajo que incluyen operaciones de <strong>E/S bloqueantes (I/O-Bound)</strong>.
              </p>
              <ul className="list-disc ml-6 space-y-2">
                <li>
                  <strong>Mecanismo FIFO:</strong> Las tareas se procesan en el orden en que llegan a la cola (<strong>First-In, First-Out</strong>).
                </li>
                <li>
                  <strong>Resiliencia I/O:</strong> El pool tiene más hilos que núcleos de CPU, asumiendo que algunos se bloquearán en I/O.
                </li>
              </ul>
            </Card>

            {/* Animation Section */}
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-orange-500 border-b-2 border-orange-500 pb-2 mb-6 font-mono">
                Animación Interactiva: Resiliencia I/O (FIFO)
              </h2>
              <p className="mb-6">
                Observa cómo el bloqueo de un Worker no paraliza el pool. Hemos aumentado los tiempos para que puedas seguir el flujo de cada tarea.
              </p>

              {/* Shared Queue */}
              <div className="bg-card/50 border-2 border-orange-500 rounded-lg p-4 mb-6">
                <h4 className="text-orange-500 font-mono font-bold text-center mb-3">
                  🔗 Cola de Tareas Compartida (FIFO)
                </h4>
                <div className="relative">
                  <span className="absolute -top-3 left-4 bg-card px-2 text-xs text-muted-foreground font-bold">
                    FIFO (Oldest) → Cola → LIFO (Newest)
                  </span>
                  <div className="min-h-20 bg-background border-2 border-dashed border-border rounded p-3 flex items-center overflow-x-auto">
                    <div className="flex gap-2">
                      {sharedQueue.map((task) => (
                        <div
                          key={task.id}
                          className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center text-white text-xs font-bold font-mono shadow-lg flex-shrink-0 ${
                            task.type === "cpu"
                              ? "bg-gradient-to-br from-blue-500 to-blue-700"
                              : "bg-gradient-to-br from-purple-500 to-purple-700"
                          }`}
                        >
                          <span>{task.id}</span>
                          <span className="text-[10px]">{task.type.toUpperCase()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="text-center mb-6 p-4 bg-card/30 rounded-lg">
                <div className="flex gap-3 justify-center mb-3">
                  <Button
                    onClick={startThreadPoolAnimation}
                    disabled={isRunning}
                    className="bg-orange-500 hover:bg-orange-600 text-background font-mono"
                  >
                    ▶ Iniciar Animación
                  </Button>
                  <Button
                    onClick={resetThreadPool}
                    variant="outline"
                    className="border-orange-500 text-orange-500 hover:bg-orange-500/10 font-mono"
                  >
                    ↻ Reiniciar
                  </Button>
                </div>
                <div className="bg-[#3d342a] border-l-4 border-orange-500 p-3 text-left text-[#ffd99e] font-mono min-h-12">
                  {statusText || "Presiona \"Iniciar Animación\" para comenzar (Pool de 3 Workers)"}
                </div>
              </div>

              {/* Workers */}
              <div className="flex gap-5 justify-around">
                {workers.map((worker) => (
                  <div
                    key={worker.id}
                    className={`bg-card/50 rounded-lg p-4 border transition-all w-[30%] text-center ${
                      worker.status === "blocked"
                        ? "shadow-[0_0_20px_rgba(231,76,60,0.6)] bg-red-950/20 border-red-500"
                        : worker.status === "idle"
                        ? "opacity-70 border-border"
                        : "border-border"
                    }`}
                  >
                    <div className="font-bold text-lg mb-2 font-mono">🔧 Worker {worker.id}</div>
                    <div
                      className={`inline-block px-3 py-1 rounded-full text-sm font-bold font-mono ${
                        worker.status === "working"
                          ? "bg-green-950/50 text-green-400"
                          : worker.status === "blocked"
                          ? "bg-red-950/50 text-red-400 animate-pulse"
                          : "bg-blue-950/50 text-blue-400"
                      }`}
                    >
                      {worker.status === "working"
                        ? "Trabajando"
                        : worker.status === "blocked"
                        ? "Bloqueado"
                        : "Ocioso"}
                    </div>
                    <div className="min-h-16 mt-4 flex justify-center items-center">
                      {worker.currentTask && (
                        <div
                          className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center text-white text-xs font-bold font-mono shadow-lg ${
                            worker.currentTask.state === "blocked"
                              ? "bg-gradient-to-br from-red-500 to-red-700 animate-pulse"
                              : worker.currentTask.type === "cpu"
                              ? "bg-gradient-to-br from-green-500 to-green-700 animate-pulse"
                              : "bg-gradient-to-br from-purple-500 to-purple-700"
                          }`}
                        >
                          <span>{worker.currentTask.id}</span>
                          <span className="text-[10px]">
                            {worker.currentTask.type.toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex gap-6 justify-center mt-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-blue-700" />
                  <span className="text-sm">Tarea CPU (rápida)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-500 to-purple-700" />
                  <span className="text-sm">Tarea I/O (lenta/bloqueante)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-green-500 to-green-700" />
                  <span className="text-sm">Worker Procesando</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-red-500 to-red-700" />
                  <span className="text-sm">Worker Bloqueado</span>
                </div>
              </div>
            </Card>

            {/* Best Practice */}
            <Card className="p-6 mt-8 bg-green-950/20 border-green-500">
              <h3 className="text-xl font-bold text-green-500 border-b border-green-500 pb-2 mb-3">
                ¿Por Qué es Mejor para I/O?
              </h3>
              <p className="text-green-200">
                Al tener una <strong>cola única y compartida</strong>, cuando el Worker 1 toma una tarea de I/O y se bloquea, el Worker 2 y el Worker 3 no necesitan robar trabajo. Simplemente acuden a la misma cola compartida, toman la <strong>siguiente tarea FIFO</strong> y continúan trabajando, garantizando un alto throughput (rendimiento).
              </p>
            </Card>
          </div>
        )}

        {/* ForkJoinPool Content */}
        {mode === "forkjoin" && (
          <div>
            <Card className="p-8 mb-8">
              <h2 className="text-2xl font-bold text-green-500 border-b-2 border-green-500 pb-2 mb-4 font-mono">
                ¿Qué es el <code className="text-green-400">ForkJoinPool</code>?
              </h2>
              <p className="mb-4">
                El <code className="bg-card px-2 py-1 rounded text-green-400">ForkJoinPool</code> es un <code className="bg-card px-2 py-1 rounded text-green-400">ExecutorService</code> especializado en la ejecución eficiente de tareas que siguen el patrón <strong>"Divide y Conquista"</strong>. Es el motor detrás de la paralelización en los Streams de Java 8. Su principal característica es el uso de un número fijo de threads (hilos) trabajadores, generalmente igual al número de núcleos de CPU disponibles.
              </p>
              <ul className="list-disc ml-6 space-y-2">
                <li>
                  <strong>Fork (Ramificar):</strong> Una tarea se divide en subtareas más pequeñas.
                </li>
                <li>
                  <strong>Join (Unir):</strong> Se espera el resultado de las subtareas para combinarlas.
                </li>
              </ul>
            </Card>

            {/* Animation Section */}
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-green-500 border-b-2 border-green-500 pb-2 mb-6 font-mono">
                Animación Interactiva: Work Stealing (LIFO vs. FIFO)
              </h2>
              <p className="mb-6">
                La <strong>cola local</strong> de un Worker se comporta como una <strong>PILA (LIFO)</strong>. El Worker roba de otra cola comportándose como una <strong>COLA (FIFO)</strong>, tomando el trabajo más antiguo.
              </p>

              {/* Task Producer */}
              <div className="bg-green-500/5 border-2 border-dashed border-green-500 rounded-lg p-4 mb-6 text-center">
                <h4 className="text-green-500 font-mono font-bold mb-1">
                  📥 Productor de Tareas (<code>ForkJoinPool.submit()</code>)
                </h4>
                <p className="text-sm text-muted-foreground">
                  Las tareas nuevas se distribuyen a los workers disponibles
                </p>
              </div>

              {/* Controls */}
              <div className="text-center mb-6 p-4 bg-card/30 rounded-lg">
                <div className="flex gap-3 justify-center mb-3">
                  <Button
                    onClick={startForkJoinAnimation}
                    disabled={isRunning}
                    className="bg-green-500 hover:bg-green-600 text-background font-mono"
                  >
                    ▶ Iniciar Animación
                  </Button>
                  <Button
                    onClick={resetForkJoinPool}
                    variant="outline"
                    className="border-green-500 text-green-500 hover:bg-green-500/10 font-mono"
                  >
                    ↻ Reiniciar
                  </Button>
                </div>
                <div className="bg-[#2a333d] border-l-4 border-blue-500 p-3 text-left text-[#a6c5e0] font-mono min-h-12">
                  {statusText || "Presiona \"Iniciar Animación\" para comenzar"}
                </div>
              </div>

              {/* Workers */}
              <div className="flex flex-col gap-5">
                {fjpWorkers.map((worker) => (
                  <div
                    key={worker.id}
                    className={`bg-card/50 rounded-lg p-4 border transition-all ${
                      worker.status === "stealing"
                        ? "shadow-[0_0_20px_rgba(46,204,113,0.6)] border-green-500 scale-[1.02]"
                        : worker.status === "idle"
                        ? "opacity-70 border-border"
                        : "border-border"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-border">
                      <span className="font-bold text-lg font-mono">
                        🔧 Worker {String.fromCharCode(64 + worker.id)}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-bold font-mono ${
                          worker.status === "working"
                            ? "bg-green-950/50 text-green-400"
                            : worker.status === "stealing"
                            ? "bg-blue-950/50 text-blue-400 animate-pulse"
                            : "bg-blue-950/50 text-blue-400"
                        }`}
                      >
                        {worker.status === "working"
                          ? "Trabajando"
                          : worker.status === "stealing"
                          ? "Robando"
                          : "Ocioso"}
                      </span>
                    </div>

                    {/* Worker Queue */}
                    <div className="relative">
                      <span className="absolute -top-3 left-4 bg-card px-2 text-xs text-muted-foreground font-bold z-10">
                        LIFO (Newest) ← Cola → FIFO (Oldest)
                      </span>
                      <div className="min-h-20 bg-background border-2 border-dashed border-border rounded p-3 flex items-center overflow-x-auto">
                        <div className="flex gap-2 flex-row-reverse w-full">
                          {worker.queue?.map((task) => (
                            <div
                              key={task.id}
                              className="w-12 h-12 rounded-lg flex flex-col items-center justify-center text-white text-xs font-bold font-mono shadow-lg flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-700"
                            >
                              <span>{task.id}</span>
                              <span className="text-[10px]">CPU</span>
                            </div>
                          ))}
                          {worker.currentTask && (
                            <div className="w-12 h-12 rounded-lg flex flex-col items-center justify-center text-white text-xs font-bold font-mono shadow-lg flex-shrink-0 bg-gradient-to-br from-green-500 to-green-700 animate-pulse scale-110">
                              <span>{worker.currentTask.id}</span>
                              <span className="text-[10px]">CPU</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex gap-6 justify-center mt-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-blue-700" />
                  <span className="text-sm">Tarea CPU</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-green-500 to-green-700" />
                  <span className="text-sm">Tarea Robada (FIFO)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-green-500 to-green-700 animate-pulse" />
                  <span className="text-sm">Procesando (LIFO Local)</span>
                </div>
              </div>

              {/* Sequence */}
              <div className="mt-8 p-6 bg-card/30 rounded-lg">
                <h3 className="text-lg font-bold mb-3">Secuencia de la Animación:</h3>
                <ol className="list-decimal ml-6 space-y-2">
                  <li>
                    <strong>Inicialización:</strong> Entran 10 tareas (4, 4, 2). Worker C tiene menos carga.
                  </li>
                  <li>
                    <strong>Proceso LIFO:</strong> Workers A y B procesan las tareas más a la derecha (las más nuevas).
                  </li>
                  <li>
                    <strong>Worker C Ocioso:</strong> Worker C termina sus 2 tareas y queda libre.
                  </li>
                  <li>
                    <strong>Robo FIFO:</strong> Worker C (ocioso) roba la tarea más a la izquierda de Worker A (la más antigua), demostrando el balanceo de carga.
                  </li>
                  <li>
                    <strong>Continuidad:</strong> El trabajo se balancea hasta que todas las colas están vacías.
                  </li>
                </ol>
              </div>
            </Card>

            {/* Risk Warning */}
            <Card className="p-6 mt-8 bg-red-950/20 border-red-500">
              <h3 className="text-xl font-bold text-red-500 border-b border-red-500 pb-2 mb-3">
                🔴 Riesgos Críticos: Blocking I/O y el ForkJoinPool
              </h3>
              <p className="text-red-200 mb-4">
                El uso del <code className="bg-card px-2 py-1 rounded">ForkJoinPool</code> para tareas que realizan operaciones de <strong>E/S bloqueantes (Blocking I/O)</strong>, como acceder a bases de datos, leer archivos o hacer llamadas de red síncronas, es un <strong>antipatrón</strong> y un error de diseño grave.
              </p>
              <div className="bg-amber-950/50 border-l-4 border-red-500 p-4 rounded font-bold text-amber-200 text-center">
                ⚠️ Si todas las threads del ForkJoinPool se bloquean esperando I/O, el pool completo se paraliza y no puede procesar más tareas.
              </div>
            </Card>
          </div>
        )}
        </div>
      </main>
    </div>
  );
};
