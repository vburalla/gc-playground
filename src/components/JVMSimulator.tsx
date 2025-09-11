import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Frame {
  id: string;
  name: string;
  variables: string[];
  returnAddr?: number;
}

interface HeapObject {
  id: string;
  ref: string;
  content: string;
  isGarbage?: boolean;
}

export const JVMSimulator = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightLine, setHighlightLine] = useState(0);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [heapObjects, setHeapObjects] = useState<HeapObject[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  const fullJavaCode = [
    `public class Main {`,
    `    public static void main(String[] args) {`,
    `        String details = buildAndFormatPerson(23, "John");`,
    `        System.out.println(details);`,
    `    } // End of main()`,
    ``,
    `    public static String buildAndFormatPerson(int id, String name) {`,
    `        Person person = new Person(id, name);`,
    `        return formatDetails(person);`,
    `    } // End of buildAndFormatPerson()`,
    ``,
    `    public static String formatDetails(Person p) {`,
    `        String info = "ID: " + p.id + ", Name: " + p.name;`,
    `        return info;`,
    `    } // End of formatDetails()`,
    `}`,
    ``,
    `class Person {`,
    `    int id;`,
    `    String name;`,
    ``,
    `    Person(int id, String name) {`,
    `        this.id = id;`,
    `        this.name = name;`,
    `    } // End of constructor`,
    `}`
  ];

  const methodAreaInfo = [
    {
      className: "Main",
      methods: ["main()", "buildAndFormatPerson()", "formatDetails()"]
    },
    {
      className: "Person", 
      methods: ["Constructor: Person()", "Instance fields: id, name"]
    }
  ];

  const steps = [
    () => { // Inicia JVM
      setHighlightLine(0);
      setFrames([]);
      setHeapObjects([]);
      setIsFinished(false);
    },
    () => { // Inicia main
      setHighlightLine(3);
      setFrames([{
        id: 'frame-main',
        name: 'main()',
        variables: ['String details = (uninitialized)']
      }]);
    },
    () => { // Llama a buildAndFormatPerson
      setHighlightLine(8);
      setFrames(prev => [...prev, {
        id: 'frame-build',
        name: 'buildAndFormatPerson()',
        variables: ['int id = 23', 'String name = @ref1'],
        returnAddr: 3
      }]);
      setHeapObjects([{
        id: 'heap-obj-1',
        ref: '@ref1',
        content: '"John" (String Pool)'
      }]);
    },
    () => { // Llama al constructor de Person
      setHighlightLine(23);
      setFrames(prev => [...prev, {
        id: 'frame-constructor', 
        name: 'Person()',
        variables: ['this = @ref2'],
        returnAddr: 8
      }]);
      setHeapObjects(prev => [...prev, {
        id: 'heap-obj-2',
        ref: '@ref2',
        content: 'Person { id=0, name=null }'
      }]);
    },
    () => { // Asigna this.id
      setHighlightLine(24);
      setHeapObjects(prev => prev.map(obj => 
        obj.id === 'heap-obj-2' 
          ? { ...obj, content: 'Person { id=23, name=null }' }
          : obj
      ));
    },
    () => { // Asigna this.name
      setHighlightLine(25);
      setHeapObjects(prev => prev.map(obj => 
        obj.id === 'heap-obj-2' 
          ? { ...obj, content: 'Person { id=23, name=@ref1 }' }
          : obj
      ));
    },
    () => { // Termina constructor, vuelve a buildAndFormatPerson
      setHighlightLine(9);
      setFrames(prev => {
        const filtered = prev.filter(f => f.id !== 'frame-constructor');
        return filtered.map(f => 
          f.id === 'frame-build' 
            ? { ...f, variables: [...f.variables, 'Person person = @ref2'] }
            : f
        );
      });
    },
    () => { // Llama a formatDetails
      setHighlightLine(14);
      setFrames(prev => [...prev, {
        id: 'frame-format',
        name: 'formatDetails()',
        variables: ['Person p = @ref2'],
        returnAddr: 9
      }]);
    },
    () => { // Crea el nuevo String en el heap
      setHighlightLine(14);
      setHeapObjects(prev => [...prev, {
        id: 'heap-obj-3',
        ref: '@ref3',
        content: '"ID: 23, Name: John"'
      }]);
      setFrames(prev => prev.map(f => 
        f.id === 'frame-format' 
          ? { ...f, variables: [...f.variables, 'String info = @ref3'] }
          : f
      ));
    },
    () => { // Retorna de formatDetails
      setHighlightLine(15);
      setFrames(prev => prev.map(f => 
        f.id === 'frame-format' 
          ? { ...f, variables: [...f.variables, 'return val: @ref3'] }
          : f
      ));
    },
    () => { // Vuelve a buildAndFormatPerson, se elimina el frame de formatDetails
      setHighlightLine(9);
      setFrames(prev => {
        const filtered = prev.filter(f => f.id !== 'frame-format');
        return filtered.map(f => 
          f.id === 'frame-build' 
            ? { ...f, variables: [...f.variables, 'return val: @ref3'] }
            : f
        );
      });
    },
    () => { // Retorna de buildAndFormatPerson, se elimina el frame de build
      setHighlightLine(3);
      setFrames(prev => {
        const filtered = prev.filter(f => f.id !== 'frame-build');
        return filtered.map(f => 
          f.id === 'frame-main' 
            ? { ...f, variables: ['String details = @ref3'] }
            : f
        );
      });
    },
    () => { // Ejecuta println
      setHighlightLine(4);
    },
    () => { // Termina main, se elimina el frame
      setHighlightLine(5);
      setFrames([]);
    },
    () => { // Objetos listos para GC
      setHighlightLine(0);
      setHeapObjects(prev => prev.map(obj => ({ ...obj, isGarbage: true })));
      setIsFinished(true);
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length) {
      steps[currentStep]();
      setCurrentStep(prev => prev + 1);
    } else {
      resetAnimation();
    }
  };

  const resetAnimation = () => {
    setCurrentStep(0);
    setHighlightLine(0);
    setFrames([]);
    setHeapObjects([]);
    setIsFinished(false);
  };

  const formatCode = () => {
    return fullJavaCode.map((line, index) => {
      const lineNumber = index + 1;
      const isHighlighted = lineNumber === highlightLine;
      return (
        <div 
          key={index}
          className={`font-mono text-sm leading-relaxed ${
            isHighlighted ? 'bg-warning/20 border-l-4 border-warning pl-2 -ml-2' : ''
          }`}
        >
          <span className="text-muted-foreground mr-3 select-none inline-block w-6 text-right">
            {lineNumber}
          </span>
          <span className="text-foreground">{line || '\u00A0'}</span>
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-gradient-bg">
      <main className="container mx-auto p-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">JVM Simulator</h1>
          <p className="text-muted-foreground">Interactive Stack, Heap and Method Area Visualization</p>
        </div>

        <div className="grid gap-6 h-[calc(100vh-200px)]" style={{ gridTemplateColumns: "40% 15% 20% 25%" }}>
          {/* Java Code */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-primary">Java Code</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              <div className="bg-muted/30 p-4 rounded-lg font-mono text-sm overflow-auto">
                {formatCode()}
              </div>
            </CardContent>
          </Card>

          {/* Heap */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-primary">Heap</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              <div className="space-y-2">
                {heapObjects.map((obj) => (
                  <div 
                    key={obj.id}
                    className={`border-2 rounded-lg p-3 transition-all duration-500 ${
                      obj.isGarbage 
                        ? 'border-destructive/50 bg-destructive/10 opacity-60' 
                        : 'border-success/50 bg-success/10'
                    }`}
                  >
                    <div className="text-sm font-mono">
                      <span className="text-warning font-bold">{obj.ref}</span>: {obj.content}
                    </div>
                  </div>
                ))}
                {isFinished && (
                  <div className="text-destructive font-bold text-center mt-4">
                    🗑️ Objects unreferenced, eligible for Garbage Collector
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stack */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-primary">Stack</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              <div className="space-y-2 flex flex-col-reverse">
                {frames.map((frame) => (
                  <div 
                    key={frame.id}
                    className="border-2 border-primary/50 rounded-lg p-3 bg-primary/10 transition-all duration-500"
                  >
                    <div className="font-bold text-primary text-sm mb-1">
                      Frame: {frame.name}
                    </div>
                    {frame.returnAddr && (
                      <div className="text-xs text-muted-foreground mb-1">
                        Return Address: line {frame.returnAddr}
                      </div>
                    )}
                    <div className="text-sm space-y-1">
                      {frame.variables.map((variable, index) => (
                        <div key={index} dangerouslySetInnerHTML={{ __html: variable }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Method Area */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-primary">Method Area</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              <div className="space-y-4">
                {methodAreaInfo.map((classInfo, index) => (
                  <div 
                    key={index}
                    className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4"
                  >
                    <h4 className="font-bold text-foreground border-b border-muted-foreground/30 pb-2 mb-2">
                      Class: {classInfo.className}
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {classInfo.methods.map((method, methodIndex) => (
                        <li key={methodIndex}>• {method}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Control Button */}
        <div className="fixed bottom-6 right-6">
          <Button 
            onClick={nextStep}
            size="lg"
            className="shadow-lg"
          >
            {isFinished ? '🔄 Restart Animation' : '▶ Next Step'}
          </Button>
        </div>
      </main>
    </div>
  );
};